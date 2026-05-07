# backend/detection/preprocess.py
import cv2
import numpy as np
from PIL import Image
import torch
from torchvision import transforms
from facenet_pytorch import MTCNN

# Standard ImageNet normalization
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

# Initialize MTCNN face detector (runs once)
_mtcnn = None

def get_mtcnn(device='cpu'):
    global _mtcnn
    if _mtcnn is None:
        _mtcnn = MTCNN(
            image_size=224,
            margin=30,
            min_face_size=80,
            keep_all=False,
            device=device,
            post_process=False
        )
    return _mtcnn

def get_transform(train=False):
    if train:
        return transforms.Compose([
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.RandomRotation(10),
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD)
        ])
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD)
    ])

def extract_face_from_image(image_path: str, device='cpu') -> tuple:
    """
    Extract face from image using MTCNN.
    Returns (face_tensor, face_box, original_image)
    """
    img = Image.open(image_path).convert('RGB')
    mtcnn = get_mtcnn(device)
    
    # Detect face
    face_tensor, prob = mtcnn(img, return_prob=True)
    boxes, _ = mtcnn.detect(img)
    
    if face_tensor is None or prob < 0.9:
        # Fallback: use full image if no face detected
        print("No face detected, using full image")
        transform = get_transform()
        face_tensor = transform(img).unsqueeze(0)
        return face_tensor, None, img
    
    # Normalize for model input
    transform = get_transform()
    face_pil = transforms.ToPILImage()(face_tensor / 255.0)
    face_input = transform(face_pil).unsqueeze(0)
    
    return face_input, boxes[0] if boxes is not None else None, img


def extract_frames_from_video(video_path: str, n_frames: int = 15, device='cpu') -> list:
    """
    Extract n evenly-spaced frames from video, detect faces in each.
    Returns list of (face_tensor, frame_index, original_frame)
    """
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    if total_frames == 0:
        cap.release()
        return []
    
    # Sample frames evenly
    indices = np.linspace(0, total_frames - 1, n_frames, dtype=int)
    results = []
    mtcnn = get_mtcnn(device)
    transform = get_transform()
    
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            continue
        
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(frame_rgb)
        
        face_tensor, prob = mtcnn(pil_img, return_prob=True)
        
        if face_tensor is not None and prob > 0.85:
            face_pil = transforms.ToPILImage()(face_tensor / 255.0)
            face_input = transform(face_pil).unsqueeze(0)
        else:
            # Use center crop as fallback
            face_input = transform(pil_img).unsqueeze(0)
        
        results.append((face_input, int(idx), frame_rgb))
    
    cap.release()
    return results