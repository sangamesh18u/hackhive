import { motion } from 'framer-motion'

export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <motion.div
      className={`${sizes[size]} rounded-full border-2 border-indigo-800 border-t-indigo-400 ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
  )
}
