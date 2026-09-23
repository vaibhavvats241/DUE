import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { initFirebase, ensureFirebaseAuth } from '../lib/firebase';
import { AppUser, DueAllocation, Expense, ExpenseStatus, Group, GroupMember, Payment } from '../types/khata';
import { validateExpenseAllocation } from '../utils/khataMath';

// Local storage fallback keys
const LOCAL_GROUPS_KEY = 'due_khata_local_groups';
const LOCAL_EXPENSES_KEY = 'due_khata_local_expenses';
const LOCAL_PAYMENTS_KEY = 'due_khata_local_payments';
const LOCAL_USER_KEY = 'due_khata_local_current_user';
const LOCAL_DELETED_GROUPS_KEY = 'due_khata_deleted_group_ids';

// Transaction limits (Max: ₹1,00,000 = 10,000,000 paise)
export const MAX_TRANSACTION_LIMIT_RUPEES = 100000;
export const MAX_TRANSACTION_LIMIT_PAISE = 10000000;

// Persistent Tombstone tracking for deleted groups
function getDeletedGroupIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_DELETED_GROUPS_KEY);
    if (!raw) return new Set();
    const arr: string[] = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function markGroupAsDeletedLocally(groupId: string) {
  try {
    const set = getDeletedGroupIds();
    set.add(groupId);
    localStorage.setItem(LOCAL_DELETED_GROUPS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

// Simple event emitter for reactive local storage updates
type Listener<T> = (data: T) => void;
const groupListeners = new Map<string, Set<Listener<Group | null>>>();
const expenseListeners = new Map<string, Set<Listener<Expense[]>>>();
const paymentListeners = new Map<string, Set<Listener<Payment[]>>>();

function notifyGroupListeners(groupId: string, group: Group | null) {
  groupListeners.get(groupId)?.forEach((cb) => cb(group));
}
function notifyExpenseListeners(groupId: string, expenses: Expense[]) {
  const map = new Map<string, Expense>();
  expenses.forEach((e) => {
    if (e && e.id) map.set(e.id, e);
  });
  const unique = Array.from(map.values());
  expenseListeners.get(groupId)?.forEach((cb) => cb(unique));
}
function notifyPaymentListeners(groupId: string, payments: Payment[]) {
  const map = new Map<string, Payment>();
  payments.forEach((p) => {
    if (p && p.id) map.set(p.id, p);
  });
  const unique = Array.from(map.values());
  paymentListeners.get(groupId)?.forEach((cb) => cb(unique));
}

/**
 * Strips undefined values recursively so Firestore setDoc/updateDoc does not reject them
 */
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        clean[key] = value.map((item) =>
          item !== null && typeof item === 'object' ? sanitizeForFirestore(item) : item
        );
      } else if (
        value.constructor?.name === 'FieldValue' ||
        '_methodName' in value ||
        'toMillis' in value
      ) {
        clean[key] = value;
      } else {
        clean[key] = sanitizeForFirestore(value);
      }
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

// Initial starter seed if nothing in storage
function getSeedData(): {
  user: AppUser;
  groups: Group[];
  expenses: Expense[];
  payments: Payment[];
} {
  const rahul: AppUser = {
    id: 'user_rahul_1',
    name: 'Rahul Sharma',
    avatarColor: 'bg-blue-600',
  };

  const starterGroup: Group = {
    id: 'group_flatmates_101',
    name: 'Flat 402 Khata',
    inviteCode: 'DU-402',
    createdBy: rahul.id,
    createdByName: rahul.name,
    createdAt: Date.now() - 86400000 * 3,
    members: [
      { userId: rahul.id, name: 'Rahul', joinedAt: Date.now() - 86400000 * 3 },
      { userId: 'user_aman_2', name: 'Aman', joinedAt: Date.now() - 86400000 * 3 },
      { userId: 'user_rohit_3', name: 'Rohit', joinedAt: Date.now() - 86400000 * 3 },
      { userId: 'user_vivek_4', name: 'Vivek', joinedAt: Date.now() - 86400000 * 3 },
    ],
  };

  // Seed expense matching the user prompt:
  // Rahul paid ₹2,500: Aman owes ₹700, Rohit owes ₹1,000, Vivek owes ₹800.
  const sampleConfirmedExpense: Expense = {
    id: 'exp_seed_grocery',
    groupId: starterGroup.id,
    description: 'Monthly Groceries & Ration',
    totalAmountPaise: 250000, // ₹2,500.00
    payerId: rahul.id,
    payerName: 'Rahul',
    createdById: rahul.id,
    createdByName: rahul.name,
    status: 'CONFIRMED',
    dues: [
      { userId: 'user_aman_2', userName: 'Aman', amountPaise: 70000 },   // ₹700
      { userId: 'user_rohit_3', userName: 'Rohit', amountPaise: 100000 }, // ₹1,000
      { userId: 'user_vivek_4', userName: 'Vivek', amountPaise: 80000 },  // ₹800
    ],
    createdAt: Date.now() - 86400000 * 2,
    confirmedAt: Date.now() - 86400000 * 2 + 1000,
  };

  // Seed draft pending expense where Aman paid ₹900 awaiting Aman's confirmation:
  const samplePendingExpense: Expense = {
    id: 'exp_seed_wifi',
    groupId: starterGroup.id,
    description: 'High Speed WiFi Bill',
    totalAmountPaise: 90000, // ₹900
    payerId: 'user_aman_2',
    payerName: 'Aman',
    createdById: rahul.id,
    createdByName: rahul.name,
    status: 'PENDING',
    dues: [
      { userId: rahul.id, userName: 'Rahul', amountPaise: 30000 }, // ₹300
      { userId: 'user_rohit_3', userName: 'Rohit', amountPaise: 30000 }, // ₹300
      { userId: 'user_vivek_4', userName: 'Vivek', amountPaise: 30000 }, // ₹300
    ],
    createdAt: Date.now() - 3600000 * 4,
  };

  return {
    user: rahul,
    groups: [starterGroup],
    expenses: [sampleConfirmedExpense, samplePendingExpense],
    payments: [],
  };
}

// Read Local Storage Helpers
function readLocalGroups(): Group[] {
  try {
    const deletedIds = getDeletedGroupIds();
    const raw = localStorage.getItem(LOCAL_GROUPS_KEY);
    if (!raw) {
      return [];
    }
    const parsed: Group[] = JSON.parse(raw);
    return parsed
      .filter((g) => g && g.id && !g.isDeleted && !deletedIds.has(g.id))
      .map((g) => ({
        ...g,
        createdByName: (g.createdByName || '').replace(/\s*\(You\)/gi, '').trim(),
        members: (g.members || []).map((m) => ({
          ...m,
          name: (m.name || '').replace(/\s*\(You\)/gi, '').trim(),
        })),
      }));
  } catch {
    return [];
  }
}

function saveLocalGroups(groups: Group[]) {
  const deletedIds = getDeletedGroupIds();
  const clean = groups.filter((g) => g && g.id && !g.isDeleted && !deletedIds.has(g.id));
  localStorage.setItem(LOCAL_GROUPS_KEY, JSON.stringify(clean));
}

function readLocalExpenses(groupId: string): Expense[] {
  try {
    const raw = localStorage.getItem(LOCAL_EXPENSES_KEY);
    if (!raw) return [];
    const all: Expense[] = JSON.parse(raw);
    const map = new Map<string, Expense>();
    all.forEach((e) => {
      if (e && e.id && e.groupId === groupId) {
        map.set(e.id, e);
      }
    });
    return Array.from(map.values());
  } catch {
    return [];
  }
}

function saveLocalExpenses(expenses: Expense[]) {
  const map = new Map<string, Expense>();
  expenses.forEach((e) => {
    if (e && e.id) {
      map.set(e.id, e);
    }
  });
  localStorage.setItem(LOCAL_EXPENSES_KEY, JSON.stringify(Array.from(map.values())));
}

function readLocalPayments(groupId: string): Payment[] {
  try {
    const raw = localStorage.getItem(LOCAL_PAYMENTS_KEY);
    if (!raw) return [];
    const all: Payment[] = JSON.parse(raw);
    const map = new Map<string, Payment>();
    all.forEach((p) => {
      if (p && p.id && p.groupId === groupId) {
        map.set(p.id, p);
      }
    });
    return Array.from(map.values());
  } catch {
    return [];
  }
}

function saveLocalPayments(payments: Payment[]) {
  const map = new Map<string, Payment>();
  payments.forEach((p) => {
    if (p && p.id) {
      map.set(p.id, p);
    }
  });
  localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(Array.from(map.values())));
}

export class KhataService {
  /**
   * Retrieves current authenticated user or defaults to starter persona
   */
  static getAuthenticatedUser(): AppUser | null {
    try {
      const saved = localStorage.getItem(LOCAL_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Default to starter persona (Rahul Sharma) so app opens directly in phone frame
    const seed = getSeedData();
    try {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(seed.user));
    } catch {}
    return seed.user;
  }

  static logoutUser() {
    localStorage.removeItem(LOCAL_USER_KEY);
  }

  static getCurrentUser(): AppUser {
    try {
      const saved = localStorage.getItem(LOCAL_USER_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}

    const defaultUser: AppUser = {
      id: 'guest_user',
      name: 'User',
    };
    return defaultUser;
  }

  static setCurrentUser(user: AppUser) {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  }

  /**
   * Generates a readable 6-character group invite code
   */
  static generateInviteCode(): string {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `DU-${random}`;
  }

  /**
   * Create a new Group
   */
  static async createGroup(
    name: string,
    user: AppUser,
    onStepLog?: (step: string) => void
  ): Promise<Group> {
    onStepLog?.(`[1] Validating and preparing group model: "${name}"`);
    const fb = initFirebase();
    const cleanUserName = user.name.replace(/\s*\(You\)/gi, '').trim();
    const newGroup: Group = {
      id: `grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      inviteCode: this.generateInviteCode(),
      createdBy: user.id,
      createdByName: cleanUserName,
      createdAt: Date.now(),
      members: [
        {
          userId: user.id,
          name: cleanUserName,
          joinedAt: Date.now(),
        },
      ],
    };

    let firestoreError: string | null = null;

    if (fb.isConfigured && fb.db) {
      onStepLog?.(`[2] Firebase is configured (Project: ${fb.app?.options.projectId}). Checking Authentication...`);
      try {
        const authRes = await ensureFirebaseAuth();
        const authUid = authRes.authUid || user.id;
        if (authRes.error) {
          onStepLog?.(`[Auth Notice] ${authRes.error}`);
        } else {
          onStepLog?.(`[3] Firebase Auth active (UID: ${authUid})`);
        }

        onStepLog?.(`[4] Writing group to Firestore "groups/${newGroup.id}"...`);
        const firestoreData = {
          ...newGroup,
          ownerId: authUid,
          createdBy: user.id,
          memberIds: [authUid, user.id],
          membersList: [authUid, user.id],
          updatedAt: serverTimestamp(),
        };

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Firestore write timed out after 7s. Check internet connection and rules.')),
            7000
          )
        );

        await Promise.race([
          setDoc(doc(fb.db, 'groups', newGroup.id), firestoreData),
          timeoutPromise,
        ]);

        onStepLog?.(`[5] Firestore document created successfully!`);
      } catch (err: any) {
        firestoreError = err?.message || 'Firestore setDoc error';
        console.error('[CreateGroup Error] Firestore write failed:', err);
        onStepLog?.(`[Firestore Error] ${firestoreError}`);
      }
    } else {
      onStepLog?.(`[2] Firebase not configured — running in offline-first local storage mode`);
    }

    // Always update and preserve local copy
    const local = readLocalGroups();
    const exists = local.some((g) => g.id === newGroup.id);
    if (!exists) {
      local.push(newGroup);
      saveLocalGroups(local);
      notifyGroupListeners(newGroup.id, newGroup);
    }
    onStepLog?.(`[6] Saved group "${newGroup.name}" to persistent local storage`);

    if (firestoreError) {
      (newGroup as any)._firestoreError = firestoreError;
    }

    return newGroup;
  }

  /**
   * Join an existing Group using Invite Code
   */
  static async joinGroupByCode(inviteCode: string, user: AppUser): Promise<Group | null> {
    const cleanCode = inviteCode.trim().toUpperCase();
    const fb = initFirebase();

    if (fb.isConfigured && fb.db) {
      try {
        const q = query(collection(fb.db, 'groups'), where('inviteCode', '==', cleanCode));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const groupDoc = snap.docs[0];
          const groupData = groupDoc.data() as Group;

          const exists = groupData.members.some((m) => m.userId === user.id);
          if (!exists) {
            const updatedMembers = [
              ...groupData.members,
              { userId: user.id, name: user.name, joinedAt: Date.now() },
            ];
            await updateDoc(doc(fb.db, 'groups', groupDoc.id), {
              members: updatedMembers,
              membersList: updatedMembers.map((m) => m.userId),
            });
            groupData.members = updatedMembers;
          }
          return groupData;
        }
      } catch (e) {
        console.warn('Firestore join error, checking local:', e);
      }
    }

    // Local fallback
    const local = readLocalGroups();
    const found = local.find((g) => g.inviteCode.toUpperCase() === cleanCode);
    if (!found) return null;

    if (!found.members.some((m) => m.userId === user.id)) {
      found.members.push({
        userId: user.id,
        name: user.name,
        joinedAt: Date.now(),
      });
      saveLocalGroups(local);
      notifyGroupListeners(found.id, found);
    }
    return found;
  }

  /**
   * Add a new member directly to a group (for quick offline adding)
   */
  static async addMemberToGroup(groupId: string, memberName: string): Promise<GroupMember> {
    const newMember: GroupMember = {
      userId: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: memberName.trim(),
      joinedAt: Date.now(),
    };

    const fb = initFirebase();
    if (fb.isConfigured && fb.db) {
      try {
        const groupRef = doc(fb.db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);
        if (groupSnap.exists()) {
          const data = groupSnap.data() as Group;
          const updated = [...(data.members || []), newMember];
          await updateDoc(groupRef, {
            members: updated,
            membersList: updated.map((m) => m.userId),
          });
        }
      } catch (e) {
        console.warn('Error adding member to firestore:', e);
      }
    }

    const local = readLocalGroups();
    const g = local.find((item) => item.id === groupId);
    if (g) {
      g.members.push(newMember);
      saveLocalGroups(local);
      notifyGroupListeners(groupId, g);
    }

    return newMember;
  }

  /**
   * Delete an existing Group (only allowed for the creator of the group)
   * Enforces permanent cascading deletion: local tombstone + subcollections cleanup + Firestore deletion
   */
  static async deleteGroup(groupId: string, user: AppUser): Promise<boolean> {
    // 1. Immediately record in permanent local tombstone
    markGroupAsDeletedLocally(groupId);

    const local = readLocalGroups();
    const group = local.find((g) => g.id === groupId);

    if (group) {
      const cleanUserName = user.name.replace(/\s*\(You\)/gi, '').trim().toLowerCase();
      const cleanCreatorName = (group.createdByName || '').replace(/\s*\(You\)/gi, '').trim().toLowerCase();
      const isCreator =
        group.createdBy === user.id ||
        cleanCreatorName === cleanUserName;

      if (!isCreator) {
        throw new Error('Only the creator of this group can delete it.');
      }
    }

    // 2. Remove immediately from local storage cache
    const updated = local.filter((g) => g.id !== groupId);
    saveLocalGroups(updated);

    // 3. Remove all related local expenses and payments
    try {
      const rawExp = localStorage.getItem(LOCAL_EXPENSES_KEY);
      if (rawExp) {
        const allExp: Expense[] = JSON.parse(rawExp);
        const filtered = allExp.filter((e) => e.groupId !== groupId);
        localStorage.setItem(LOCAL_EXPENSES_KEY, JSON.stringify(filtered));
      }
      const rawPay = localStorage.getItem(LOCAL_PAYMENTS_KEY);
      if (rawPay) {
        const allPay: Payment[] = JSON.parse(rawPay);
        const filteredPay = allPay.filter((p) => p.groupId !== groupId);
        localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(filteredPay));
      }
    } catch (cleanErr) {
      console.warn('[deleteGroup] Cleanup local records notice:', cleanErr);
    }

    // 4. Firestore cascade deletion
    const fb = initFirebase();
    if (fb.isConfigured && fb.db) {
      try {
        const groupRef = doc(fb.db, 'groups', groupId);

        // Step 4a: Mark soft delete flag immediately so any concurrent read ignores it
        await setDoc(
          groupRef,
          { isDeleted: true, deletedAt: serverTimestamp() },
          { merge: true }
        ).catch(() => {});

        // Step 4b: Delete expenses subcollection documents
        try {
          const expSnap = await getDocs(collection(fb.db, 'groups', groupId, 'expenses'));
          for (const expDoc of expSnap.docs) {
            deleteDoc(doc(fb.db, 'groups', groupId, 'expenses', expDoc.id)).catch(() => {});
          }
        } catch {}

        // Step 4c: Delete payments subcollection documents
        try {
          const paySnap = await getDocs(collection(fb.db, 'groups', groupId, 'payments'));
          for (const payDoc of paySnap.docs) {
            deleteDoc(doc(fb.db, 'groups', groupId, 'payments', payDoc.id)).catch(() => {});
          }
        } catch {}

        // Step 4d: Permanently delete group document in Firestore
        await deleteDoc(groupRef);
      } catch (err: any) {
        console.warn('[deleteGroup] Firestore deleteDoc notice:', err?.message || err);
      }
    }

    notifyGroupListeners(groupId, null);
    return true;
  }

  /**
   * Subscribe to Group metadata
   */
  static subscribeToGroup(groupId: string, callback: (group: Group | null) => void): () => void {
    const fb = initFirebase();

    if (fb.isConfigured && fb.db) {
      const unsub = onSnapshot(
        doc(fb.db, 'groups', groupId),
        (docSnap) => {
          if (docSnap.exists()) {
            callback(docSnap.data() as Group);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.warn('Firestore onSnapshot error, using local fallback:', error);
          const local = readLocalGroups();
          callback(local.find((g) => g.id === groupId) || null);
        }
      );
      return unsub;
    }

    // Local subscription
    if (!groupListeners.has(groupId)) {
      groupListeners.set(groupId, new Set());
    }
    groupListeners.get(groupId)!.add(callback);

    // Initial push
    const local = readLocalGroups();
    callback(local.find((g) => g.id === groupId) || null);

    return () => {
      groupListeners.get(groupId)?.delete(callback);
    };
  }

  /**
   * Subscribe to Expenses in a Group
   */
  static subscribeToExpenses(
    groupId: string,
    callback: (expenses: Expense[]) => void
  ): () => void {
    // 1. Always register in local listeners so local mutations immediately trigger UI updates
    if (!expenseListeners.has(groupId)) {
      expenseListeners.set(groupId, new Set());
    }
    expenseListeners.get(groupId)!.add(callback);

    // Initial broadcast with local expenses
    callback(readLocalExpenses(groupId));

    let firestoreUnsub: (() => void) | null = null;
    const fb = initFirebase();

    if (fb.isConfigured && fb.db) {
      try {
        const expensesRef = collection(fb.db, 'groups', groupId, 'expenses');
        const q = query(expensesRef, orderBy('createdAt', 'desc'));

        firestoreUnsub = onSnapshot(
          q,
          (snapshot) => {
            const expenses: Expense[] = [];
            snapshot.forEach((doc) => {
              expenses.push(doc.data() as Expense);
            });
            if (expenses.length > 0) {
              const local = readLocalExpenses(groupId);
              const map = new Map<string, Expense>();
              local.forEach((e) => {
                if (e && e.id) map.set(e.id, e);
              });
              expenses.forEach((e) => {
                if (e && e.id) map.set(e.id, e);
              });
              const merged = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
              const rawAll = localStorage.getItem(LOCAL_EXPENSES_KEY);
              const allExisting: Expense[] = rawAll ? JSON.parse(rawAll) : [];
              const otherGroupExpenses = allExisting.filter((e) => e && e.id && e.groupId !== groupId);
              saveLocalExpenses([...merged, ...otherGroupExpenses]);
              callback(merged);
            } else {
              callback(readLocalExpenses(groupId));
            }
          },
          (error) => {
            console.warn('Firestore expenses onSnapshot notice (operating offline/local):', error);
            callback(readLocalExpenses(groupId));
          }
        );
      } catch (err) {
        console.warn('Could not attach Firestore expenses listener:', err);
      }
    }

    return () => {
      expenseListeners.get(groupId)?.delete(callback);
      if (firestoreUnsub) {
        firestoreUnsub();
      }
    };
  }

  /**
   * Subscribe to Payments in a Group
   */
  static subscribeToPayments(
    groupId: string,
    callback: (payments: Payment[]) => void
  ): () => void {
    // 1. Always register in local listeners so local payments immediately trigger UI balance reductions
    if (!paymentListeners.has(groupId)) {
      paymentListeners.set(groupId, new Set());
    }
    paymentListeners.get(groupId)!.add(callback);

    // Initial broadcast with local payments
    callback(readLocalPayments(groupId));

    let firestoreUnsub: (() => void) | null = null;
    const fb = initFirebase();

    if (fb.isConfigured && fb.db) {
      try {
        const paymentsRef = collection(fb.db, 'groups', groupId, 'payments');
        const q = query(paymentsRef, orderBy('createdAt', 'desc'));

        firestoreUnsub = onSnapshot(
          q,
          (snapshot) => {
            const payments: Payment[] = [];
            snapshot.forEach((doc) => {
              payments.push(doc.data() as Payment);
            });
            if (payments.length > 0) {
              const local = readLocalPayments(groupId);
              const map = new Map<string, Payment>();
              local.forEach((p) => {
                if (p && p.id) map.set(p.id, p);
              });
              payments.forEach((p) => {
                if (p && p.id) map.set(p.id, p);
              });
              const merged = Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
              const rawAll = localStorage.getItem(LOCAL_PAYMENTS_KEY);
              const allExisting: Payment[] = rawAll ? JSON.parse(rawAll) : [];
              const otherGroupPayments = allExisting.filter((p) => p && p.id && p.groupId !== groupId);
              saveLocalPayments([...merged, ...otherGroupPayments]);
              callback(merged);
            } else {
              callback(readLocalPayments(groupId));
            }
          },
          (error) => {
            console.warn('Firestore payments onSnapshot notice (operating offline/local):', error);
            callback(readLocalPayments(groupId));
          }
        );
      } catch (err) {
        console.warn('Could not attach Firestore payments listener:', err);
      }
    }

    return () => {
      paymentListeners.get(groupId)?.delete(callback);
      if (firestoreUnsub) {
        firestoreUnsub();
      }
    };
  }

  /**
   * Create an Expense Draft (Status: PENDING)
   * Must validate: sum of friend dues == totalAmountPaise and amount <= ₹1,00,000
   */
  static async createExpenseDraft(params: {
    groupId: string;
    description: string;
    totalAmountPaise: number;
    payerId: string;
    payerName: string;
    createdById: string;
    createdByName: string;
    status?: ExpenseStatus;
    dues: DueAllocation[];
  }): Promise<{ success: boolean; error?: string; expense?: Expense }> {
    if (params.totalAmountPaise <= 0) {
      return { success: false, error: 'Expense amount must be greater than zero.' };
    }

    if (params.totalAmountPaise > MAX_TRANSACTION_LIMIT_PAISE) {
      return {
        success: false,
        error: `Expense amount cannot exceed ₹${MAX_TRANSACTION_LIMIT_RUPEES.toLocaleString('en-IN')}.`,
      };
    }

    const invalidDue = params.dues.find((d) => d.amountPaise > MAX_TRANSACTION_LIMIT_PAISE);
    if (invalidDue) {
      return {
        success: false,
        error: `Individual due for ${invalidDue.userName} cannot exceed ₹${MAX_TRANSACTION_LIMIT_RUPEES.toLocaleString('en-IN')}.`,
      };
    }

    const validation = validateExpenseAllocation(params.totalAmountPaise, params.dues);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Sum of friend dues (${params.dues.reduce((a, b) => a + (b.amountPaise || 0), 0) / 100}) does not match amount paid (${params.totalAmountPaise / 100}).`,
      };
    }

    const newExpense: Expense = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      groupId: params.groupId,
      description: params.description.trim(),
      totalAmountPaise: params.totalAmountPaise,
      payerId: params.payerId,
      payerName: params.payerName,
      createdById: params.createdById,
      createdByName: params.createdByName,
      status: params.status || 'PENDING',
      dues: params.dues.filter((d) => d.amountPaise > 0),
      createdAt: Date.now(),
      confirmedAt: params.status === 'CONFIRMED' ? Date.now() : undefined,
    };

    // 1. Instant local storage update (0ms UI latency)
    const raw = localStorage.getItem(LOCAL_EXPENSES_KEY);
    const all: Expense[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter((e) => e && e.id !== newExpense.id);
    filtered.unshift(newExpense);
    saveLocalExpenses(filtered);
    notifyExpenseListeners(params.groupId, filtered.filter((e) => e.groupId === params.groupId));

    // 2. Non-blocking Firestore sync in background
    const fb = initFirebase();
    if (fb.isConfigured && fb.db) {
      const syncTimeout = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore sync timeout')), 3000)
      );
      Promise.race([
        setDoc(
          doc(fb.db, 'groups', params.groupId, 'expenses', newExpense.id),
          sanitizeForFirestore(newExpense)
        ),
        syncTimeout,
      ]).catch((e) => {
        console.warn('Firestore save expense notice (persisted in local cache):', e);
      });
    }

    return { success: true, expense: newExpense };
  }

  /**
   * Payer Confirmation: ONLY the selected payer can confirm the expense!
   * Local-first execution ensures instant confirmation with zero spinner delays.
   */
  static async confirmExpense(
    groupId: string,
    expenseId: string,
    currentUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    // 1. Instant check in local storage
    const raw = localStorage.getItem(LOCAL_EXPENSES_KEY);
    const all: Expense[] = raw ? JSON.parse(raw) : [];
    const target = all.find((e) => e.id === expenseId);

    if (!target) {
      return { success: false, error: 'Expense not found.' };
    }

    // Strict Authorization check:
    if (target.payerId !== currentUserId) {
      return {
        success: false,
        error: `Only the designated payer (${target.payerName}) can confirm this expense.`,
      };
    }

    if (target.status === 'CONFIRMED') {
      return { success: true };
    }

    const now = Date.now();

    // 2. Update local state immediately (<2ms)
    target.status = 'CONFIRMED';
    target.confirmedAt = now;
    saveLocalExpenses(all);
    notifyExpenseListeners(groupId, all.filter((e) => e.groupId === groupId));

    // 3. Background Firestore sync (bounded by 2.5s timeout race so it never blocks)
    const fb = initFirebase();
    if (fb.isConfigured && fb.db) {
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore confirm sync timeout')), 2500)
      );
      Promise.race([
        updateDoc(doc(fb.db, 'groups', groupId, 'expenses', expenseId), {
          status: 'CONFIRMED',
          confirmedAt: now,
        }),
        timeoutPromise,
      ]).catch((e) => {
        console.warn('Firestore confirm background sync notice:', e);
      });
    }

    return { success: true };
  }

  /**
   * Reject / Cancel expense draft - Instant local-first execution
   */
  static async rejectExpense(
    groupId: string,
    expenseId: string,
    currentUserId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const raw = localStorage.getItem(LOCAL_EXPENSES_KEY);
    const all: Expense[] = raw ? JSON.parse(raw) : [];
    const target = all.find((e) => e.id === expenseId);

    if (!target) return { success: false, error: 'Expense not found.' };

    if (target.payerId !== currentUserId && target.createdById !== currentUserId) {
      return {
        success: false,
        error: 'Only the designated payer or creator can decline this draft.',
      };
    }

    const now = Date.now();
    target.status = 'REJECTED';
    target.rejectedAt = now;
    saveLocalExpenses(all);
    notifyExpenseListeners(groupId, all.filter((e) => e.groupId === groupId));

    // Background Firestore sync
    const fb = initFirebase();
    if (fb.isConfigured && fb.db) {
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore reject sync timeout')), 2500)
      );
      Promise.race([
        updateDoc(doc(fb.db, 'groups', groupId, 'expenses', expenseId), {
          status: 'REJECTED',
          rejectedAt: now,
          rejectReason: reason || 'Declined by payer',
        }),
        timeoutPromise,
      ]).catch((e) => {
        console.warn('Firestore reject background sync notice:', e);
      });
    }

    return { success: true };
  }

  /**
   * Record a settlement payment
   */
  static async recordPayment(params: {
    groupId: string;
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    amountPaise: number;
    note?: string;
  }): Promise<{ success: boolean; error?: string; payment?: Payment }> {
    if (params.amountPaise <= 0) {
      return { success: false, error: 'Payment amount must be greater than zero.' };
    }

    if (params.amountPaise > MAX_TRANSACTION_LIMIT_PAISE) {
      return {
        success: false,
        error: `Payment amount cannot exceed ₹${MAX_TRANSACTION_LIMIT_RUPEES.toLocaleString('en-IN')}.`,
      };
    }

    const cleanNote = params.note?.trim() || '';
    const fb = initFirebase();
    const authUid = fb.auth?.currentUser?.uid || params.fromUserId;

    const newPayment: Payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      groupId: params.groupId,
      fromUserId: params.fromUserId,
      fromUserName: params.fromUserName,
      toUserId: params.toUserId,
      toUserName: params.toUserName,
      amountPaise: params.amountPaise,
      note: cleanNote,
      createdAt: Date.now(),
      recordedById: authUid,
      status: 'PENDING', // MUST be confirmed by receiver (toUserId) to settle balance
    };

    if (fb.isConfigured && fb.db) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore record payment timeout')), 5000)
        );
        await Promise.race([
          setDoc(
            doc(fb.db, 'groups', params.groupId, 'payments', newPayment.id),
            sanitizeForFirestore(newPayment)
          ),
          timeoutPromise,
        ]);
      } catch (e) {
        console.warn('Firestore save payment notice (persisting locally):', e);
      }
    }

    const raw = localStorage.getItem(LOCAL_PAYMENTS_KEY);
    const all: Payment[] = raw ? JSON.parse(raw) : [];
    const filtered = all.filter((p) => p && p.id !== newPayment.id);
    filtered.unshift(newPayment);
    saveLocalPayments(filtered);
    notifyPaymentListeners(params.groupId, filtered.filter((p) => p.groupId === params.groupId));

    return { success: true, payment: newPayment };
  }

  /**
   * Confirm / Approve a payment - ONLY the receiver (toUserId) can approve
   * Local-first instant update (<2ms) with background Firestore sync
   */
  static async confirmPayment(
    groupId: string,
    paymentId: string,
    receiverUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    const raw = localStorage.getItem(LOCAL_PAYMENTS_KEY);
    const all: Payment[] = raw ? JSON.parse(raw) : [];
    const target = all.find((p) => p.id === paymentId);

    if (!target) return { success: false, error: 'Payment not found.' };

    if (target.toUserId !== receiverUserId) {
      return {
        success: false,
        error: 'Only the receiver can confirm this payment.',
      };
    }

    const now = Date.now();
    target.status = 'CONFIRMED';
    target.confirmedAt = now;
    saveLocalPayments(all);
    notifyPaymentListeners(groupId, all.filter((p) => p.groupId === groupId));

    // Background Firestore sync
    const fb = initFirebase();
    if (fb.isConfigured && fb.db) {
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore confirm payment sync timeout')), 2500)
      );
      Promise.race([
        updateDoc(doc(fb.db, 'groups', groupId, 'payments', paymentId), {
          status: 'CONFIRMED',
          confirmedAt: now,
        }),
        timeoutPromise,
      ]).catch((e) => {
        console.warn('Firestore confirm payment background sync notice:', e);
      });
    }

    return { success: true };
  }

  /**
   * Reject / Decline a payment - receiver or sender can decline
   */
  static async rejectPayment(
    groupId: string,
    paymentId: string,
    currentUserId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const raw = localStorage.getItem(LOCAL_PAYMENTS_KEY);
    const all: Payment[] = raw ? JSON.parse(raw) : [];
    const target = all.find((p) => p.id === paymentId);

    if (!target) return { success: false, error: 'Payment not found.' };

    if (target.toUserId !== currentUserId && target.fromUserId !== currentUserId) {
      return {
        success: false,
        error: 'Only the sender or receiver can decline this payment.',
      };
    }

    const now = Date.now();
    target.status = 'REJECTED';
    target.rejectedAt = now;
    target.rejectReason = reason || 'Declined';
    saveLocalPayments(all);
    notifyPaymentListeners(groupId, all.filter((p) => p.groupId === groupId));

    // Background Firestore sync
    const fb = initFirebase();
    if (fb.isConfigured && fb.db) {
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore reject payment sync timeout')), 2500)
      );
      Promise.race([
        updateDoc(doc(fb.db, 'groups', groupId, 'payments', paymentId), {
          status: 'REJECTED',
          rejectedAt: now,
          rejectReason: target.rejectReason,
        }),
        timeoutPromise,
      ]).catch((e) => {
        console.warn('Firestore reject payment background sync notice:', e);
      });
    }

    return { success: true };
  }

  /**
   * Get all groups the current user is part of
   * Strictly filters out any deleted groups using persistent tombstones and soft-delete flags
   */
  static async getAllUserGroups(userId?: string): Promise<Group[]> {
    const deletedIds = getDeletedGroupIds();
    const local = readLocalGroups().filter((g) => !deletedIds.has(g.id) && !g.isDeleted);
    const fb = initFirebase();
    if (fb.isConfigured && fb.db) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Firestore getDocs timeout')), 4000)
        );
        const snap = await Promise.race([
          getDocs(collection(fb.db, 'groups')),
          timeoutPromise,
        ]);
        const firestoreGroups: Group[] = [];
        snap.forEach((d) => {
          const g = d.data() as Group;
          // Filter out deleted groups immediately
          if (g.isDeleted || (g as any).deleted || deletedIds.has(g.id) || deletedIds.has(d.id)) {
            // Asynchronously ensure Firestore document is deleted
            deleteDoc(doc(fb.db!, 'groups', d.id)).catch(() => {});
            return;
          }
          if (!userId || g.createdBy === userId || g.members?.some((m) => m.userId === userId)) {
            firestoreGroups.push({
              ...g,
              id: d.id || g.id,
            });
          }
        });

        const map = new Map<string, Group>();
        local.forEach((g) => {
          if (!deletedIds.has(g.id) && !g.isDeleted && (!userId || g.createdBy === userId || g.members?.some((m) => m.userId === userId))) {
            map.set(g.id, g);
          }
        });
        firestoreGroups.forEach((g) => {
          if (!deletedIds.has(g.id) && !g.isDeleted) {
            map.set(g.id, g);
          }
        });
        const merged = Array.from(map.values());
        saveLocalGroups(merged);
        return merged;
      } catch (e) {
        console.warn('Firestore fetch groups failed or timed out, returning local groups:', e);
      }
    }
    if (userId) {
      return local.filter((g) => !deletedIds.has(g.id) && !g.isDeleted && (g.createdBy === userId || g.members?.some((m) => m.userId === userId)));
    }
    return local.filter((g) => !deletedIds.has(g.id) && !g.isDeleted);
  }
}

// Export convenient standalone wrappers
export const getAuthenticatedUser = () => KhataService.getAuthenticatedUser();
export const logoutUser = () => KhataService.logoutUser();
export const getCurrentUser = () => KhataService.getCurrentUser();
export const setCurrentUser = (user: AppUser) => KhataService.setCurrentUser(user);
export const getUserGroups = async (userId?: string) => KhataService.getAllUserGroups(userId);
export const createGroup = (name: string, user: AppUser, onStepLog?: (step: string) => void) =>
  KhataService.createGroup(name, user, onStepLog);
export const joinGroupByCode = (code: string, user: AppUser) => KhataService.joinGroupByCode(code, user);
export const subscribeToGroupExpenses = (groupId: string, cb: (expenses: Expense[]) => void) =>
  KhataService.subscribeToExpenses(groupId, cb);
export const subscribeToGroupPayments = (groupId: string, cb: (payments: Payment[]) => void) =>
  KhataService.subscribeToPayments(groupId, cb);
export const createExpense = async (params: {
  groupId: string;
  description: string;
  totalAmountPaise: number;
  payerId: string;
  payerName: string;
  createdById: string;
  createdByName: string;
  status: 'PENDING' | 'CONFIRMED';
  dues: DueAllocation[];
}) => {
  const res = await KhataService.createExpenseDraft(params);
  if (res.success && res.expense && params.status === 'CONFIRMED') {
    await KhataService.confirmExpense(params.groupId, res.expense.id, params.payerId);
  }
  return res;
};
export const confirmExpense = (groupId: string, expenseId: string, payerId: string) =>
  KhataService.confirmExpense(groupId, expenseId, payerId);
export const rejectExpense = (groupId: string, expenseId: string, payerId: string, reason?: string) =>
  KhataService.rejectExpense(groupId, expenseId, payerId, reason);
export const recordPayment = (params: {
  groupId: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amountPaise: number;
  note?: string;
}) => KhataService.recordPayment(params);
export const confirmPayment = (groupId: string, paymentId: string, receiverUserId: string) =>
  KhataService.confirmPayment(groupId, paymentId, receiverUserId);
export const rejectPayment = (groupId: string, paymentId: string, currentUserId: string, reason?: string) =>
  KhataService.rejectPayment(groupId, paymentId, currentUserId, reason);
export const deleteGroup = (groupId: string, user: AppUser) => KhataService.deleteGroup(groupId, user);

