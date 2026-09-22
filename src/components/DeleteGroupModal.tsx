import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, ShieldAlert, Check } from 'lucide-react';
import { Group, AppUser } from '../types/khata';

interface DeleteGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroup: Group | null;
  currentUser: AppUser;
  onDeleteGroup: (groupId: string) => Promise<void>;
}

export const DeleteGroupModal: React.FC<DeleteGroupModalProps> = ({
  isOpen,
  onClose,
  activeGroup,
  currentUser,
  onDeleteGroup,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !activeGroup) return null;

  const cleanUserName = currentUser.name.replace(/\s*\(You\)/gi, '').trim().toLowerCase();
  const cleanCreatorName = (activeGroup.createdByName || '').replace(/\s*\(You\)/gi, '').trim().toLowerCase();
  const isCreator =
    activeGroup.createdBy === currentUser.id ||
    cleanCreatorName === cleanUserName;

  const handleDelete = async () => {
    if (!isCreator) {
      setError('Only the creator of this group can delete it.');
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      await onDeleteGroup(activeGroup.id);
      onClose();
    } catch (err: any) {
      console.error('[DeleteGroup] Error:', err);
      setError(err?.message || 'Failed to delete group. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center border border-rose-200 dark:border-rose-900/60">
              <Trash2 className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Delete Group
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Target Group
            </div>
            <div className="font-extrabold text-base text-slate-900 dark:text-white">
              {activeGroup.name}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Code: <span className="font-mono font-semibold">{activeGroup.inviteCode}</span></span>
              <span>&bull;</span>
              <span>{activeGroup.members?.length || 0} members</span>
            </div>
          </div>

          {isCreator ? (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Permanent Action</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed">
                As the group creator (<span className="font-semibold">{activeGroup.createdByName || currentUser.name}</span>), deleting this group will permanently remove it along with all recorded expenses and payment history for all members.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Only the creator of this group (<span className="font-semibold">{activeGroup.createdByName || 'Creator'}</span>) can delete it.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition"
            >
              Cancel
            </button>

            {isCreator && (
              <button
                type="button"
                id="confirm-delete-group-button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Group</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
