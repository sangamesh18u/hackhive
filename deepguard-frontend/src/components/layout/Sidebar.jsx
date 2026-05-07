import { NavLink } from 'react-router-dom'
import { Home, ScanLine, Camera, Link2, Shield } from 'lucide-react'
import { motion } from 'framer-motion'

const navLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/scan', label: 'Scan File', icon: ScanLine },
  { to: '/webcam', label: 'Live Webcam', icon: Camera },
  { to: '/social', label: 'Social URL', icon: Link2 },
]

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-gray-950 border-r border-gray-800 pt-6 pb-4 px-3">
      <div className="flex items-center gap-2 px-3 mb-8">
        <Shield className="w-5 h-5 text-indigo-400" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Navigation</span>
      </div>
      <nav className="flex flex-col gap-1">
        {navLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  className={isActive ? 'text-indigo-400' : 'text-gray-500 group-hover:text-gray-300'}
                >
                  <Icon className="w-4 h-4" />
                </motion.div>
                {label}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto px-3">
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
          <p className="text-xs text-gray-500 mb-1">Powered by</p>
          <p className="text-xs font-semibold text-indigo-400">EfficientNet-B4</p>
          <p className="text-xs text-gray-500">+ MTCNN + Grad-CAM</p>
        </div>
      </div>
    </aside>
  )
}
