import React, { useState } from 'react';
import { User, ChevronRight, ChevronDown, UserPlus, Check, ArrowRight, IndianRupee } from 'lucide-react';
import { Group, GroupMember, MemberBalance } from '../types/khata';
import { formatRupees } from '../utils/khataMath';

interface FriendsKhataListProps {
  activeGroup: Group;
  currentUserId: string;
  memberBalances: Record<string, MemberBalance>;
  onSelectPayFriend: (friend: GroupMember) => void;
  onAddFriend: (name: string) => void;
}

export const FriendsKhataList: React.FC<FriendsKhataListProps> = ({
  activeGroup,
  currentUserId,
  memberBalances,
  onSelectPayFriend,
  onAddFriend,
}) => {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFriendName.trim()) {
      onAddFriend(newFriendName.trim());
      setNewFriendName('');
      setShowAddInput(false);
    }
  };

  return (
    <div id="friends-khata-list" className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3">
      <div className="flex items-center justify-between pb-1">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Friends Ledger</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Accumulated dues & individual balances</p>
        </div>

        <button
          id="toggle-add-friend-btn"
          onClick={() => setShowAddInput(!showAddInput)}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Friend</span>
        </button>
      </div>

      {showAddInput && (
        <form onSubmit={handleAddSubmit} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex gap-2">
          <input
            id="new-friend-name-input"
            type="text"
            placeholder="Friend's Name (e.g. Ankit)"
            value={newFriendName}
            onChange={(e) => setNewFriendName(e.target.value)}
            className="flex-1 text-xs bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition shrink-0 cursor-pointer"
          >
            Add
          </button>
        </form>
      )}

      {/* Friends list */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {activeGroup.members.map((member) => {
          const isYou = member.userId === currentUserId;
          const cleanName = member.name.replace(/\s*\(You\)/gi, '').trim();
          const balance = memberBalances[member.userId] || {
            netBalancePaise: 0,
            totalPaidPaise: 0,
            totalOwedPaise: 0,
            totalPaymentsSentPaise: 0,
            totalPaymentsReceivedPaise: 0,
          };

          const net = balance.netBalancePaise;
          const owes = net > 0;
          const isOwed = net < 0;
          const isSettled = net === 0;
          const isExpanded = expandedUserId === member.userId;

          return (
            <div key={member.userId} className="py-2.5 first:pt-0 last:pb-0">
              <div
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => setExpandedUserId(isExpanded ? null : member.userId)}
              >
                {/* Left: Avatar & Name */}
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                    isYou ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {cleanName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {cleanName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {owes ? 'Needs to pay' : isOwed ? 'Gets back' : 'Settled up'}
                    </p>
                  </div>
                </div>

                {/* Right: Net amount & expand toggle */}
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className={`text-xs font-extrabold ${
                      owes ? 'text-rose-600 dark:text-rose-400' : isOwed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {formatRupees(net)}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {owes ? 'owes' : isOwed ? 'advance' : '₹0'}
                    </p>
                  </div>

                  <div className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 p-1">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Breakdown */}
              {isExpanded && (
                <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 text-xs space-y-2 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500">Paid as Payer: </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupees(balance.totalPaidPaise)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500">Expense Share: </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupees(balance.totalOwedPaise)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500">Settled (Paid): </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupees(balance.totalPaymentsSentPaise)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500">Settled (Recv): </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupees(balance.totalPaymentsReceivedPaise)}</span>
                    </div>
                  </div>

                  {!isYou && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPayFriend(member);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition shadow-xs cursor-pointer"
                      >
                        <IndianRupee className="w-3 h-3" />
                        <span>Settle with {cleanName.split(' ')[0]}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
