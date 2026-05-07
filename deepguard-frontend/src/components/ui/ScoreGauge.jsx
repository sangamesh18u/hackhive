import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

function getColor(score) {
  if (score < 40) return '#EF4444'
  if (score <= 65) return '#F59E0B'
  return '#10B981'
}

export default function ScoreGauge({ score = 0, size = 160 }) {
  const [animated, setAnimated] = useState(0)
  const radius = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  const color = getColor(score)
  const offset = circumference - (animated / 100) * circumference

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(score), 100)
    return () => clearTimeout(timer)
  }, [score])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1F2937"
            strokeWidth="12"
          />
          {/* Animated progress ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        {/* Center score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-black"
            style={{ color }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {Math.round(animated)}
          </motion.span>
          <span className="text-xs text-gray-500 font-medium">/ 100</span>
        </div>
      </div>
      <span className="text-sm text-gray-400 font-medium">Authenticity Score</span>
    </div>
  )
}
