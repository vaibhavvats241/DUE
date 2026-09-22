import React, { useState } from 'react';
import { X, Plus, UserPlus, Sparkles, CheckCircle2, AlertTriangle, Bug, Terminal } from 'lucide-react';
import { getSavedFirebaseConfig, initFirebase, ensureFirebaseAuth } from '../lib/firebase';

interface CreateOrJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (name: string, onStepLog?: (step: string) => void) => Promise<any>;
  onJoinGroup: (code: string) => Promise<any>;
}

export const CreateOrJoinModal: React.FC<CreateOrJoinModalProps> = ({
  isOpen,
  onClose,
  onCreateGroup,
  onJoinGroup,
}) => {
  const [tab, setTab] = useState<'CREATE' | 'JOIN'>('CREATE');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugTerminal, setShowDebugTerminal] = useState(false);

  if (!isOpen) return null;

  const appendLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] ${msg}`;
    console.log(`[CreateGroup Debug] ${formatted}`);
    setDebugLogs((prev) => [...prev, formatted]);
  };

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setError(null);
    setSuccessInfo(null);
    setDebugLogs([]);
    appendLog('Create Group clicked');

    // 1. Validate group name
    const trimmed = groupName.trim();
    if (!trimmed) {
      const valErr = 'Validation Error: Please enter a group name before creating.';
      appendLog(valErr);
      setError(valErr);
      return;
    }
    appendLog(`Group name validated: "${trimmed}"`);

    // 2. Check Firebase configuration & initialization
    const savedConfig = getSavedFirebaseConfig();
    if (savedConfig?.projectId) {
      appendLog(`Firebase is configured (Project: ${savedConfig.projectId})`);
    } else {
      appendLog('Firebase is not configured. Group will be stored in offline local storage.');
    }

    try {
      setIsLoading(true);

      // 3. Check Authentication if Firebase is configured
      if (savedConfig?.projectId) {
        appendLog('Checking Firebase Authentication...');
        try {
          const authRes = await ensureFirebaseAuth();
          if (authRes.user) {
            appendLog(`Firebase Auth ready (UID: ${authRes.user.uid})`);
          } else if (authRes.error) {
            appendLog(`Firebase Auth notice: ${authRes.error}`);
          }
        } catch (authErr: any) {
          appendLog(`Firebase Auth warning: ${authErr?.message || authErr}`);
        }
      }

      // 4. Create group (handles Firestore + local storage persistence)
      appendLog('Invoking group creation service...');
      const createdGroup = await onCreateGroup(trimmed, (step) => appendLog(step));

      const grpName = createdGroup?.name || trimmed;
      const grpCode = createdGroup?.inviteCode || 'DU-GRP';

      appendLog(`Group "${grpName}" created successfully!`);
      if ((createdGroup as any)?._firestoreError) {
        appendLog(`Note: Firestore warning: ${(createdGroup as any)._firestoreError}`);
      }

      setSuccessInfo(`Group "${grpName}" created successfully! Code: ${grpCode}`);

      // Auto close after showing success
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      const errMsg = err?.message || String(err) || 'Failed to create group.';
      console.error('[CreateGroup Error]', err);
      appendLog(`FAILED: ${errMsg}`);
      setError(`Error creating group: ${errMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    try {
      setIsLoading(true);
      setError(null);
      await onJoinGroup(inviteCode.trim().toUpperCase());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Group not found with that code.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="create-join-group-modal"
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Friend Groups</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Shared expenses & khata ledger</p>
          </div>
          <button
            id="close-create-group-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            id="create-group-tab-btn"
            onClick={() => {
              setTab('CREATE');
              setError(null);
              setSuccessInfo(null);
            }}
            className={`flex-1 py-3 text-center transition-colors ${
              tab === 'CREATE'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 font-bold bg-blue-50/30 dark:bg-blue-950/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Create New Group
          </button>
          <button
            id="join-group-tab-btn"
            onClick={() => {
              setTab('JOIN');
              setError(null);
              setSuccessInfo(null);
            }}
            className={`flex-1 py-3 text-center transition-colors ${
              tab === 'JOIN'
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 font-bold bg-blue-50/30 dark:bg-blue-950/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Join with Code
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 text-sm flex-1">
          {tab === 'CREATE' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Group Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="create-group-name-input"
                  required
                  placeholder="e.g. Hostel Friends, Flat 402, Goa Trip"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              <p className="text-xs text-slate-500">
                A unique invite code will be generated to share with members.
              </p>

              {/* Status & Alerts */}
              {error && (
                <div
                  id="create-group-error-alert"
                  className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 animate-in fade-in"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="space-y-1">
                    <div className="font-bold">Group Creation Error</div>
                    <div className="break-words leading-relaxed">{error}</div>
                  </div>
                </div>
              )}

              {successInfo && (
                <div
                  id="create-group-success-alert"
                  className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 animate-in fade-in"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-semibold">{successInfo}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                id="submit-create-group-btn"
                disabled={isLoading}
                onClick={() => {
                  console.log('[CreateGroup Debug] Create Group button onClick fired!');
                }}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:bg-blue-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Creating Group...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Create Group</span>
                  </>
                )}
              </button>

              {/* Live Debug Log Section */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <Terminal className="w-3 h-3 text-slate-400" />
                    Live Debug Diagnostics
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDebugTerminal(!showDebugTerminal)}
                    className="text-[10px] text-blue-600 hover:underline font-medium"
                  >
                    {showDebugTerminal ? 'Hide' : 'Show'}
                  </button>
                </div>

                {showDebugTerminal && (
                  <div className="p-2.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] space-y-1 max-h-36 overflow-y-auto leading-tight select-text">
                    {debugLogs.length === 0 ? (
                      <div className="text-slate-500 italic">Ready. Tap &quot;Create Group&quot; to view live execution steps...</div>
                    ) : (
                      debugLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={
                            log.includes('FAILED') || log.includes('Error')
                              ? 'text-rose-400 font-semibold'
                              : log.includes('successfully') || log.includes('Done')
                              ? 'text-emerald-400 font-semibold'
                              : 'text-slate-300'
                          }
                        >
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  6-Character Invite Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="join-group-code-input"
                  required
                  maxLength={10}
                  placeholder="e.g. DU-402"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm font-mono tracking-widest text-center uppercase rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                />
              </div>

              <p className="text-xs text-slate-500">
                Enter the code shared by your friend to view their ledger.
              </p>

              {error && (
                <div className="p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">{error}</div>
              )}

              <button
                type="submit"
                id="submit-join-group-btn"
                disabled={isLoading || !inviteCode.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {isLoading ? 'Joining...' : 'Join Group'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
