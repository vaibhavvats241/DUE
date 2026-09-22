import React from 'react';
import { ArrowRight, CheckCircle2, HandCoins, ArrowUpRight, ArrowDownLeft, ShieldCheck } from 'lucide-react';
import { SettlementDebt } from '../types/khata';
import { formatRupees } from '../utils/khataMath';

interface WhoOwesWhomCardProps {
  settlements: SettlementDebt[];
  currentUserId: string;
  onSettleDebt: (debt: SettlementDebt) => void;
}

export const WhoOwesWhomCard: React.FC<WhoOwesWhomCardProps> = ({
  settlements,
  currentUserId,
  onSettleDebt,
}) => {
  if (settlements.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">All Settled Up!</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Everyone is even. No one owes anyone in this group right now.
          </p>
        </div>
      </div>
    );
  }

  // Split into:
  // 1) Debts where current user must pay
  // 2) Debts where current user will receive
  // 3) Other friend-to-friend debts
  const myDebtsToPay = settlements.filter((s) => s.fromUserId === currentUserId);
  const myDebtsToReceive = settlements.filter((s) => s.toUserId === currentUserId);
  const otherDebts = settlements.filter(
    (s) => s.fromUserId !== currentUserId && s.toUserId !== currentUserId
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <HandCoins className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Who Needs to Give Money to Whom</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Direct friend-to-friend dues (no adjusting with others)
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60">
          {settlements.length} {settlements.length === 1 ? 'due' : 'dues'}
        </span>
      </div>

      {/* Your Action Items (If you owe money or are owed money) */}
      {(myDebtsToPay.length > 0 || myDebtsToReceive.length > 0) && (
        <div className="space-y-2.5">
          <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Your Direct Settlements
          </div>

          {/* You Owe Someone */}
          {myDebtsToPay.map((item) => {
            const cleanToName = item.toUserName.replace(/\s*\(You\)/gi, '').trim();
            return (
              <div
                key={`${item.fromUserId}_${item.toUserId}`}
                className="flex items-center justify-between p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      You need to give <span className="font-bold text-rose-700 dark:text-rose-400">{cleanToName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Direct payment to {cleanToName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                    {formatRupees(item.amountPaise)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSettleDebt(item)}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    Pay Directly
                  </button>
                </div>
              </div>
            );
          })}

          {/* Someone Owes You */}
          {myDebtsToReceive.map((item) => {
            const cleanFromName = item.fromUserName.replace(/\s*\(You\)/gi, '').trim();
            return (
              <div
                key={`${item.fromUserId}_${item.toUserId}`}
                className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">{cleanFromName}</span> needs to give you
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Awaiting direct payment from {cleanFromName}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatRupees(item.amountPaise)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSettleDebt(item)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    Record
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Other Friend Settlements */}
      {otherDebts.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Between Friends (Direct Dues)
          </div>
          <div className="space-y-1.5">
            {otherDebts.map((item) => {
              const cleanFrom = item.fromUserName.replace(/\s*\(You\)/gi, '').trim();
              const cleanTo = item.toUserName.replace(/\s*\(You\)/gi, '').trim();
              return (
                <div
                  key={`${item.fromUserId}_${item.toUserId}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{cleanFrom}</span>
                    <div className="flex items-center text-slate-400 dark:text-slate-500 gap-1 text-[11px]">
                      <span>gives to</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{cleanTo}</span>
                  </div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {formatRupees(item.amountPaise)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
