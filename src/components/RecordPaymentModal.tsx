import React, { useState, useEffect } from 'react';
import { X, ArrowRight, IndianRupee, Check, AlertCircle } from 'lucide-react';
import { Group, GroupMember } from '../types/khata';
import { rupeesToPaise, formatRupees } from '../utils/khataMath';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroup: Group;
  currentUserId: string;
  preselectedFriend?: GroupMember | null;
  onSubmitPayment: (params: {
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    amountPaise: number;
    note?: string;
  }) => Promise<void>;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  activeGroup,
  currentUserId,
  preselectedFriend,
  onSubmitPayment,
}) => {
  const [fromUserId, setFromUserId] = useState(currentUserId);
  const [toUserId, setToUserId] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setAmountRupees('');
      setNote('');

      if (preselectedFriend) {
        setFromUserId(currentUserId);
        setToUserId(preselectedFriend.userId);
      } else {
        setFromUserId(currentUserId);
        const other = activeGroup.members.find((m) => m.userId !== currentUserId);
        setToUserId(other ? other.userId : '');
      }
    }
  }, [isOpen, activeGroup, currentUserId, preselectedFriend]);

  if (!isOpen) return null;

  const amountPaise = rupeesToPaise(amountRupees);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (amountPaise <= 0) {
      setErrorMsg('Please enter a payment amount greater than zero.');
      return;
    }

    if (!fromUserId || !toUserId) {
      setErrorMsg('Please select both the sender and recipient.');
      return;
    }

    if (fromUserId === toUserId) {
      setErrorMsg('Sender and receiver cannot be the same person.');
      return;
    }

    const fromMember = activeGroup.members.find((m) => m.userId === fromUserId);
    const toMember = activeGroup.members.find((m) => m.userId === toUserId);

    setIsSubmitting(true);
    try {
      await onSubmitPayment({
        fromUserId,
        fromUserName: fromMember ? fromMember.name.replace(/\s*\(You\)/gi, '').trim() : 'Sender',
        toUserId,
        toUserName: toMember ? toMember.name.replace(/\s*\(You\)/gi, '').trim() : 'Recipient',
        amountPaise,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="record-payment-modal" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 dark:bg-black/80 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Record Direct Payment</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Settles or reduces accumulated dues</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          
          {/* Who paid whom */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Who Paid? (Payer)
              </label>
              <select
                id="payment-from-select"
                value={fromUserId}
                onChange={(e) => setFromUserId(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {activeGroup.members.map((m) => {
                  const cleanName = m.name.replace(/\s*\(You\)/gi, '').trim();
                  return (
                    <option key={m.userId} value={m.userId}>
                      {cleanName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex justify-center -my-1">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Who Received? (Recipient)
              </label>
              <select
                id="payment-to-select"
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Recipient --</option>
                {activeGroup.members
                  .filter((m) => m.userId !== fromUserId)
                  .map((m) => {
                    const cleanName = m.name.replace(/\s*\(You\)/gi, '').trim();
                    return (
                      <option key={m.userId} value={m.userId}>
                        {cleanName}
                      </option>
                    );
                  })}
              </select>
            </div>
          </div>

          {/* Amount Paid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Payment Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500 dark:text-slate-400 text-lg">
                ₹
              </span>
              <input
                id="payment-amount-input"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="500.00"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="w-full text-lg font-bold pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            {amountPaise > 0 && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                Reduces balance by {formatRupees(amountPaise)}
              </p>
            )}
          </div>

          {/* Payment Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Payment Note / Method (Optional)
            </label>
            <input
              id="payment-note-input"
              type="text"
              placeholder="e.g. Cash, UPI reference, GPay"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              id="submit-payment-btn"
              type="submit"
              disabled={amountPaise <= 0 || isSubmitting}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Recording...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Record Payment</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
