import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
        <p className="text-gray-400 text-xs">Frame {label}</p>
        <p className="text-white text-sm font-bold">{(val * 100).toFixed(1)}% fake prob</p>
      </div>
    )
  }
  return null
}

export default function FrameTimeline({ frameScores = [] }) {
  if (!frameScores.length) return null

  const data = frameScores.map((score, i) => ({ frame: i + 1, probability: score }))

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">
        Frame-by-Frame Analysis
        <span className="ml-2 text-xs text-gray-500 font-normal">{frameScores.length} frames</span>
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
          <XAxis
            dataKey="frame"
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            axisLine={{ stroke: '#374151' }}
            tickLine={false}
            label={{ value: 'Frame', position: 'insideBottom', fill: '#6B7280', fontSize: 11 }}
          />
          <YAxis
            domain={[0, 1]}
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={0.5}
            stroke="#EF4444"
            strokeDasharray="4 4"
            label={{ value: 'Threshold', fill: '#EF4444', fontSize: 10 }}
          />
          <Line
            type="monotone"
            dataKey="probability"
            stroke="#6366F1"
            strokeWidth={2}
            dot={{ fill: '#4F46E5', r: 3 }}
            activeDot={{ r: 5, fill: '#818CF8' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
