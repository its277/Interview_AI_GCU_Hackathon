import { useEffect, useState } from "react";
import SkillBar from "../components/SkillBar";

export default function Scorecard({ analysis }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- FETCH DATA ---------------- */

  const fetchCandidates = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/candidates");
      const data = await res.json();

      if (Array.isArray(data)) {
        setCandidates(data);
      }
    } catch (err) {
      console.error("Error fetching candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  /* ---------------- UI ---------------- */

  return (
    <div className="px-10 py-8 space-y-10">
      {loading && (
        <p className="text-sm text-slate-400">Loading scorecards...</p>
      )}

      {!loading && candidates.length === 0 && (
        <p className="text-sm text-slate-400">No candidates found</p>
      )}

      {candidates.map((candidate) => {
        /* SAFE DATA PARSING */

        const name = candidate?.name || "Candidate";
        const role = candidate?.exp || "Applicant";
        const score = Number(candidate?.score) || 0;
        const verdict = candidate?.verdict || "Pending";

        const initials = name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        /* Resume Skills Safety */

        let resumeSkills = [];

        if (Array.isArray(candidate?.resume_skills)) {
          resumeSkills = candidate.resume_skills;
        } else if (typeof candidate?.resume_skills === "string") {
          resumeSkills = candidate.resume_skills.split(",");
        }

        /* Skill calculation */

        const skills = [
          {
            label: "Technical knowledge",
            value: analysis?.scorecard?.skills?.technical ?? score,
          },

          {
            label: "Communication",
            value:
              analysis?.scorecard?.skills?.communication ??
              Math.round(score * 0.9),
          },

          {
            label: "Problem solving",
            value:
              analysis?.scorecard?.skills?.problemSolving ??
              Math.round(score * 0.95),
          },

          {
            label: "Cultural fit",
            value:
              analysis?.scorecard?.skills?.culturalFit ??
              Math.round(score * 0.85),
          },

          {
            label: "Experience match",
            value:
              analysis?.scorecard?.skills?.experienceMatch ??
              Math.round(score * 0.9),
          },
        ];

        return (
          <div
            key={candidate.id || candidate.name}
            className="grid grid-cols-1 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1.1fr)] gap-8 items-start"
          >
            <div className="space-y-6">
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-[0_22px_55px_rgba(15,23,42,0.9)]">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-slate-950 font-semibold">
                    {initials}
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Candidate scorecard
                    </p>

                    <p className="text-lg font-semibold">
                      {name} · {role}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 min-w-[180px]">
                  <div className="w-20 h-20 rounded-full border-2 border-teal-400/70 bg-slate-950 flex items-center justify-center">
                    <span className="text-3xl font-semibold text-teal-300">
                      {(score / 10).toFixed(1)}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium bg-emerald-500/15 text-emerald-200 border border-emerald-400/50">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                    {verdict}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE */}

            <aside className="space-y-6">
              {/* Skill Breakdown */}

              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Skill breakdown
                  </p>

                  <span className="text-xs text-slate-300">
                    Derived from resume & interview
                  </span>
                </div>

                <div className="space-y-1">
                  {skills.map((skill) => (
                    <SkillBar
                      key={skill.label}
                      label={skill.label}
                      value={skill.value}
                    />
                  ))}
                </div>
              </div>

              {/* Resume Skills */}

              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                <p className="text-xs uppercase tracking-wide text-slate-400 mb-4">
                  Parsed resume skills
                </p>

                {resumeSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {resumeSkills.map((skill, i) => (
                      <span
                        key={i}
                        className="text-xs px-3 py-1 rounded-full bg-teal-500/10 border border-teal-400/30 text-teal-200"
                      >
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    No skills detected from resume
                  </p>
                )}
              </div>
            </aside>
          </div>
        );
      })}
    </div>
  );
}
