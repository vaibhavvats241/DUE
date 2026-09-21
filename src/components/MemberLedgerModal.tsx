import React from 'react';
import { X, ArrowDownRight, ArrowUpRight, IndianRupee, CheckCircle2, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { Expense, GroupMember, MemberBalance, Payment } from '../types/khata';
import { formatRupees } from '../utils/khataMath';

interface MemberLedgerModalProps {
  member: GroupMember | null;
  onClose: () => void;
  memberBalance: MemberBalance | null;
  expenses: Expense[];
  payments: Payment[];
  onOpenRecordPayment: (memberId: string) => void;
}

export const MemberLedgerModal: React.FC<MemberLedgerModalProps> = ({
  member,
  onClose,
  memberBalance,
  expenses,
  payments,
  onOpenRecordPayment,
}) => {
  if (!member) return null;

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
        items.push({
          id: `exp-share-${e.id}`,
          date: e.createdAt,
          description: `Share of ${e.description} (Paid by ${e.payerName})`,
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
      items.push({
        id: `pay-sent-${p.id}`,
        date: p.createdAt,
        description: `Payment sent to ${p.toUserName}${p.note ? ` (${p.note})` : ''}`,
        type: 'PAYMENT_SENT',
        amountPaise: p.amountPaise,
        deltaPaise: -p.amountPaise, // sending payment reduces net due
      });
    });

  // 4. Payments received by this member
  payments
    .filter((p) => p.toUserId === member.userId)
    .forEach((p) => {
      items.push({
        id: `pay-rcvd-${p.id}`,
        date: p.createdAt,
        description: `Payment received from ${p.fromUserName}${p.note ? ` (${p.note})` : ''}`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="member-ledger-modal"
        className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
              {member.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{member.name}'s Khata Ledger</h3>
              <p className="text-xs text-slate-500">Official statement of expenses, shares & payments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Summary Card */}
          <div
            className={`p-4 rounded-xl border space-y-3 transition-colors ${
              isCredit
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : isPendingDue
                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Current Net Position
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isCredit
                    ? 'bg-emerald-100 text-emerald-800'
                    : isPendingDue
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isCredit ? 'Credit (Gets Back)' : isPendingDue ? 'Pending Due (Owes)' : 'All Settled'}
              </span>
            </div>

            <div className="text-2xl font-black">
              {isCredit
                ? `+${formatRupees(Math.abs(netPaise))}`
                : isPendingDue
                ? formatRupees(netPaise)
                : '₹0'}
              <span className="text-xs font-normal text-slate-600 ml-2">
                {isCredit
                  ? '(Friends owe this member)'
                  : isPendingDue
                  ? '(Owes friends in group)'
                  : '(Zero balance)'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-black/10 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Paid for Group:</span>
                <span className="font-bold text-slate-900">{formatRupees(totalSpentAsPayer)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Own Share:</span>
                <span className="font-bold text-slate-900">{formatRupees(totalAssignedShare)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Paid Direct:</span>
                <span className="font-bold text-emerald-700">{formatRupees(totalSent)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Received Direct:</span>
                <span className="font-bold text-blue-700">{formatRupees(totalReceived)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenRecordPayment(member.userId);
              }}
              className="w-full mt-1 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Record Payment / Settle with {member.name}</span>
            </button>
          </div>

          {/* Ledger Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Transaction History ({displayLedger.length})
              </h4>
              <span className="text-[11px] text-slate-400">Chronological</span>
            </div>

            {displayLedger.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                No confirmed dues or payments recorded for {member.name} yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                {displayLedger.map((row) => {
                  return (
                    <div key={row.id} className="p-3 hover:bg-slate-50 text-xs space-y-1 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-xs">
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
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              + Paid {formatRupees(row.amountPaise)}
                            </span>
                          )}
                          {row.type === 'EXPENSE_SHARE' && (
                            <span className="font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                              - Due {formatRupees(row.amountPaise)}
                            </span>
                          )}
                          {row.type === 'PAYMENT_SENT' && (
                            <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                              Settled {formatRupees(row.amountPaise)}
                            </span>
                          )}
                          {row.type === 'PAYMENT_RECEIVED' && (
                            <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                              Received {formatRupees(row.amountPaise)}
                            </span>
                          )}
                        </div>

                        <div className="font-bold text-slate-700">
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
