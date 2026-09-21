import React, { useState } from 'react';
import { X, Plus, LogIn, Users, Check, AlertCircle } from 'lucide-react';
import { Group } from '../types/khata';

interface CreateOrJoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (name: string) => Promise<Group>;
  onJoinGroup: (inviteCode: string) => Promise<Group | null>;
}

export const CreateOrJoinGroupModal: React.FC<CreateOrJoinGroupModalProps> = ({
  isOpen,
  onClose,
  onCreateGroup,
  onJoinGroup,
}) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setErrorMsg('Please enter a group name');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onCreateGroup(groupName.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setErrorMsg('Please enter a 6-character invite code (e.g. DU-402)');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const joined = await onJoinGroup(inviteCode.trim());
      if (!joined) {
        setErrorMsg('No group found matching this invite code. Please check and try again.');
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to join group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="create-join-group-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden text-slate-900 border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <h3 className="text-sm font-bold text-slate-900">Friends Group</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => {
              setMode('create');
              setErrorMsg('');
            }}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mode === 'create' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/40' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Group</span>
          </button>
          <button
            onClick={() => {
              setMode('join');
              setErrorMsg('');
            }}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mode === 'join' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/40' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Join with Code</span>
          </button>
        </div>

        <div className="p-5">
          {mode === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Group Name
                </label>
                <input
                  id="create-group-name-input"
                  type="text"
                  required
                  placeholder="e.g. Flat 302, Goa Vacation, Office Lunch"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                id="submit-create-group-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isSubmitting ? 'Creating Group...' : 'Create Group & Generate Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Invite Code
                </label>
                <input
                  id="join-group-code-input"
                  type="text"
                  required
                  placeholder="e.g. DU-402"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full text-sm font-mono tracking-wider text-center font-bold p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Ask your friend for their 6-character DUE group invite code.
                </p>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                id="submit-join-group-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                {isSubmitting ? 'Joining Group...' : 'Join Group'}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
};
