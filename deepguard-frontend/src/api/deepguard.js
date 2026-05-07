import client from './client'

export const analyzeFile = (file) => {
  const form = new FormData()
  form.append('file', file)
  return client.post('/api/v1/analyze', form)
}

export const getJob = (jobId) =>
  client.get(`/api/v1/jobs/${jobId}`)

export const analyzeFrame = (base64String) =>
  client.post('/api/v1/analyze-frame', { frame: base64String })

export const analyzeUrl = (url) =>
  client.post('/api/v1/analyze-url', { url })
