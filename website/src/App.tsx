import { useState } from 'react'
import Header from './components/Header'
import Hero from './components/Hero'
import ProblemSolution from './components/ProblemSolution'
import ModuleExplorer from './components/ModuleExplorer'
import SecurityRBAC from './components/SecurityRBAC'
import AICapabilities from './components/AICapabilities'
import Awards from './components/Awards'
import Team from './components/Team'
import DemoCTA from './components/DemoCTA'
import Footer from './components/Footer'
import DemoRequestModal from './components/DemoRequestModal'
import VideoModal from './components/VideoModal'

function App() {
  const [demoModalOpen, setDemoModalOpen] = useState(false)
  const [videoModalOpen, setVideoModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <Header onRequestDemo={() => setDemoModalOpen(true)} />
      <main>
        <Hero onWatchDemo={() => setVideoModalOpen(true)} />
        <ProblemSolution />
        <ModuleExplorer />
        <SecurityRBAC />
        <AICapabilities />
        <Awards />
        <Team />
        <DemoCTA
          onRequestDemo={() => setDemoModalOpen(true)}
          onWatchDemo={() => setVideoModalOpen(true)}
        />
      </main>
      <Footer />
      <DemoRequestModal open={demoModalOpen} onClose={() => setDemoModalOpen(false)} />
      <VideoModal open={videoModalOpen} onClose={() => setVideoModalOpen(false)} />
    </div>
  )
}

export default App
