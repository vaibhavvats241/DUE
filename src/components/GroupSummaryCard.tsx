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
  onOpenDeleteGroup?: () => void;
}

export const GroupSummaryCard: React.FC<GroupSummaryCardProps> = ({
  activeGroup,
  currentUserId,
  memberBalances,
  expenses,
  onOpenAddExpense,
  onOpenRecordPayment,
  pendingCount,
  onOpenDeleteGroup,
}) => {
  const userBalance = memberBalances[currentUserId] || {
    netBalancePaise: 0,
    totalPaidPaise: 0,
    totalOwedPaise: 0,
    totalPaymentsSentPaise: 0,
    totalPaymentsReceivedPaise: 0,
  };

  const directOwedToOthers = userBalance.totalDirectOwedToOthersPaise || 0;
  const directOwedFromOthers = userBalance.totalDirectOwedFromOthersPaise || 0;
  const isSettled = directOwedToOthers === 0 && directOwedFromOthers === 0;

  // Calculate total confirmed expenses in the group
  const totalGroupSpendPaise = expenses
    .filter((e) => e.status === 'CONFIRMED')
    .reduce((acc, curr) => acc + curr.totalAmountPaise, 0);

  const cleanCreator = (activeGroup.createdByName || '').replace(/\s*\(You\)/gi, '').trim();
  const isCreator = Boolean(
    activeGroup.createdBy === currentUserId ||
    (cleanCreator && memberBalances[currentUserId] && cleanCreator.toLowerCase() === (activeGroup.members.find(m => m.userId === currentUserId)?.name.replace(/\s*\(You\)/gi, '').trim().toLowerCase()))
  );

  return (
    <div id="group-summary-card" className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
      {/* Top Banner: Your Direct Dues */}
      <div
        className={`p-4 rounded-xl border transition-all ${
          isSettled
            ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
            : directOwedToOthers > 0 && directOwedFromOthers > 0
            ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-200'
            : directOwedToOthers > 0
            ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-950 dark:text-rose-200'
            : 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Your Direct Dues
            </span>

            {isSettled ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">₹0</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">(All settled up)</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                {directOwedToOthers > 0 && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
                      You need to give
                    </span>
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                      {formatRupees(directOwedToOthers)}
                    </span>
                  </div>
                )}
                {directOwedFromOthers > 0 && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                      You will receive
                    </span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                      {formatRupees(directOwedFromOthers)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold shadow-xs shrink-0 ${
              isSettled
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                : directOwedToOthers > 0 && directOwedFromOthers === 0
                ? 'bg-rose-600 text-white'
                : directOwedFromOthers > 0 && directOwedToOthers === 0
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-600 text-white'
            }`}
          >
            {isSettled ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : directOwedToOthers > 0 && directOwedFromOthers === 0 ? (
              <ArrowDownLeft className="w-6 h-6" />
            ) : directOwedFromOthers > 0 && directOwedToOthers === 0 ? (
              <ArrowUpRight className="w-6 h-6" />
            ) : (
              <IndianRupee className="w-6 h-6" />
            )}
          </div>
        </div>

        {/* Sub-info bar */}
        <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <div>
            <span className="text-slate-400 dark:text-slate-500">Total Spent: </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{formatRupees(userBalance.totalPaidPaise)}</span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Your Share: </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{formatRupees(userBalance.totalOwedPaise)}</span>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Paid Direct: </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{formatRupees(userBalance.totalPaymentsSentPaise)}</span>
          </div>
        </div>
      </div>

      {/* Group Stats & Pending Count */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-slate-400 dark:text-slate-500 font-medium">Group Spend</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{formatRupees(totalGroupSpendPaise)}</p>
            {cleanCreator && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[120px]">
                by {cleanCreator}
              </p>
            )}
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            ₹
          </div>
        </div>

        <div className={`p-3 rounded-xl border flex items-center justify-between ${
          pendingCount > 0
            ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60'
            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-800'
        }`}>
          <div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Awaiting Payer</p>
            <p className={`text-sm font-bold mt-0.5 ${pendingCount > 0 ? 'text-amber-700 dark:text-amber-400 font-black' : 'text-slate-700 dark:text-slate-300'}`}>
              {pendingCount} {pendingCount === 1 ? 'draft' : 'drafts'}
            </p>
          </div>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            pendingCount > 0 ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
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
          className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Expense</span>
        </button>

        <button
          id="record-payment-button"
          onClick={onOpenRecordPayment}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-sm transition border border-transparent dark:border-slate-700 cursor-pointer"
        >
          <IndianRupee className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

    </div>
  );
};
