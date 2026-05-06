document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const progressContainer = document.getElementById('progress-container');
    const resultsContainer = document.getElementById('results-container');
    const progressFill = document.getElementById('progress-fill');
    const progressStatus = document.getElementById('progress-status');
    
    // UI Elements for Results
    const scoreCircle = document.getElementById('score-circle');
    const scoreText = document.getElementById('score-text');
    const verdictText = document.getElementById('verdict-text');
    const resultBadge = document.getElementById('result-badge');
    const explanationsList = document.getElementById('explanations-list');
    
    // Breakdown Elements
    const spatialScore = document.getElementById('spatial-score');
    const temporalScore = document.getElementById('temporal-score');
    const bioScore = document.getElementById('bio-score');
    const metaScore = document.getElementById('meta-score');
    
    // XAI Elements
    const heatmapImg = document.getElementById('heatmap-img');
    const heatmapPlaceholder = document.getElementById('heatmap-placeholder');

    // Drag and Drop Handlers
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            handleFile(this.files[0]);
        }
    });

    // Demo Buttons
    document.querySelectorAll('.demo-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const type = btn.getAttribute('data-type');
            
            // Create a fake File object to trigger the flow
            const filename = type === 'fake' ? 'deepfake_sample.mp4' : 'authentic_sample.mp4';
            const blob = new Blob(["demo content"], { type: "video/mp4" });
            const fakeFile = new File([blob], filename, { type: "video/mp4" });
            
            handleFile(fakeFile);
        });
    });

    async function handleFile(file) {
        // UI Reset
        resultsContainer.classList.add('hidden');
        dropZone.querySelector('.upload-content').classList.add('hidden');
        progressContainer.classList.remove('hidden');
        
        progressFill.style.width = '0%';
        progressStatus.textContent = 'Uploading to DeepGuard Servers...';

        try {
            await window.analyzer.uploadMedia(file);
            
            window.analyzer.startPolling(
                (progress) => {
                    progressFill.style.width = `${progress}%`;
                    updateProgressText(progress);
                },
                (results) => {
                    progressFill.style.width = '100%';
                    progressStatus.textContent = 'Analysis Complete!';
                    setTimeout(() => displayResults(results), 500);
                },
                (error) => {
                    progressStatus.textContent = `Error: ${error}`;
                    progressStatus.style.color = 'var(--accent-red)';
                }
            );

        } catch (error) {
            progressStatus.textContent = `Error: ${error.message}`;
            progressStatus.style.color = 'var(--accent-red)';
        }
    }

    function updateProgressText(progress) {
        if (progress < 20) progressStatus.textContent = "Initializing Spatial Transformers...";
        else if (progress < 40) progressStatus.textContent = "Analyzing frame-level textures (EfficientNet)...";
        else if (progress < 60) progressStatus.textContent = "Extracting EXIF metadata and forensic signatures...";
        else if (progress < 80) progressStatus.textContent = "Running Temporal 3D-CNN across video frames...";
        else if (progress < 95) progressStatus.textContent = "Detecting rPPG biological pulse signals...";
        else progressStatus.textContent = "Generating Explainable AI Heatmaps...";
    }

    function displayResults(results) {
        // Hide upload, show results
        progressContainer.classList.add('hidden');
        dropZone.classList.add('hidden');
        resultsContainer.classList.remove('hidden');

        // Animate Circle
        const offset = 100 - results.authenticity_score;
        scoreCircle.style.strokeDasharray = `${results.authenticity_score}, 100`;
        
        // Count up animation
        animateValue(scoreText, 0, results.authenticity_score, 1500, "%");

        // Styling based on result
        scoreCircle.classList.remove('safe', 'danger');
        resultBadge.classList.remove('safe', 'danger');
        
        if (results.is_fake) {
            scoreCircle.classList.add('danger');
            resultBadge.classList.add('danger');
            resultBadge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> MANIPULATION DETECTED';
            verdictText.textContent = `High probability of synthetic manipulation (${results.confidence}% confidence).`;
        } else {
            scoreCircle.classList.add('safe');
            resultBadge.classList.add('safe');
            resultBadge.innerHTML = '<i class="fa-solid fa-shield-check"></i> AUTHENTIC MEDIA';
            verdictText.textContent = `Media appears to be authentic (${results.confidence}% confidence).`;
        }

        // Breakdown scores
        animateValue(spatialScore, 0, results.breakdown.spatial_consistency, 1000);
        animateValue(temporalScore, 0, results.breakdown.temporal_smoothness, 1200);
        animateValue(bioScore, 0, results.breakdown.biological_signals, 1400);
        animateValue(metaScore, 0, results.breakdown.metadata_integrity, 1600);

        // N/A handling for images
        if (results.media_type === "image") {
            document.getElementById('temporal-score').textContent = "N/A";
            document.getElementById('bio-score').textContent = "N/A";
        }

        // Explanations
        explanationsList.innerHTML = '';
        results.explanations.forEach(exp => {
            const item = document.createElement('div');
            item.className = 'explanation-item';
            
            let icon = 'fa-info-circle';
            let color = 'var(--text-secondary)';
            
            if (exp.includes('Fail') || exp.includes('Unnatural') || exp.includes('Missing') || exp.includes('Irregular')) {
                icon = 'fa-exclamation-circle';
                color = 'var(--accent-red)';
            } else if (exp.includes('Consistent') || exp.includes('Smooth') || exp.includes('Original')) {
                icon = 'fa-check-circle';
                color = 'var(--accent-green)';
            }

            item.innerHTML = `
                <i class="fa-solid ${icon}" style="color: ${color}"></i>
                <p>${exp}</p>
            `;
            explanationsList.appendChild(item);
        });

        // XAI Heatmap
        if (results.heatmap_url) {
            heatmapPlaceholder.style.display = 'none';
            heatmapImg.style.display = 'block';
            
            // Add cache buster and ensure path is correct
            const imgUrl = results.heatmap_url + '?t=' + new Date().getTime();
            heatmapImg.src = imgUrl;
            document.getElementById('heatmap-preview-side').src = imgUrl;
            
            // Set a dummy original for comparison (in a real app this would be the actual video frame)
            document.getElementById('original-preview').src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300';
        }
    }

    // XAI Tab Switching Logic
    document.querySelectorAll('.xai-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const view = tab.getAttribute('data-view');
            
            // UI Toggle
            document.querySelectorAll('.xai-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const heatmapCont = document.querySelector('.heatmap-container');
            const comparisonCont = document.getElementById('comparison-view');
            
            if (view === 'heatmap') {
                heatmapCont.classList.remove('hidden');
                comparisonCont.classList.add('hidden');
            } else {
                heatmapCont.classList.add('hidden');
                comparisonCont.classList.remove('hidden');
            }
        });
    });

    function animateValue(obj, start, end, duration, suffix = "") {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Ease out quad
            const easeOut = progress * (2 - progress);
            obj.innerHTML = (start + easeOut * (end - start)).toFixed(1) + suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }
});
