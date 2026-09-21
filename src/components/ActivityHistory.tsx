import React, { useState } from 'react';
import { IndianRupee, ArrowDownLeft, ArrowUpRight, Calendar, CheckCircle2, FileText } from 'lucide-react';
import { Expense, Payment } from '../types/khata';
import { formatRupees } from '../utils/khataMath';

interface ActivityHistoryProps {
  expenses: Expense[];
  payments: Payment[];
  currentUserId: string;
}

type ActivityItem =
  | { type: 'expense'; data: Expense; timestamp: number }
  | { type: 'payment'; data: Payment; timestamp: number };

export const ActivityHistory: React.FC<ActivityHistoryProps> = ({
  expenses,
  payments,
  currentUserId,
}) => {
  const [filter, setFilter] = useState<'all' | 'expenses' | 'payments'>('all');

  // Combine confirmed expenses and payments sorted by timestamp descending
  const activities: ActivityItem[] = [];

  expenses.forEach((e) => {
    activities.push({
      type: 'expense',
      data: e,
      timestamp: e.confirmedAt || e.createdAt,
    });
  });

  payments.forEach((p) => {
    activities.push({
      type: 'payment',
      data: p,
      timestamp: p.createdAt,
    });
  });

  activities.sort((a, b) => b.timestamp - a.timestamp);

  const filtered = activities.filter((act) => {
    if (filter === 'expenses') return act.type === 'expense';
    if (filter === 'payments') return act.type === 'payment';
    return true;
  });

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div id="activity-history-section" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-3">
      <div className="flex items-center justify-between pb-1">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Ledger History</h3>
          <p className="text-xs text-slate-500">Expenses & recorded settlements</p>
        </div>

        {/* Filter Pills */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold text-slate-600">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 rounded-md transition ${filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('expenses')}
            className={`px-2 py-1 rounded-md transition ${filter === 'expenses' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
          >
            Expenses
          </button>
          <button
            onClick={() => setFilter('payments')}
            className={`px-2 py-1 rounded-md transition ${filter === 'payments' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
          >
            Payments
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
          No activity recorded yet in this group.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filtered.map((item, idx) => {
            if (item.type === 'expense') {
              const exp = item.data;
              const isConfirmed = exp.status === 'CONFIRMED';
              const isPending = exp.status === 'PENDING';
              const isPayer = exp.payerId === currentUserId;

              // What did the current user owe in this expense?
              const myDue = exp.dues.find((d) => d.userId === currentUserId)?.amountPaise || 0;

              return (
                <div key={`exp-${exp.id}-${idx}`} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isPending ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        <IndianRupee className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {exp.description}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Paid by <strong className="text-slate-700">{isPayer ? 'You' : exp.payerName}</strong> &bull; {formatDate(exp.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-900">
                        {formatRupees(exp.totalAmountPaise)}
                      </span>
                      {isPending ? (
                        <span className="block text-[10px] text-amber-600 font-bold">Pending Payer</span>
                      ) : (
                        <span className="block text-[10px] text-slate-400">
                          {isPayer ? 'You paid' : myDue > 0 ? `Your due: ${formatRupees(myDue)}` : 'No share'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dues summary tags */}
                  <div className="flex flex-wrap gap-1 pl-10 text-[10px] text-slate-600">
                    {exp.dues.map((d) => (
                      <span key={d.userId} className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                        {d.userName.split(' ')[0]}: {formatRupees(d.amountPaise)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            }

            // Payment item
            const pay = item.data;
            const isSender = pay.fromUserId === currentUserId;
            const isReceiver = pay.toUserId === currentUserId;

            return (
              <div key={`pay-${pay.id}-${idx}`} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {isSender ? 'You' : pay.fromUserName} paid {isReceiver ? 'You' : pay.toUserName}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {pay.note ? `${pay.note} • ` : ''}{formatDate(pay.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700">
                    {formatRupees(pay.amountPaise)}
                  </span>
                  <span className="block text-[10px] text-slate-400">Settled</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
