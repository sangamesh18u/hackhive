import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, FileVideo, FileImage, X } from 'lucide-react'

const ACCEPTED = {
  'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DropZone({ onFile, file, onClear }) {
  const onDrop = useCallback(
    (accepted) => {
      if (accepted[0]) onFile(accepted[0])
    },
    [onFile]
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 1,
    disabled: !!file,
  })

  const isVideo = file && file.type.startsWith('video')
  const rejectionMsg = fileRejections[0]?.errors[0]?.message

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {file ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="border border-gray-700 bg-gray-900 rounded-xl p-5 flex items-center gap-4"
          >
            <div className="p-3 rounded-lg bg-indigo-950/50 border border-indigo-800/50">
              {isVideo ? (
                <FileVideo className="w-8 h-8 text-indigo-400" />
              ) : (
                <FileImage className="w-8 h-8 text-indigo-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">{file.name}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {formatBytes(file.size)} · {file.type || 'unknown type'}
              </p>
            </div>
            {!isVideo && (
              <img
                src={URL.createObjectURL(file)}
                alt="preview"
                className="w-16 h-16 object-cover rounded-lg border border-gray-700"
              />
            )}
            <button
              onClick={onClear}
              className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 ${
              isDragActive
                ? 'border-indigo-500 bg-indigo-950/20'
                : 'border-gray-700 hover:border-indigo-600 hover:bg-gray-900/50'
            }`}
          >
            <input {...getInputProps()} />
            <motion.div
              animate={isDragActive ? { scale: 1.2, rotate: 10 } : { scale: 1, rotate: 0 }}
              className="p-4 rounded-full bg-indigo-950/50 border border-indigo-800/50"
            >
              <UploadCloud className={`w-8 h-8 ${isDragActive ? 'text-indigo-300' : 'text-indigo-500'}`} />
            </motion.div>
            <div className="text-center">
              <p className="text-white font-semibold">
                {isDragActive ? 'Drop it here!' : 'Drag & drop your file here'}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                or <span className="text-indigo-400 underline cursor-pointer">browse files</span>
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              {['JPG', 'PNG', 'MP4', 'MOV', 'AVI', 'WEBP'].map((ext) => (
                <span key={ext} className="px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-400">
                  {ext}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {rejectionMsg && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-xs mt-2 flex items-center gap-1"
        >
          ⚠ {rejectionMsg}
        </motion.p>
      )}
    </div>
  )
}
