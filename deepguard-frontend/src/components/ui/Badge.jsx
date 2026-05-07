const variants = {
  fake: 'bg-red-950/50 text-red-400 border-red-800/50',
  real: 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50',
  processing: 'bg-blue-950/50 text-blue-400 border-blue-800/50',
  error: 'bg-orange-950/50 text-orange-400 border-orange-800/50',
  warning: 'bg-amber-950/50 text-amber-400 border-amber-800/50',
  default: 'bg-gray-800 text-gray-300 border-gray-700',
}

export default function Badge({ variant = 'default', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border uppercase tracking-wide ${variants[variant] || variants.default} ${className}`}
    >
      {children}
    </span>
  )
}
