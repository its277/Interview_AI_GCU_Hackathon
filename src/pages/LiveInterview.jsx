import { useEffect, useState, useRef } from "react"
import { Mic, MicOff, Square, AlertTriangle } from "lucide-react"
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

export default function LiveInterview({ onFinishInterview, analysis }) {
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
  const [proctorWarning, setProctorWarning] = useState(null)

  // Proctoring warning system
  const [warningCount, setWarningCount] = useState(0)
  const MAX_WARNINGS = 3
  const [showTerminationOverlay, setShowTerminationOverlay] = useState(false)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const videoRef = useRef(null)
  const faceLandmarkerRef = useRef(null)
  const requestRef = useRef(null)
  const lastVideoTimeRef = useRef(-1)
  const lookingAwayStartRef = useRef(null)
  const warnedThisAbsenceRef = useRef(false)   // ← key fix: one warning per absence period
  const proctorStreamRef = useRef(null)

  // Termination handler
  const handleTerminateInterview = () => {
    setShowTerminationOverlay(true)
    
    // Stop recording if active
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }

    // Notify backend (optional)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "terminate",
        reason: "proctoring_violation_face_out",
        warnings: warningCount + 1
      }))
    }

    // Delay then finish interview
    setTimeout(() => {
      onFinishInterview?.()
    }, 4000)
  }

  const processVideoFrame = () => {
    if (!videoRef.current || !faceLandmarkerRef.current) return

    const video = videoRef.current
    if (video.currentTime !== lastVideoTimeRef.current && video.readyState >= 2) {
      lastVideoTimeRef.current = video.currentTime
      const results = faceLandmarkerRef.current.detectForVideo(video, performance.now())
      
      let currentWarning = null

      if (results.faceLandmarks) {
        if (results.faceLandmarks.length === 0) {
          currentWarning = "Face Not Detected"
        } else if (results.faceLandmarks.length > 1) {
          currentWarning = "Multiple People Detected"
        } else {
          // One face detected → check head pose
          const landmarks = results.faceLandmarks[0]
          const nose = landmarks[1]
          const left = landmarks[234]
          const right = landmarks[454]
          const top = landmarks[10]
          const bottom = landmarks[152]

          const yawRatio = (nose.x - left.x) / (right.x - left.x)
          const pitchRatio = (nose.y - top.y) / (bottom.y - top.y)

          const isLookingAway = yawRatio < 0.25 || yawRatio > 0.75 || pitchRatio < 0.3 || pitchRatio > 0.75

          if (isLookingAway) {
            currentWarning = "Looking Away"
          }
        }
      }

      setProctorWarning(currentWarning)

      // Warning & Termination Logic
      if (currentWarning) {
        // Absence / bad pose detected
        if (!lookingAwayStartRef.current) {
          lookingAwayStartRef.current = Date.now()
          warnedThisAbsenceRef.current = false
        }

        const awayDuration = Date.now() - lookingAwayStartRef.current

        if (awayDuration > 3500 && !warnedThisAbsenceRef.current) {
          warnedThisAbsenceRef.current = true

          setWarningCount(prev => {
            const newCount = prev + 1
            setProctorWarning(`Warning ${newCount}/${MAX_WARNINGS}: Keep face visible`)

            if (newCount >= MAX_WARNINGS) {
              handleTerminateInterview()
            }

            return newCount
          })
        }
      } else {
        // Face is visible again → reset
        lookingAwayStartRef.current = null
        warnedThisAbsenceRef.current = false
      }
    }

    requestRef.current = requestAnimationFrame(processVideoFrame)
  }

  // Initialize MediaPipe FaceLandmarker and Camera
  useEffect(() => {
    let active = true
    const initFaceLandmarkerAndCamera = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        )
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: 5,
        })
        console.log("FaceLandmarker loaded")
        
        if (active) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          proctorStreamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play()
              requestRef.current = requestAnimationFrame(processVideoFrame)
            }
          }
        }
      } catch (err) {
        console.error("Error initializing camera & FaceLandmarker:", err)
      }
    }
    initFaceLandmarkerAndCamera()

    return () => {
      active = false
      if (faceLandmarkerRef.current) faceLandmarkerRef.current.close()
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
      if (proctorStreamRef.current) proctorStreamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((s) => s + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Initialize WebSocket
  useEffect(() => {
    // Safely extract context from the analysis object
    // aiService.js maps the backend data to simpler UI keys: name, role, skills (array)
    const name = encodeURIComponent(analysis?.name || "Candidate");
    const role = encodeURIComponent(analysis?.role || "Senior AI Engineer");
    
    let flatSkills = "";
    if (Array.isArray(analysis?.skills)) {
      flatSkills = analysis.skills.join(", ");
    } else if (typeof analysis?.skills === 'string') {
      flatSkills = analysis.skills;
    }
    const skills = encodeURIComponent(flatSkills);
    const summary = encodeURIComponent(analysis?.summary || "");

    const wsUrl = `ws://localhost:8000/ws/interview?name=${name}&role=${role}&skills=${skills}&summary=${summary}`;
    const socket = new WebSocket(wsUrl);
    
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
    
    return () => {
      socket.close()
    }
  }, [analysis])

  const startRecording = async () => {
    try {
      if (!proctorStreamRef.current) {
        alert("Camera/Microphone stream not ready yet.")
        return
      }
      const audioStream = new MediaStream(proctorStreamRef.current.getAudioTracks())
      const mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' })
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (ws && ws.readyState === WebSocket.OPEN) {
          audioBlob.arrayBuffer().then(buffer => {
            ws.send(buffer)
          })
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Error starting recording:", error)
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
  
  const lastAiMessage = [...transcript].reverse().find(t => t.speaker === 'AI')
  const currentQuestionText = lastAiMessage ? lastAiMessage.text : "Waiting for AI..."

  return (
    <div className="px-10 py-8 grid grid-cols-1 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] gap-8 items-start relative">
      <div className="space-y-6">
        
        {/* Video preview with warning counter */}
        <div className="fixed bottom-8 right-8 z-50 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl bg-slate-900 w-48 aspect-video">
          <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover -scale-x-100" />
          
          {warningCount > 0 && (
            <div className="absolute top-2 right-2 bg-red-600/90 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg z-10">
              Warning {warningCount}/{MAX_WARNINGS}
            </div>
          )}
        </div>

        {/* Proctoring warning banner */}
        {proctorWarning && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 shadow-[0_10px_30px_rgba(245,158,11,0.15)]">
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex flex-shrink-0 items-center justify-center text-amber-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-500">Proctoring Alert</p>
              <p className="text-sm text-amber-200/80">{proctorWarning}</p>
            </div>
          </div>
        )}

        {/* Termination overlay */}
        {showTerminationOverlay && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-slate-900 border border-rose-600/50 rounded-2xl p-10 max-w-md text-center shadow-2xl">
              <AlertTriangle className="h-16 w-16 text-rose-500 mx-auto mb-6 animate-pulse" />
              <h2 className="text-2xl font-bold text-rose-300 mb-4">
                Interview Terminated
              </h2>
              <p className="text-slate-300 mb-6">
                You exceeded the allowed number of warnings for leaving the camera frame.
              </p>
              <p className="text-slate-400 text-sm">
                The session has been automatically ended.
              </p>
            </div>
          </div>
        )}

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