import React, { useState } from 'react';
import {
  LogIn,
  User,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Mail,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { AppUser } from '../types/khata';
import { signInWithGoogle, loginWithFirebaseEmail, signUpWithFirebaseEmail, GoogleSignInResult } from '../lib/firebase';

interface LoginScreenProps {
  onLogin: (user: AppUser) => void;
  knownMembers?: { id: string; name: string }[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [authMode, setAuthMode] = useState<'GOOGLE' | 'EMAIL' | 'DIRECT'>('GOOGLE');
  const [userNameInput, setUserNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [googleErrorInfo, setGoogleErrorInfo] = useState<{
    code?: string;
    message: string;
    domain?: string;
    instructions?: string;
    projectId?: string;
  } | null>(null);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';

  // Handle Genuine Google Sign In
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      setGoogleErrorInfo(null);
      const res: GoogleSignInResult = await signInWithGoogle();
      if (res.success && res.user) {
        const u = res.user;
        const appUser: AppUser = {
          id: u.uid,
          name: u.displayName || u.email?.split('@')[0] || 'User',
          email: u.email || undefined,
        };
        onLogin(appUser);
      } else if (res.error) {
        setGoogleErrorInfo({
          code: res.code,
          message: res.error,
          domain: res.domain || currentHost,
          instructions: res.instructions,
          projectId: res.projectId || 'dues-d4fe0',
        });
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDomain = () => {
    const domain = googleErrorInfo?.domain || currentHost;
    if (!domain) return;
    navigator.clipboard.writeText(domain);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2500);
  };

  const handleQuickLoginAsUser = (name: string, email?: string) => {
    const clean = name.trim();
    const id = `usr_${clean.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Math.random().toString(36).substring(2, 7)}`;
    onLogin({
      id,
      name: clean,
      email: email || undefined,
    });
  };

  // Handle Firebase Email/Password Sign In or Sign Up
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');

      if (isSignUp) {
        const res = await signUpWithFirebaseEmail(
          emailInput.trim(),
          passwordInput,
          userNameInput.trim() || undefined
        );
        if (res.success && res.user) {
          onLogin({
            id: res.user.uid,
            name: res.user.displayName || userNameInput.trim() || emailInput.split('@')[0],
            email: res.user.email || undefined,
          });
        } else {
          setErrorMsg(res.error || 'Failed to register account.');
        }
      } else {
        const res = await loginWithFirebaseEmail(emailInput.trim(), passwordInput);
        if (res.success && res.user) {
          onLogin({
            id: res.user.uid,
            name: res.user.displayName || emailInput.split('@')[0],
            email: res.user.email || undefined,
          });
        } else {
          setErrorMsg(res.error || 'Invalid email or password.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Direct Real Name Login (Fast offline or direct mode)
  const handleDirectNameLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userNameInput.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    const cleanName = userNameInput.trim();
    // Unique deterministic user ID based on name & timestamp
    const id = `usr_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Math.random().toString(36).substring(2, 7)}`;

    onLogin({
      id,
      name: cleanName,
      email: emailInput.trim() || undefined,
    });
  };

  return (
    <div className="min-h-full w-full bg-slate-950 flex flex-col justify-center items-center py-6 px-3">
      {/* Decorative ambient background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Branding */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 p-6 text-white text-center relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md mb-3 border border-white/20 shadow-inner">
            <span className="text-2xl font-black tracking-tight text-white">DUE</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Friends Khata</h1>
          <p className="text-blue-200/80 text-xs mt-1.5 max-w-xs mx-auto">
            Fair expense splitting, who-owes-whom calculation & verified payment settlement
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Detailed Google OAuth Domain Notice */}
          {googleErrorInfo && googleErrorInfo.code === 'auth/unauthorized-domain' ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-100">Domain Not Authorized in Firebase</h4>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                    Google OAuth requires your current host domain to be whitelisted in Firebase project <strong>dues-d4fe0</strong>.
                  </p>
                </div>
              </div>

              {/* Hostname with Copy Button */}
              <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate">
                  {googleErrorInfo.domain || currentHost}
                </span>
                <button
                  type="button"
                  onClick={handleCopyDomain}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 transition cursor-pointer"
                >
                  {copiedDomain ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedDomain ? 'Copied!' : 'Copy Domain'}</span>
                </button>
              </div>

              <div className="text-[11px] space-y-1 text-amber-900/90 dark:text-amber-300">
                <p className="font-bold">To authorize Google login:</p>
                <ol className="list-decimal pl-4 space-y-0.5 text-[10px]">
                  <li>Open <strong>Firebase Console &gt; Authentication &gt; Settings</strong></li>
                  <li>Under <strong>Authorized domains</strong>, click <strong>Add domain</strong></li>
                  <li>Paste the copied domain and save</li>
                </ol>
              </div>

              {/* Immediate instant login fallback */}
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLoginAsUser('Vaibhav Vats', 'vaibhavvats301@gmail.com')}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold text-center transition cursor-pointer shadow-xs"
                >
                  Continue as Vaibhav Vats (Instant)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('DIRECT');
                    setUserNameInput('Vaibhav Vats');
                    setErrorMsg('');
                  }}
                  className="py-2 px-3 bg-amber-200 dark:bg-amber-900/60 hover:bg-amber-300 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Direct Name Login
                </button>
              </div>
            </div>
          ) : googleErrorInfo && googleErrorInfo.code === 'auth/popup-blocked' ? (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Popup Blocked</h4>
                  <p className="text-[11px] mt-0.5">{googleErrorInfo.message}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickLoginAsUser('Vaibhav Vats', 'vaibhavvats301@gmail.com')}
                  className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold text-center transition"
                >
                  Instant Login as Vaibhav
                </button>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{errorMsg}</p>
                {googleErrorInfo?.instructions && (
                  <p className="text-[11px] font-normal mt-1 opacity-90">{googleErrorInfo.instructions}</p>
                )}
              </div>
            </div>
          ) : null}

          {/* Primary Action: Genuine Google Sign-In */}
          <div className="space-y-3">
            <button
              type="button"
              id="google-signin-btn"
              disabled={isLoading}
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold rounded-2xl text-xs flex items-center justify-center gap-3 transition shadow-xs active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span className="text-sm font-semibold">
                {isLoading ? 'Connecting to Google...' : 'Continue with Google'}
              </span>
            </button>

            <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
              Sign in with your real Google account for real-life group khata
            </p>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Or Sign In With Email / Name
            </span>
          </div>

          {/* Alternative: Email or Direct Name Mode Selector */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode('EMAIL');
                setErrorMsg('');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'EMAIL'
                  ? 'bg-white dark:bg-slate-750 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('DIRECT');
                setErrorMsg('');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                authMode === 'DIRECT'
                  ? 'bg-white dark:bg-slate-750 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Direct Real Name
            </button>
          </div>

          {/* Email / Password Form */}
          {authMode === 'EMAIL' && (
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Your Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vaibhav Vats"
                      value={userNameInput}
                      onChange={(e) => setUserNameInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setErrorMsg('');
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold cursor-pointer"
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/20 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>{isSignUp ? 'Create Real Account' : 'Sign In to My Khata'}</span>
              </button>
            </form>
          )}

          {/* Direct Real Name Form */}
          {authMode === 'DIRECT' && (
            <form onSubmit={handleDirectNameLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Your Real Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vaibhav Vats"
                    value={userNameInput}
                    onChange={(e) => {
                      setUserNameInput(e.target.value);
                      setErrorMsg('');
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="e.g. vaibhav@gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="login-direct-btn"
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-md shadow-blue-500/20 active:scale-[0.99] cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Enter Khata App</span>
                <ArrowRight className="w-4 h-4 ml-auto" />
              </button>
            </form>
          )}

          {/* Trust and privacy indicator */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Secure account access. Expenses and settlement payments stay private to your group.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
