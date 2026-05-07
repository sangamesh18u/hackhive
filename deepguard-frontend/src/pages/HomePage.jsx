import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ScanLine, Camera, Link2, Zap, Shield, Activity } from 'lucide-react'

const stats = [
  { value: '99.2%', label: 'Detection Accuracy', icon: Activity },
  { value: '< 3s', label: 'Analysis Time', icon: Zap },
  { value: '4 Vectors', label: 'Detection Methods', icon: Shield },
]

const features = [
  {
    icon: ScanLine,
    title: 'Upload Media',
    description:
      'Drag & drop images or videos. Our EfficientNet-B4 classifier analyzes each frame for manipulation artifacts with Grad-CAM visualization.',
    link: '/scan',
    cta: 'Start Scanning',
    gradient: 'from-indigo-600/20 to-violet-600/10',
    border: 'border-indigo-800/40',
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-950/60',
  },
  {
    icon: Camera,
    title: 'Live Webcam',
    description:
      'Real-time deepfake detection from your camera. Analyzes frames every 2 seconds with instant overlay feedback and live authenticity scores.',
    link: '/webcam',
    cta: 'Open Camera',
    gradient: 'from-violet-600/20 to-purple-600/10',
    border: 'border-violet-800/40',
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-950/60',
  },
  {
    icon: Link2,
    title: 'Social Media URL',
    description:
      'Paste a YouTube, TikTok, Instagram, or Twitter/X URL. We download and analyze the media automatically in the cloud.',
    link: '/social',
    cta: 'Analyze URL',
    gradient: 'from-pink-600/20 to-rose-600/10',
    border: 'border-pink-800/40',
    iconColor: 'text-pink-400',
    iconBg: 'bg-pink-950/60',
  },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.12 } },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-16 px-4">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
        </div>

        <motion.div
          className="max-w-4xl mx-auto text-center relative z-10"
          initial="hidden"
          animate="show"
          variants={container}
        >
          <motion.div variants={item} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-indigo-400 text-sm font-medium mb-6">
            <Shield className="w-4 h-4" />
            Enterprise-grade AI authentication
          </motion.div>

          <motion.h1
            variants={item}
            className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight mb-6"
          >
            Detect Deepfakes{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              with AI
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            DeepGuard AI combines EfficientNet-B4, MTCNN face detection, and Grad-CAM explanations
            to deliver the most accurate deepfake detection available.
          </motion.p>

          <motion.div variants={item} className="flex flex-wrap justify-center gap-4">
            <Link
              to="/scan"
              className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-900/40 hover:shadow-indigo-800/60"
            >
              <ScanLine className="w-5 h-5" />
              Analyze Media
            </Link>
            <Link
              to="/webcam"
              className="flex items-center gap-2 px-8 py-3.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-semibold rounded-xl transition-all duration-200"
            >
              <Camera className="w-5 h-5" />
              Live Detection
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <motion.div
          initial="hidden"
          animate="show"
          variants={container}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {stats.map(({ value, label, icon: Icon }) => (
            <motion.div
              key={label}
              variants={item}
              className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-indigo-800/50 transition-colors"
            >
              <div className="p-3 bg-indigo-950/60 rounded-lg">
                <Icon className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Feature Cards */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-bold text-white mb-8 text-center"
        >
          Choose your detection method
        </motion.h2>
        <motion.div
          initial="hidden"
          animate="show"
          variants={container}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {features.map(({ icon: Icon, title, description, link, cta, gradient, border, iconColor, iconBg }) => (
            <motion.div
              key={title}
              variants={item}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`relative overflow-hidden bg-gradient-to-b ${gradient} border ${border} rounded-2xl p-6 flex flex-col gap-4 group`}
            >
              <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
              </div>
              <Link
                to={link}
                className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2.5 rounded-lg transition-all duration-200 w-fit"
              >
                {cta} →
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  )
}
