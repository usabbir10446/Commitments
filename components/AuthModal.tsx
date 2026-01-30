
import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { UserRole } from '../types';
import { LogIn, UserPlus, Mail, Lock, Loader2, Activity, AlertCircle, Globe, Copy, Check, Info, RefreshCw, Shield, Eye } from 'lucide-react';

const AuthModal: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.VIEWER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [currentHostname, setCurrentHostname] = useState('');

  useEffect(() => {
    setCurrentHostname(window.location.hostname || 'localhost');
  }, []);

  const formatErrorMessage = (err: any) => {
    const errorCode = err.code || '';
    const errorMsg = err.message || '';
    
    if (errorCode === 'auth/unauthorized-domain' || errorMsg.includes('unauthorized-domain')) {
      return `SECURITY BLOCK: Unauthorized Domain.`;
    }
    if (errorMsg.includes('No acct found')) {
      return "No acct found. You need to create a new acct sir.";
    }
    return errorMsg || 'Authentication failed';
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await authService.signIn(email, password);
      } else {
        await authService.signUp(email, password, selectedRole);
      }
    } catch (err: any) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await authService.signInWithGoogle(!isLogin, selectedRole);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(formatErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const copyHostname = () => {
    navigator.clipboard.writeText(currentHostname);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDomainError = error.includes('SECURITY BLOCK');

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900 p-4 sm:p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.15),transparent)] pointer-events-none" />
      
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 sm:p-12 relative animate-in zoom-in-95 duration-500 overflow-hidden my-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Activity className="text-sky-400 w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">
            Daily <span className="text-indigo-600">Cmt</span>
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Access Portal</p>
        </div>

        {error && (
          <div className={`mb-6 p-5 rounded-[1.5rem] flex flex-col gap-3 animate-in slide-in-from-top-2 border shadow-sm ${
            isDomainError ? 'bg-rose-50 border-rose-200 text-rose-700' : 
            error.includes('No acct found') ? 'bg-amber-50 border-amber-200 text-amber-700' : 
            'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-black leading-tight uppercase tracking-wide">
                  {isDomainError ? "Security Block Detected" : "Auth Notification"}
                </span>
                <span className="text-[11px] font-bold leading-relaxed whitespace-pre-wrap">{error}</span>
              </div>
            </div>

            {isDomainError && (
              <div className="mt-2 space-y-4">
                <div className="p-3 bg-white border border-rose-200 rounded-xl shadow-inner">
                  <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-2">Target Hostname:</p>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-[12px] font-mono font-black text-slate-800 break-all bg-slate-100 px-2 py-1 rounded">
                      {currentHostname}
                    </code>
                    <button 
                      onClick={copyHostname}
                      className="shrink-0 p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all active:scale-90"
                      title="Copy hostname"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-rose-800 uppercase flex items-center gap-1">
                    <Info size={12} /> Troubleshoot Project "cmtbipsot":
                  </p>
                  <ul className="text-[10px] font-medium text-rose-700 space-y-1.5 ml-4 list-disc">
                    <li>Add <span className="font-bold underline">{currentHostname}</span> to Authorized Domains.</li>
                    <li>If testing locally, also add <span className="font-bold">127.0.0.1</span>.</li>
                    <li><span className="font-bold">CRITICAL:</span> Do not include <code className="bg-rose-100 px-1">http://</code> in the Firebase list.</li>
                    <li>Firebase updates can take <span className="font-bold">60-90 seconds</span> to sync.</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => window.location.reload()}
                    className="w-full bg-rose-100 text-rose-700 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-rose-200 transition-all"
                  >
                    <RefreshCw size={14} /> Force Refresh App
                  </button>
                  <a 
                    href="https://console.firebase.google.com/project/cmtbipsot/authentication/settings" 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-center text-[9px] font-black text-rose-500 underline uppercase tracking-widest py-1"
                  >
                    Open Firebase Settings
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {!isLogin && (
            <div className="mb-4">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Select Access Level</label>
              <div className="flex p-1 bg-slate-50 rounded-2xl border border-slate-100">
                <button 
                  type="button"
                  onClick={() => setSelectedRole(UserRole.VIEWER)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider ${selectedRole === UserRole.VIEWER ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                >
                  <Eye size={14} /> Viewer
                </button>
                <button 
                  type="button"
                  onClick={() => setSelectedRole(UserRole.ADMIN)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-wider ${selectedRole === UserRole.ADMIN ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}
                >
                  <Shield size={14} /> Admin
                </button>
              </div>
            </div>
          )}

          <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white border-2 border-slate-100 hover:border-indigo-100 text-slate-700 font-bold py-4 rounded-2xl shadow-sm uppercase tracking-widest text-[10px] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isLogin ? "Continue with Google" : "Register with Google"}
              </>
            )}
          </button>

          <div className="relative flex items-center justify-center py-2">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">OR</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
              <input 
                type="email" 
                placeholder="Email address" 
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl pl-14 pr-6 py-4 outline-none font-bold transition-all text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl pl-14 pr-6 py-4 outline-none font-bold transition-all text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-indigo-100 uppercase tracking-widest text-[10px] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : isLogin ? (
                <><LogIn size={18} /> Login to Dashboard</>
              ) : (
                <><UserPlus size={18} /> Register Account</>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }} 
              className="text-indigo-600 font-black uppercase tracking-widest text-[10px] hover:underline"
            >
              {isLogin ? "Create new account" : "Back to login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
