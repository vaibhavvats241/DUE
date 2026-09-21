import React, { useState } from 'react';
import { X, Filter, Clock, CheckCircle2, XCircle, ArrowRightLeft } from 'lucide-react';
import { Expense, Payment } from '../types/khata';
import { formatRupees } from '../utils/khataMath';

interface ActivityHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  payments: Payment[];
}

type HistoryFilter = 'ALL' | 'EXPENSES' | 'PAYMENTS' | 'PENDING' | 'CONFIRMED';

export const ActivityHistoryModal: React.FC<ActivityHistoryModalProps> = ({
  isOpen,
  onClose,
  expenses,
  payments,
}) => {
  const [filter, setFilter] = useState<HistoryFilter>('ALL');

  if (!isOpen) return null;

  interface ActivityItem {
    id: string;
    type: 'EXPENSE' | 'PAYMENT';
    title: string;
    subtitle: string;
    amountPaise: number;
    status: 'CONFIRMED' | 'PENDING' | 'REJECTED';
    date: number;
    person: string;
  }

  const allItems: ActivityItem[] = [];

  expenses.forEach((e) => {
    allItems.push({
      id: `exp-${e.id}`,
      type: 'EXPENSE',
      title: e.description,
      subtitle: `Paid by ${e.payerName} • ${e.dues.length} friends assigned`,
      amountPaise: e.totalAmountPaise,
      status: e.status,
      date: e.createdAt,
      person: e.payerName,
    });
  });

  payments.forEach((p) => {
    allItems.push({
      id: `pay-${p.id}`,
      type: 'PAYMENT',
      title: `Payment: ${p.fromUserName} → ${p.toUserName}`,
      subtitle: p.note ? `Note: ${p.note}` : (p.status === 'PENDING' ? 'Waiting for receiver approval' : 'Settlement payment'),
      amountPaise: p.amountPaise,
      status: p.status || 'CONFIRMED',
      date: p.createdAt,
      person: p.fromUserName,
    });
  });

  // Deduplicate by ID and sort newest first
  const itemMap = new Map<string, (typeof allItems)[0]>();
  allItems.forEach((it) => itemMap.set(it.id, it));
  const uniqueItems = Array.from(itemMap.values());
  uniqueItems.sort((a, b) => b.date - a.date);

  // Apply filters
  const filtered = uniqueItems.filter((item) => {
    if (filter === 'ALL') return true;
    if (filter === 'EXPENSES') return item.type === 'EXPENSE';
    if (filter === 'PAYMENTS') return item.type === 'PAYMENT';
    if (filter === 'PENDING') return item.status === 'PENDING';
    if (filter === 'CONFIRMED') return item.status === 'CONFIRMED';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="activity-history-modal"
        className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Group Ledger History</h3>
            <p className="text-xs text-slate-500">Chronological timeline of all activity</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="p-3 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          {(['ALL', 'EXPENSES', 'PAYMENTS', 'PENDING', 'CONFIRMED'] as HistoryFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No transactions match this filter.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 text-sm block">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {item.subtitle}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-slate-900 block">
                      {formatRupees(item.amountPaise)}
                    </span>
                    <span
                      className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        item.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/50">
                  <span>Person: {item.person}</span>
                  <span>
                    {new Date(item.date).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
