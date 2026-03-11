from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
import base64
import io
import PyPDF2

# Import services
from services.agents import parse_resume_and_match, generate_questions, evaluate_interview, InterviewerAgent
from services.voice_service import transcribe_audio_bytes, text_to_speech_bytes
from services.database import get_all_candidates, add_candidate, update_candidate_score

app = FastAPI(title="InterviewAI Backend")

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store for the prototype
interview_sessions = {}

@app.get("/")
def read_root():
    return {"status": "Backend is running"}

@app.get("/api/candidates")
def get_candidates():
    try:
        candidates = get_all_candidates()
        return candidates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze")
async def analyze_resume(
    jobDescription: str = Form(...),
    resumeFile: UploadFile = File(...)
):
    try:
        content = await resumeFile.read()
        
        # Proper PDF Parsing
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            resume_text = ""
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    resume_text += text + "\n"
        except Exception as e:
            print(f"Failed to parse PDF physically: {e}")
            resume_text = content.decode('utf-8', errors='ignore')

        # Limit to avoid blowing up context window
        resume_text = resume_text[:3000]

        # 1. Resume Parser & Matcher
        analysis_result = parse_resume_and_match(jobDescription, resume_text)
        
        # Save to JSON database
        try:
            add_candidate(analysis_result)
        except Exception as e:
            print(f"Failed to add candidate to db: {e}")
        
        # 2. Question Generation
        questions = generate_questions(analysis_result)
        
        return {
            "analysis": analysis_result,
            "questions": questions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scorecard")
async def generate_scorecard(data: dict):
    # Retrieve history from simple dictionary, or default to mock
    history = data.get("history", [])
    candidate_name = data.get("candidateName", "Candidate")
    
    if not history:
        # Evaluate based on a mock history if empty
        history = [
            {"role": "interviewer", "content": "Welcome to the interview."},
            {"role": "candidate", "content": "Thank you, I'm excited to be here."}
        ]
        
    evaluation = evaluate_interview(history)
    
    # Update score in JSON DB
    try:
        update_candidate_score(candidate_name, evaluation.get("overallScore", 0))
    except Exception as e:
        print(f"Failed to update db score: {e}")
        
    return evaluation

# WebSocket endpoint for Live Interview
@app.websocket("/ws/interview")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # Initialize Interviewer Agent state for this connection
    agent = InterviewerAgent()
    
    try:
        # Send initial greeting
        greeting_text = "Hello! I am ready to begin the interview. Let me know when you're ready."
        agent.history.append({"role": "interviewer", "content": greeting_text})
        
        # Send text
        await websocket.send_text(json.dumps({
            "type": "text", 
            "data": greeting_text
        }))
        
        # Optionally send audio of greeting
        audio_bytes = text_to_speech_bytes(greeting_text)
        if audio_bytes:
            encoded_audio = base64.b64encode(audio_bytes).decode('utf-8')
            try:
                await websocket.send_text(json.dumps({
                    "type": "audio",
                    "data": encoded_audio
                }))
            except Exception as e:
                print(f"Client disconnected during greeting audio: {e}")
        
        while True:
            try:
                # Receive data
                message = await websocket.receive()
                
                if message["type"] == "websocket.disconnect":
                    break
                    
                candidate_text = ""
                if "text" in message:
                    try:
                        data = json.loads(message["text"])
                        if data.get("type") == "text":
                            candidate_text = data.get("data", "")
                    except json.JSONDecodeError:
                        candidate_text = message["text"]
                    
                elif "bytes" in message:
                    # 3. Speech-to-Text (candidate spoke)
                    audio_data = message["bytes"]
                    candidate_text = transcribe_audio_bytes(audio_data)
                    
                    # Echo transcribed text back so user sees what was heard
                    await websocket.send_text(json.dumps({
                        "type": "transcription",
                        "data": candidate_text
                    }))
                    
                if candidate_text.strip():
                    # 4. Generate next question/response using Agent
                    interviewer_response = agent.generate_response(candidate_text)
                    
                    # Send text response
                    await websocket.send_text(json.dumps({
                        "type": "text",
                        "data": interviewer_response
                    }))
                    
                    # 5. Text-to-Speech (interviewer speaks)
                    tts_bytes = text_to_speech_bytes(interviewer_response)
                    if tts_bytes:
                        encoded_tts = base64.b64encode(tts_bytes).decode('utf-8')
                        try:
                            await websocket.send_text(json.dumps({
                                "type": "audio",
                                "data": encoded_tts
                            }))
                        except Exception as e:
                            print(f"Client disconnected during TTS audio: {e}")
                            break
            except RuntimeError as e:
                # Disconnected while waiting for receive
                print(f"RuntimeError in websocket loop: {e}")
                break
                
    except WebSocketDisconnect:
        # Keep track of history in memory if needed
        # interview_sessions[websocket.client] = agent.history
        print("Client disconnected explicitly")
    except Exception as e:
        print(f"Unexpected error in websocket loop: {e}")
