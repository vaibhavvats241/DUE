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
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">All Settled Up!</h3>
          <p className="text-xs text-slate-500 mt-0.5">
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
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <HandCoins className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Who Owes Whom</h3>
            <p className="text-[11px] text-slate-500">
              Simplified settlement plan to clear all group dues
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          {settlements.length} {settlements.length === 1 ? 'payment' : 'payments'} needed
        </span>
      </div>

      {/* Your Action Items (If you owe money or are owed money) */}
      {(myDebtsToPay.length > 0 || myDebtsToReceive.length > 0) && (
        <div className="space-y-2.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Your Settlements
          </div>

          {/* You Owe Someone */}
          {myDebtsToPay.map((item) => (
            <div
              key={`${item.fromUserId}_${item.toUserId}`}
              className="flex items-center justify-between p-3 rounded-xl bg-rose-50/70 border border-rose-100"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    You owe <span className="font-bold text-rose-700">{item.toUserName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Receiver must confirm once sent</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-rose-600">
                  {formatRupees(item.amountPaise)}
                </span>
                <button
                  type="button"
                  onClick={() => onSettleDebt(item)}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
                >
                  Pay Now
                </button>
              </div>
            </div>
          ))}

          {/* Someone Owes You */}
          {myDebtsToReceive.map((item) => (
            <div
              key={`${item.fromUserId}_${item.toUserId}`}
              className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 border border-emerald-100"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    <span className="font-bold text-emerald-700">{item.fromUserName}</span> owes you
                  </div>
                  <div className="text-[11px] text-slate-500">You will approve when received</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-emerald-600">
                  {formatRupees(item.amountPaise)}
                </span>
                <button
                  type="button"
                  onClick={() => onSettleDebt(item)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                >
                  Record
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Other Friend Settlements */}
      {otherDebts.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Friend-to-Friend Settlements
          </div>
          <div className="space-y-1.5">
            {otherDebts.map((item) => (
              <div
                key={`${item.fromUserId}_${item.toUserId}`}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{item.fromUserName}</span>
                  <div className="flex items-center text-slate-400">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-slate-800">{item.toUserName}</span>
                </div>
                <span className="font-bold text-slate-700">
                  {formatRupees(item.amountPaise)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
