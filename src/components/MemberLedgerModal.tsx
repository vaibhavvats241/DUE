import React from 'react';
import { X, ArrowDownRight, ArrowUpRight, IndianRupee, CheckCircle2, AlertCircle, ArrowRightLeft, ArrowDownLeft } from 'lucide-react';
import { Expense, GroupMember, MemberBalance, Payment } from '../types/khata';
import { calculateDirectBalanceBetween, formatRupees } from '../utils/khataMath';

interface MemberLedgerModalProps {
  member: GroupMember | null;
  onClose: () => void;
  memberBalance: MemberBalance | null;
  expenses: Expense[];
  payments: Payment[];
  currentUserId?: string;
  onOpenRecordPayment: (memberId: string) => void;
}

export const MemberLedgerModal: React.FC<MemberLedgerModalProps> = ({
  member,
  onClose,
  memberBalance,
  expenses,
  payments,
  currentUserId,
  onOpenRecordPayment,
}) => {
  if (!member) return null;

  const isSelf = currentUserId === member.userId;
  const cleanMemberName = member.name.replace(/\s*\(You\)/gi, '').trim();
  const directWithCurrentUser =
    currentUserId && !isSelf
      ? calculateDirectBalanceBetween(currentUserId, member.userId, expenses, payments)
      : null;

  interface LedgerItem {
    id: string;
    date: number;
    description: string;
    type: 'PAID_EXPENSE' | 'EXPENSE_SHARE' | 'PAYMENT_SENT' | 'PAYMENT_RECEIVED';
    amountPaise: number;
    deltaPaise: number; // positive = owes more, negative = gets back more
  }

  const items: LedgerItem[] = [];

  // 1. Confirmed expenses where this member paid for the group
  expenses
    .filter((e) => e.status === 'CONFIRMED' && e.payerId === member.userId)
    .forEach((e) => {
      items.push({
        id: `exp-payer-${e.id}`,
        date: e.createdAt,
        description: `Paid for ${e.description} (Total: ${formatRupees(e.totalAmountPaise)})`,
        type: 'PAID_EXPENSE',
        amountPaise: e.totalAmountPaise,
        deltaPaise: -e.totalAmountPaise, // paying for group puts member into credit (negative net)
      });
    });

  // 2. Confirmed expenses where this member was assigned a share/due
  expenses
    .filter((e) => e.status === 'CONFIRMED')
    .forEach((e) => {
      const due = e.dues.find((d) => d.userId === member.userId);
      if (due && due.amountPaise > 0) {
        const cleanPayer = (e.payerName || '').replace(/\s*\(You\)/gi, '').trim();
        items.push({
          id: `exp-share-${e.id}`,
          date: e.createdAt,
          description: `Share of ${e.description} (Paid by ${cleanPayer})`,
          type: 'EXPENSE_SHARE',
          amountPaise: due.amountPaise,
          deltaPaise: due.amountPaise, // owing a share increases net due
        });
      }
    });

  // 3. Payments sent by this member
  payments
    .filter((p) => p.fromUserId === member.userId)
    .forEach((p) => {
      const cleanTo = (p.toUserName || '').replace(/\s*\(You\)/gi, '').trim();
      items.push({
        id: `pay-sent-${p.id}`,
        date: p.createdAt,
        description: `Payment sent to ${cleanTo}${p.note ? ` (${p.note})` : ''}`,
        type: 'PAYMENT_SENT',
        amountPaise: p.amountPaise,
        deltaPaise: -p.amountPaise, // sending payment reduces net due
      });
    });

  // 4. Payments received by this member
  payments
    .filter((p) => p.toUserId === member.userId)
    .forEach((p) => {
      const cleanFrom = (p.fromUserName || '').replace(/\s*\(You\)/gi, '').trim();
      items.push({
        id: `pay-rcvd-${p.id}`,
        date: p.createdAt,
        description: `Payment received from ${cleanFrom}${p.note ? ` (${p.note})` : ''}`,
        type: 'PAYMENT_RECEIVED',
        amountPaise: p.amountPaise,
        deltaPaise: p.amountPaise, // receiving settlement payment reduces credit / brings net closer to 0
      });
    });

  // Deduplicate and sort ascending by date for chronological calculation
  const itemMap = new Map<string, (typeof items)[0]>();
  items.forEach((it) => itemMap.set(it.id, it));
  const uniqueItems = Array.from(itemMap.values());
  uniqueItems.sort((a, b) => a.date - b.date);

  let runningBalance = 0;
  const ledgerWithRunningBalance = uniqueItems.map((item) => {
    runningBalance += item.deltaPaise;
    return {
      ...item,
      runningBalancePaise: runningBalance,
    };
  });

  // Reverse so newest appears first
  const displayLedger = [...ledgerWithRunningBalance].reverse();

  const netPaise = memberBalance?.netBalancePaise ?? runningBalance;
  const isCredit = netPaise < 0;
  const isSettled = netPaise === 0;
  const isPendingDue = netPaise > 0;

  const totalSpentAsPayer = memberBalance?.totalPaidPaise || 0;
  const totalAssignedShare = memberBalance?.totalOwedPaise || 0;
  const totalSent = memberBalance?.totalPaymentsSentPaise || 0;
  const totalReceived = memberBalance?.totalPaymentsReceivedPaise || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="member-ledger-modal"
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
              {cleanMemberName.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">{cleanMemberName}'s Khata Ledger</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Official statement of expenses, shares & payments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Direct Dues with You (No adjusting with others) */}
          {directWithCurrentUser && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                directWithCurrentUser.userAOwesUserBPaise > 0
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-200'
                  : directWithCurrentUser.userAGetsFromUserBPaise > 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-200'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider block opacity-75">
                  Direct Balance with You
                </span>
                <div className="font-extrabold text-sm mt-0.5">
                  {directWithCurrentUser.userAOwesUserBPaise > 0 ? (
                    <span className="text-rose-700 dark:text-rose-400">
                      You need to give {formatRupees(directWithCurrentUser.userAOwesUserBPaise)} to {cleanMemberName}
                    </span>
                  ) : directWithCurrentUser.userAGetsFromUserBPaise > 0 ? (
                    <span className="text-emerald-700 dark:text-emerald-400">
                      {cleanMemberName} needs to give {formatRupees(directWithCurrentUser.userAGetsFromUserBPaise)} to you
                    </span>
                  ) : (
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      All settled up directly between you and {cleanMemberName}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRecordPayment(member.userId);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs shrink-0 cursor-pointer ${
                  directWithCurrentUser.userAOwesUserBPaise > 0
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : directWithCurrentUser.userAGetsFromUserBPaise > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200'
                }`}
              >
                {directWithCurrentUser.userAOwesUserBPaise > 0
                  ? 'Pay Directly'
                  : directWithCurrentUser.userAGetsFromUserBPaise > 0
                  ? 'Record Payment'
                  : 'Record Settlement'}
              </button>
            </div>
          )}

          {/* Group Statement & Balance Summary Card */}
          <div
            className={`p-4 rounded-xl border space-y-3 transition-colors ${
              isCredit
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200'
                : isPendingDue
                ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-950 dark:text-amber-200'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Group Khata Net Position
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isCredit
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                    : isPendingDue
                    ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {isCredit ? 'Credit (Gets Back)' : isPendingDue ? 'Pending Due (Owes)' : 'All Settled'}
              </span>
            </div>

            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {isCredit
                ? `+${formatRupees(Math.abs(netPaise))}`
                : isPendingDue
                ? formatRupees(netPaise)
                : '₹0'}
              <span className="text-xs font-normal text-slate-600 dark:text-slate-400 ml-2">
                {isCredit
                  ? '(Friends owe this member)'
                  : isPendingDue
                  ? '(Owes friends in group)'
                  : '(Zero balance)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-black/10 dark:border-white/10 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Paid for Group:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatRupees(totalSpentAsPayer)}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Own Share:</span>
                <span className="font-bold text-slate-900 dark:text-white">{formatRupees(totalAssignedShare)}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Paid Direct:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatRupees(totalSent)}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Received Direct:</span>
                <span className="font-bold text-blue-700 dark:text-blue-400">{formatRupees(totalReceived)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenRecordPayment(member.userId);
              }}
              className="w-full mt-1 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Record Payment / Settle with {cleanMemberName}</span>
            </button>
          </div>

          {/* Ledger Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Transaction History ({displayLedger.length})
              </h4>
              <span className="text-[11px] text-slate-400">Chronological</span>
            </div>

            {displayLedger.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                No confirmed dues or payments recorded for {cleanMemberName} yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                {displayLedger.map((row) => {
                  return (
                    <div key={row.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs space-y-1 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-white text-xs">
                          {row.description}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                          {new Date(row.date).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-0.5">
                        <div className="flex items-center gap-2">
                          {row.type === 'PAID_EXPENSE' && (
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                              + Paid {formatRupees(row.amountPaise)}
                            </span>
                          )}
                          {row.type === 'EXPENSE_SHARE' && (
                            <span className="font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded">
                              - Due {formatRupees(row.amountPaise)}
                            </span>
                          )}
                          {row.type === 'PAYMENT_SENT' && (
                            <span className="font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                              Settled {formatRupees(row.amountPaise)}
                            </span>
                          )}
                          {row.type === 'PAYMENT_RECEIVED' && (
                            <span className="font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
                              Received {formatRupees(row.amountPaise)}
                            </span>
                          )}
                        </div>

                        <div className="font-bold text-slate-700 dark:text-slate-300">
                          Net: {row.runningBalancePaise < 0
                            ? `+${formatRupees(Math.abs(row.runningBalancePaise))} credit`
                            : row.runningBalancePaise > 0
                            ? `${formatRupees(row.runningBalancePaise)} due`
                            : '₹0'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
