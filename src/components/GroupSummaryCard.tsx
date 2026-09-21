import React from 'react';
import { IndianRupee, Clock, ArrowUpRight, ArrowDownLeft, ShieldCheck, Plus, CheckCircle2 } from 'lucide-react';
import { Group, MemberBalance, Expense } from '../types/khata';
import { formatRupees } from '../utils/khataMath';

interface GroupSummaryCardProps {
  activeGroup: Group;
  currentUserId: string;
  memberBalances: Record<string, MemberBalance>;
  expenses: Expense[];
  onOpenAddExpense: () => void;
  onOpenRecordPayment: () => void;
  pendingCount: number;
}

export const GroupSummaryCard: React.FC<GroupSummaryCardProps> = ({
  activeGroup,
  currentUserId,
  memberBalances,
  expenses,
  onOpenAddExpense,
  onOpenRecordPayment,
  pendingCount,
}) => {
  const userBalance = memberBalances[currentUserId] || {
    netBalancePaise: 0,
    totalPaidPaise: 0,
    totalOwedPaise: 0,
    totalPaymentsSentPaise: 0,
    totalPaymentsReceivedPaise: 0,
  };

  const netPaise = userBalance.netBalancePaise;
  const isOwed = netPaise < 0;   // Negative means others owe them (credit)
  const owes = netPaise > 0;     // Positive means they owe others (due)
  const isSettled = netPaise === 0;

  // Calculate total confirmed expenses in the group
  const totalGroupSpendPaise = expenses
    .filter((e) => e.status === 'CONFIRMED')
    .reduce((acc, curr) => acc + curr.totalAmountPaise, 0);

  return (
    <div id="group-summary-card" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-4">
      {/* Top Banner: Your Personal Net Balance */}
      <div
        className={`p-4 rounded-xl border transition-all ${
          owes
            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
            : isOwed
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Your Net Khata
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tracking-tight">
                {formatRupees(netPaise)}
              </span>
              <span className="text-xs font-semibold">
                {owes ? '(You owe friends)' : isOwed ? '(Friends owe you)' : '(Settled up)'}
              </span>
            </div>
          </div>

          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shadow-xs ${
              owes
                ? 'bg-rose-600 text-white'
                : isOwed
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-300 text-slate-700'
            }`}
          >
            {owes ? (
              <ArrowDownLeft className="w-6 h-6" />
            ) : isOwed ? (
              <ArrowUpRight className="w-6 h-6" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>
        </div>

        {/* Sub-info bar */}
        <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between text-xs text-slate-600">
          <div>
            <span className="text-slate-400">Total Paid: </span>
            <span className="font-semibold text-slate-700">{formatRupees(userBalance.totalPaidPaise)}</span>
          </div>
          <div>
            <span className="text-slate-400">Your Share: </span>
            <span className="font-semibold text-slate-700">{formatRupees(userBalance.totalOwedPaise)}</span>
          </div>
          <div>
            <span className="text-slate-400">Paid Direct: </span>
            <span className="font-semibold text-slate-700">{formatRupees(userBalance.totalPaymentsSentPaise)}</span>
          </div>
        </div>
      </div>

      {/* Group Stats & Pending Count */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-400 font-medium">Group Spend</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{formatRupees(totalGroupSpendPaise)}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            ₹
          </div>
        </div>

        <div className={`p-3 rounded-xl border flex items-center justify-between ${
          pendingCount > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-100'
        }`}>
          <div>
            <p className="text-slate-500 font-medium">Awaiting Payer</p>
            <p className={`text-sm font-bold mt-0.5 ${pendingCount > 0 ? 'text-amber-700 font-black' : 'text-slate-700'}`}>
              {pendingCount} {pendingCount === 1 ? 'draft' : 'drafts'}
            </p>
          </div>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            pendingCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'
          }`}>
            <Clock className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Primary Action Buttons (Mobile-first large touch targets) */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          id="add-expense-button"
          onClick={onOpenAddExpense}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>

        <button
          id="record-payment-button"
          onClick={onOpenRecordPayment}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-sm transition"
        >
          <IndianRupee className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

    </div>
  );
};
