const API_BASE = "http://localhost:8000/api/v1";

class DeepGuardAnalyzer {
    constructor() {
        this.jobId = null;
        this.pollingInterval = null;
    }

    async uploadMedia(file) {
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(`${API_BASE}/analyze`, {
                method: "POST",
                body: formData
            });
            
            if (!response.ok) throw new Error("Upload failed");
            
            const data = await response.json();
            this.jobId = data.job_id;
            return data;
        } catch (error) {
            console.error("Error uploading media:", error);
            throw error;
        }
    }

    async checkStatus() {
        if (!this.jobId) return null;

        try {
            const response = await fetch(`${API_BASE}/jobs/${this.jobId}`);
            if (!response.ok) throw new Error("Status check failed");
            return await response.json();
        } catch (error) {
            console.error("Error checking status:", error);
            throw error;
        }
    }

    startPolling(onProgress, onComplete, onError) {
        if (this.pollingInterval) clearInterval(this.pollingInterval);

        this.pollingInterval = setInterval(async () => {
            try {
                const status = await this.checkStatus();
                
                if (status) {
                    onProgress(status.progress);
                    
                    if (status.status === "completed") {
                        clearInterval(this.pollingInterval);
                        onComplete(status.results);
                    } else if (status.status === "failed") {
                        clearInterval(this.pollingInterval);
                        onError(status.results?.error || "Unknown error occurred");
                    }
                }
            } catch (error) {
                clearInterval(this.pollingInterval);
                onError(error.message);
            }
        }, 500); // Poll every 500ms
    }
}

window.analyzer = new DeepGuardAnalyzer();
