import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, AlertCircle, CheckCircle2, IndianRupee, Clock, ShieldCheck } from 'lucide-react';
import { AppUser, Expense, Group, MemberBalance, Payment } from '../types/khata';
import { calculateDirectBalanceBetween, formatRupees, rupeesToPaise } from '../utils/khataMath';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroup: Group;
  currentUser: AppUser;
  memberBalances: Record<string, MemberBalance>;
  expenses?: Expense[];
  payments?: Payment[];
  preselectedMemberId?: string;
  preselectedSettlement?: { fromUserId: string; toUserId: string; amountPaise: number } | null;
  onRecordPayment: (payment: {
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    amountPaise: number;
    note?: string;
  }) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  activeGroup,
  currentUser,
  memberBalances,
  expenses = [],
  payments = [],
  preselectedMemberId,
  preselectedSettlement,
  onRecordPayment,
}) => {
  const [fromUserId, setFromUserId] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [amountRupeesInput, setAmountRupeesInput] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && activeGroup.members.length > 0) {
      setErrorText(null);
      setAmountRupeesInput('');
      setNote('');

      if (preselectedSettlement) {
        setFromUserId(preselectedSettlement.fromUserId);
        setToUserId(preselectedSettlement.toUserId);
        setAmountRupeesInput((preselectedSettlement.amountPaise / 100).toString());
        return;
      }

      const otherMembers = activeGroup.members.filter((m) => m.userId !== currentUser.id);
      const firstOtherId = otherMembers.length > 0 ? otherMembers[0].userId : activeGroup.members[0].userId;

      if (preselectedMemberId) {
        if (preselectedMemberId === currentUser.id) {
          setFromUserId(currentUser.id);
          setToUserId(firstOtherId);
        } else {
          // Direct bilateral calculation between currentUser and preselectedMemberId (no 3rd-party adjustments)
          const direct = calculateDirectBalanceBetween(currentUser.id, preselectedMemberId, expenses, payments);
          if (direct.userAOwesUserBPaise > 0) {
            // Current user owes the member: Current user pays member
            setFromUserId(currentUser.id);
            setToUserId(preselectedMemberId);
            setAmountRupeesInput((direct.userAOwesUserBPaise / 100).toString());
          } else if (direct.userAGetsFromUserBPaise > 0) {
            // Member owes current user: Member pays current user
            setFromUserId(preselectedMemberId);
            setToUserId(currentUser.id);
            setAmountRupeesInput((direct.userAGetsFromUserBPaise / 100).toString());
          } else {
            setFromUserId(currentUser.id);
            setToUserId(preselectedMemberId);
          }
        }
      } else {
        // Default: find a member who has direct due with current user
        let foundDirectMember = false;
        for (const m of otherMembers) {
          const direct = calculateDirectBalanceBetween(currentUser.id, m.userId, expenses, payments);
          if (direct.userAOwesUserBPaise > 0) {
            setFromUserId(currentUser.id);
            setToUserId(m.userId);
            setAmountRupeesInput((direct.userAOwesUserBPaise / 100).toString());
            foundDirectMember = true;
            break;
          } else if (direct.userAGetsFromUserBPaise > 0) {
            setFromUserId(m.userId);
            setToUserId(currentUser.id);
            setAmountRupeesInput((direct.userAGetsFromUserBPaise / 100).toString());
            foundDirectMember = true;
            break;
          }
        }

        if (!foundDirectMember) {
          setFromUserId(currentUser.id);
          setToUserId(firstOtherId);
        }
      }
    }
  }, [isOpen, preselectedMemberId, preselectedSettlement, activeGroup.members, currentUser.id, memberBalances, expenses, payments]);

  if (!isOpen) return null;

  const fromMember = activeGroup.members.find((m) => m.userId === fromUserId);
  const toMember = activeGroup.members.find((m) => m.userId === toUserId);

  // Compute live direct debt between selected fromUserId and toUserId
  const directBetweenSelected =
    fromUserId && toUserId && fromUserId !== toUserId
      ? calculateDirectBalanceBetween(fromUserId, toUserId, expenses, payments)
      : null;

  const paymentPaise = rupeesToPaise(amountRupeesInput);
  const isValidAmount = paymentPaise > 0 && !!fromUserId && !!toUserId && fromUserId !== toUserId;

  const handleSwap = () => {
    const prevFrom = fromUserId;
    const prevTo = toUserId;
    setFromUserId(prevTo);
    setToUserId(prevFrom);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromMember || !toMember) {
      setErrorText('Please select both a payer and recipient.');
      return;
    }
    if (fromUserId === toUserId) {
      setErrorText('Payer and recipient cannot be the same member.');
      return;
    }
    if (paymentPaise <= 0) {
      setErrorText('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorText(null);
      await onRecordPayment({
        fromUserId: fromMember.userId,
        fromUserName: fromMember.name.replace(' (You)', ''),
        toUserId: toMember.userId,
        toUserName: toMember.name.replace(' (You)', ''),
        amountPaise: paymentPaise,
        note: note.trim() || '',
      });
      onClose();
    } catch (err: any) {
      setErrorText(err?.message || 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="record-payment-modal"
        className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Record Payment & Settle</h3>
            <p className="text-xs text-slate-500">Reduces outstanding dues with direct ledger confirmation</p>
          </div>
          <button
            id="close-payment-modal-btn"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {/* Payer and Recipient Section */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3">
            {/* Who Paid (Payer) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Who Paid? (Payer)
                </label>
              </div>
              <select
                id="payment-from-select"
                value={fromUserId}
                onChange={(e) => setFromUserId(e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              >
                {activeGroup.members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name} {m.userId === currentUser.id ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap direction button */}
            <div className="flex items-center justify-center">
              <button
                type="button"
                id="swap-payment-direction-btn"
                onClick={handleSwap}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 shadow-2xs transition active:scale-95"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                <span>Swap Direction</span>
              </button>
            </div>

            {/* Who Received (Recipient) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Who Received? (Recipient)
                </label>
              </div>
              <select
                id="payment-to-select"
                value={toUserId}
                onChange={(e) => setToUserId(e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              >
                {activeGroup.members
                  .filter((m) => m.userId !== fromUserId)
                  .map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} {m.userId === currentUser.id ? '(You)' : ''}
                    </option>
                  ))}
              </select>
            </div>

            {/* Direct bilateral due between selected pair (No 3rd-party adjustments!) */}
            {directBetweenSelected && (
              <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-100 text-xs">
                {directBetweenSelected.userAOwesUserBPaise > 0 ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-blue-900 font-medium">
                      Direct due: <strong>{fromMember?.name}</strong> needs to give <strong>{formatRupees(directBetweenSelected.userAOwesUserBPaise)}</strong> to <strong>{toMember?.name}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAmountRupeesInput((directBetweenSelected.userAOwesUserBPaise / 100).toString())}
                      className="px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shrink-0 shadow-xs cursor-pointer"
                    >
                      Fill Due
                    </button>
                  </div>
                ) : directBetweenSelected.userAGetsFromUserBPaise > 0 ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-amber-800 font-medium">
                      Note: <strong>{toMember?.name}</strong> owes <strong>{fromMember?.name}</strong> {formatRupees(directBetweenSelected.userAGetsFromUserBPaise)}
                    </span>
                    <button
                      type="button"
                      onClick={handleSwap}
                      className="px-2 py-0.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 shadow-xs cursor-pointer"
                    >
                      Swap
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-600 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Direct dues between {fromMember?.name} and {toMember?.name} are settled (₹0)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Payment Amount (₹)
              </label>
              {directBetweenSelected && directBetweenSelected.userAOwesUserBPaise > 0 && (
                <button
                  type="button"
                  id="pay-full-due-chip"
                  onClick={() => setAmountRupeesInput((directBetweenSelected.userAOwesUserBPaise / 100).toString())}
                  className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  Pay Full Due ({formatRupees(directBetweenSelected.userAOwesUserBPaise)})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-base">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0.01"
                id="payment-amount-input"
                required
                placeholder="e.g. 500"
                value={amountRupeesInput}
                onChange={(e) => setAmountRupeesInput(e.target.value)}
                className="w-full pl-8 pr-3 py-2.5 text-base font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Real-time Dynamic Context */}
          {paymentPaise > 0 && fromMember && toMember && (
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-950">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Reduces {fromMember.name}&apos;s balance by {formatRupees(paymentPaise)}
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Directly reduces {fromMember.name}&apos;s dues and credits {toMember.name}. Multiple payments can be recorded anytime without limit.
              </p>
              {directBetweenSelected && directBetweenSelected.userAOwesUserBPaise > 0 && paymentPaise > directBetweenSelected.userAOwesUserBPaise && (
                <p className="text-amber-800 text-[11px] font-semibold pt-0.5">
                  Notice: Amount is {formatRupees(paymentPaise - directBetweenSelected.userAOwesUserBPaise)} higher than current direct due and will be stored as an advance credit.
                </p>
              )}
            </div>
          )}

          {/* Note Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Optional Note / Mode
            </label>
            <input
              type="text"
              id="payment-note-input"
              placeholder="e.g. Google Pay, PhonePe UPI, Cash in hand"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Receiver Approval Rule Notice */}
          {toMember && (
            <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl text-xs flex items-start gap-2 text-amber-900">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Approval Required:</span> Once recorded, this payment will be marked as{' '}
                <span className="font-bold underline">Pending</span> until{' '}
                <span className="font-bold">{toMember.name}</span> confirms receipt.
              </div>
            </div>
          )}

          {errorText && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}

          <button
            type="submit"
            id="submit-payment-btn"
            disabled={!isValidAmount || isSubmitting}
            className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-sm transition-all flex items-center justify-center gap-2 ${
              isValidAmount && !isSubmitting
                ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] cursor-pointer'
                : 'bg-slate-300 cursor-not-allowed text-slate-500'
            }`}
          >
            <IndianRupee className="w-4 h-4" />
            <span>{isSubmitting ? 'Recording...' : 'Record Payment (Sends to Receiver for Approval)'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

