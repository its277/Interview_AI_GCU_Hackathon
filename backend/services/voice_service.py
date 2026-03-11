import tempfile
import os
from faster_whisper import WhisperModel
import pyttsx3
import threading

# Initialize STT Model (lightweight 'tiny' or 'base' for speed)
try:
    print("Loading faster-whisper model...")
    # Using 'tiny.en' for English-only and maximum speed on CPU
    whisper_model = WhisperModel("tiny.en", device="cpu", compute_type="int8")
except Exception as e:
    print(f"Warning: Could not initialize faster-whisper. {e}")
    whisper_model = None

# Initialize pyttsx3 engine globally. 
# pyttsx3 can be tricky in async contexts, so we'll use a lock or initialize it per request.
# The simplest robust way for a fast prototype is a helper function that spins up an engine.

def transcribe_audio_bytes(audio_bytes: bytes) -> str:
    """Takes raw audio bytes, writes to a temp file, and transcribes using faster-whisper."""
    if not whisper_model:
        return "I heard you, but my STT model is offline."
        
    try:
        # We need a valid file extension for ffmpeg to parse it. Usually .wav or .webm
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
            
        segments, info = whisper_model.transcribe(tmp_path, beam_size=5)
        text = " ".join([segment.text for segment in segments])
        
        # Cleanup
        os.unlink(tmp_path)
        return text.strip()
    except Exception as e:
        print(f"Transcription error: {e}")
        return ""

def text_to_speech_bytes(text: str) -> bytes:
    """Converts text to speech using pyttsx3 and returns the audio bytes (.wav)."""
    try:
        engine = pyttsx3.init()
        # Set properties for a more natural voice
        voices = engine.getProperty('voices')
        # Try to find a female voice (often sounds slightly more natural in base pyttsx3)
        for voice in voices:
            if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                engine.setProperty('voice', voice.id)
                break
                
        engine.setProperty('rate', 170) # slightly slower than default
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp_path = tmp.name
            
        # pyttsx3 saves to file async-ish, need to runAndWait
        engine.save_to_file(text, tmp_path)
        engine.runAndWait()
        
        with open(tmp_path, "rb") as f:
            audio_data = f.read()
            
        os.unlink(tmp_path)
        return audio_data
    except Exception as e:
        print(f"TTS error: {e}")
        # Return empty bytes if TTS fails
        return b""
