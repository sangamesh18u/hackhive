from fastapi import FastAPI, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import uuid
import time
import os
import asyncio

# Import detection modules
from detection.ensemble import analyze_media

app = FastAPI(title="DeepGuard AI API", version="1.0.0")

# Allow CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for analysis jobs
analysis_jobs = {}

class AnalysisJob(BaseModel):
    id: str
    status: str
    progress: int
    results: Optional[Dict[str, Any]] = None

@app.get("/")
def read_root():
    return {"message": "DeepGuard AI Backend is running"}

async def process_media_task(job_id: str, file_path: str, filename: str):
    try:
        # Simulate initial processing
        analysis_jobs[job_id]["status"] = "processing"
        analysis_jobs[job_id]["progress"] = 10
        await asyncio.sleep(1)
        
        # Run the ensemble analysis
        results = await analyze_media(file_path, filename, lambda p: update_progress(job_id, p))
        
        analysis_jobs[job_id]["status"] = "completed"
        analysis_jobs[job_id]["progress"] = 100
        analysis_jobs[job_id]["results"] = results
        
    except Exception as e:
        analysis_jobs[job_id]["status"] = "failed"
        analysis_jobs[job_id]["results"] = {"error": str(e)}
        print(f"Error processing job {job_id}: {e}")

def update_progress(job_id: str, progress: int):
    if job_id in analysis_jobs:
        analysis_jobs[job_id]["progress"] = progress

@app.post("/api/v1/analyze")
async def upload_for_analysis(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    job_id = str(uuid.uuid4())
    
    # Save the uploaded file temporarily (in a real app, save to cloud storage or temp dir)
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, f"{job_id}_{file.filename}")
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    # Initialize job state
    analysis_jobs[job_id] = {
        "id": job_id,
        "status": "queued",
        "progress": 0,
        "results": None
    }
    
    # Start processing in the background
    background_tasks.add_task(process_media_task, job_id, file_path, file.filename)
    
    return {"job_id": job_id, "message": "Analysis started"}

@app.get("/api/v1/jobs/{job_id}", response_model=AnalysisJob)
def get_job_status(job_id: str):
    if job_id not in analysis_jobs:
        return {"id": job_id, "status": "not_found", "progress": 0}
    return analysis_jobs[job_id]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
