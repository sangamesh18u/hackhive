import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast'
import Navbar from './components/layout/Navbar'
import Sidebar from './components/layout/Sidebar'
import HomePage from './pages/HomePage'
import ScanPage from './pages/ScanPage'
import WebcamPage from './pages/WebcamPage'
import SocialPage from './pages/SocialPage'
import ResultPage from './pages/ResultPage'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <div className="min-h-screen bg-gray-950 flex flex-col">
          <Navbar />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/scan" element={<ScanPage />} />
                <Route path="/webcam" element={<WebcamPage />} />
                <Route path="/social" element={<SocialPage />} />
                <Route path="/results/:jobId" element={<ResultPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </ToastProvider>
    </BrowserRouter>
  )
}
