export async function simulateResumeAnalysis({ jobDescription, resumeFile }) {
  const formData = new FormData();
  formData.append('jobDescription', jobDescription);
  formData.append('resumeFile', resumeFile);

  try {
    const response = await fetch('http://localhost:8000/api/analyze', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Reshape the backend analysis result to match the frontend mock's expected UI shape
    return {
      name: data.analysis.candidateName || resumeFile.name.replace('.pdf', '') || "Candidate",
      role: data.analysis.candidateRole || "Applicant",
      experience: "Parsed from Resume",
      location: "Remote",
      education: "Parsed from Resume",
      skills: data.analysis.skills?.matched || ["Skill 1", "Skill 2"],
      matchScore: data.analysis.fitScore || 0,
      summary: data.analysis.summary || "No summary provided.",
      _rawQuestions: data.questions // Cache for the next call
    };
  } catch (error) {
    console.error("Error analyzing resume:", error);
    // Fallback if backend is down
    return {
      name: "Error parsing",
      role: "Unknown",
      experience: "N/A",
      location: "N/A",
      education: "N/A",
      skills: ["Error connecting to backend"],
      matchScore: 0,
      summary: "Could not connect to the backend server. Make sure FastAPI is running on port 8000.",
      _rawQuestions: []
    };
  }
}

export async function simulateQuestionGeneration({ analysis }) {
  // We already fetched questions in the single /api/analyze call, so just reshape them
  if (analysis && analysis._rawQuestions && analysis._rawQuestions.length > 0) {
    return analysis._rawQuestions.map(q => ({
      id: q.id || Math.random().toString(36).substr(2, 9),
      label: q.category || "Technical",
      question: q.text || "Question missing text"
    }));
  }
  
  // Fallback
  return [
    {
      id: "err_q",
      label: "Error",
      question: "Could not generate questions. Backend may be unreachable.",
    }
  ];
}

