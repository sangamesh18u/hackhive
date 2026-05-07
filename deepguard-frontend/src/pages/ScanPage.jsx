import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ScanLine, Zap } from 'lucide-react'
import DropZone from '../components/analysis/DropZone'
import ProgressRing from '../components/ui/ProgressRing'
import Spinner from '../components/ui/Spinner'
import { analyzeFile, getJob } from '../api/deepguard'
import { useToast } from '../components/ui/Toast'

const STATUS_MESSAGES = [
  [0, 20, 'Uploading media...'],
  [20, 40, 'Detecting faces with MTCNN...'],
  [40, 70, 'Running EfficientNet-B4 classifier...'],
  [70, 90, 'Generating Grad-CAM heatmap...'],
  [90, 100, 'Finalizing results...'],
]

function getStatusMessage(progress) {
  for (const [min, max, msg] of STATUS_MESSAGES) {
    if (progress >= min && progress < max) return msg
  }
  return 'Finalizing results...'
}

export default function ScanPage() {
  const [file, setFile] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const navigate = useNavigate()
  const toast = useToast()

  const handleAnalyze = async () => {
    if (!file) return
    setAnalyzing(true)
    setProgress(0)

    try {
      const { data } = await analyzeFile(file)
      const { job_id } = data

      // Poll job status
      await new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const { data: job } = await getJob(job_id)
            setProgress(job.progress || 0)

            if (job.status === 'completed') {
              clearInterval(interval)
              resolve(job)
            } else if (job.status === 'failed') {
              clearInterval(interval)
              reject(new Error(job.error || 'Analysis failed'))
            }
          } catch (e) {
            clearInterval(interval)
            reject(e)
          }
        }, 2000)
      })

      setProgress(100)
      setTimeout(() => navigate(`/results/${job_id}`), 500)
    } catch (err) {
      setAnalyzing(false)
      setProgress(0)
      if (err.isNetworkError) {
        toast(
          'Backend offline — start the FastAPI server: uvicorn main:app --host 0.0.0.0 --port 8000',
          'error',
          8000
        )
      } else {
        toast(err.message || 'Analysis failed. Please try again.', 'error')
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <ScanLine className="w-6 h-6 text-indigo-400" />
          <h1 className="text-2xl font-bold text-white">Scan Media File</h1>
        </div>
        <p className="text-gray-400 text-sm mb-8">
          Upload an image or video to analyze for AI-generated manipulation
        </p>

        <DropZone
          file={file}
          onFile={setFile}
          onClear={() => {
            setFile(null)
            setProgress(0)
            setAnalyzing(false)
          }}
        />

        {/* Analyze button */}
        <AnimatePresence>
          {file && !analyzing && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={handleAnalyze}
              className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-900/40"
            >
              <Zap className="w-5 h-5" />
              Analyze for Deepfakes
            </motion.button>
          )}
        </AnimatePresence>

        {/* Progress */}
        <AnimatePresence>
          {analyzing && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-6"
            >
              <div className="flex items-center gap-5 mb-5">
                <ProgressRing progress={progress} size={80} />
                <div>
                  <p className="text-white font-semibold text-sm">{getStatusMessage(progress)}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Analysis in progress — please wait...
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {STATUS_MESSAGES.map(([min, , msg]) => (
                  <div
                    key={msg}
                    className={`text-center py-2 px-2 rounded-lg text-xs transition-all ${
                      progress >= min
                        ? 'bg-indigo-950/50 text-indigo-400 border border-indigo-800/40'
                        : 'bg-gray-800/40 text-gray-600'
                    }`}
                  >
                    {msg}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Backend offline hint */}
        <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Backend not running?</p>
          <code className="text-xs text-emerald-400 font-mono block">
            uvicorn main:app --host 0.0.0.0 --port 8000
          </code>
        </div>
      </motion.div>
    </div>
  )
}
