import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, Layers } from 'lucide-react'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function HeatmapViewer({ heatmapUrl }) {
  const [view, setView] = useState('heatmap')

  if (!heatmapUrl) return null

  const fullUrl = heatmapUrl.startsWith('http') ? heatmapUrl : `${BASE_URL}/${heatmapUrl}`

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Grad-CAM Heatmap</h3>
        <div className="flex gap-1 p-1 bg-gray-800 rounded-lg">
          <button
            onClick={() => setView('original')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              view === 'original'
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Eye className="w-3 h-3" />
            Original
          </button>
          <button
            onClick={() => setView('heatmap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              view === 'heatmap'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            Heatmap
          </button>
        </div>
      </div>

      <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-gray-900 aspect-video flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.img
            key={view}
            src={view === 'heatmap' ? fullUrl : fullUrl}
            alt={view === 'heatmap' ? 'Grad-CAM Heatmap' : 'Original'}
            className={`w-full h-full object-contain transition-all ${
              view === 'heatmap' ? '' : 'filter saturate-0'
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        </AnimatePresence>
        <div className="absolute bottom-3 left-3">
          <span className="text-xs bg-black/60 text-red-400 px-2 py-1 rounded-md backdrop-blur-sm border border-red-900/50">
            🔴 Red regions = highest manipulation probability
          </span>
        </div>
      </div>
    </div>
  )
}
