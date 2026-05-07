import { useRef, useState, useCallback } from 'react'

export function useWebcam() {
  const webcamRef = useRef(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const intervalRef = useRef(null)

  const startCapture = useCallback((onFrame) => {
    setIsCapturing(true)
    intervalRef.current = setInterval(() => {
      if (webcamRef.current) {
        const screenshot = webcamRef.current.getScreenshot()
        if (screenshot) {
          // Strip data URL prefix to get raw base64
          const base64 = screenshot.replace(/^data:image\/\w+;base64,/, '')
          onFrame(base64)
        }
      }
    }, 2000)
  }, [])

  const stopCapture = useCallback(() => {
    setIsCapturing(false)
    clearInterval(intervalRef.current)
  }, [])

  return { webcamRef, isCapturing, startCapture, stopCapture }
}
