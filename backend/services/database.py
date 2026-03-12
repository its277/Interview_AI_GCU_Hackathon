import json
import os
from datetime import datetime

DB_FILE = os.path.join(os.path.dirname(__file__), "..", "db", "candidates.json")

def _ensure_db():
    if not os.path.exists(DB_FILE):
        os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
        with open(DB_FILE, "w") as f:
            json.dump([], f)

def get_all_candidates():
    _ensure_db()
    with open(DB_FILE, "r") as f:
        return json.load(f)

def add_candidate(candidate_data):
    _ensure_db()
    candidates = get_all_candidates()
    
    # Generate a simple ID
    new_id = str(len(candidates) + 1)
    
    # Extract matched skills list for display in Scorecard
    skills_data = candidate_data.get("skills", {})
    matched_skills = skills_data.get("matched", []) if isinstance(skills_data, dict) else []

    candidate = {
        "id": new_id,
        "name": candidate_data.get("candidateName", "Candidate " + new_id),
        "exp": candidate_data.get("candidateRole", "Applicant"),
        "score": candidate_data.get("fitScore", 0),
        "status": "Pending",
        "verdict": "-",
        "resume_skills": matched_skills,
        "timestamp": datetime.now().isoformat()
    }
    
    # Check if a candidate with this name already exists to avoid massive duplicates 
    # during rapid testing
    for c in candidates:
        if c["name"] == candidate["name"]:
            # Update existing
            c["exp"] = candidate["exp"]
            c["score"] = candidate["score"]
            c["status"] = "Pending"
            c["verdict"] = "-"
            c["resume_skills"] = matched_skills
            c["timestamp"] = candidate["timestamp"]
            _save_db(candidates)
            return c
            
    candidates.append(candidate)
    _save_db(candidates)
    return candidate

def update_candidate_score(candidate_name, overall_score):
    _ensure_db()
    candidates = get_all_candidates()
    
    for c in reversed(candidates):
        if c["name"] == candidate_name or c["name"] == "Candidate":
            c["score"] = overall_score
            c["status"] = "Interviewed"
            
            # Passing score is >= 60 logic (6.0 in UI)
            if overall_score >= 80:
                c["verdict"] = "Strong Hire"
            elif overall_score >= 60:
                c["verdict"] = "Hire"
            else:
                c["verdict"] = "Pass"
                
            _save_db(candidates)
            return c
            
    return None

def _save_db(data):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2)
