import { useState } from "react"
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from "react-router-dom"
import Navbar from "./components/Navbar"
import Dashboard from "./pages/Dashboard"
import LiveInterview from "./pages/LiveInterview"
import Scorecard from "./pages/Scorecard"
import Analysis from "./pages/Analysis"
import Login from "./pages/Login"
import { useInterviewFlow } from "./hooks/useInterviewFlow"
import { simulateResumeAnalysis, simulateQuestionGeneration } from "./services/aiService"
import { AuthProvider, useAuth } from "./context/AuthContext"

// A simple wrapper to protect routes
function ProtectedRoute({ children, allowedRoles }) {
  const { userRole } = useAuth();
  if (!userRole) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={userRole === 'recruiter' ? '/dashboard' : '/interview'} replace />;
  }
  return children;
}

function AppShell() {

  const navigate = useNavigate()
  const { userRole } = useAuth()
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const {
    jobDescription,
    setJobDescription,
    resumeFile,
    setResumeFile,
    analysis,
    setAnalysis,
    questions,
    setQuestions,
    stage,
    setStage,
  } = useInterviewFlow()

  const handleAnalyze = async () => {
    if (!jobDescription || !resumeFile) return
    setIsAnalyzing(true)
    setStage("analyzing")
    const nextAnalysis = await simulateResumeAnalysis({ jobDescription, resumeFile })
    setAnalysis(nextAnalysis)
    const qs = await simulateQuestionGeneration({ analysis: nextAnalysis })
    setQuestions(qs)
    setStage("ready")
    setIsAnalyzing(false)
  }

  const handleResumeSelected = async (file) => {
    setResumeFile(file)
    if (file) {
      if (userRole === 'candidate') {
         setIsAnalyzing(true)
         setStage("analyzing")
         // Start analysis in background, but move candidate to interview immediately
         const nextAnalysis = await simulateResumeAnalysis({ jobDescription: jobDescription || "Software Engineer", resumeFile: file })
         setAnalysis(nextAnalysis)
         const qs = await simulateQuestionGeneration({ analysis: nextAnalysis })
         setQuestions(qs)
         setStage("ready")
         setIsAnalyzing(false)
         navigate("/interview")
      } else {
         navigate("/analysis")
      }
    }
  }

  const handleStartInterview = () => {
    if (!analysis || !questions.length) return
    setStage("interviewing")
    navigate("/interview")
  }

  const handleFinishInterview = async () => {
    setStage("analyzing-score")
    try {
      const response = await fetch('http://localhost:8000/api/scorecard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          history: [],
          candidateName: analysis?.name || "Candidate"
        }) // Backend will fallback to mock
      });
      const scoreData = await response.json();
      setAnalysis(prev => ({ ...prev, scorecard: scoreData }));
    } catch (error) {
      console.error("Scorecard error:", error)
    }
    setStage("scored")
    navigate("/scorecard")
  }

  return (

  <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">

    {/* Only show Navbar if not on login page */}
    {userRole && <Navbar/>}

    <main className={`flex-1 ${userRole ? 'pb-10' : ''}`}>
      <Routes>
        <Route path="/" element={
          !userRole ? <Navigate to="/login" replace/> : 
          <Navigate to="/dashboard" replace/>
        } />
        
        <Route 
          path="/login" 
          element={
            userRole ? 
            <Navigate to="/dashboard" replace/> : 
            <Login />
          } 
        />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['recruiter', 'candidate']}>
              <Dashboard
                jobDescription={jobDescription}
                onJobDescriptionChange={setJobDescription}
                resumeFile={resumeFile}
                onResumeChange={handleResumeSelected}
                isAnalyzing={isAnalyzing}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analysis"
          element={
            <ProtectedRoute allowedRoles={['recruiter']}>
              <Analysis
                jobDescription={jobDescription}
                resumeFile={resumeFile}
                analysis={analysis}
                questions={questions}
                onAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
                stage={stage}
                onStartInterview={handleStartInterview}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interview"
          element={
            <ProtectedRoute allowedRoles={['recruiter', 'candidate']}>
              <LiveInterview
                onFinishInterview={handleFinishInterview}
                analysis={analysis}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scorecard"
          element={
            <ProtectedRoute allowedRoles={['recruiter', 'candidate']}>
              <Scorecard
                analysis={analysis}
              />
            </ProtectedRoute>
          }
        />
      </Routes>
    </main>

  </div>

  )

}

function App() {
  return (
  <BrowserRouter>
    <AuthProvider>
      <AppShell/>
    </AuthProvider>
  </BrowserRouter>
  )
}

export default App


