import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, Zap, Play, Globe, Share2 } from 'lucide-react'
import { analyzeUrl, getJob } from '../api/deepguard'
import { useToast } from '../components/ui/Toast'
import ProgressRing from '../components/ui/ProgressRing'

const PLATFORMS = [
  { name: 'YouTube', icon: Play, color: 'text-red-400', domain: 'youtube.com' },
  { name: 'TikTok', icon: Link2, color: 'text-pink-400', domain: 'tiktok.com' },
  { name: 'Instagram', icon: Globe, color: 'text-purple-400', domain: 'instagram.com' },
  { name: 'Twitter/X', icon: Share2, color: 'text-sky-400', domain: 'x.com' },
]

const SUPPORTED_DOMAINS = ['youtube.com', 'youtu.be', 'tiktok.com', 'instagram.com', 'twitter.com', 'x.com']

function detectPlatform(url) {
  try {
    const { hostname } = new URL(url)
    return SUPPORTED_DOMAINS.find((d) => hostname.includes(d)) || null
  } catch {
    return null
  }
}

const STATUS_MESSAGES = [
  [0, 20, 'Downloading media...'],
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

export default function SocialPage() {
  const [url, setUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [videoTitle, setVideoTitle] = useState('')
  const [urlError, setUrlError] = useState('')
  const navigate = useNavigate()
  const toast = useToast()

  const handleAnalyze = async () => {
    setUrlError('')
    if (!url.trim()) {
      setUrlError('Please enter a URL')
      return
    }
    const platform = detectPlatform(url)
    if (!platform) {
      setUrlError('Supported: YouTube, TikTok, Instagram, Twitter/X')
      return
    }

    setAnalyzing(true)
    setProgress(0)
    setVideoTitle('')

    try {
      const { data } = await analyzeUrl(url)
      const { job_id, title } = data
      if (title) setVideoTitle(title)

      await new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const { data: job } = await getJob(job_id)
            setProgress(job.progress || 0)
            if (job.results?.title || job.title) setVideoTitle(job.results?.title || job.title)

            if (job.status === 'completed') {
              clearInterval(interval)
              resolve()
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
      setTimeout(() => navigate(`/results/${data.job_id}`), 500)
    } catch (err) {
      setAnalyzing(false)
      setProgress(0)
      if (err.isNetworkError) {
        toast('Backend offline — start the FastAPI server', 'error', 8000)
      } else {
        toast(err.message || 'Failed to analyze URL', 'error')
      }
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Link2 className="w-6 h-6 text-pink-400" />
          <h1 className="text-2xl font-bold text-white">Social Media Analysis</h1>
        </div>
        <p className="text-gray-400 text-sm mb-8">
          Paste a social media URL to analyze the video for deepfakes
        </p>

        {/* URL Input */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-3">Video URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setUrlError('') }}
              placeholder="https://youtube.com/watch?v=..."
              disabled={analyzing}
              className="flex-1 bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            />
          </div>
          {urlError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-xs mt-2 flex items-center gap-1"
            >
              ⚠ {urlError}
            </motion.p>
          )}

          {/* Platform icons */}
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Supported platforms</p>
            <div className="flex items-center gap-4">
              {PLATFORMS.map(({ name, icon: Icon, color }) => (
                <div key={name} className="flex items-center gap-1.5" title={name}>
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-xs text-gray-400">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={analyzing || !url.trim()}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-900/40"
        >
          <Zap className="w-5 h-5" />
          {analyzing ? 'Analyzing...' : 'Analyze URL'}
        </button>

        {/* Progress */}
        <AnimatePresence>
          {analyzing && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-6"
            >
              <div className="flex items-center gap-5 mb-4">
                <ProgressRing progress={progress} size={72} />
                <div>
                  {videoTitle && (
                    <p className="text-indigo-400 text-xs font-medium mb-1 truncate max-w-xs">
                      📺 {videoTitle}
                    </p>
                  )}
                  <p className="text-white font-semibold text-sm">{getStatusMessage(progress)}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Processing media from the internet...</p>
                </div>
              </div>

              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Backend hint */}
        <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Backend not running?</p>
          <code className="text-xs text-emerald-400 font-mono">
            uvicorn main:app --host 0.0.0.0 --port 8000
          </code>
        </div>
      </motion.div>
    </div>
  )
}
