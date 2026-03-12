
import { useEffect, useState } from "react"
import StatCard from "../components/StatCard"
import CandidateTable from "../components/CandidateTable"
import CandidatePanel from "../components/CandidatePanel"
import JDInput from "../components/JDInput"
import ResumeUploader from "../components/ResumeUploader"
import { useAuth } from "../context/AuthContext"

export default function Dashboard({
  jobDescription,
  onJobDescriptionChange,
  resumeFile,
  onResumeChange,
  isAnalyzing,
}){

  const { userRole } = useAuth();

  const [candidates, setCandidates] = useState([])
  const [avgScore, setAvgScore] = useState(0)
  const [topCandidate, setTopCandidate] = useState(null)

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/candidates")
      .then(res => res.json())
      .then(data => {

        setCandidates(data)

        if(data.length > 0){

          // average score
          const totalScore = data.reduce((sum, c) => sum + (c.score || 0), 0)
          setAvgScore(Math.round(totalScore / data.length))

          // highest score candidate
          const best = data.reduce((prev, current) => {
            return (current.score || 0) > (prev.score || 0) ? current : prev
          })

          setTopCandidate(best)
        }

      })
      .catch(err => console.error("Error fetching candidates:", err))
  }, [])

  if (userRole === 'candidate') {
    return (
      <div className="px-10 py-12 max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
           <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/30 mb-6 font-bold text-2xl">
             C
           </div>
           <h1 className="text-3xl font-semibold">Welcome, Candidate</h1>
           <p className="text-slate-400">Please upload your resume to begin your AI interview session.</p>
        </div>
        
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-8 shadow-[0_18px_45px_rgba(15,23,42,0.85)]">
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-800 border-t-teal-400 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-500 rounded-full animate-spin glow-pulse" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-slate-200">Analyzing Your Resume...</p>
                <p className="text-sm text-slate-400 mt-2">Connecting to AI Brain. This usually takes 10-20 seconds with local models.</p>
              </div>
            </div>
          ) : (
            <ResumeUploader file={resumeFile} onFileChange={onResumeChange} />
          )}
        </div>
      </div>
    );
  }

  return(
    <div className="px-10 py-8 space-y-8">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        <StatCard 
          title="Total Applications" 
          value={candidates.length} 
          sub="From database"
        />

        <StatCard 
          title="Interviews Done" 
          value={candidates.filter(c => c.status === "Interviewed").length} 
          sub="Completed interviews"
        />

        <StatCard 
          title="Avg Fit Score" 
          value={`${avgScore}%`} 
          sub="AI evaluation"
        />

        <StatCard 
          title="Top Candidate Score" 
          value={topCandidate ? `${topCandidate.score}%` : "-"} 
          sub={topCandidate ? topCandidate.name : "No candidates"}
        />

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">

          <CandidateTable/>

          <div className="grid lg:grid-cols-1 gap-6">
            <JDInput value={jobDescription} onChange={onJobDescriptionChange}/>
          </div>

        </div>

        <div className="xl:pl-2">
          <CandidatePanel candidate={topCandidate}/>
        </div>

      </div>

    </div>
  )
}

