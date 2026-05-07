import { useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, CameraOff, Play, Square, User, AlertTriangle } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { analyzeFrame } from '../api/deepguard'
import { useToast } from '../components/ui/Toast'
import Badge from '../components/ui/Badge'

function OverlayBorder({ result }) {
  if (!result) return null
  if (!result.face_detected) {
    return (
      <div className="absolute inset-0 border-4 border-amber-400 rounded-xl pointer-events-none">
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-900/80 text-amber-300 px-3 py-1.5 rounded-lg text-sm font-semibold backdrop-blur-sm">
          No face detected
        </div>
      </div>
    )
  }
  const isFake = result.is_fake
  const score = ((isFake ? result.fake_probability : 1 - result.fake_probability) * 100).toFixed(0)
  return (
    <div className={`absolute inset-0 border-4 rounded-xl pointer-events-none ${isFake ? 'border-red-500' : 'border-emerald-500'}`}>
      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-lg text-sm font-bold backdrop-blur-sm ${isFake ? 'bg-red-900/80 text-red-300' : 'bg-emerald-900/80 text-emerald-300'}`}>
        {isFake ? `⚠ FAKE DETECTED (${score}%)` : `✓ REAL (${score}%)`}
      </div>
    </div>
  )
}

export default function WebcamPage() {
  const webcamRef = useRef(null)
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [frameCount, setFrameCount] = useState(0)
  const intervalRef = useRef(null)
  const toast = useToast()

  const startScanning = useCallback(() => {
    setIsScanning(true)
    setResult(null)
    setHistory([])
    setFrameCount(0)

    intervalRef.current = setInterval(async () => {
      if (!webcamRef.current) return
      const screenshot = webcamRef.current.getScreenshot()
      if (!screenshot) return

      const base64 = screenshot.replace(/^data:image\/\w+;base64,/, '')
      try {
        const { data } = await analyzeFrame(base64)
        setResult(data)
        setFrameCount((c) => c + 1)
        setHistory((prev) => [
          ...prev.slice(-9),
          { t: prev.length, score: data.authenticity_score },
        ])
      } catch (err) {
        if (err.isNetworkError) {
          toast('Backend offline — start the FastAPI server', 'error', 6000)
          stopScanning()
        }
      }
    }, 2000)
  }, [toast])

  const stopScanning = useCallback(() => {
    setIsScanning(false)
    clearInterval(intervalRef.current)
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <Camera className="w-6 h-6 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">Live Webcam Detection</h1>
        </div>
        <p className="text-gray-400 text-sm mb-8">
          Real-time frame analysis — camera feed is analyzed every 2 seconds
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Webcam */}
          <div className="lg:col-span-2">
            <div className="relative rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 aspect-video flex items-center justify-center">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                videoConstraints={{ facingMode: 'user' }}
              />
              {isScanning && <OverlayBorder result={result} />}
            </div>

            {/* Controls */}
            <div className="flex gap-3 mt-4">
              {!isScanning ? (
                <button
                  onClick={startScanning}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all"
                >
                  <Play className="w-5 h-5" />
                  Start Scanning
                </button>
              ) : (
                <button
                  onClick={stopScanning}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-900/50 hover:bg-red-900 border border-red-800 text-red-300 font-semibold rounded-xl transition-all"
                >
                  <Square className="w-5 h-5" />
                  Stop Scanning
                </button>
              )}
            </div>
          </div>

          {/* Live Stats Panel */}
          <div className="flex flex-col gap-4">
            {/* Current Score */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Authenticity Score</p>
              <AnimatePresence mode="wait">
                <motion.p
                  key={result?.authenticity_score ?? 'idle'}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-4xl font-black ${
                    !result
                      ? 'text-gray-600'
                      : result.authenticity_score > 65
                      ? 'text-emerald-400'
                      : result.authenticity_score >= 40
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {result ? `${result.authenticity_score.toFixed(0)}` : '--'}
                </motion.p>
              </AnimatePresence>
              <p className="text-gray-600 text-sm mt-1">/ 100</p>
            </div>

            {/* Face Detected */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Face Detected</p>
              {result ? (
                <Badge variant={result.face_detected ? 'real' : 'warning'}>
                  <User className="w-3 h-3" />
                  {result.face_detected ? 'Yes' : 'No'}
                </Badge>
              ) : (
                <span className="text-gray-600 text-sm">Waiting...</span>
              )}
            </div>

            {/* Frames analyzed */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Frames Analyzed</p>
              <p className="text-2xl font-bold text-indigo-400">{frameCount}</p>
            </div>

            {/* Sparkline */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Last 10 Readings</p>
              {history.length > 1 ? (
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={history}>
                    <XAxis dataKey="t" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip
                      content={({ active, payload }) =>
                        active && payload?.length ? (
                          <div className="bg-gray-800 border border-gray-700 px-2 py-1 rounded text-xs text-white">
                            {payload[0].value.toFixed(1)}
                          </div>
                        ) : null
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#6366F1"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-600 text-xs">
                  {isScanning ? 'Collecting data...' : 'Start scanning to see data'}
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
