import { useEffect, useState, useRef } from "react"
import { Mic, MicOff, Square } from "lucide-react"

export default function LiveInterview({ onFinishInterview, analysis, jobDescription }) {
  const [secondsElapsed, setSecondsElapsed] = useState(0)
  const [metrics, setMetrics] = useState({
    clarity: 72,
    technical: 75,
    culture: 78,
  })
  
  const [ws, setWs] = useState(null)
  const [transcript, setTranscript] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [aiIsSpeaking, setAiIsSpeaking] = useState(false)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((s) => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Initialize WebSocket
  useEffect(() => {
    const params = new URLSearchParams({
      role: jobDescription || analysis?.role || "Software Engineer",
      name: analysis?.name || "Candidate",
      skills: analysis?.skills?.join(", ") || ""
    }).toString()
    
    const socket = new WebSocket(`ws://localhost:8000/ws/interview?${params}`)
    
    socket.onopen = () => console.log("WebSocket connected")
    
    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)
        
        if (message.type === "text") {
          setTranscript(prev => [...prev, {
            speaker: "AI",
            time: new Date().toLocaleTimeString([], {minute: '2-digit', second:'2-digit'}),
            text: message.data
          }])
          setAiIsSpeaking(true)
          setTimeout(() => setAiIsSpeaking(false), 4000) // Mock speaking duration
        } 
        else if (message.type === "transcription") {
          setTranscript(prev => [...prev, {
            speaker: "Candidate",
            time: new Date().toLocaleTimeString([], {minute: '2-digit', second:'2-digit'}),
            text: message.data
          }])
        }
        else if (message.type === "audio") {
          // Play received audio (TTS)
          const audioSrc = `data:audio/wav;base64,${message.data}`
          const audio = new Audio(audioSrc)
          audio.play().catch(e => console.error("Error playing audio:", e))
        }
      } catch (err) {
        console.error("Error parsing WebSocket message", err)
      }
    }
    
    socket.onclose = () => console.log("WebSocket disconnected")
    setWs(socket)
    
    return () => socket.close()
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        // Send blob to websocket as ArrayBuffer
        if (ws && ws.readyState === WebSocket.OPEN) {
          audioBlob.arrayBuffer().then(buffer => {
            ws.send(buffer)
          })
        }
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      alert("Microphone access is required for the interview.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const minutes = String(Math.floor(secondsElapsed / 60)).padStart(2, "0")
  const seconds = String(secondsElapsed % 60).padStart(2, "0")
  const elapsedLabel = `${minutes}:${seconds}`
  
  // Get the latest AI question for the big display
  const lastAiMessage = [...transcript].reverse().find(t => t.speaker === 'AI')
  const currentQuestionText = lastAiMessage ? lastAiMessage.text : "Waiting for AI..."

  return (
    <div className="px-10 py-8 grid grid-cols-1 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] gap-8 items-start">
      <div className="space-y-6">
        
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex items-center justify-between shadow-[0_22px_55px_rgba(15,23,42,0.9)]">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-slate-950 font-semibold shadow-lg shadow-teal-500/40">
              AI
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">AI Interviewer</p>
              <p className="text-base font-semibold">Aurora · Interviewing {analysis?.name || 'Candidate'}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs text-rose-300">
              {isRecording && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-70 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
                </span>
              )}
              <span className="uppercase tracking-wide">
                {isRecording ? "Listening..." : "Connected"}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="h-6 rounded-full border border-slate-700 px-3 inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>WS · Active</span>
              </span>
              <span className="h-6 rounded-full border border-slate-700 px-3 inline-flex items-center">
                {elapsedLabel} elapsed
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-6 flex flex-col items-center shadow-[0_18px_45px_rgba(15,23,42,0.85)] relative overflow-hidden">
          
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950/80 to-transparent pointer-events-none" />
          
          <div className="text-center max-w-2xl mx-auto space-y-4 relative z-10 py-10">
            <h2 className={`text-2xl md:text-3xl font-medium leading-relaxed transition-opacity duration-300 ${aiIsSpeaking ? 'text-teal-100' : 'text-slate-300'}`}>
              &ldquo;{currentQuestionText}&rdquo;
            </h2>
            
            {aiIsSpeaking && (
              <div className="flex items-center justify-center gap-1.5 mt-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-emerald-400 animate-pulse"
                    style={{
                      height: `${(i % 3 + 1) * 8}px`,
                      animationDelay: `${i * 150}ms`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="relative z-10 mt-4">
             <button
              onClick={toggleRecording}
              className={`group relative flex items-center justify-center gap-3 px-8 py-4 rounded-full font-semibold transition-all duration-300 overflow-hidden shadow-xl
                ${isRecording 
                  ? "bg-rose-500 text-white shadow-rose-500/30 hover:bg-rose-600 ring-2 ring-rose-400 ring-offset-4 ring-offset-slate-900" 
                  : "bg-teal-500 text-slate-950 shadow-teal-500/20 hover:bg-teal-400"
                }`}
            >
              {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
              <span>{isRecording ? "Stop Speaking" : "Push to Speak"}</span>
            </button>
          </div>

        </div>

        <div className="grid lg:grid-cols-2 gap-6 items-start">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-col h-64 shadow-[0_18px_45px_rgba(15,23,42,0.85)] col-span-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Live transcript</p>
              <span className="text-[10px] text-slate-500">Auto-synced via WebSockets</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scroll flex flex-col-reverse">
              {/* Flex row-reverse trick to keep scroll at bottom */}
              <div className="space-y-4">
                {transcript.map((entry, idx) => (
                  <div key={idx} className="text-sm leading-relaxed">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wide font-medium ${
                        entry.speaker === "AI"
                          ? "bg-slate-800/80 border-slate-600 text-slate-200"
                          : "bg-teal-500/15 border-teal-400/40 text-teal-200"
                      }`}>
                        {entry.speaker}
                      </span>
                      <span className="text-[10px] text-slate-500">{entry.time}</span>
                    </div>
                    <p className="text-slate-300 ml-1">{entry.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={onFinishInterview}
            className="rounded-xl bg-slate-800 border border-slate-700 text-rose-400 text-xs font-semibold px-6 py-3 shadow-lg hover:bg-slate-700 hover:text-rose-300 transition-colors"
          >
            End Interview Manually
          </button>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-slate-400">Live AI analysis</p>
            <span className="text-[10px] text-slate-500">Updating in real‑time</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-slate-400 mb-1">Signal</p>
              <p className="text-sm text-emerald-300 font-semibold">High</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-slate-400 mb-1">Match</p>
              <p className="text-sm text-teal-300 font-semibold">Strong</p>
            </div>
          </div>

          <div className="space-y-3 text-xs pt-2">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Communication clarity</span>
                <span className="text-slate-400">{metrics.clarity}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-teal-400" style={{ width: `${metrics.clarity}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-300">Technical depth</span>
                <span className="text-slate-400">{metrics.technical}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400" style={{ width: `${metrics.technical}%` }} />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-600 pt-2 border-t border-slate-800 leading-relaxed max-w-xs">
            The transcript is analyzed in real-time by the Evaluator Agent. End the interview to get the final Scorecard.
          </p>
        </div>
      </aside>
    </div>
  )
}

