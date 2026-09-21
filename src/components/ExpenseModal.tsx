import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, AlertCircle, Users, UserMinus, SlidersHorizontal, Calculator, Sparkles } from 'lucide-react';
import { AppUser, DueAllocation, Group, GroupMember } from '../types/khata';
import { formatRupees, rupeesToPaise, calculateEqualSplit, validateExpenseAllocation } from '../utils/khataMath';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroup: Group;
  currentUser: AppUser;
  onSubmitExpense: (expense: {
    description: string;
    totalAmountPaise: number;
    payerId: string;
    payerName: string;
    dues: DueAllocation[];
    autoConfirm: boolean;
  }) => Promise<void>;
}

type SplitMode = 'EQUALLY_ALL' | 'EXCLUDE_PAYER' | 'CUSTOM';

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  activeGroup,
  currentUser,
  onSubmitExpense,
}) => {
  const [description, setDescription] = useState('');
  const [totalRupeesInput, setTotalRupeesInput] = useState('');
  const [selectedPayerId, setSelectedPayerId] = useState(currentUser.id);
  const [splitMode, setSplitMode] = useState<SplitMode>('EQUALLY_ALL');
  const [includedMemberIds, setIncludedMemberIds] = useState<string[]>([]);
  const [duesInputs, setDuesInputs] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Initialize or reset form when modal opens or activeGroup changes
  useEffect(() => {
    if (isOpen && activeGroup) {
      setDescription('');
      setTotalRupeesInput('');
      setSelectedPayerId(currentUser.id);
      setSplitMode('EQUALLY_ALL');
      const allIds = activeGroup.members.map((m) => m.userId);
      setIncludedMemberIds(allIds);
      setDuesInputs({});
      setErrorText(null);
    }
  }, [isOpen, activeGroup, currentUser.id]);

  const totalPaise = rupeesToPaise(totalRupeesInput);

  const selectedPayer = activeGroup.members.find((m) => m.userId === selectedPayerId) || {
    userId: currentUser.id,
    name: currentUser.name,
  };

  // Recompute automatic split when totalPaise, splitMode, selectedPayerId, or includedMemberIds change
  useEffect(() => {
    if (!isOpen || splitMode === 'CUSTOM') return;

    let targetMemberIds: string[] = [];
    if (splitMode === 'EQUALLY_ALL') {
      // Split equally among all included members
      targetMemberIds = includedMemberIds;
    } else if (splitMode === 'EXCLUDE_PAYER') {
      // Split equally only among other included members (payer pays 0)
      targetMemberIds = includedMemberIds.filter((id) => id !== selectedPayerId);
    }

    if (targetMemberIds.length === 0 || totalPaise <= 0) {
      const resetMap: Record<string, string> = {};
      activeGroup.members.forEach((m) => {
        resetMap[m.userId] = '0';
      });
      setDuesInputs(resetMap);
      return;
    }

    const splitMap = calculateEqualSplit(totalPaise, targetMemberIds);
    const newInputs: Record<string, string> = {};

    activeGroup.members.forEach((m) => {
      const memberPaise = splitMap[m.userId] || 0;
      newInputs[m.userId] = (memberPaise / 100).toString();
    });

    setDuesInputs(newInputs);
  }, [totalPaise, splitMode, selectedPayerId, includedMemberIds, isOpen, activeGroup.members]);

  // Convert dues inputs to paise allocations
  const dueAllocations: DueAllocation[] = useMemo(() => {
    return activeGroup.members.map((m) => {
      const rawVal = duesInputs[m.userId] || '0';
      return {
        userId: m.userId,
        userName: m.name,
        amountPaise: rupeesToPaise(rawVal),
      };
    }).filter((d) => d.amountPaise > 0);
  }, [activeGroup.members, duesInputs]);

  const validation = validateExpenseAllocation(totalPaise, dueAllocations);
  const isPayerSelf = selectedPayerId === currentUser.id;

  const handleToggleMember = (userId: string) => {
    setIncludedMemberIds((prev) => {
      if (prev.includes(userId)) {
        // Prevent unchecking all members
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleDueChange = (userId: string, val: string) => {
    setSplitMode('CUSTOM');
    setDuesInputs((prev) => ({ ...prev, [userId]: val }));
  };

  // Helper to distribute any leftover/remainder to a specific member
  const handleAutoFillDifference = () => {
    if (validation.diffPaise === 0) return;
    setSplitMode('CUSTOM');
    const currentPayerDue = rupeesToPaise(duesInputs[selectedPayerId] || '0');
    const newPayerDue = Math.max(0, currentPayerDue + validation.diffPaise);
    setDuesInputs((prev) => ({
      ...prev,
      [selectedPayerId]: (newPayerDue / 100).toString(),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid) {
      setErrorText('Expense cannot be submitted until sum of dues exactly matches the total amount.');
      return;
    }
    if (!description.trim()) {
      setErrorText('Please enter a title for the expense.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorText(null);
      await onSubmitExpense({
        description: description.trim(),
        totalAmountPaise: totalPaise,
        payerId: selectedPayer.userId,
        payerName: selectedPayer.name,
        dues: dueAllocations,
        autoConfirm: isPayerSelf, // If payer is current user, directly confirm
      });
      onClose();
    } catch (err: any) {
      setErrorText(err?.message || 'Failed to submit expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Payer's own share calculation
  const payerAllocation = dueAllocations.find((d) => d.userId === selectedPayerId);
  const payerOwnSharePaise = payerAllocation ? payerAllocation.amountPaise : 0;
  const friendsOwedPaise = totalPaise - payerOwnSharePaise;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="add-expense-modal"
        className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Add Group Expense</h3>
            <p className="text-xs text-slate-500">Live khata with transparent exact paise math</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Expense Description
            </label>
            <input
              type="text"
              id="expense-title-input"
              required
              placeholder="e.g. Dinner at Karim's, Grocery, Taxi to Airport"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Total Amount Paid */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Total Amount Paid (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="any"
                min="0.01"
                id="expense-amount-input"
                required
                placeholder="e.g. 1000"
                value={totalRupeesInput}
                onChange={(e) => setTotalRupeesInput(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Who Paid? */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Who Paid the Bill?
            </label>
            <select
              id="expense-payer-select"
              value={selectedPayerId}
              onChange={(e) => setSelectedPayerId(e.target.value)}
              className="w-full px-3 py-2 text-sm font-medium rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {activeGroup.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name} {m.userId === currentUser.id ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Split Mode Selector */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              Split Method
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-medium">
              <button
                type="button"
                id="split-mode-all"
                onClick={() => setSplitMode('EQUALLY_ALL')}
                className={`py-1.5 px-2 rounded-lg text-center transition ${
                  splitMode === 'EQUALLY_ALL'
                    ? 'bg-white font-bold text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Everyone in group shares equally, including payer"
              >
                Split All (Equal)
              </button>
              <button
                type="button"
                id="split-mode-exclude-payer"
                onClick={() => setSplitMode('EXCLUDE_PAYER')}
                className={`py-1.5 px-2 rounded-lg text-center transition ${
                  splitMode === 'EXCLUDE_PAYER'
                    ? 'bg-white font-bold text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Payer paid purely for other friends (payer pays 0)"
              >
                Only Friends
              </button>
              <button
                type="button"
                id="split-mode-custom"
                onClick={() => setSplitMode('CUSTOM')}
                className={`py-1.5 px-2 rounded-lg text-center transition ${
                  splitMode === 'CUSTOM'
                    ? 'bg-white font-bold text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Enter custom individual amounts"
              >
                Custom
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              {splitMode === 'EQUALLY_ALL' && '• Everyone shares the bill equally (e.g. ₹1000 ÷ 4 = ₹250 each).'}
              {splitMode === 'EXCLUDE_PAYER' && `• ${selectedPayer.name} paid on behalf of friends (${selectedPayer.name}'s share is ₹0).`}
              {splitMode === 'CUSTOM' && '• Specify custom exact amounts for each friend.'}
            </p>
          </div>

          {/* Member Dues List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">
                Members & Individual Shares:
              </span>
              {validation.diffPaise !== 0 && totalPaise > 0 && (
                <button
                  type="button"
                  onClick={handleAutoFillDifference}
                  className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-balance remaining</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {activeGroup.members.map((member) => {
                const isPayer = member.userId === selectedPayerId;
                const isIncluded = includedMemberIds.includes(member.userId);
                const currentVal = duesInputs[member.userId] || '';

                return (
                  <div
                    key={member.userId}
                    id={`split-row-${member.userId}`}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                      isIncluded
                        ? 'bg-slate-50/90 border-slate-200'
                        : 'bg-slate-100/50 border-slate-200/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isIncluded}
                        onChange={() => handleToggleMember(member.userId)}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        title={isIncluded ? 'Include in split' : 'Exclude from split'}
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span>{member.name}</span>
                          {isPayer && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                              Payer
                            </span>
                          )}
                          {member.userId === currentUser.id && !isPayer && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {isPayer
                            ? splitMode === 'EXCLUDE_PAYER'
                              ? 'Paid for group (0 due)'
                              : 'Own share'
                            : 'Friend due'}
                        </p>
                      </div>
                    </div>

                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-medium">₹</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        id={`due-input-${member.userId}`}
                        placeholder="0"
                        value={currentVal}
                        onChange={(e) => handleDueChange(member.userId, e.target.value)}
                        className="w-full pl-6 pr-2 py-1 text-xs font-semibold text-right rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Math & Validation Breakdown */}
          <div
            id="expense-math-summary"
            className={`p-3 rounded-xl border text-xs font-medium space-y-1.5 ${
              validation.isValid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : validation.diffPaise > 0
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Total Paid by {selectedPayer.name}:</span>
              <span className="font-bold text-slate-900">{formatRupees(totalPaise)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">{selectedPayer.name}'s Own Share:</span>
              <span className="font-semibold text-slate-800">{formatRupees(payerOwnSharePaise)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Other Friends Owe {selectedPayer.name}:</span>
              <span className="font-semibold text-slate-800">{formatRupees(friendsOwedPaise)}</span>
            </div>

            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/80">
              <span className="flex items-center gap-1 font-bold">
                {validation.isValid ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 inline" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 inline" />
                )}
                Math Check:
              </span>
              <span className="font-bold">
                {validation.diffPaise === 0
                  ? '✓ Exact match (₹0 difference)'
                  : `${formatRupees(Math.abs(validation.diffPaise))} ${
                      validation.diffPaise > 0 ? 'unallocated' : 'overallocated'
                    }`}
              </span>
            </div>
          </div>

          {errorText && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {errorText}
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            id="submit-expense-btn"
            disabled={!validation.isValid || isSubmitting}
            className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-sm transition-all ${
              validation.isValid && !isSubmitting
                ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer active:scale-[0.99]'
                : 'bg-slate-300 cursor-not-allowed text-slate-500'
            }`}
          >
            {isSubmitting
              ? 'Saving Expense...'
              : isPayerSelf
              ? 'Confirm & Add to Khata'
              : `Submit for ${selectedPayer.name}'s Confirmation`}
          </button>
        </form>
      </div>
    </div>
  );
};
