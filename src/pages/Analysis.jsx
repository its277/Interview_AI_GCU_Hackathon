import { useEffect, useState, useMemo } from "react";
import ResumeAnalysisCard from "../components/ResumeAnalysisCard";
import SkillBar from "../components/SkillBar";
import QuestionList from "../components/QuestionList";
import {
  AlertTriangle,
  RefreshCw,
  Users,
  BarChart3,
  Award,
  User,
  Calendar,
  CheckCircle,
  Clock,
} from "lucide-react";

export default function Analysis({
  jobDescription,
  resumeFile,
  analysis,
  questions,
  onAnalyze,
  isAnalyzing,
  stage,
  onStartInterview,
}) {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = [
    "Fetching all candidates...",
    "Loading performance metrics...",
    "Calculating skill breakdowns...",
    "Preparing detailed view...",
  ];

  // ────────────────────────────────────────────────
  //  Fetch & Refresh Logic
  // ────────────────────────────────────────────────

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/candidates");
      if (!res.ok) throw new Error(`Server responded: ${res.status}`);
      const data = await res.json();

      if (!Array.isArray(data)) {
        throw new Error("Invalid response format – expected array");
      }

      setCandidates(data);

      // Auto-select best candidate if nothing is selected
      if (data.length > 0 && !selectedCandidateId) {
        const sortedByScore = [...data].sort((a, b) => (b.score || 0) - (a.score || 0));
        setSelectedCandidateId(sortedByScore[0]?.id || data[data.length - 1]?.id);
      }
    } catch (err) {
      console.error("Candidates fetch failed:", err);
      setError("Failed to load candidates. Please check if backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  // ────────────────────────────────────────────────
  //  Analyzing animation
  // ────────────────────────────────────────────────

  useEffect(() => {
    if (!isAnalyzing) {
      setLoadingStep(0);
      return;
    }

    const timer = setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, loadingMessages.length - 1));
    }, 900);

    return () => clearInterval(timer);
  }, [isAnalyzing]);

  // ────────────────────────────────────────────────
  //  Derived values
  // ────────────────────────────────────────────────

  const selectedCandidate = useMemo(
    () => candidates.find((c) => c.id === selectedCandidateId) || null,
    [candidates, selectedCandidateId]
  );

  const stats = useMemo(() => {
    if (candidates.length === 0) {
      return { total: 0, avgScore: 0, topScore: 0, interviewed: 0 };
    }

    const scores = candidates.map((c) => Number(c.score) || 0);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) || 0;
    const top = Math.max(...scores) || 0;
    const interviewed = candidates.filter((c) => c.status?.toLowerCase().includes("interview")).length;

    return { total: candidates.length, avgScore: avg, topScore: top, interviewed };
  }, [candidates]);

  const skills = useMemo(() => {
    if (!selectedCandidate) return [];

    const fallback = analysis?.scorecard?.skills || {};

    return [
      { label: "Technical Depth", value: selectedCandidate.interview?.technical ?? fallback.technical ?? 70 },
      { label: "Communication", value: selectedCandidate.interview?.communication ?? fallback.communication ?? 65 },
      { label: "Problem Solving", value: selectedCandidate.interview?.problem_solving ?? fallback.problemSolving ?? 68 },
      { label: "Culture Fit", value: selectedCandidate.interview?.culture ?? fallback.cultureAdd ?? 72 },
      { label: "Experience Match", value: fallback.experienceMatch ?? 75 },
    ];
  }, [selectedCandidate, analysis]);

  const showEmptyState = candidates.length === 0 && !resumeFile && !isAnalyzing;

  // ────────────────────────────────────────────────
  //  Render
  // ────────────────────────────────────────────────

  if (showEmptyState) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <AlertTriangle className="h-16 w-16 text-amber-500 mb-6" />
        <h2 className="text-2xl font-bold text-slate-100 mb-3">No Candidates Yet</h2>
        <p className="text-slate-400 max-w-md mb-8">
          Upload resumes and add job descriptions from the Dashboard to start seeing AI-powered analysis and performance insights.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 md:px-10 py-8 space-y-8">
      {/* Top Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatBox icon={Users} title="Total Candidates" value={stats.total} color="teal" />
        <StatBox icon={BarChart3} title="Average Score" value={`${stats.avgScore}%`} color="emerald" />
        <StatBox icon={Award} title="Top Score" value={`${stats.topScore}%`} color="amber" />
        <StatBox icon={CheckCircle} title="Interviewed" value={stats.interviewed} color="cyan" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">
        {/* Left column – List + Details */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-slate-50">Candidate Performance Overview</h1>
            <button
              onClick={fetchCandidates}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="bg-rose-950/50 border border-rose-800/60 rounded-xl p-4 text-rose-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-10 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-700 border-t-teal-500 mb-6" />
              <p className="text-slate-300 text-lg">{loadingMessages[loadingStep]}</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-12 text-center">
              <Users className="h-14 w-14 text-slate-600 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No candidates found</h3>
              <p className="text-slate-500">Upload resumes from Dashboard to begin analysis.</p>
            </div>
          ) : (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/80 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-left font-medium text-slate-300">Candidate</th>
                    <th className="px-6 py-4 text-left font-medium text-slate-300">Score</th>
                    <th className="px-6 py-4 text-left font-medium text-slate-300">Status</th>
                    <th className="px-6 py-4 text-left font-medium text-slate-300">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => {
                    const isSelected = candidate.id === selectedCandidateId;
                    const score = Number(candidate.score) || 0;
                    const scoreColor =
                      score >= 80 ? "text-emerald-400" :
                      score >= 65 ? "text-amber-400" :
                      score > 0   ? "text-rose-400" : "text-slate-500";

                    return (
                      <tr
                        key={candidate.id}
                        onClick={() => setSelectedCandidateId(candidate.id)}
                        className={`border-b border-slate-800 cursor-pointer transition-colors hover:bg-slate-800/60 ${
                          isSelected ? "bg-teal-950/40 border-l-4 border-l-teal-500" : ""
                        }`}
                      >
                        <td className="px-6 py-4 font-medium text-slate-200 flex items-center gap-3">
                          <User className="h-4 w-4 text-slate-500" />
                          {candidate.name || "Unnamed Candidate"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-bold ${scoreColor}`}>
                            {score > 0 ? `${score}%` : "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {candidate.status || (score > 0 ? "Evaluated" : "Pending")}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {candidate.date
                            ? new Date(candidate.date).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Selected candidate details */}
          {selectedCandidate && !isAnalyzing && (
            <div className="space-y-6 pt-4">
              <ResumeAnalysisCard analysis={selectedCandidate.analysis || analysis} />
              <QuestionList questions={selectedCandidate.questions || questions || []} />
            </div>
          )}

          {isAnalyzing && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 mt-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-5">Processing New Resume</h3>
              <div className="space-y-4">
                {loadingMessages.map((msg, idx) => (
                  <div key={msg} className="flex items-center gap-3">
                    <div
                      className={`h-3 w-3 rounded-full transition-all duration-300 ${
                        idx <= loadingStep ? "bg-teal-400 scale-125" : "bg-slate-700"
                      }`}
                    />
                    <span className={idx === loadingStep ? "text-teal-300 font-medium" : "text-slate-500"}>
                      {msg}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar – Selected candidate summary */}
        <aside className="space-y-6">
          {selectedCandidate ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-100">
                    {selectedCandidate.name || "Selected Candidate"}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {selectedCandidate.date ? new Date(selectedCandidate.date).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${selectedCandidate.score >= 80 ? "text-emerald-400" : selectedCandidate.score >= 65 ? "text-amber-400" : "text-rose-400"}`}>
                    {selectedCandidate.score ? `${selectedCandidate.score}%` : "—"}
                  </div>
                  <p className="text-xs text-slate-500">Overall Score</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {skills.map((skill) => (
                  <SkillBar key={skill.label} label={skill.label} value={skill.value} />
                ))}
              </div>

              <button
                type="button"
                disabled={stage !== "ready"}
                onClick={() => onStartInterview?.(selectedCandidate)}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {stage === "ready" ? "Start / Continue Interview" : "Interview not ready"}
              </button>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center py-20">
              <User className="h-12 w-12 text-slate-600 mx-auto mb-6" />
              <h3 className="text-lg font-semibold text-slate-300 mb-2">No candidate selected</h3>
              <p className="text-slate-500">Click a candidate in the list to view detailed performance</p>
            </div>
          )}

          {/* Analyze new resume section */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-slate-200 mb-4">New Resume Analysis</h3>
            <button
              type="button"
              disabled={isAnalyzing || !jobDescription || !resumeFile}
              onClick={onAnalyze}
              className="w-full py-3.5 px-6 rounded-xl bg-teal-600 hover:bg-teal-500 text-slate-950 font-semibold shadow-lg disabled:opacity-60 transition-colors"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze New Resume"}
            </button>
            <p className="text-xs text-slate-500 mt-3 text-center">
              Upload from Dashboard to add new candidate
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Small helper component for stats cards
function StatBox({ icon: Icon, title, value, color }) {
  const colorClasses = {
    teal: "text-teal-400 bg-teal-950/30 border-teal-900/50",
    emerald: "text-emerald-400 bg-emerald-950/30 border-emerald-900/50",
    amber: "text-amber-400 bg-amber-950/30 border-amber-900/50",
    cyan: "text-cyan-400 bg-cyan-950/30 border-cyan-900/50",
  };

  return (
    <div className={`rounded-2xl border p-5 flex items-center gap-4 ${colorClasses[color] || "text-slate-300"}`}>
      <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}