import React, { useState, useEffect } from 'react';
import { X, IndianRupee, Users, Check, AlertCircle, Sparkles, Split } from 'lucide-react';
import { Group, GroupMember, DueAllocation } from '../types/khata';
import { rupeesToPaise, formatRupees, validateExpenseAllocation } from '../utils/khataMath';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGroup: Group;
  currentUserId: string;
  onSubmitExpense: (params: {
    description: string;
    totalAmountPaise: number;
    payerId: string;
    payerName: string;
    dues: DueAllocation[];
  }) => Promise<void>;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  activeGroup,
  currentUserId,
  onSubmitExpense,
}) => {
  const [description, setDescription] = useState('');
  const [totalRupees, setTotalRupees] = useState('');
  const [payerId, setPayerId] = useState(currentUserId);
  const [friendDues, setFriendDues] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setDescription('');
      setTotalRupees('');
      setPayerId(currentUserId);
      setErrorMsg('');

      // Prepopulate friend dues map with empty strings
      const initialDues: Record<string, string> = {};
      activeGroup.members.forEach((m) => {
        initialDues[m.userId] = '';
      });
      setFriendDues(initialDues);
    }
  }, [isOpen, activeGroup, currentUserId]);

  if (!isOpen) return null;

  const totalPaise = rupeesToPaise(totalRupees);

  // Convert current input values to DueAllocation array
  const duesList: DueAllocation[] = activeGroup.members.map((m) => ({
    userId: m.userId,
    userName: m.name.replace(' (You)', ''),
    amountPaise: rupeesToPaise(friendDues[m.userId] || '0'),
  }));

  const validation = validateExpenseAllocation(totalPaise, duesList);

  // Quick helper: Split total equally among all group members
  const handleSplitEqually = () => {
    if (totalPaise <= 0 || activeGroup.members.length === 0) return;

    const count = activeGroup.members.length;
    const baseSharePaise = Math.floor(totalPaise / count);
    const remainderPaise = totalPaise % count;

    const updated: Record<string, string> = {};
    activeGroup.members.forEach((m, idx) => {
      // distribute leftover single paise to the first few members
      const memberPaise = baseSharePaise + (idx < remainderPaise ? 1 : 0);
      const rupees = (memberPaise / 100).toFixed(memberPaise % 100 === 0 ? 0 : 2);
      updated[m.userId] = rupees;
    });

    setFriendDues(updated);
  };

  // Helper: Quick-fill sample from user prompt (Rahul ₹2500, Aman 700, Rohit 1000, Vivek 800)
  const handleLoadSamplePrompt = () => {
    setDescription('Group Dinner & Ration');
    setTotalRupees('2500');
    setPayerId(currentUserId);

    const updated: Record<string, string> = {};
    activeGroup.members.forEach((m) => {
      const lower = m.name.toLowerCase();
      if (lower.includes('aman')) updated[m.userId] = '700';
      else if (lower.includes('rohit')) updated[m.userId] = '1000';
      else if (lower.includes('vivek')) updated[m.userId] = '800';
      else updated[m.userId] = '0';
    });
    setFriendDues(updated);
  };

  const handleDueChange = (userId: string, val: string) => {
    setFriendDues((prev) => ({
      ...prev,
      [userId]: val,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!description.trim()) {
      setErrorMsg('Please enter an expense description.');
      return;
    }

    if (totalPaise <= 0) {
      setErrorMsg('Please enter a valid expense amount.');
      return;
    }

    if (!validation.isValid) {
      setErrorMsg(
        `Total friend dues (${formatRupees(validation.sumPaise)}) must equal total paid (${formatRupees(totalPaise)}).`
      );
      return;
    }

    const payer = activeGroup.members.find((m) => m.userId === payerId);
    const payerName = payer ? payer.name.replace(' (You)', '') : 'Payer';

    setIsSubmitting(true);
    try {
      await onSubmitExpense({
        description: description.trim(),
        totalAmountPaise: totalPaise,
        payerId,
        payerName,
        dues: duesList,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="add-expense-modal" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900 border border-slate-100 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h3 className="text-base font-bold text-slate-900">Add New Expense</h3>
            <p className="text-xs text-slate-500">Awaiting payer confirmation after draft</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          
          {/* 1. Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Expense Description
            </label>
            <input
              id="expense-description-input"
              type="text"
              required
              placeholder="e.g. Dinner, Groceries, WiFi, Taxi"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          {/* 2. Total Amount & Quick Sample */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Total Amount Paid (₹)
              </label>
              <button
                type="button"
                onClick={handleLoadSamplePrompt}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                Fill ₹2,500 Example
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-lg">
                ₹
              </span>
              <input
                id="expense-amount-input"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="2500.00"
                value={totalRupees}
                onChange={(e) => setTotalRupees(e.target.value)}
                className="w-full text-lg font-bold pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
              />
            </div>
          </div>

          {/* 3. Who Paid? (Designated Payer) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Who Paid the Bill?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {activeGroup.members.map((m) => {
                const isSelected = payerId === m.userId;
                return (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => setPayerId(m.userId)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium text-left transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {m.name.charAt(0)}
                    </div>
                    <span className="truncate">{m.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 italic">
              Note: The selected payer must confirm this expense before it affects balances.
            </p>
          </div>

          {/* 4. Friend Dues Breakdown */}
          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                How Much Each Friend Owes
              </label>
              <button
                type="button"
                onClick={handleSplitEqually}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold px-2 py-1 bg-blue-50 rounded-lg transition"
              >
                <Split className="w-3.5 h-3.5" />
                <span>Split Equally</span>
              </button>
            </div>

            {/* Dues inputs */}
            <div className="space-y-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
              {activeGroup.members.map((member) => {
                const val = friendDues[member.userId] || '';
                return (
                  <div key={member.userId} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                        {member.name.charAt(0)}
                      </div>
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {member.name}
                      </span>
                    </div>

                    <div className="relative w-32 shrink-0">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        ₹
                      </span>
                      <input
                        id={`due-input-${member.userId}`}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={val}
                        onChange={(e) => handleDueChange(member.userId, e.target.value)}
                        className="w-full text-xs font-bold pl-6 pr-2.5 py-1.5 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* STRICT VALIDATION INDICATOR */}
            <div
              className={`p-3 rounded-xl border text-xs font-medium transition ${
                validation.isValid
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : totalPaise > 0 && validation.diffPaise > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : totalPaise > 0 && validation.diffPaise < 0
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>Sum of Friend Dues:</span>
                <strong className="font-bold">{formatRupees(validation.sumPaise)}</strong>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span>Total Bill Amount:</span>
                <strong className="font-bold">{formatRupees(totalPaise)}</strong>
              </div>

              <div className="mt-2 pt-2 border-t border-black/10 flex items-center justify-between font-bold">
                {validation.isValid ? (
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Dues match total paid exactly!</span>
                  </div>
                ) : validation.diffPaise > 0 ? (
                  <div className="flex items-center gap-1.5 text-amber-700">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Remaining to allocate: {formatRupees(validation.diffPaise)}</span>
                  </div>
                ) : validation.diffPaise < 0 ? (
                  <div className="flex items-center gap-1.5 text-rose-700">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Over-allocated by: {formatRupees(Math.abs(validation.diffPaise))}</span>
                  </div>
                ) : (
                  <span>Enter bill amount and friend dues</span>
                )}
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="submit-expense-btn"
              type="submit"
              disabled={!validation.isValid || isSubmitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Submitting Draft...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Submit Expense Draft</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2">
              Expense will be submitted as draft and await confirmation from the payer.
            </p>
          </div>

        </form>

      </div>
    </div>
  );
};
