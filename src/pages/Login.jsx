import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Briefcase } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { loginAsRecruiter, loginAsCandidate } = useAuth();

  const handleRecruiterLogin = () => {
    loginAsRecruiter();
    navigate('/dashboard');
  };

  const handleCandidateLogin = () => {
    loginAsCandidate();
    navigate('/interview');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="z-10 bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md bg-gradient-to-b from-slate-900/80 to-slate-900/40">
        
        <div className="text-center mb-10">
          <div className="mx-auto h-16 w-16 mb-6 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-slate-950 text-2xl font-bold shadow-lg shadow-teal-500/20 ring-1 ring-teal-300/60 ring-offset-4 ring-offset-slate-950">
            IA
          </div>
          <h1 className="text-3xl font-bold text-slate-100 tracking-tight mb-2">InterviewAI</h1>
          <p className="text-slate-400 text-sm">Sign in to continue to the portal</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleRecruiterLogin}
            className="w-full group relative flex items-center justify-between p-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-teal-500/50 transition-all duration-300 overflow-hidden"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 group-hover:scale-110 group-hover:bg-teal-500/20 transition-all">
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="text-slate-200 font-semibold group-hover:text-teal-300 transition-colors">Recruiter Portal</h3>
                <p className="text-slate-500 text-xs mt-0.5">Upload resumes & review candidates</p>
              </div>
            </div>
          </button>

          <button
            onClick={handleCandidateLogin}
            className="w-full group relative flex items-center justify-between p-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-indigo-500/50 transition-all duration-300 overflow-hidden"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
                <User className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="text-slate-200 font-semibold group-hover:text-indigo-300 transition-colors">Candidate Portal</h3>
                <p className="text-slate-500 text-xs mt-0.5">Join your live interview session</p>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
          <p className="text-xs text-slate-500">
            By logging in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

      </div>
    </div>
  );
}
