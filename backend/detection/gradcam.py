# backend/detection/gradcam.py
import torch
import torch.nn.functional as F
import numpy as np
import cv2
import os
from pathlib import Path

OUTPUT_DIR = "assets"

class GradCAM:
    def __init__(self, model, target_layer_name='backbone.conv_head'):
        self.model = model
        self.gradients = None
        self.activations = None
        self._register_hooks(target_layer_name)
    
    def _register_hooks(self, layer_name):
        # Walk the model to find the target layer
        layer = dict(self.model.named_modules()).get(layer_name)
        if layer is None:
            # Fallback: use last conv layer of backbone
            for name, module in self.model.named_modules():
                if isinstance(module, torch.nn.Conv2d):
                    layer = module
            print(f"Using fallback conv layer for Grad-CAM")
        
        def forward_hook(module, input, output):
            self.activations = output.detach()
        
        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0].detach()
        
        layer.register_forward_hook(forward_hook)
        layer.register_full_backward_hook(backward_hook)
    
    def generate(self, input_tensor, target_class=0):
        self.model.zero_grad()
        output = self.model(input_tensor)
        
        # Backprop w.r.t. the fake class output
        output[:, target_class].backward()
        
        if self.gradients is None or self.activations is None:
            return None
        
        # Global average pool gradients
        weights = self.gradients.mean(dim=[2, 3], keepdim=True)
        cam = (weights * self.activations).sum(dim=1, keepdim=True)
        cam = F.relu(cam)
        cam = F.interpolate(cam, size=(224, 224), mode='bilinear', align_corners=False)
        
        # Normalize to [0, 1]
        cam = cam.squeeze().cpu().numpy()
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
        return cam


def generate_gradcam(model, face_tensor: torch.Tensor, job_id: str, device: str) -> str:
    """
    Generate and save a Grad-CAM heatmap overlay.
    Returns relative URL path.
    """
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    
    try:
        # Need gradient computation
        face_tensor = face_tensor.to(device).requires_grad_(True)
        
        gradcam = GradCAM(model)
        cam = gradcam.generate(face_tensor)
        
        if cam is None:
            return _generate_placeholder_heatmap(job_id)
        
        # Create heatmap overlay on the input image
        # Denormalize input tensor for visualization
        mean = np.array([0.485, 0.456, 0.406])
        std  = np.array([0.229, 0.224, 0.225])
        
        img = face_tensor.squeeze().cpu().detach().numpy().transpose(1, 2, 0)
        img = (img * std + mean)
        img = np.clip(img * 255, 0, 255).astype(np.uint8)
        img_bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        
        # Apply jet colormap to CAM
        heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
        
        # Blend
        overlay = cv2.addWeighted(img_bgr, 0.5, heatmap, 0.5, 0)
        
        filename = f"heatmap_{job_id}.png"
        save_path = os.path.join(OUTPUT_DIR, filename)
        cv2.imwrite(save_path, overlay)
        
        return f"assets/{filename}?t={job_id}"
    
    except Exception as e:
        print(f"Grad-CAM failed: {e}")
        return _generate_placeholder_heatmap(job_id)


def _generate_placeholder_heatmap(job_id: str) -> str:
    """Create a colored placeholder if Grad-CAM fails."""
    Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    filename = f"heatmap_{job_id}.png"
    save_path = os.path.join(OUTPUT_DIR, filename)
    
    # Generate a simple gradient heatmap
    gradient = np.zeros((224, 224, 3), dtype=np.uint8)
    for i in range(224):
        gradient[:, i] = [int(255 * i / 224), 0, int(255 * (1 - i / 224))]
    cv2.imwrite(save_path, gradient)
    return f"assets/{filename}"