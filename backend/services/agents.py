from langchain_community.llms import Ollama
from langchain_core.prompts import PromptTemplate
import json
import re

# Initialize Ollama model (ensure 'llama3' or 'mistral' is pulled locally)
# Using llama3 as a default lightweight model
try:
    # Explicitly force JSON format from Ollama to prevent markdown/chat parsing errors
    llm_json = Ollama(model="llama3", timeout=120, format="json")
    llm_text = Ollama(model="llama3", timeout=120)
except Exception as e:
    print(f"Warning: Could not initialize Ollama. {e}")
    llm_json = None
    llm_text = None

def parse_resume_and_match(job_description: str, resume_text: str):
    """Parses resume text and compares it against the job description to output a fit score and skills."""
    if not llm_json:
        # Fallback mock response for prototype
        return {
            "fitScore": 75,
            "skills": {"matched": ["Python", "React"], "missing": ["AWS", "Docker"]},
            "summary": "Candidate has foundational skills but lacks cloud deployment experience (Fallback)."
        }
        
    prompt = PromptTemplate(
        input_variables=["jd", "resume"],
        template="""
        You are an expert technical recruiter. Based on the Job Description and the candidate's Resume below, 
        You must return the result STRICTLY as a JSON object with this exact structure, nothing else:
        {{
            "candidateName": "First Last",
            "candidateRole": "Current or Target Title",
            "fitScore": int (0 to 100),
            "skills": {{
                "matched": ["list of strings"],
                "missing": ["list of strings"]
            }},
            "summary": "1-2 sentence summary"
        }}
        
        Job Description: {jd}
        
        Resume: {resume}
        """
    )
    
    try:
        chain = prompt | llm_json
        response = chain.invoke({"jd": job_description, "resume": resume_text})
        
        # Clean up any potential markdown formatting from local LLMs
        response_clean = response.strip().replace("```json", "").replace("```", "")
        match = re.search(r'(\{.*\})', response_clean, re.DOTALL)
        if match:
            response_clean = match.group(1)
            
        return json.loads(response_clean)
    except Exception as e:
        print(f"Error parsing resume with LLM: {e}")
        return {
            "fitScore": 70,
            "skills": {"matched": ["Extraction Failed"], "missing": []},
            "summary": "Failed to parse LLM response. Please check local model."
        }

def generate_questions(analysis: dict):
    """Generates technical and behavioral questions based on the candidate's analysis."""
    if not llm_json:
        return [
            {"id": "q1", "text": "Tell me about your most challenging project.", "category": "Behavioral"},
            {"id": "q2", "text": "How do you optimize React performance?", "category": "Technical"}
        ]
        
    prompt = PromptTemplate(
        input_variables=["analysis_str"],
        template="""
        You are an expert technical interviewer. Based on the candidate's analysis results below,
        create exactly 3 interview questions (2 Technical, 1 Behavioral) targeting their weak spots or verifying their strengths.
        You must return the result STRICTLY as a JSON object with a single key 'questions' containing a list of objects, structured exactly like this:
        {{
            "questions": [
                {{"id": "q1", "text": "...", "category": "Technical"}},
                {{"id": "q2", "text": "...", "category": "Technical"}},
                {{"id": "q3", "text": "...", "category": "Behavioral"}}
            ]
        }}
        
        Analysis: {analysis_str}
        """
    )
    
    try:
        chain = prompt | llm_json
        response = chain.invoke({"analysis_str": json.dumps(analysis)})
        
        response_clean = response.strip().replace("```json", "").replace("```", "")
        match = re.search(r'(\{.*\})', response_clean, re.DOTALL)
        if match:
            response_clean = match.group(1)
            
        data = json.loads(response_clean)
        return data.get("questions", [])
    except Exception as e:
        print(f"Error generating questions with LLM: {e}")
        return [
            {"id": "q1", "text": "Fallback generated question 1?", "category": "Technical"},
            {"id": "q2", "text": "Fallback generated question 2?", "category": "Behavioral"}
        ]

class InterviewerAgent:
    def __init__(self, role_context: str = "Senior AI Engineer"):
        self.history = []
        self.role_context = role_context
        
    def generate_response(self, candidate_input: str) -> str:
        self.history.append({"role": "candidate", "content": candidate_input})
        
        if not llm_text:
            reply = f"Mocked Interviwer Response acknowledging: '{candidate_input}'"
            self.history.append({"role": "interviewer", "content": reply})
            return reply
            
        history_str = "\n".join([f"{msg['role']}: {msg['content']}" for msg in self.history[-5:]]) # Keep context short
        
        prompt = PromptTemplate(
            input_variables=["history", "role_context"],
            template="""
            You are an AI conducting an interview for a {role_context} position.
            Below is the recent conversation history. Respond as the interviewer to the candidate's latest message.
            Keep your response concise, conversational, and professional (1-2 sentences). Ask ONE follow-up question if appropriate.
            IMPORTANT: The candidate's input is transcribed by a Speech-to-Text engine. It may contain phonetic misspellings, grammar errors, or incorrect homophones. Do NOT correct their spelling. Infer their intent and respond naturally based on the technical context.
            
            History:
            {history}
            
            Interviewer (You):
            """
        )
        
        try:
            chain = prompt | llm_text
            response = chain.invoke({"history": history_str, "role_context": self.role_context})
            reply = response.strip()
            self.history.append({"role": "interviewer", "content": reply})
            return reply
        except Exception as e:
            print(f"Error in interviewer agent: {e}")
            return "I'm having trouble connecting to my AI brain. Can you repeat that?"

def evaluate_interview(history: list):
    """Scores candidate post-interview"""
    if not llm_json:
        return {
            "overallScore": 85,
            "technicalScore": 80,
            "communicationScore": 90,
            "feedback": "Good fallback performance.",
            "areasForImprovement": ["Error handling"]
        }
        
    history_str = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history])
    
    prompt = PromptTemplate(
        input_variables=["history"],
        template="""
        You are a hiring manager evaluating an interview transcript. 
        Read the transcript and output an evaluation STRICTLY as a JSON object with this exact structure, nothing else:
        {{
            "overallScore": int (0-100),
            "technicalScore": int (0-100),
            "communicationScore": int (0-100),
            "feedback": "1-2 paragraph description",
            "areasForImprovement": ["list of strings"]
        }}
        
        Interview Transcript:
        {history}
        """
    )
    
    try:
        chain = prompt | llm_json
        response = chain.invoke({"history": history_str})
        
        response_clean = response.strip().replace("```json", "").replace("```", "")
        match = re.search(r'(\{.*\})', response_clean, re.DOTALL)
        if match:
            response_clean = match.group(1)
            
        return json.loads(response_clean)
    except Exception as e:
        print(f"Error evaluating interview: {e}")
        return {
            "overallScore": 70,
            "technicalScore": 70,
            "communicationScore": 70,
            "feedback": "Failed to parse LLM response for evaluation.",
            "areasForImprovement": []
        }
