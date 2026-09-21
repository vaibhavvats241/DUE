import React, { useState } from 'react';
import { Clock, Check, X, ShieldAlert, ChevronDown, ChevronUp, ArrowRightLeft, HandCoins } from 'lucide-react';
import { Expense, Payment } from '../types/khata';
import { formatRupees } from '../utils/khataMath';

interface PendingApprovalCardProps {
  pendingExpenses: Expense[];
  pendingPayments?: Payment[];
  currentUserId: string;
  onConfirmExpense: (expenseId: string) => Promise<void>;
  onRejectExpense: (expenseId: string, reason?: string) => Promise<void>;
  onConfirmPayment?: (paymentId: string) => Promise<void>;
  onRejectPayment?: (paymentId: string, reason?: string) => Promise<void>;
}

export const PendingApprovalCard: React.FC<PendingApprovalCardProps> = ({
  pendingExpenses,
  pendingPayments = [],
  currentUserId,
  onConfirmExpense,
  onRejectExpense,
  onConfirmPayment,
  onRejectPayment,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Guarantee strict uniqueness by id to prevent duplicate key collisions
  const uniquePayments = Array.from(
    new Map(pendingPayments.filter((p) => p && p.id).map((p) => [p.id, p])).values()
  );
  const uniqueExpenses = Array.from(
    new Map(pendingExpenses.filter((e) => e && e.id).map((e) => [e.id, e])).values()
  );

  const totalPending = uniqueExpenses.length + uniquePayments.length;
  if (totalPending === 0) return null;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleConfirmExp = async (id: string) => {
    try {
      setLoadingId(id);
      await onConfirmExpense(id);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRejectExp = async (id: string) => {
    try {
      setLoadingId(id);
      await onRejectExpense(id);
    } finally {
      setLoadingId(null);
    }
  };

  const handleConfirmPay = async (id: string) => {
    if (!onConfirmPayment) return;
    try {
      setLoadingId(id);
      await onConfirmPayment(id);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRejectPay = async (id: string) => {
    if (!onRejectPayment) return;
    try {
      setLoadingId(id);
      await onRejectPayment(id);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div id="pending-approvals-card" className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200/90 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
            <Clock className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-bold text-amber-950 text-sm">
              Pending Approvals ({totalPending})
            </h3>
            <p className="text-[11px] text-amber-700">
              Expenses and payments require confirmation before updating ledger
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {/* Pending Payments List */}
        {uniquePayments.map((pay) => {
          const isReceiver = pay.toUserId === currentUserId;
          const isSender = pay.fromUserId === currentUserId;
          const isLoading = loadingId === pay.id;

          return (
            <div
              key={pay.id}
              id={`pending-payment-${pay.id}`}
              className="bg-white rounded-xl p-3 border border-amber-200 shadow-xs space-y-2 text-xs"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    ₹
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>Payment: {formatRupees(pay.amountPaise)}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                        {isReceiver ? 'Needs Your Approval' : 'Pending Receiver'}
                      </span>
                    </div>
                    <div className="text-slate-600 mt-0.5">
                      <span className="font-semibold text-slate-800">{pay.fromUserName}</span> paid{' '}
                      <span className="font-semibold text-slate-800">{pay.toUserName}</span>
                      {pay.note ? ` • "${pay.note}"` : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Receiver Confirmation Action */}
              {isReceiver ? (
                <div className="pt-1.5 border-t border-slate-100">
                  <div className="text-[11px] text-emerald-800 font-medium pb-2">
                    Did you receive this payment of {formatRupees(pay.amountPaise)} from {pay.fromUserName}?
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      id={`confirm-pay-${pay.id}`}
                      disabled={isLoading}
                      onClick={() => handleConfirmPay(pay.id)}
                      className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-1 transition shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isLoading ? 'Confirming...' : 'Yes, I Received It'}</span>
                    </button>

                    <button
                      id={`reject-pay-${pay.id}`}
                      disabled={isLoading}
                      onClick={() => handleRejectPay(pay.id)}
                      className="py-1.5 px-3 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-lg font-semibold flex items-center justify-center gap-1 transition border border-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ) : isSender ? (
                <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span>Waiting for {pay.toUserName} to confirm receipt.</span>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-100 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-500" />
                  <span>Only {pay.toUserName} can approve this payment receipt.</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Pending Expenses List */}
        {uniqueExpenses.map((exp) => {
          const isPayer = exp.payerId === currentUserId;
          const isExpanded = expandedId === exp.id;
          const isLoading = loadingId === exp.id;

          return (
            <div
              key={exp.id}
              id={`pending-item-${exp.id}`}
              className="bg-white rounded-xl p-3 border border-amber-200 shadow-xs space-y-2 text-xs"
            >
              <div
                className="flex items-start justify-between cursor-pointer"
                onClick={() => toggleExpand(exp.id)}
              >
                <div>
                  <div className="font-bold text-slate-900 text-sm">{exp.description}</div>
                  <div className="text-slate-500 mt-0.5">
                    Paid by <span className="font-semibold text-slate-700">{exp.payerName}</span> • Added by {exp.createdByName}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm text-amber-900">
                    {formatRupees(exp.totalAmountPaise)}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-amber-700 font-medium justify-end">
                    <span>{isPayer ? 'Requires your approval' : 'Waiting for payer'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>

              {/* Expanded Breakdown */}
              {isExpanded && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5 animate-in fade-in">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                    Due Breakdown:
                  </span>
                  <div className="space-y-1 pl-1">
                    {exp.dues.map((d) => (
                      <div key={d.userId} className="flex justify-between text-slate-600">
                        <span>• {d.userName}</span>
                        <span className="font-medium text-slate-800">{formatRupees(d.amountPaise)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions for Payer */}
              {isPayer ? (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <button
                    id={`confirm-expense-${exp.id}`}
                    disabled={isLoading}
                    onClick={() => handleConfirmExp(exp.id)}
                    className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-1 transition shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isLoading ? 'Confirming...' : 'Confirm & Apply'}</span>
                  </button>

                  <button
                    id={`reject-expense-${exp.id}`}
                    disabled={isLoading}
                    onClick={() => handleRejectExp(exp.id)}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-lg font-semibold flex items-center justify-center gap-1 transition border border-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-100">
                  <ShieldAlert className="w-3 h-3 text-amber-500" />
                  <span>Waiting for payer {exp.payerName} to confirm.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
