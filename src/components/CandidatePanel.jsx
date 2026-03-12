import { useEffect, useState } from "react";
import SkillBar from "./SkillBar";

export default function CandidatePanel() {
  const [candidate, setCandidate] = useState(null);

  const fetchCandidates = () => {
    fetch("http://127.0.0.1:8000/api/candidates")
      .then((res) => res.json())
      .then((data) => {
        if (data.length === 0) return;

        const best = data.reduce((prev, current) => {
          return (current.score || 0) > (prev.score || 0) ? current : prev;
        });

        setCandidate(best);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchCandidates();

    const interval = setInterval(fetchCandidates, 5000);

    return () => clearInterval(interval);
  }, []);

  const name = candidate?.name || "No Candidate";
  const role = candidate?.exp || "Applicant";
  const score = candidate?.score || 0;
  const verdict = candidate?.verdict || "Pending";

  const skills = [
    { label: "Technical depth", value: score },
    { label: "Communication", value: Math.max(score - 5, 40) },
    { label: "Problem solving", value: Math.max(score - 3, 40) },
    { label: "Culture add", value: Math.min(score + 2, 100) },
    { label: "Experience match", value: Math.max(score - 4, 40) },
  ];

  return (
    <div className="bg-slate-900/70 p-6 rounded-2xl border border-slate-800 shadow-[0_22px_55px_rgba(15,23,42,0.9)] hover:border-teal-400/40 hover:shadow-[0_28px_70px_rgba(15,23,42,1)] hover:-translate-y-0.5 transition-all duration-200 animate-soft-glow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{name}</h2>

          <p className="text-xs text-slate-400 mt-1">{role}</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
            {verdict}
          </span>

          <span className="text-[10px] uppercase tracking-wide text-slate-500">
            AI Fit Score
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6 mb-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border border-teal-400/40 bg-slate-950 flex items-center justify-center shadow-[0_0_40px_rgba(45,212,191,0.25)] animate-slow-pulse">
            <span className="text-3xl font-semibold text-teal-300">
              {score}
            </span>
          </div>

          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wide text-slate-400">
            Highest Match
          </div>
        </div>

        <div className="space-y-1 text-xs text-slate-400">
          <p>
            Role: <span className="text-slate-200">{role}</span>
          </p>
          <p>
            Location: <span className="text-slate-200">Remote</span>
          </p>
          <p>
            Last interview: <span className="text-slate-200">Recently</span>
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-4 text-[11px] text-slate-400">
        <p>
          This candidate currently holds the highest AI evaluation score among
          all interviewed applicants.
        </p>
      </div>

      <div className="mt-6">
        {skills.map((skill) => (
          <SkillBar key={skill.label} label={skill.label} value={skill.value} />
        ))}
      </div>
    </div>
  );
}
