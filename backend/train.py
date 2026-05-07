"""
DeepGuard AI — Improved train.py (drop-in replacement)
=======================================================
Drop this file into your backend/ folder, replacing the old train.py.
It reuses your existing detection/model.py and detection/preprocess.py
so your FastAPI backend needs zero changes.

Run AFTER prepare_dataset.py has built data/splits/*.csv

  python train.py                          # defaults
  python train.py --epochs 20 --batch_size 32

What changed vs the old script:
  ✓ Reads from your real FF++ folder structure via CSV splits
  ✓ WeightedRandomSampler  → fixes class imbalance
  ✓ Label smoothing        → stops overconfident predictions
  ✓ Stronger augmentation  → better generalisation
  ✓ Cosine LR + warmup     → stable convergence
  ✓ Early stopping         → no wasted epochs
  ✓ Precision/Recall/F1/AUC logged every epoch
  ✓ Saves best model to same path detection/deepfake_efficientnet_b4.pth
  ✓ drop_last=False        → no frames thrown away
"""

import csv
import json
import argparse
from pathlib import Path
from collections import Counter

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import transforms
from PIL import Image

# ── reuse your existing classes ──────────────────────────────────────────────
from detection.model import DeepfakeDetector
from detection.preprocess import get_transform

try:
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
    )
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False
    print("⚠  scikit-learn not found — install it: pip install scikit-learn")

# ─── CONFIG ──────────────────────────────────────────────────────────────────
SAVE_PATH = "detection/deepfake_efficientnet_b4.pth"   # same path as before


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--train_csv",     default="data/splits/train.csv")
    p.add_argument("--val_csv",       default="data/splits/val.csv")
    p.add_argument("--test_csv",      default="data/splits/test.csv")
    p.add_argument("--save_path",     default=SAVE_PATH)
    p.add_argument("--epochs",        type=int,   default=20)
    p.add_argument("--batch_size",    type=int,   default=32)
    p.add_argument("--lr",            type=float, default=1e-4)
    p.add_argument("--num_workers",   type=int,   default=4)
    p.add_argument("--patience",      type=int,   default=5)
    p.add_argument("--label_smooth",  type=float, default=0.1)
    p.add_argument("--warmup_epochs", type=int,   default=2)
    p.add_argument("--seed",          type=int,   default=42)
    return p.parse_args()


# ─── DATASET ─────────────────────────────────────────────────────────────────

def load_csv(path: str) -> list[dict]:
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


class FF_Dataset(Dataset):
    """
    Reads frame paths + labels from a CSV produced by prepare_dataset.py.
    label: 0 = real, 1 = fake  (same convention as your old script)
    """

    def __init__(self, rows: list[dict], transform=None):
        self.transform = transform
        self.rows = []
        missing = 0
        for r in rows:
            if Path(r["frame_path"]).exists():
                self.rows.append(r)
            else:
                missing += 1
        if missing:
            print(f"  ⚠  {missing} frames not found on disk — skipped.")

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, idx):
        row = self.rows[idx]
        img = Image.open(row["frame_path"]).convert("RGB")
        if self.transform:
            img = self.transform(img)
        label = torch.tensor(float(row["label"]), dtype=torch.float32)
        return img, label


def make_weighted_sampler(rows: list[dict]) -> WeightedRandomSampler:
    """Over-sample whichever class has fewer frames so batches are ~50/50."""
    labels = [int(r["label"]) for r in rows]
    counts = Counter(labels)
    weight_map = {cls: 1.0 / cnt for cls, cnt in counts.items()}
    weights = [weight_map[l] for l in labels]
    return WeightedRandomSampler(weights, num_samples=len(weights), replacement=True)


# ─── STRONGER AUGMENTATION ───────────────────────────────────────────────────

def strong_train_transform(img_size: int = 224):
    """More aggressive than old get_transform(train=True) for better generalisation."""
    mean = [0.485, 0.456, 0.406]
    std  = [0.229, 0.224, 0.225]
    return transforms.Compose([
        transforms.Resize((img_size + 32, img_size + 32)),
        transforms.RandomCrop(img_size),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2, hue=0.05),
        transforms.RandomRotation(15),
        transforms.GaussianBlur(kernel_size=3, sigma=(0.1, 2.0)),
        transforms.RandomGrayscale(p=0.05),
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
        transforms.RandomErasing(p=0.1),
    ])


# ─── LABEL SMOOTHING LOSS ────────────────────────────────────────────────────

class SmoothBCELoss(nn.Module):
    def __init__(self, smoothing: float = 0.1):
        super().__init__()
        self.smoothing = smoothing

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        logits = logits.squeeze(1)          # handles (B,1) or (B,) from your model
        targets_smooth = targets * (1 - self.smoothing) + 0.5 * self.smoothing
        return nn.functional.binary_cross_entropy_with_logits(logits, targets_smooth)


# ─── METRICS ─────────────────────────────────────────────────────────────────

def compute_metrics(labels, preds, probs) -> dict:
    if not HAS_SKLEARN:
        acc = sum(p == l for p, l in zip(preds, labels)) / max(len(labels), 1)
        return {"accuracy": round(acc, 4)}
    return {
        "accuracy":  round(accuracy_score(labels, preds), 4),
        "precision": round(precision_score(labels, preds, zero_division=0), 4),
        "recall":    round(recall_score(labels, preds, zero_division=0), 4),
        "f1":        round(f1_score(labels, preds, zero_division=0), 4),
        "auc_roc":   round(
            roc_auc_score(labels, probs) if len(set(labels)) > 1 else 0.0, 4
        ),
    }


@torch.no_grad()
def evaluate(model, loader, criterion, device) -> tuple[float, dict]:
    model.eval()
    total_loss = 0.0
    all_labels, all_preds, all_probs = [], [], []

    for imgs, labels in loader:
        imgs, labels = imgs.to(device), labels.to(device)
        logits = model(imgs).squeeze(1)
        loss = criterion(logits, labels)
        total_loss += loss.item()

        probs = torch.sigmoid(logits).cpu().tolist()
        preds = [int(p >= 0.5) for p in probs]
        all_probs.extend(probs)
        all_preds.extend(preds)
        all_labels.extend(labels.cpu().int().tolist())

    avg_loss = total_loss / max(len(loader), 1)
    metrics  = compute_metrics(all_labels, all_preds, all_probs)
    return avg_loss, metrics


# ─── TRAINING LOOP ───────────────────────────────────────────────────────────

def train_one_epoch(model, loader, optimizer, criterion, device) -> float:
    model.train()
    total_loss = 0.0
    for i, (imgs, labels) in enumerate(loader):
        imgs, labels = imgs.to(device), labels.to(device)
        optimizer.zero_grad()
        logits = model(imgs).squeeze(1)
        loss = criterion(logits, labels)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
        total_loss += loss.item()
        if (i + 1) % 30 == 0:
            print(f"      step {i+1}/{len(loader)}  loss={loss.item():.4f}", end="\r")
    return total_loss / max(len(loader), 1)


# ─── MAIN ────────────────────────────────────────────────────────────────────

def train():
    args   = parse_args()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    torch.manual_seed(args.seed)

    print("\n" + "═" * 62)
    print("  DeepGuard AI — Training  (drop-in replacement)")
    print("═" * 62)
    print(f"  Device        : {device}")
    print(f"  Epochs        : {args.epochs}  (warmup={args.warmup_epochs})")
    print(f"  Batch size    : {args.batch_size}")
    print(f"  Base LR       : {args.lr}  →  fine-tune LR: {args.lr/10}")
    print(f"  Early stop    : patience={args.patience}")
    print(f"  Label smooth  : {args.label_smooth}")
    print(f"  Save path     : {args.save_path}")
    print("═" * 62 + "\n")

    # ── 1. Load CSVs ──────────────────────────────────────────────────────────
    print("[ 1/5 ] Loading split CSVs...")
    train_rows = load_csv(args.train_csv)
    val_rows   = load_csv(args.val_csv)
    test_rows  = load_csv(args.test_csv)

    for name, rows in [("train", train_rows), ("val", val_rows), ("test", test_rows)]:
        c = Counter(int(r["label"]) for r in rows)
        print(f"        {name:<6}: {len(rows):>7} frames  |  real={c[0]:>6}  fake={c[1]:>6}")

    # ── 2. Datasets ───────────────────────────────────────────────────────────
    print("\n[ 2/5 ] Building datasets & loaders...")

    train_ds = FF_Dataset(train_rows, transform=strong_train_transform(224))
    val_ds   = FF_Dataset(val_rows,   transform=get_transform(train=False))
    test_ds  = FF_Dataset(test_rows,  transform=get_transform(train=False))

    sampler = make_weighted_sampler(train_rows)

    train_loader = DataLoader(
        train_ds, batch_size=args.batch_size, sampler=sampler,
        num_workers=args.num_workers, pin_memory=True,
        # drop_last REMOVED — every sample is used
    )
    val_loader  = DataLoader(val_ds,  batch_size=args.batch_size, shuffle=False,
                             num_workers=args.num_workers, pin_memory=True)
    test_loader = DataLoader(test_ds, batch_size=args.batch_size, shuffle=False,
                             num_workers=args.num_workers, pin_memory=True)

    print(f"        train: {len(train_ds)} frames  →  {len(train_loader)} batches")
    print(f"        val  : {len(val_ds)} frames  →  {len(val_loader)} batches")
    print(f"        test : {len(test_ds)} frames  →  {len(test_loader)} batches")

    # ── 3. Model ──────────────────────────────────────────────────────────────
    print("\n[ 3/5 ] Loading your DeepfakeDetector (EfficientNet-B4)...")
    model     = DeepfakeDetector().to(device)
    criterion = SmoothBCELoss(smoothing=args.label_smooth)

    # Phase 1 — freeze backbone, only train your classifier head
    for p in model.backbone.parameters():
        p.requires_grad = False
    optimizer = torch.optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()), lr=args.lr
    )
    scheduler = None

    # ── 4. Training ───────────────────────────────────────────────────────────
    print("\n[ 4/5 ] Training...\n")

    score_key    = "auc_roc" if HAS_SKLEARN else "accuracy"
    best_score   = 0.0
    patience_ctr = 0
    history      = []

    for epoch in range(1, args.epochs + 1):

        # Unfreeze backbone after warmup
        if epoch == args.warmup_epochs + 1:
            print("\n  ▶  Warmup done — unfreezing backbone for fine-tuning")
            for p in model.backbone.parameters():
                p.requires_grad = True
            optimizer = torch.optim.Adam(model.parameters(), lr=args.lr / 10)
            scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
                optimizer,
                T_max=args.epochs - args.warmup_epochs,
                eta_min=1e-6,
            )

        train_loss = train_one_epoch(model, train_loader, optimizer, criterion, device)
        val_loss, val_m = evaluate(model, val_loader, criterion, device)

        if scheduler:
            scheduler.step()

        score = val_m.get(score_key, 0.0)
        history.append({
            "epoch":      epoch,
            "train_loss": round(train_loss, 4),
            "val_loss":   round(val_loss, 4),
            **{f"val_{k}": v for k, v in val_m.items()},
        })

        metrics_str = "  ".join(f"{k}={v:.4f}" for k, v in val_m.items())
        print(f"\n  Epoch {epoch:>2}/{args.epochs}  "
              f"train_loss={train_loss:.4f}  val_loss={val_loss:.4f}")
        print(f"           {metrics_str}")

        if score > best_score:
            best_score   = score
            patience_ctr = 0
            Path(args.save_path).parent.mkdir(parents=True, exist_ok=True)
            torch.save({
                "epoch":            epoch,
                "model_state_dict": model.state_dict(),
                "val_metrics":      val_m,
                score_key:          score,
            }, args.save_path)
            print(f"           💾  New best {score_key}={best_score:.4f} — saved")
        else:
            patience_ctr += 1
            if patience_ctr >= args.patience:
                print(f"\n  ⏹  Early stopping triggered (no improvement for {args.patience} epochs)")
                break

    # ── 5. Test evaluation ────────────────────────────────────────────────────
    print("\n[ 5/5 ] Final evaluation on held-out test set...")
    ckpt = torch.load(args.save_path, map_location=device)
    model.load_state_dict(ckpt["model_state_dict"])
    _, test_m = evaluate(model, test_loader, criterion, device)

    old_baseline = {"accuracy": 0.62, "precision": 0.56}

    print("\n" + "═" * 62)
    print("  TEST SET RESULTS")
    print("═" * 62)
    for k, v in test_m.items():
        old_v = old_baseline.get(k)
        if old_v is not None:
            delta = v - old_v
            arrow = "↑" if delta > 0 else "↓"
            print(f"  {k:<12}: {v:.4f}   (was {old_v:.2f}  {arrow}{abs(delta):.4f})")
        else:
            print(f"  {k:<12}: {v:.4f}")
    print("═" * 62)

    results = {
        "best_val": {score_key: best_score},
        "test_metrics": test_m,
        "baseline": old_baseline,
        "history":  history,
        "config":   vars(args),
    }
    results_path = Path(args.save_path).parent / "training_results.json"
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n  Model   → {args.save_path}")
    print(f"  Results → {results_path}")
    print(f"\n  🏆  Best val {score_key} = {best_score:.4f}\n")


if __name__ == "__main__":
    train()