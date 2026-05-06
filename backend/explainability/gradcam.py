import asyncio

async def generate_heatmap(file_path: str, spatial_results: dict):
    """
    Simulates Grad-CAM Explainable AI heatmap generation.
    Returns a mock URL or base64 string indicating where manipulation occurred.
    """
    await asyncio.sleep(0.8)
    
    if spatial_results["flag"]:
        # In a real app, this would return a generated heatmap image URL
        return "assets/heatmap_fake_mock.png"
    else:
        return "assets/heatmap_real_mock.png"
