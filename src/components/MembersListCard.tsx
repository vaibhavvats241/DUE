import React from 'react';
import { User, ChevronRight, CheckCircle2, AlertCircle, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { GroupMember, MemberBalance } from '../types/khata';
import { formatRupees } from '../utils/khataMath';

interface MembersListCardProps {
  members: GroupMember[];
  memberBalances: Record<string, MemberBalance>;
  currentUserId: string;
  onSelectMember: (member: GroupMember) => void;
  onOpenRecordPayment: (targetMemberId?: string) => void;
}

export const MembersListCard: React.FC<MembersListCardProps> = ({
  members,
  memberBalances,
  currentUserId,
  onSelectMember,
  onOpenRecordPayment,
}) => {
  return (
    <div id="members-list-card" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Member Dues (Live Khata)</h2>
          <p className="text-xs text-slate-500">Real-time status based on confirmed expenses & payments</p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          {members.length} friends
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {members.map((member) => {
          const balance = memberBalances[member.userId] || {
            netBalancePaise: 0,
            totalPaidPaise: 0,
            totalOwedPaise: 0,
            totalPaymentsSentPaise: 0,
            totalPaymentsReceivedPaise: 0,
          };

          const isSelf = member.userId === currentUserId;
          const net = balance.netBalancePaise;

          // Status & Color coding:
          // Credit (net < 0): Friend is owed money
          // Settled (net === 0): All cleared
          // Pending (0 < net <= 100000 paise [₹1,000])
          // High Due (net > 100000 paise)
          const isCredit = net < 0;
          const isSettled = net === 0;
          const isHighOutstanding = net > 100000;
          const isPendingDue = net > 0 && !isHighOutstanding;

          return (
            <div
              key={member.userId}
              id={`member-row-${member.userId}`}
              className="py-3 flex items-center justify-between hover:bg-slate-50/80 rounded-xl px-2 -mx-2 transition-colors cursor-pointer group"
              onClick={() => onSelectMember(member)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    isSelf
                      ? 'bg-blue-600 text-white'
                      : isCredit
                      ? 'bg-emerald-100 text-emerald-800'
                      : isHighOutstanding
                      ? 'bg-rose-100 text-rose-800'
                      : isPendingDue
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">
                      {member.name}
                    </span>
                    {isSelf && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                        You
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    {isCredit ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Gets back {formatRupees(Math.abs(net))}
                      </span>
                    ) : isSettled ? (
                      <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                        All Cleared
                      </span>
                    ) : isHighOutstanding ? (
                      <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        High Due
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Pending Due
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div
                    className={`font-bold text-sm ${
                      isCredit
                        ? 'text-emerald-700 font-black'
                        : isHighOutstanding
                        ? 'text-rose-700 font-black'
                        : isPendingDue
                        ? 'text-amber-700 font-bold'
                        : 'text-slate-500'
                    }`}
                  >
                    {isCredit
                      ? `+${formatRupees(Math.abs(net))}`
                      : net > 0
                      ? formatRupees(net)
                      : '₹0'}
                  </div>
                  <div className="text-[11px] font-medium text-slate-400">
                    {isCredit ? (
                      <span className="text-emerald-600 font-semibold">Gets back</span>
                    ) : net > 0 ? (
                      <span className="text-amber-700">Owes group</span>
                    ) : (
                      'Settled'
                    )}
                  </div>
                </div>

                <button
                  id={`pay-btn-${member.userId}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenRecordPayment(member.userId);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    net > 0
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title="Record payment or settlement"
                >
                  {net > 0 ? 'Pay' : 'Settle'}
                </button>

                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
