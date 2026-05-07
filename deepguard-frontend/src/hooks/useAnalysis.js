import { useState, useEffect, useRef } from 'react'
import { getJob } from '../api/deepguard'

export function useAnalysis(jobId) {
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!jobId) return

    const poll = async () => {
      try {
        const { data } = await getJob(jobId)
        setJob(data)

        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(intervalRef.current)
          setLoading(false)
        }
      } catch (err) {
        clearInterval(intervalRef.current)
        setError(
          err.isNetworkError
            ? 'Backend offline — start the FastAPI server'
            : err.response?.data?.detail || 'Failed to fetch job status'
        )
        setLoading(false)
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 2000)

    return () => clearInterval(intervalRef.current)
  }, [jobId])

  return { job, loading, error }
}
