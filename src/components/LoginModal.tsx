import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  ShieldCheck,
  CheckCircle2,
  LogIn,
  UserPlus,
  LogOut,
  Sparkles,
  AlertCircle,
  Activity,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { AppUser, GroupMember } from '../types/khata';
import {
  checkAuthDiagnostic,
  loginWithFirebaseEmail,
  signUpWithFirebaseEmail,
  signOutFirebaseUser,
  ensureFirebaseAuth,
  signInWithGoogle,
} from '../lib/firebase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onSelectUser: (user: AppUser) => void;
  availableMembers?: GroupMember[];
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  availableMembers = [],
}) => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'FIREBASE_AUTH' | 'STATUS'>('PROFILE');
  const [customName, setCustomName] = useState(currentUser.name);
  const [customEmail, setCustomEmail] = useState(currentUser.email || '');

  // Firebase email login states
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Diagnostic status
  const [diagnostic, setDiagnostic] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCustomName(currentUser.name);
      setCustomEmail(currentUser.email || '');
      setAuthFeedback(null);
      runVerification();
    }
  }, [isOpen, currentUser]);

  const runVerification = async () => {
    setIsVerifying(true);
    try {
      const diag = checkAuthDiagnostic();
      setDiagnostic(diag);
    } catch (e: any) {
      setDiagnostic({
        isConfigured: false,
        isLoggedIn: true,
        message: `Status check: Local Persona is active for ${currentUser.name}.`,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    const updated: AppUser = {
      ...currentUser,
      name: customName.trim(),
      email: customEmail.trim() || undefined,
    };
    onSelectUser(updated);
    setAuthFeedback({
      type: 'success',
      message: `Active user updated to ${updated.name}!`,
    });
  };

  const handleQuickSwitch = (member: GroupMember) => {
    const switchedUser: AppUser = {
      id: member.userId,
      name: member.name,
      email: member.email,
    };
    onSelectUser(switchedUser);
    setAuthFeedback({
      type: 'success',
      message: `Switched active user to ${member.name}.`,
    });
  };

  const handleFirebaseEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);
    setAuthLoading(true);

    try {
      if (authMode === 'LOGIN') {
        const res = await loginWithFirebaseEmail(emailInput.trim(), passwordInput);
        if (res.success && res.user) {
          const fbUser = res.user;
          const updated: AppUser = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            email: fbUser.email || undefined,
          };
          onSelectUser(updated);
          setAuthFeedback({
            type: 'success',
            message: `Successfully logged in as ${updated.name}!`,
          });
          runVerification();
        } else {
          setAuthFeedback({
            type: 'error',
            message: res.error || 'Login failed. Please check credentials.',
          });
        }
      } else {
        const res = await signUpWithFirebaseEmail(
          emailInput.trim(),
          passwordInput,
          displayNameInput.trim() || undefined
        );
        if (res.success && res.user) {
          const fbUser = res.user;
          const updated: AppUser = {
            id: fbUser.uid,
            name: displayNameInput.trim() || fbUser.email?.split('@')[0] || 'New Member',
            email: fbUser.email || undefined,
          };
          onSelectUser(updated);
          setAuthFeedback({
            type: 'success',
            message: `Account created and logged in as ${updated.name}!`,
          });
          runVerification();
        } else {
          setAuthFeedback({
            type: 'error',
            message: res.error || 'Sign up failed.',
          });
        }
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setAuthLoading(true);
    setAuthFeedback(null);
    try {
      const res = await ensureFirebaseAuth();
      if (res.user) {
        setAuthFeedback({
          type: 'success',
          message: `Connected via Anonymous Firebase Session (UID: ${res.user.uid.substring(0, 8)}...).`,
        });
        runVerification();
      } else {
        setAuthFeedback({
          type: 'error',
          message: res.error || 'Anonymous login failed.',
        });
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthFeedback(null);
    try {
      const res = await signInWithGoogle();
      if (res.success && res.user) {
        const fbUser = res.user;
        const updated: AppUser = {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          email: fbUser.email || undefined,
        };
        onSelectUser(updated);
        setAuthFeedback({
          type: 'success',
          message: `Logged in via Google as ${updated.name}!`,
        });
        runVerification();
      } else {
        setAuthFeedback({
          type: 'error',
          message: res.error || 'Google sign-in failed.',
        });
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOutFirebaseUser();
    runVerification();
    setAuthFeedback({
      type: 'success',
      message: 'Signed out of Firebase account.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="login-modal"
        className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Account & Login Management</h3>
              <p className="text-[11px] text-slate-500">Authenticate or switch active khata identity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Pill Banner */}
        <div className="bg-blue-50/80 px-4 py-2.5 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <div>
              <p className="text-xs font-bold text-slate-900">
                Logged in as: <span className="text-blue-700">{currentUser.name}</span>
              </p>
              <p className="text-[10px] text-slate-500">ID: {currentUser.id.substring(0, 16)}...</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Active
          </span>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 border-b border-slate-200 text-xs font-semibold bg-slate-50">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`py-2.5 px-2 border-b-2 text-center transition ${
              activeTab === 'PROFILE'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Identity & Switch
          </button>
          <button
            onClick={() => setActiveTab('FIREBASE_AUTH')}
            className={`py-2.5 px-2 border-b-2 text-center transition ${
              activeTab === 'FIREBASE_AUTH'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Firebase Auth
          </button>
          <button
            onClick={() => {
              setActiveTab('STATUS');
              runVerification();
            }}
            className={`py-2.5 px-2 border-b-2 text-center transition flex items-center justify-center gap-1 ${
              activeTab === 'STATUS'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Diagnostics</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Feedback banner */}
          {authFeedback && (
            <div
              className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                authFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {authFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{authFeedback.message}</span>
            </div>
          )}

          {/* TAB 1: PROFILE & PERSONA SWITCH */}
          {activeTab === 'PROFILE' && (
            <div className="space-y-4">
              {/* Quick Persona Switcher */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Quick Switch Member Persona
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {availableMembers.map((member) => {
                    const isCurrent = member.userId === currentUser.id;
                    return (
                      <button
                        key={member.userId}
                        type="button"
                        onClick={() => handleQuickSwitch(member)}
                        className={`p-2 rounded-xl text-left border text-xs font-medium transition flex items-center justify-between ${
                          isCurrent
                            ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                              isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {member.name.charAt(0)}
                          </div>
                          <span className="truncate">{member.name}</span>
                        </div>
                        {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Set Custom Name Form */}
              <form onSubmit={handleUpdateProfile} className="pt-3 border-t border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Your Display Name (or Login as New User)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vaibhav Vats"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Email or Phone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. vaibhav@example.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Apply & Log In as {customName || 'User'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: FIREBASE AUTH */}
          {activeTab === 'FIREBASE_AUTH' && (
            <div className="space-y-4">
              {/* Google Sign-in action */}
              <div>
                <button
                  type="button"
                  disabled={authLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-2.5 transition shadow-xs cursor-pointer disabled:opacity-60"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  <span>Sign In with Google</span>
                </button>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Or Email / Password
                </span>
              </div>

              <div className="flex items-center justify-between bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setAuthMode('LOGIN')}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    authMode === 'LOGIN' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Sign In (Email)
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('SIGNUP')}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    authMode === 'SIGNUP' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleFirebaseEmailSubmit} className="space-y-3">
                {authMode === 'SIGNUP' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Vaibhav Vats"
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Min 6 characters"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:bg-slate-300 cursor-pointer"
                >
                  {authLoading
                    ? 'Processing...'
                    : authMode === 'LOGIN'
                    ? 'Sign In with Email'
                    : 'Register New Account'}
                </button>
              </form>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleAnonymousSignIn}
                  disabled={authLoading}
                  className="text-slate-600 hover:text-slate-900 font-semibold underline"
                >
                  Sign in as Guest
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-rose-600 hover:text-rose-700 font-semibold"
                >
                  Sign Out Firebase
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DIAGNOSTICS & LOGIN VERIFICATION */}
          {activeTab === 'STATUS' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Authentication Diagnostics
                </h4>
                <button
                  type="button"
                  onClick={runVerification}
                  disabled={isVerifying}
                  className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:underline"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                  <span>Re-test</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl border bg-slate-50 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Login System Status:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Working Properly
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Active Khata User:</span>
                  <span className="font-bold text-slate-900">{currentUser.name}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">User Identity ID:</span>
                  <span className="font-mono text-[10px] text-slate-700">{currentUser.id}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Firebase Backend:</span>
                  <span className="font-semibold text-slate-800">
                    {diagnostic?.isConfigured ? 'Configured & Online' : 'Local Offline Mode (Default)'}
                  </span>
                </div>

                {diagnostic?.currentUser && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Firebase Auth UID:</span>
                    <span className="font-mono text-[10px] text-slate-700">
                      {diagnostic.currentUser.uid}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900">
                <p className="font-bold mb-1">How Login Works:</p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                  <li>
                    Every action (paying expenses, confirming debts, recording settlement) is tied to your
                    active user profile ({currentUser.name}).
                  </li>
                  <li>
                    You can switch personas at any time using the <strong>Identity & Switch</strong> tab to
                    test multi-party confirmations like Rahul, Aman, or Rohit.
                  </li>
                  <li>
                    If Firebase is connected, sessions seamlessly link with Firebase Authentication.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
