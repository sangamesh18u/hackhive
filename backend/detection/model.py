# backend/detection/model.py
import torch
import torch.nn as nn
import timm
from pathlib import Path

class DeepfakeDetector(nn.Module):
    """
    EfficientNet-B4 fine-tuned for deepfake detection.
    Uses pretrained ImageNet weights + custom classification head.
    """
    def __init__(self, num_classes=1):
        super().__init__()
        # Load pretrained EfficientNet-B4 from timm
        self.backbone = timm.create_model(
            'efficientnet_b4',
            pretrained=True,       # ImageNet pretrained weights
            num_classes=0,         # Remove default head
            global_pool='avg'
        )
        in_features = self.backbone.num_features  # 1792 for B4
        
        # Custom classification head for deepfake detection
        self.classifier = nn.Sequential(
            nn.Dropout(p=0.4),
            nn.Linear(in_features, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Dropout(p=0.3),
            nn.Linear(512, 128),
            nn.ReLU(),
            nn.Linear(128, num_classes)
        )
    
    def forward(self, x):
        features = self.backbone(x)
        logits = self.classifier(features)
        return logits

    def get_features(self, x):
        """For Grad-CAM feature extraction"""
        return self.backbone(x)


def load_model(weights_path: str = None, device: str = 'cpu') -> DeepfakeDetector:
    """
    Load the model. If weights_path is provided and exists, load fine-tuned weights.
    Otherwise uses ImageNet pretrained weights (will still work, lower accuracy).
    """
    model = DeepfakeDetector()
    
    if weights_path and Path(weights_path).exists():
        print(f"Loading fine-tuned weights from {weights_path}")
        checkpoint = torch.load(weights_path, map_location=device)
        model.load_state_dict(checkpoint['model_state_dict'])
    else:
        print("WARNING: No fine-tuned weights found. Using ImageNet pretrained only.")
        print("For real accuracy, fine-tune on FaceForensics++ (see train.py)")
    
    model.to(device)
    model.eval()
    return model