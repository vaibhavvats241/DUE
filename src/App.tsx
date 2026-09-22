import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  History,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { AppUser, DueAllocation, Expense, Group, GroupMember, Payment, SettlementDebt } from './types/khata';
import { calculateGroupBalances, calculateWhoOwesWhom } from './utils/khataMath';
import {
  getAuthenticatedUser,
  logoutUser,
  setCurrentUser,
  getUserGroups,
  createGroup,
  joinGroupByCode,
  subscribeToGroupExpenses,
  subscribeToGroupPayments,
  createExpense,
  confirmExpense,
  rejectExpense,
  recordPayment,
  confirmPayment,
  rejectPayment,
  deleteGroup,
} from './services/khataService';

import { Header } from './components/Header';
import { GroupSummaryCard } from './components/GroupSummaryCard';
import { WhoOwesWhomCard } from './components/WhoOwesWhomCard';
import { MembersListCard } from './components/MembersListCard';
import { PendingApprovalCard } from './components/PendingApprovalCard';
import { ExpenseModal } from './components/ExpenseModal';
import { PaymentModal } from './components/PaymentModal';
import { MemberLedgerModal } from './components/MemberLedgerModal';
import { ActivityHistoryModal } from './components/ActivityHistoryModal';
import { CreateOrJoinModal } from './components/CreateOrJoinModal';
import { DeleteGroupModal } from './components/DeleteGroupModal';
import { LoginScreen } from './components/LoginScreen';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { onFirebaseAuthStateChanged, signOutFirebaseUser } from './lib/firebase';

export default function App() {
  // Global Theme State (Dark / Light Mode)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('due_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  // Apply theme class to root document element and sync with local storage
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('due_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // User Authentication Gate: user must log in to access their account
  const [currentUser, setCurrentUserState] = useState<AppUser | null>(getAuthenticatedUser());
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false);
  const [selectedPaymentMemberId, setSelectedPaymentMemberId] = useState<string | undefined>(undefined);
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementDebt | null>(null);
  const [selectedLedgerMember, setSelectedLedgerMember] = useState<GroupMember | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCreateOrJoinOpen, setIsCreateOrJoinOpen] = useState(false);

  // Phone frame toggle for testing mobile layout
  const [isPhoneFrame, setIsPhoneFrame] = useState(true);

  // Synchronize Firebase Auth changes
  useEffect(() => {
    const unsub = onFirebaseAuthStateChanged((fbUser) => {
      if (fbUser) {
        const u: AppUser = {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          email: fbUser.email || undefined,
        };
        setCurrentUser(u);
        setCurrentUserState(u);
      }
    });
    return () => unsub();
  }, []);

  // Load groups when authenticated user changes
  useEffect(() => {
    if (!currentUser) return;
    async function loadGroups() {
      const userGroups = await getUserGroups(currentUser!.id);
      setGroups(userGroups);
      if (userGroups.length > 0 && !activeGroup) {
        setActiveGroup(userGroups[0]);
      }
    }
    loadGroups();
  }, [currentUser?.id]);

  // Real-time listener for expenses and payments in active group
  useEffect(() => {
    if (!activeGroup) return;

    const unsubExpenses = subscribeToGroupExpenses(activeGroup.id, (newExpenses: Expense[]) => {
      const map = new Map<string, Expense>();
      newExpenses.forEach((e) => {
        if (e && e.id) map.set(e.id, e);
      });
      setExpenses(Array.from(map.values()));
    });

    const unsubPayments = subscribeToGroupPayments(activeGroup.id, (newPayments: Payment[]) => {
      const map = new Map<string, Payment>();
      newPayments.forEach((p) => {
        if (p && p.id) map.set(p.id, p);
      });
      setPayments(Array.from(map.values()));
    });

    return () => {
      unsubExpenses();
      unsubPayments();
    };
  }, [activeGroup?.id]);

  // Handle Login from LoginScreen
  const handleLogin = (user: AppUser) => {
    setCurrentUser(user);
    setCurrentUserState(user);

    // Auto-add to active group if active group exists and user not a member
    if (activeGroup && !activeGroup.members.some((m) => m.userId === user.id)) {
      const updatedGroup: Group = {
        ...activeGroup,
        members: [
          ...activeGroup.members,
          {
            userId: user.id,
            name: user.name,
            email: user.email,
            role: 'MEMBER',
            joinedAt: Date.now(),
          },
        ],
      };
      setActiveGroup(updatedGroup);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await signOutFirebaseUser();
    } catch {}
    logoutUser();
    setCurrentUserState(null);
    setActiveGroup(null);
    setGroups([]);
  };

  // If user is not logged in, enforce login screen barrier
  if (!currentUser) {
    const knownMembers = activeGroup
      ? activeGroup.members.map((m) => ({ id: m.userId, name: m.name.replace(' (You)', '') }))
      : [];
    return <LoginScreen onLogin={handleLogin} knownMembers={knownMembers} />;
  }

  // Live balances calculation using deterministic math
  const memberBalances = activeGroup
    ? calculateGroupBalances(activeGroup.members, expenses, payments)
    : {};

  // Direct "Who Needs to Give Money to Whom" (no multi-party adjustments)
  const settlements = activeGroup
    ? calculateWhoOwesWhom(activeGroup.members, expenses, payments)
    : [];

  // Pending expenses & payments requiring confirmation (deduplicated by ID)
  const pendingExpenses = Array.from(
    new Map(expenses.filter((e) => e && e.id && e.status === 'PENDING').map((e) => [e.id, e])).values()
  );
  const pendingPayments = Array.from(
    new Map(payments.filter((p) => p && p.id && p.status === 'PENDING').map((p) => [p.id, p])).values()
  );

  // Add Expense
  const handleAddExpense = async (data: {
    description: string;
    totalAmountPaise: number;
    payerId: string;
    payerName: string;
    dues: DueAllocation[];
    autoConfirm: boolean;
  }) => {
    if (!activeGroup) return;
    await createExpense({
      groupId: activeGroup.id,
      description: data.description,
      totalAmountPaise: data.totalAmountPaise,
      payerId: data.payerId,
      payerName: data.payerName,
      createdById: currentUser.id,
      createdByName: currentUser.name,
      status: data.autoConfirm ? 'CONFIRMED' : 'PENDING',
      dues: data.dues,
    });
  };

  // Confirm Expense (only payer)
  const handleConfirmExpense = async (expenseId: string) => {
    if (!activeGroup) return;
    await confirmExpense(activeGroup.id, expenseId, currentUser.id);
  };

  // Reject Expense (only payer)
  const handleRejectExpense = async (expenseId: string, reason?: string) => {
    if (!activeGroup) return;
    await rejectExpense(activeGroup.id, expenseId, currentUser.id, reason);
  };

  // Record Payment
  const handleRecordPayment = async (data: {
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    amountPaise: number;
    note?: string;
  }) => {
    if (!activeGroup) return;
    await recordPayment({
      groupId: activeGroup.id,
      fromUserId: data.fromUserId,
      fromUserName: data.fromUserName,
      toUserId: data.toUserId,
      toUserName: data.toUserName,
      amountPaise: data.amountPaise,
      note: data.note,
    });
  };

  // Confirm Payment (only receiver)
  const handleConfirmPayment = async (paymentId: string) => {
    if (!activeGroup) return;
    await confirmPayment(activeGroup.id, paymentId, currentUser.id);
  };

  // Reject Payment (receiver or sender)
  const handleRejectPayment = async (paymentId: string, reason?: string) => {
    if (!activeGroup) return;
    await rejectPayment(activeGroup.id, paymentId, currentUser.id, reason);
  };

  // One-click settlement trigger from WhoOwesWhomCard
  const handleSettleDebt = (debt: SettlementDebt) => {
    setSelectedSettlement(debt);
    setSelectedPaymentMemberId(undefined);
    setIsPaymentModalOpen(true);
  };

  // Create Group
  const handleCreateGroup = async (name: string, onStepLog?: (step: string) => void) => {
    const newGroup = await createGroup(name, currentUser, onStepLog);
    setGroups((prev) => [...prev, newGroup]);
    setActiveGroup(newGroup);
    return newGroup;
  };

  // Delete Group (Creator only)
  const handleDeleteGroup = async (groupId: string) => {
    await deleteGroup(groupId, currentUser);
    const remaining = groups.filter((g) => g.id !== groupId);
    setGroups(remaining);
    setActiveGroup(remaining.length > 0 ? remaining[0] : null);
    setExpenses([]);
    setPayments([]);
    setIsDeleteGroupOpen(false);
  };

  // Join Group
  const handleJoinGroup = async (code: string) => {
    const joined = await joinGroupByCode(code, currentUser);
    if (!joined) {
      throw new Error('Group not found with that code.');
    }
    setGroups((prev) => {
      const exists = prev.some((g) => g.id === joined.id);
      return exists ? prev : [...prev, joined];
    });
    setActiveGroup(joined);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900 dark:text-slate-100 antialiased flex flex-col">
      {/* Top Utility Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-black text-blue-500 tracking-wider">DUE</span>
          <span className="text-slate-600">•</span>
          <span>Friends Khata (Shared Expense Ledger)</span>
          <span className="hidden sm:inline px-2 py-0.5 rounded bg-blue-950 text-blue-400 font-mono text-[10px]">
            Paise Precision Engine
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPhoneFrame(!isPhoneFrame)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer"
            title="Toggle between mobile device frame and expanded view"
          >
            {isPhoneFrame ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span>{isPhoneFrame ? 'Desktop Mode' : 'Phone Frame'}</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex justify-center items-center p-0 sm:p-4 bg-slate-950">
        <div
          className={`w-full transition-all duration-200 ${
            isPhoneFrame
              ? 'max-w-md bg-slate-100 dark:bg-slate-950 min-h-screen sm:min-h-[840px] sm:max-h-[92vh] sm:rounded-3xl sm:border-[8px] sm:border-slate-800 sm:shadow-2xl overflow-y-auto flex flex-col'
              : 'max-w-2xl bg-slate-100 dark:bg-slate-950 min-h-screen sm:rounded-2xl shadow-xl flex flex-col'
          }`}
        >
          {/* Header */}
          <Header
            currentUser={currentUser}
            onLogout={handleLogout}
            groups={groups}
            activeGroup={activeGroup}
            onSelectGroup={(g) => setActiveGroup(g)}
            onOpenCreateOrJoin={() => setIsCreateOrJoinOpen(true)}
            onOpenDeleteGroup={() => setIsDeleteGroupOpen(true)}
            theme={theme}
            onToggleTheme={handleToggleTheme}
          />

          {/* Body Content */}
          <main className="flex-1 p-4 space-y-4 overflow-y-auto bg-slate-100 dark:bg-slate-950">
            {activeGroup ? (
              <>
                {/* 1. Group Summary Card (You Owe / You are Owed, Add Expense, Record Payment) */}
                <GroupSummaryCard
                  activeGroup={activeGroup}
                  currentUserId={currentUser.id}
                  memberBalances={memberBalances}
                  expenses={expenses}
                  onOpenAddExpense={() => setIsExpenseModalOpen(true)}
                  onOpenRecordPayment={() => {
                    setSelectedPaymentMemberId(undefined);
                    setSelectedSettlement(null);
                    setIsPaymentModalOpen(true);
                  }}
                  pendingCount={pendingExpenses.length + pendingPayments.length}
                  onOpenDeleteGroup={() => setIsDeleteGroupOpen(true)}
                />

                {/* 2. Who Owes Whom (Minimal Pairwise Settlement Plan) */}
                <WhoOwesWhomCard
                  settlements={settlements}
                  currentUserId={currentUser.id}
                  onSettleDebt={handleSettleDebt}
                />

                {/* 3. Pending Approvals (Expenses & Payments needing Confirmation) */}
                <PendingApprovalCard
                  pendingExpenses={pendingExpenses}
                  pendingPayments={pendingPayments}
                  currentUserId={currentUser.id}
                  onConfirmExpense={handleConfirmExpense}
                  onRejectExpense={handleRejectExpense}
                  onConfirmPayment={handleConfirmPayment}
                  onRejectPayment={handleRejectPayment}
                />

                {/* 4. Live Member Dues Khata List */}
                <MembersListCard
                  members={activeGroup.members}
                  memberBalances={memberBalances}
                  currentUserId={currentUser.id}
                  expenses={expenses}
                  payments={payments}
                  onSelectMember={(member) => setSelectedLedgerMember(member)}
                  onOpenRecordPayment={(targetId) => {
                    setSelectedPaymentMemberId(targetId);
                    setSelectedSettlement(null);
                    setIsPaymentModalOpen(true);
                  }}
                />

                {/* 5. Bottom Quick Action: Ledger History & Add Expense */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    id="open-history-btn"
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="flex-1 py-2.5 px-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <History className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>View Group History</span>
                  </button>

                  <button
                    id="add-expense-bottom-btn"
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Expense</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm mt-6 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-100/80 dark:border-blue-900/60 shadow-inner">
                  <Users className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Welcome, {currentUser.name.replace(/\s*\(You\)/gi, '').trim()}!</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                    You don&apos;t have any active Khata group yet. Start a new group for your friends, trip, or flat, or join an existing group with an invite code.
                  </p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <button
                    id="welcome-create-group-btn"
                    onClick={() => setIsCreateOrJoinOpen(true)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create or Join Khata Group</span>
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* PWA Install Banner */}
          <PWAInstallBanner />
        </div>
      </div>

      {/* Modals */}
      {activeGroup && (
        <>
          <ExpenseModal
            isOpen={isExpenseModalOpen}
            onClose={() => setIsExpenseModalOpen(false)}
            activeGroup={activeGroup}
            currentUser={currentUser}
            onSubmitExpense={handleAddExpense}
          />

          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => {
              setIsPaymentModalOpen(false);
              setSelectedSettlement(null);
              setSelectedPaymentMemberId(undefined);
            }}
            activeGroup={activeGroup}
            currentUser={currentUser}
            memberBalances={memberBalances}
            expenses={expenses}
            payments={payments}
            preselectedMemberId={selectedPaymentMemberId}
            preselectedSettlement={selectedSettlement}
            onRecordPayment={handleRecordPayment}
          />

          <MemberLedgerModal
            member={selectedLedgerMember}
            onClose={() => setSelectedLedgerMember(null)}
            memberBalance={selectedLedgerMember ? memberBalances[selectedLedgerMember.userId] : null}
            expenses={expenses}
            payments={payments}
            currentUserId={currentUser.id}
            onOpenRecordPayment={(mId) => {
              setSelectedPaymentMemberId(mId);
              setSelectedSettlement(null);
              setIsPaymentModalOpen(true);
            }}
          />

          <ActivityHistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            expenses={expenses}
            payments={payments}
          />
        </>
      )}

      <CreateOrJoinModal
        isOpen={isCreateOrJoinOpen}
        onClose={() => setIsCreateOrJoinOpen(false)}
        onCreateGroup={handleCreateGroup}
        onJoinGroup={handleJoinGroup}
      />

      <DeleteGroupModal
        isOpen={isDeleteGroupOpen}
        onClose={() => setIsDeleteGroupOpen(false)}
        activeGroup={activeGroup}
        currentUser={currentUser}
        onDeleteGroup={handleDeleteGroup}
      />
    </div>
  );
}
