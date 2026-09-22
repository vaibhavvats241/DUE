import React from 'react';
import { User, ChevronRight, CheckCircle2, AlertCircle, AlertTriangle, ArrowRightLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Expense, GroupMember, MemberBalance, Payment } from '../types/khata';
import { calculateDirectBalanceBetween, formatRupees } from '../utils/khataMath';

interface MembersListCardProps {
  members: GroupMember[];
  memberBalances: Record<string, MemberBalance>;
  currentUserId: string;
  expenses?: Expense[];
  payments?: Payment[];
  onSelectMember: (member: GroupMember) => void;
  onOpenRecordPayment: (targetMemberId?: string) => void;
}

export const MembersListCard: React.FC<MembersListCardProps> = ({
  members,
  memberBalances,
  currentUserId,
  expenses = [],
  payments = [],
  onSelectMember,
  onOpenRecordPayment,
}) => {
  return (
    <div id="members-list-card" className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Friends & Direct Dues</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Direct balances between friends (no cross-adjustments)</p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          {members.length} friends
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {members.map((member) => {
          const balance = memberBalances[member.userId] || {
            netBalancePaise: 0,
            totalPaidPaise: 0,
            totalOwedPaise: 0,
            totalPaymentsSentPaise: 0,
            totalPaymentsReceivedPaise: 0,
            totalDirectOwedToOthersPaise: 0,
            totalDirectOwedFromOthersPaise: 0,
          };

          const isSelf = member.userId === currentUserId;
          const cleanName = member.name.replace(/\s*\(You\)/gi, '').trim();

          // Direct bilateral calculation between current user and this specific member
          const direct = !isSelf
            ? calculateDirectBalanceBetween(currentUserId, member.userId, expenses, payments)
            : null;

          const youOweFriend = direct ? direct.userAOwesUserBPaise : 0;
          const friendOwesYou = direct ? direct.userAGetsFromUserBPaise : 0;
          const isSettledWithYou = direct ? direct.isSettled : true;

          // For the friend's general direct position with other group members
          const otherDuesTheyOwe = (balance.totalDirectOwedToOthersPaise || 0) - friendOwesYou;
          const otherDuesTheyGet = (balance.totalDirectOwedFromOthersPaise || 0) - youOweFriend;

          return (
            <div
              key={member.userId}
              id={`member-row-${member.userId}`}
              className="py-3 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/60 rounded-xl px-2 -mx-2 transition-colors cursor-pointer group"
              onClick={() => onSelectMember(member)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    isSelf
                      ? 'bg-blue-600 text-white'
                      : friendOwesYou > 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : youOweFriend > 0
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {cleanName.charAt(0).toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">
                      {cleanName}
                    </span>
                    {isSelf && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 rounded-md">
                        You
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isSelf ? (
                      <span className="text-slate-600 dark:text-slate-300">
                        {balance.totalDirectOwedToOthersPaise
                          ? `You need to give ${formatRupees(balance.totalDirectOwedToOthersPaise)} total`
                          : balance.totalDirectOwedFromOthersPaise
                          ? `You will receive ${formatRupees(balance.totalDirectOwedFromOthersPaise)} total`
                          : 'All settled with everyone'}
                      </span>
                    ) : friendOwesYou > 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Owes you {formatRupees(friendOwesYou)}
                      </span>
                    ) : youOweFriend > 0 ? (
                      <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-semibold">
                        <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        You owe {formatRupees(youOweFriend)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                        Settled with you
                      </span>
                    )}

                    {!isSelf && (otherDuesTheyOwe > 0 || otherDuesTheyGet > 0) && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {otherDuesTheyOwe > 0
                          ? `• Owes others ${formatRupees(otherDuesTheyOwe)}`
                          : `• Gets back ${formatRupees(otherDuesTheyGet)} from others`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isSelf && (
                  <div className="text-right">
                    <div
                      className={`font-bold text-sm ${
                        friendOwesYou > 0
                          ? 'text-emerald-700 dark:text-emerald-400 font-black'
                          : youOweFriend > 0
                          ? 'text-rose-700 dark:text-rose-400 font-black'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {friendOwesYou > 0
                        ? `+${formatRupees(friendOwesYou)}`
                        : youOweFriend > 0
                        ? `-${formatRupees(youOweFriend)}`
                        : '₹0'}
                    </div>
                    <div className="text-[11px] font-medium text-slate-400">
                      {friendOwesYou > 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Owes you</span>
                      ) : youOweFriend > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">You owe</span>
                      ) : (
                        'Settled'
                      )}
                    </div>
                  </div>
                )}

                {!isSelf && (
                  <button
                    id={`pay-btn-${member.userId}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenRecordPayment(member.userId);
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      youOweFriend > 0
                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800'
                        : friendOwesYou > 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title={
                      youOweFriend > 0
                        ? 'Pay this friend directly'
                        : friendOwesYou > 0
                        ? 'Record payment received from friend'
                        : 'Record settlement'
                    }
                  >
                    {youOweFriend > 0 ? 'Pay' : friendOwesYou > 0 ? 'Record' : 'Settle'}
                  </button>
                )}

                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

