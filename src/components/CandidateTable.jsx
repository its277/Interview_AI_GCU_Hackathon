import { useState, useEffect } from "react"

const statusStyles = {
  LIVE: "bg-emerald-500/15 text-emerald-300 border-emerald-400/40",
  Interviewed: "bg-slate-800 text-slate-200 border-slate-500/50",
  Pending: "bg-amber-500/10 text-amber-200 border-amber-400/40",
}

export default function CandidateTable(){
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('http://localhost:8000/api/candidates')
      .then(res => res.json())
      .then(json => {
        // Sort newest first
        if (Array.isArray(json)) {
          const sorted = json.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp))
          setData(sorted)
        }
      })
      .catch(err => console.error("Error fetching candidates:", err))
      .finally(() => setLoading(false))
  }, [])

return(

<div className="bg-slate-900/70 rounded-2xl border border-slate-800 shadow-[0_24px_60px_rgba(15,23,42,0.9)] overflow-hidden">

  <div className="flex items-center justify-between px-6 pt-5 pb-3">
    <div>
      <h2 className="text-sm font-semibold tracking-tight text-slate-50">
        Recent candidates
      </h2>
      <p className="text-[11px] text-slate-500 mt-1">
        Live pipeline synced from ATS · updated a few seconds ago
      </p>
    </div>
    <span className="text-[11px] text-slate-500">
      {data.length} in view
    </span>
  </div>

  <div className="border-t border-slate-800/80">
    <table className="w-full text-left text-sm">

      <thead className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-950/50">
        <tr>
          <th className="px-6 py-2.5 font-medium">Candidate</th>
          <th className="px-4 py-2.5 font-medium">Score</th>
          <th className="px-4 py-2.5 font-medium">Status</th>
          <th className="px-4 py-2.5 font-medium text-right">Verdict</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-slate-800/80">
        {data.map((c, i) => {
          const initials = c.name.split(" ").map(n => n[0]).join("").slice(0, 2)
          const isLive = c.status === "LIVE"
          return (
            <tr
              key={i}
              className="group hover:bg-slate-900/80 transition-colors"
            >
              <td className="px-6 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-100 border border-slate-600 group-hover:border-teal-400/60 group-hover:bg-slate-900">
                      {initials}
                    </div>
                    {isLive && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-slate-100">
                      {c.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {c.exp}
                    </div>
                  </div>
                </div>
              </td>

              <td className="px-4 py-3.5 align-middle">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-1 text-xs text-slate-100 border border-slate-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                  {c.score}
                </span>
              </td>

              <td className="px-4 py-3.5 align-middle">
                <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] ${
                  statusStyles[c.status] ?? "bg-slate-800 text-slate-200 border-slate-600"
                }`}>
                  {c.status}
                </span>
              </td>

              <td className="px-4 py-3.5 align-middle text-right">
                <span className="text-xs font-medium text-emerald-300">
                  {c.verdict}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>

    </table>
  </div>

</div>

)

}
