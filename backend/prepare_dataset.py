"""
DeepGuard AI — FaceForensics++ Dataset Preparation Pipeline
============================================================
Structure expected:
  data/
  └── faceforensics++_C23/
      ├── original/
      │   └── **/*.mp4
      ├── Deepfakes/
      │   └── **/*.mp4
      ├── DeepfakeDetection/
      │   └── **/*.mp4
      ├── Face2Face/
      │   └── **/*.mp4
      ├── FaceShifter/
      │   └── **/*.mp4
      ├── FaceSwap/
      │   └── **/*.mp4
      └── NeuralTextures/
          └── **/*.mp4

Output:
  data/
  ├── frames/          ← extracted frames (jpg)
  │   ├── real/
  │   └── fake/
  ├── splits/
  │   ├── train.csv
  │   ├── val.csv
  │   └── test.csv
  └── dataset_stats.json

Usage:
  python prepare_dataset.py
  python prepare_dataset.py --data_root data/faceforensics++_C23 --frames_per_video 30
  python prepare_dataset.py --max_videos 200   # cap each folder to 200 videos (default)
  python prepare_dataset.py --max_videos 0     # 0 = use ALL videos (no cap)
"""

import os
import cv2
import json
import random
import shutil
import argparse
import csv
from pathlib import Path
from collections import defaultdict

# ─── CONFIG ───────────────────────────────────────────────────────────────────

FAKE_FOLDERS = [
    "Deepfakes",
    "DeepfakeDetection",
    "Face2Face",
    "FaceShifter",
    "FaceSwap",
    "NeuralTextures",
]

REAL_FOLDER = "original"

SPLIT_RATIOS = {"train": 0.70, "val": 0.15, "test": 0.15}

# ─── ARGUMENT PARSER ──────────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(description="Prepare FF++ dataset")
    parser.add_argument("--data_root",       default="data/faceforensics++_C23", help="Path to FF++ root folder")
    parser.add_argument("--output_dir",      default="data",                     help="Where to write frames/ and splits/")
    parser.add_argument("--frames_per_video",type=int, default=30,               help="Frames to extract per video")
    parser.add_argument("--img_size",        type=int, default=224,              help="Resize extracted frames to N×N")
    parser.add_argument("--seed",            type=int, default=42,               help="Random seed for reproducibility")
    parser.add_argument("--skip_extraction", action="store_true",                help="Skip frame extraction (if already done)")
    parser.add_argument("--fake_folders",    nargs="+", default=FAKE_FOLDERS,    help="Which fake subfolders to include")
    parser.add_argument("--max_videos",      type=int, default=200,
                        help="Max videos to use per folder (real + each fake type). "
                             "Set to 0 to use ALL videos with no cap. Default: 200")
    return parser.parse_args()

# ─── UTILITIES ────────────────────────────────────────────────────────────────

def collect_videos(folder: Path) -> list[Path]:
    """Recursively find all .mp4 files under folder."""
    return sorted(folder.rglob("*.mp4"))


def cap_videos(videos: list[Path], max_videos: int, seed: int) -> list[Path]:
    """
    Randomly sample up to max_videos from the list.
    If max_videos is 0 or >= len(videos), returns all videos unchanged.
    Uses a fixed seed so the same subset is always picked.
    """
    if max_videos <= 0 or max_videos >= len(videos):
        return videos
    rng = random.Random(seed)
    return rng.sample(videos, max_videos)


def extract_frames(video_path: Path, out_dir: Path, n_frames: int, img_size: int) -> list[Path]:
    """
    Extract n_frames evenly-spaced frames from video_path.
    Returns list of saved frame paths.
    """
    cap = cv2.VideoCapture(str(video_path))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if total == 0:
        cap.release()
        return []

    indices = [int(i * total / n_frames) for i in range(n_frames)]
    saved = []

    out_dir.mkdir(parents=True, exist_ok=True)
    stem = video_path.stem

    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            continue
        frame = cv2.resize(frame, (img_size, img_size))
        fname = out_dir / f"{stem}_f{idx:05d}.jpg"
        cv2.imwrite(str(fname), frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
        saved.append(fname)

    cap.release()
    return saved


def split_list(items: list, ratios: dict, seed: int) -> dict[str, list]:
    """Split items into train/val/test by ratio."""
    random.seed(seed)
    shuffled = items.copy()
    random.shuffle(shuffled)
    n = len(shuffled)
    n_train = int(n * ratios["train"])
    n_val   = int(n * ratios["val"])
    return {
        "train": shuffled[:n_train],
        "val":   shuffled[n_train:n_train + n_val],
        "test":  shuffled[n_train + n_val:],
    }


def write_csv(rows: list[dict], path: Path):
    """Write list of {frame_path, label, source, split} dicts to CSV."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["frame_path", "label", "source", "split"])
        writer.writeheader()
        writer.writerows(rows)


def bar(current, total, width=40):
    filled = int(width * current / max(total, 1))
    return f"[{'█' * filled}{'░' * (width - filled)}] {current}/{total}"

# ─── MAIN PIPELINE ────────────────────────────────────────────────────────────

def main():
    args = parse_args()
    random.seed(args.seed)

    data_root  = Path(args.data_root)
    output_dir = Path(args.output_dir)
    frames_dir = output_dir / "frames"
    splits_dir = output_dir / "splits"

    print("\n" + "═" * 60)
    print("  DeepGuard AI — FF++ Dataset Preparation")
    print("═" * 60)
    print(f"  Data root       : {data_root.resolve()}")
    print(f"  Output dir      : {output_dir.resolve()}")
    print(f"  Frames per video: {args.frames_per_video}")
    print(f"  Image size      : {args.img_size}×{args.img_size}")
    print(f"  Max videos/folder: {args.max_videos if args.max_videos > 0 else 'ALL (no cap)'}")
    print(f"  Fake folders    : {', '.join(args.fake_folders)}")
    print(f"  Split           : train={SPLIT_RATIOS['train']} / val={SPLIT_RATIOS['val']} / test={SPLIT_RATIOS['test']}")
    print("═" * 60 + "\n")

    # ── 1. COLLECT VIDEOS ──────────────────────────────────────────────────────
    print("[ 1/4 ] Scanning for videos...")

    real_folder = data_root / REAL_FOLDER
    if not real_folder.exists():
        raise FileNotFoundError(f"Real folder not found: {real_folder}\n"
                                f"Expected: {data_root}/original/")

    _all_real = collect_videos(real_folder)
    real_videos = cap_videos(_all_real, args.max_videos, args.seed)
    capped_real = len(_all_real) - len(real_videos)
    print(f"        ✓ Real videos found   : {len(_all_real):>5}  →  using {len(real_videos)}"
          + (f"  (capped, {capped_real} skipped)" if capped_real > 0 else "  (all used)"))

    fake_videos_by_type: dict[str, list[Path]] = {}
    for folder_name in args.fake_folders:
        folder = data_root / folder_name
        if not folder.exists():
            print(f"        ⚠  Folder not found, skipping: {folder_name}")
            continue
        _all_fake = collect_videos(folder)
        capped = cap_videos(_all_fake, args.max_videos, args.seed)
        fake_videos_by_type[folder_name] = capped
        skipped = len(_all_fake) - len(capped)
        print(f"        ✓ {folder_name:<22}: {len(_all_fake):>5} found  →  using {len(capped)}"
              + (f"  ({skipped} skipped)" if skipped > 0 else "  (all used)"))

    all_fake_videos = [(v, src) for src, vids in fake_videos_by_type.items() for v in vids]
    print(f"\n        Total real  : {len(real_videos)}")
    print(f"        Total fake  : {len(all_fake_videos)}  ({len(fake_videos_by_type)} manipulation types × up to {args.max_videos if args.max_videos > 0 else 'ALL'} each)")
    print(f"        Total videos: {len(real_videos) + len(all_fake_videos)}\n")

    # ── 2. EXTRACT FRAMES ──────────────────────────────────────────────────────
    all_frame_rows: list[dict] = []   # {frame_path, label, source}

    if not args.skip_extraction:
        print("[ 2/4 ] Extracting frames...")

        # REAL
        print(f"\n  → Real videos ({len(real_videos)} total)")
        for i, vpath in enumerate(real_videos):
            out = frames_dir / "real" / vpath.stem
            frames = extract_frames(vpath, out, args.frames_per_video, args.img_size)
            for fp in frames:
                all_frame_rows.append({"frame_path": str(fp), "label": 0, "source": "original"})
            print(f"\r        {bar(i+1, len(real_videos))}  ", end="", flush=True)
        print(f"\n        ✓ {len([r for r in all_frame_rows if r['label']==0])} real frames extracted")

        # FAKE
        print(f"\n  → Fake videos ({len(all_fake_videos)} total)")
        for i, (vpath, src) in enumerate(all_fake_videos):
            out = frames_dir / "fake" / src / vpath.stem
            frames = extract_frames(vpath, out, args.frames_per_video, args.img_size)
            for fp in frames:
                all_frame_rows.append({"frame_path": str(fp), "label": 1, "source": src})
            print(f"\r        {bar(i+1, len(all_fake_videos))}  ", end="", flush=True)
        print(f"\n        ✓ {len([r for r in all_frame_rows if r['label']==1])} fake frames extracted\n")

    else:
        print("[ 2/4 ] Skipping extraction — scanning existing frames...")
        for fp in (frames_dir / "real").rglob("*.jpg"):
            all_frame_rows.append({"frame_path": str(fp), "label": 0, "source": "original"})
        for fp in (frames_dir / "fake").rglob("*.jpg"):
            src = fp.relative_to(frames_dir / "fake").parts[0]
            all_frame_rows.append({"frame_path": str(fp), "label": 1, "source": src})
        print(f"        ✓ Found {len(all_frame_rows)} existing frames\n")

    # ── 3. SPLIT ───────────────────────────────────────────────────────────────
    print("[ 3/4 ] Splitting dataset (stratified by label)...")

    real_rows = [r for r in all_frame_rows if r["label"] == 0]
    fake_rows = [r for r in all_frame_rows if r["label"] == 1]

    real_splits = split_list(real_rows, SPLIT_RATIOS, args.seed)
    fake_splits = split_list(fake_rows, SPLIT_RATIOS, args.seed)

    split_data: dict[str, list[dict]] = {}
    for split in ("train", "val", "test"):
        combined = real_splits[split] + fake_splits[split]
        random.shuffle(combined)
        for row in combined:
            row["split"] = split
        split_data[split] = combined

    # Print split summary table
    print(f"\n  {'Split':<8} {'Real':>8} {'Fake':>8} {'Total':>8} {'%':>6}")
    print(f"  {'─'*8} {'─'*8} {'─'*8} {'─'*8} {'─'*6}")
    grand_total = len(all_frame_rows)
    for split in ("train", "val", "test"):
        rows = split_data[split]
        n_real = sum(1 for r in rows if r["label"] == 0)
        n_fake = sum(1 for r in rows if r["label"] == 1)
        pct = 100 * len(rows) / max(grand_total, 1)
        print(f"  {split:<8} {n_real:>8} {n_fake:>8} {len(rows):>8} {pct:>5.1f}%")
    print(f"  {'─'*8} {'─'*8} {'─'*8} {'─'*8} {'─'*6}")
    print(f"  {'TOTAL':<8} {len(real_rows):>8} {len(fake_rows):>8} {grand_total:>8} {'100.0':>6}%\n")

    # Check class balance
    balance = len(real_rows) / max(len(fake_rows), 1)
    if balance < 0.5 or balance > 2.0:
        print(f"  ⚠  Class imbalance detected (real/fake ratio = {balance:.2f})")
        print(f"     Consider using weighted loss or oversampling.\n")

    # ── 4. WRITE CSVs ──────────────────────────────────────────────────────────
    print("[ 4/4 ] Writing split CSVs...")
    for split, rows in split_data.items():
        csv_path = splits_dir / f"{split}.csv"
        write_csv(rows, csv_path)
        print(f"        ✓ {csv_path}  ({len(rows)} rows)")

    # Dataset stats JSON
    stats = {
        "total_videos": {
            "real": len(real_videos),
            "fake": len(all_fake_videos),
        },
        "fake_breakdown": {src: len(vids) for src, vids in fake_videos_by_type.items()},
        "total_frames": {
            "real": len(real_rows),
            "fake": len(fake_rows),
            "total": grand_total,
        },
        "splits": {
            split: {
                "total": len(rows),
                "real": sum(1 for r in rows if r["label"] == 0),
                "fake": sum(1 for r in rows if r["label"] == 1),
            }
            for split, rows in split_data.items()
        },
        "config": {
            "frames_per_video": args.frames_per_video,
            "img_size": args.img_size,
            "seed": args.seed,
            "ratios": SPLIT_RATIOS,
            "max_videos_per_folder": args.max_videos if args.max_videos > 0 else "unlimited",
        },
    }
    stats_path = output_dir / "dataset_stats.json"
    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2)
    print(f"        ✓ {stats_path}")

    print("\n" + "═" * 60)
    print("  ✅  Dataset preparation complete!")
    print("═" * 60)
    print(f"\n  Next step — train your model:")
    print(f"    python train.py --train_csv data/splits/train.csv \\")
    print(f"                   --val_csv   data/splits/val.csv   \\")
    print(f"                   --test_csv  data/splits/test.csv\n")


if __name__ == "__main__":
    main()