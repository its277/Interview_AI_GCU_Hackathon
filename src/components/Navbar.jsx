import { LayoutDashboard, Mic, Sparkles, LogOut } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function Navbar(){

  const location = useLocation()
  const navigate = useNavigate()
  const { userRole, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Define items based on role
  let items = []
  if (userRole === 'recruiter') {
    items = [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { id: "analysis", label: "Analysis", icon: Sparkles, path: "/analysis" },
      { id: "interview", label: "Live Interview", icon: Mic, path: "/interview" },
      { id: "scorecard", label: "Scorecard", icon: Sparkles, path: "/scorecard" },
    ]
  } else if (userRole === 'candidate') {
    items = [
      { id: "dashboard", label: "Upload CV", icon: LayoutDashboard, path: "/dashboard" },
      { id: "interview", label: "Live Interview", icon: Mic, path: "/interview" },
    ]
  }

  return(

  <header className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur flex justify-between items-center px-8 py-4 border-b border-slate-800/80 shadow-[0_1px_0_0_rgba(15,23,42,0.9)]">

    <div className="flex gap-3 items-center">

      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-slate-950 text-sm font-bold shadow-lg shadow-teal-500/40 ring-1 ring-teal-300/60 ring-offset-2 ring-offset-slate-950">
        IA
      </div>

      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold tracking-tight">InterviewAI</h1>
        <span className="text-[10px] uppercase tracking-wide bg-teal-500/15 text-teal-300 px-2 py-0.5 rounded-full border border-teal-400/30">
          Beta
        </span>
      </div>

    </div>

    {userRole && (
      <nav className="flex gap-2 rounded-full bg-slate-900/60 border border-slate-800 px-2 py-1 text-sm text-slate-300 shadow-[0_0_0_1px_rgba(15,23,42,0.7)]">
        {items.map(item => {
          const isActive = location.pathname.startsWith(item.path)
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className={`group relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "text-teal-100 bg-slate-900 shadow-[0_0_0_1px_rgba(45,212,191,0.25)]"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80"
              }`}
            >
              <Icon className="h-3.5 w-3.5 opacity-80 group-hover:opacity-100" />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute left-0 right-0 -bottom-1 h-0.5 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400" />
              )}
            </button>
          )
        })}
      </nav>
    )}

    <div className="flex items-center gap-4">

      {userRole === 'candidate' && (
        <div className="flex items-center gap-1 text-xs text-emerald-300 mr-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="uppercase tracking-wide text-[10px]">
            Live session
          </span>
        </div>
      )}

      {userRole && (
        <>
          <div className="flex items-center gap-2">
            <div className="text-right text-xs">
              <p className="text-slate-200">{userRole === 'recruiter' ? 'Jasmine D.' : 'Jane Doe'}</p>
              <p className="text-slate-500 capitalize">{userRole}</p>
            </div>
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-xs font-semibold border ${
              userRole === 'recruiter' 
                ? 'from-slate-700 to-slate-900 border-slate-600'
                : 'from-indigo-600 to-indigo-900 border-indigo-500'
            }`}>
              {userRole === 'recruiter' ? 'JD' : 'C'}
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="ml-2 p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-full transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </>
      )}

    </div>

  </header>

  )

}
