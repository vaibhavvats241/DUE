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
    const cleanPayer = (e.payerName || '').replace(/\s*\(You\)/gi, '').trim();
    allItems.push({
      id: `exp-${e.id}`,
      type: 'EXPENSE',
      title: e.description,
      subtitle: `Paid by ${cleanPayer} • ${e.dues.length} friends assigned`,
      amountPaise: e.totalAmountPaise,
      status: e.status,
      date: e.createdAt,
      person: cleanPayer,
    });
  });

  payments.forEach((p) => {
    const cleanFrom = (p.fromUserName || '').replace(/\s*\(You\)/gi, '').trim();
    const cleanTo = (p.toUserName || '').replace(/\s*\(You\)/gi, '').trim();
    allItems.push({
      id: `pay-${p.id}`,
      type: 'PAYMENT',
      title: `Payment: ${cleanFrom} → ${cleanTo}`,
      subtitle: p.note ? `Note: ${p.note}` : (p.status === 'PENDING' ? 'Waiting for receiver approval' : 'Settlement payment'),
      amountPaise: p.amountPaise,
      status: p.status || 'CONFIRMED',
      date: p.createdAt,
      person: cleanFrom,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="activity-history-modal"
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Group Ledger History</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Chronological timeline of all activity</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs bg-white dark:bg-slate-900">
          {(['ALL', 'EXPENSES', 'PAYMENTS', 'PENDING', 'CONFIRMED'] as HistoryFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 bg-white dark:bg-slate-900">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
              No transactions match this filter.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 dark:text-white text-sm block">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      {item.subtitle}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-slate-900 dark:text-white block">
                      {formatRupees(item.amountPaise)}
                    </span>
                    <span
                      className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        item.status === 'CONFIRMED'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : item.status === 'PENDING'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
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
