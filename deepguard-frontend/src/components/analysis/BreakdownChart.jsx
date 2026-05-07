import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

function getBarColor(value) {
  if (value > 65) return '#10B981'
  if (value >= 40) return '#F59E0B'
  return '#EF4444'
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
        <p className="text-white text-sm font-semibold">{val.toFixed(1)}</p>
        <p className="text-gray-400 text-xs">{payload[0].name}</p>
      </div>
    )
  }
  return null
}

export default function BreakdownChart({ breakdown = {} }) {
  const data = [
    { name: 'AI Model', value: breakdown.ai_model_score ?? 0 },
    { name: 'Face Quality', value: breakdown.face_quality_score ?? 0 },
    { name: 'Temporal', value: breakdown.temporal_consistency_score ?? 0 },
  ]

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">Detection Breakdown</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            axisLine={{ stroke: '#374151' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1F2937', radius: 4 }} />
          <Bar dataKey="value" name="Score" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.value)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
