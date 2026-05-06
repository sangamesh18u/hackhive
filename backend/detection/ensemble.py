import asyncio
import random
import os
from typing import Callable, Dict, Any

from .spatial import analyze_spatial
from .temporal import analyze_temporal
from .biological import analyze_rppg
from .forensic import analyze_metadata
from explainability.gradcam import generate_heatmap

async def analyze_media(file_path: str, filename: str, progress_callback: Callable[[int], None]) -> Dict[str, Any]:
    """
    Coordinates the multi-modal detection engine.
    """
    is_video = filename.lower().endswith(('.mp4', '.avi', '.mov', '.webm'))
    
    progress_callback(20)
    await asyncio.sleep(0.5)
    
    # 1. Spatial Analysis (Frame-level)
    spatial_results = await analyze_spatial(file_path)
    progress_callback(40)
    
    # 2. Forensic Analysis (Metadata/EXIF)
    forensic_results = await analyze_metadata(file_path)
    progress_callback(50)
    
    temporal_results = {"score": 100, "flag": False, "details": "N/A for images"}
    bio_results = {"score": 100, "flag": False, "details": "N/A for images"}
    
    if is_video:
        # 3. Temporal Analysis (Video-level)
        temporal_results = await analyze_temporal(file_path)
        progress_callback(70)
        
        # 4. Biological Signal (rPPG)
        bio_results = await analyze_rppg(file_path)
        progress_callback(85)
    
    # Generate Explainability Heatmap (Grad-CAM simulation)
    heatmap_url = await generate_heatmap(file_path, spatial_results)
    progress_callback(95)
    
    # Ensemble Scoring Logic
    # Weights for the final score
    if is_video:
        w_spatial, w_temporal, w_bio, w_forensic = 0.35, 0.30, 0.25, 0.10
    else:
        w_spatial, w_temporal, w_bio, w_forensic = 0.70, 0.0, 0.0, 0.30

    final_score = (
        spatial_results["score"] * w_spatial +
        temporal_results["score"] * w_temporal +
        bio_results["score"] * w_bio +
        forensic_results["score"] * w_forensic
    )
    
    # Determine overall assessment
    is_fake = final_score < 65.0
    confidence = (100 - final_score) if is_fake else final_score
    
    # Format the explanation
    explanation_points = []
    if spatial_results["flag"]:
        explanation_points.append(spatial_results["details"])
    if is_video and temporal_results["flag"]:
        explanation_points.append(temporal_results["details"])
    if is_video and bio_results["flag"]:
        explanation_points.append(bio_results["details"])
    if forensic_results["flag"]:
        explanation_points.append(forensic_results["details"])
        
    if not explanation_points:
        explanation_points.append("No significant signs of manipulation detected.")

    return {
        "is_fake": is_fake,
        "authenticity_score": round(final_score, 1),
        "confidence": round(confidence, 1),
        "media_type": "video" if is_video else "image",
        "breakdown": {
            "spatial_consistency": round(spatial_results["score"], 1),
            "temporal_smoothness": round(temporal_results["score"], 1),
            "biological_signals": round(bio_results["score"], 1),
            "metadata_integrity": round(forensic_results["score"], 1)
        },
        "explanations": explanation_points,
        "heatmap_url": heatmap_url
    }
