import { motion } from 'framer-motion'
import { ShieldX, ShieldCheck, AlertTriangle } from 'lucide-react'
import ScoreGauge from '../ui/ScoreGauge'
import Badge from '../ui/Badge'

export default function ResultCard({ results }) {
  if (!results) return null

  const { is_fake, authenticity_score, confidence, raw_fake_probability, frames_analyzed, media_type } = results

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`rounded-2xl border p-6 ${
        is_fake
          ? 'bg-red-950/20 border-red-800/50'
          : 'bg-emerald-950/20 border-emerald-800/50'
      }`}
    >
      {/* Verdict Banner */}
      <div className={`flex items-center gap-3 mb-6 p-4 rounded-xl ${
        is_fake ? 'bg-red-950/50' : 'bg-emerald-950/50'
      }`}>
        {is_fake ? (
          <ShieldX className="w-8 h-8 text-red-400 flex-shrink-0" />
        ) : (
          <ShieldCheck className="w-8 h-8 text-emerald-400 flex-shrink-0" />
        )}
        <div>
          <h2 className={`text-xl font-black tracking-wide ${is_fake ? 'text-red-400' : 'text-emerald-400'}`}>
            {is_fake ? '⚠ DEEPFAKE DETECTED' : '✓ AUTHENTIC MEDIA'}
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {is_fake
              ? 'AI manipulation signatures detected in this media'
              : 'No manipulation artifacts detected'}
          </p>
        </div>
      </div>

      {/* Score + Stats */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <ScoreGauge score={authenticity_score} size={160} />

        <div className="flex-1 grid grid-cols-2 gap-4 w-full">
          <StatBox
            label="Confidence"
            value={`${confidence.toFixed(1)}%`}
            color="text-indigo-400"
          />
          <StatBox
            label="Fake Probability"
            value={`${(raw_fake_probability * 100).toFixed(1)}%`}
            color={is_fake ? 'text-red-400' : 'text-emerald-400'}
          />
          <StatBox
            label="Media Type"
            value={<Badge variant={media_type === 'video' ? 'processing' : 'default'}>{media_type}</Badge>}
          />
          {frames_analyzed > 0 && (
            <StatBox
              label="Frames Analyzed"
              value={frames_analyzed}
              color="text-violet-400"
            />
          )}
        </div>
      </div>
    </motion.div>
  )
}

function StatBox({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1 uppercase tracking-widest">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}
