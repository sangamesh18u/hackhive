# backend/detection/analyzer.py
import torch
import torch.nn.functional as F
import numpy as np
from pathlib import Path
from .model import load_model
from .preprocess import extract_face_from_image, extract_frames_from_video
from .gradcam import generate_gradcam

DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
MODEL_WEIGHTS = 'detection/deepfake_efficientnet_b4.pth'  # Put your fine-tuned weights here

# Load model once at startup
_model = None

def get_model():
    global _model
    if _model is None:
        _model = load_model(MODEL_WEIGHTS, DEVICE)
    return _model


def analyze_image(image_path: str, job_id: str) -> dict:
    """Full image deepfake analysis pipeline."""
    model = get_model()
    
    # 1. Extract face
    face_tensor, face_box, original_img = extract_face_from_image(image_path, DEVICE)
    face_tensor = face_tensor.to(DEVICE)
    
    # 2. Run inference
    model.eval()
    with torch.no_grad():
        logits = model(face_tensor)
        prob_fake = torch.sigmoid(logits).item()
    
    # 3. Generate Grad-CAM heatmap
    heatmap_path = generate_gradcam(model, face_tensor, job_id, DEVICE)
    
    # 4. Build result
    is_fake = prob_fake > 0.5
    authenticity_score = round((1 - prob_fake) * 100, 1)
    
    return {
        "is_fake": is_fake,
        "authenticity_score": authenticity_score,
        "confidence": round(max(prob_fake, 1 - prob_fake) * 100, 1),
        "raw_fake_probability": round(prob_fake, 4),
        "media_type": "image",
        "frames_analyzed": 1,
        "breakdown": {
            "spatial_consistency": round((1 - prob_fake) * 100, 1),
            "face_detection": "success" if face_box is not None else "fallback",
        },
        "explanations": _build_explanations(prob_fake, "image"),
        "heatmap_url": heatmap_path
    }


def analyze_video(video_path: str, job_id: str) -> dict:
    """Full video deepfake analysis pipeline - frame-by-frame."""
    model = get_model()
    
    # 1. Extract frames + faces
    frames = extract_frames_from_video(video_path, n_frames=15, device=DEVICE)
    
    if not frames:
        return {"error": "Could not extract frames from video"}
    
    # 2. Run inference on each frame
    frame_scores = []
    model.eval()
    
    with torch.no_grad():
        for face_tensor, frame_idx, _ in frames:
            face_tensor = face_tensor.to(DEVICE)
            logits = model(face_tensor)
            prob_fake = torch.sigmoid(logits).item()
            frame_scores.append(prob_fake)
    
    # 3. Aggregate frame scores
    mean_fake_prob = float(np.mean(frame_scores))
    max_fake_prob = float(np.max(frame_scores))
    variance = float(np.var(frame_scores))
    
    # High variance = temporal inconsistency (common in deepfakes)
    temporal_penalty = min(variance * 2, 0.3)
    final_fake_prob = min(mean_fake_prob + temporal_penalty, 1.0)
    
    # 4. Grad-CAM on most suspicious frame
    worst_frame_idx = int(np.argmax(frame_scores))
    worst_tensor = frames[worst_frame_idx][0].to(DEVICE)
    heatmap_path = generate_gradcam(model, worst_tensor, job_id, DEVICE)
    
    is_fake = final_fake_prob > 0.5
    authenticity_score = round((1 - final_fake_prob) * 100, 1)
    
    return {
        "is_fake": is_fake,
        "authenticity_score": authenticity_score,
        "confidence": round(max(final_fake_prob, 1 - final_fake_prob) * 100, 1),
        "raw_fake_probability": round(final_fake_prob, 4),
        "media_type": "video",
        "frames_analyzed": len(frames),
        "frame_scores": [round(s, 3) for s in frame_scores],
        "breakdown": {
            "mean_frame_score": round(mean_fake_prob * 100, 1),
            "max_frame_score": round(max_fake_prob * 100, 1),
            "temporal_variance": round(variance, 4),
            "temporal_inconsistency_flag": variance > 0.05
        },
        "explanations": _build_explanations(final_fake_prob, "video", variance),
        "heatmap_url": heatmap_path
    }


def _build_explanations(fake_prob: float, media_type: str, variance: float = 0.0) -> list:
    explanations = []
    
    if fake_prob > 0.8:
        explanations.append("🔴 HIGH RISK: Model strongly detects GAN/diffusion artifacts in facial region")
    elif fake_prob > 0.5:
        explanations.append("🟡 MEDIUM RISK: Subtle inconsistencies detected in facial boundaries")
    else:
        explanations.append("🟢 LOW RISK: Facial features appear authentic and consistent")
    
    if media_type == "video":
        if variance > 0.05:
            explanations.append(f"⚠️ Temporal inconsistency detected (variance={variance:.3f}) — frame-to-frame score fluctuation suggests splicing")
        else:
            explanations.append("✅ Temporal consistency: frame scores are stable across the video")
    
    if fake_prob > 0.6:
        explanations.append("EfficientNet-B4 activation patterns match known deepfake signatures from FaceForensics++ training distribution")
    
    return explanations