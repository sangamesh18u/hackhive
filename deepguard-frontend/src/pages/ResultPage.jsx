import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ScanLine, AlertCircle, Loader2 } from 'lucide-react'
import { useAnalysis } from '../hooks/useAnalysis'
import ResultCard from '../components/analysis/ResultCard'
import HeatmapViewer from '../components/analysis/HeatmapViewer'
import BreakdownChart from '../components/analysis/BreakdownChart'
import FrameTimeline from '../components/analysis/FrameTimeline'
import Spinner from '../components/ui/Spinner'
import ProgressRing from '../components/ui/ProgressRing'

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

export default function ResultPage() {
  const { jobId } = useParams()
  const { job, loading, error } = useAnalysis(jobId)

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Analysis Failed</h2>
        <p className="text-gray-400 mb-6">{error}</p>
        {error.includes('Backend offline') && (
          <code className="block text-emerald-400 font-mono text-sm bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 mb-6">
            uvicorn main:app --host 0.0.0.0 --port 8000
          </code>
        )}
        <Link
          to="/scan"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
        >
          <ScanLine className="w-4 h-4" />
          Try Again
        </Link>
      </div>
    )
  }

  if (loading && (!job || job.status !== 'completed')) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <ProgressRing progress={job?.progress || 0} size={100} />
          <p className="text-white font-semibold mt-4">{getStatusMessage(job?.progress || 0)}</p>
          <p className="text-gray-500 text-sm mt-1">Job ID: {jobId}</p>
          <div className="mt-4 h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
              animate={{ width: `${job?.progress || 0}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (job?.status === 'failed') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Job Failed</h2>
        <p className="text-gray-400 mb-6">{job.error || 'Unknown error occurred'}</p>
        <Link to="/scan" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors">
          <ScanLine className="w-4 h-4" />
          Scan Another File
        </Link>
      </div>
    )
  }

  const results = job?.results

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-1">Analysis Results</h1>
        <p className="text-gray-500 text-sm mb-8">Job ID: {jobId}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            <ResultCard results={results} />

            {/* Explanations */}
            {results?.explanations?.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
                  Analysis Insights
                </h3>
                <ul className="flex flex-col gap-3">
                  {results.explanations.map((exp, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-3 text-sm text-gray-300"
                    >
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400 text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      {exp}
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            {results?.heatmap_url && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <HeatmapViewer heatmapUrl={results.heatmap_url} />
              </div>
            )}

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <BreakdownChart breakdown={results?.breakdown} />
            </div>

            {results?.frame_scores?.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <FrameTimeline frameScores={results.frame_scores} />
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex justify-center">
          <Link
            to="/scan"
            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-900/40"
          >
            <ScanLine className="w-5 h-5" />
            Scan Another File
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
