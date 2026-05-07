import torch
from torch.utils.data import DataLoader
from detection.model import DeepfakeDetector
from detection.preprocess import get_transform
from train import FF_Dataset, load_csv, compute_metrics, SmoothBCELoss

# Paths
SAVE_PATH = "detection/deepfake_efficientnet_b4.pth"
TEST_CSV = "data/splits/test.csv"

# Device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Dataset + Loader
test_rows = load_csv(TEST_CSV)
test_ds = FF_Dataset(test_rows, transform=get_transform(train=False))

test_loader = DataLoader(
    test_ds,
    batch_size=16,
    shuffle=False,
    num_workers=0,   # important fix for Windows
    pin_memory=torch.cuda.is_available()
)

# Model
model = DeepfakeDetector().to(device)
checkpoint = torch.load(SAVE_PATH, map_location=device)
model.load_state_dict(checkpoint["model_state_dict"])
model.eval()

criterion = SmoothBCELoss(smoothing=0.1)

# Evaluation loop
all_labels, all_preds, all_probs = [], [], []
total_loss = 0

with torch.no_grad():
    for images, labels in test_loader:
        images = images.to(device)
        labels = labels.to(device)

        logits = model(images).squeeze()
        loss = criterion(logits, labels)
        total_loss += loss.item()

        probs = torch.sigmoid(logits)
        preds = (probs >= 0.5).int()

        all_labels.extend(labels.cpu().numpy().tolist())
        all_preds.extend(preds.cpu().numpy().tolist())
        all_probs.extend(probs.cpu().numpy().tolist())

metrics = compute_metrics(all_labels, all_preds, all_probs)

print("\n=========== TEST RESULTS ===========")
print("Loss:", round(total_loss / len(test_loader), 4))
for k, v in metrics.items():
    print(f"{k}: {v}")
print("====================================")
