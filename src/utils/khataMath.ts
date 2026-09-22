import { DueAllocation, Expense, GroupMember, MemberBalance, Payment, SettlementDebt } from '../types/khata';

/**
 * Converts a rupee input string/number into integer paise without float inaccuracies.
 * E.g., "2500" -> 250000, "700.50" -> 70050, "0.75" -> 75
 */
export function rupeesToPaise(val: string | number): number {
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) return 0;
    return Math.round(val * 100);
  }

  const clean = val.trim().replace(/[^0-9.]/g, '');
  if (!clean) return 0;

  const parts = clean.split('.');
  const wholePart = parseInt(parts[0] || '0', 10);
  let fractionPart = 0;

  if (parts.length > 1 && parts[1]) {
    const fractionStr = (parts[1] + '00').slice(0, 2);
    fractionPart = parseInt(fractionStr, 10);
  }

  return wholePart * 100 + fractionPart;
}

/**
 * Formats integer paise into Indian Rupee representation (e.g. ₹2,500 or ₹2,500.50)
 */
export function formatRupees(paise: number, showSign: boolean = false): string {
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  const rupeeFormatted = rupees.toLocaleString('en-IN');
  const formattedStr = remainderPaise > 0 
    ? `₹${rupeeFormatted}.${remainderPaise.toString().padStart(2, '0')}`
    : `₹${rupeeFormatted}`;

  if (showSign) {
    if (paise > 0) return `+${formattedStr}`;
    if (paise < 0) return `-${formattedStr}`;
  }

  return formattedStr;
}

/**
 * Verifies that the sum of friend dues exactly matches the total amount paid.
 */
export function validateExpenseAllocation(
  totalAmountPaise: number,
  dues: DueAllocation[]
): {
  isValid: boolean;
  sumPaise: number;
  diffPaise: number; // Positive means remaining to allocate; negative means over-allocated
} {
  const sumPaise = dues.reduce((acc, curr) => acc + (curr.amountPaise || 0), 0);
  const diffPaise = totalAmountPaise - sumPaise;

  return {
    isValid: totalAmountPaise > 0 && sumPaise === totalAmountPaise,
    sumPaise,
    diffPaise,
  };
}

/**
 * Calculates deterministic equal split down to the exact paisa among given member IDs.
 * Distributes any odd remaining paise to the first member(s) so sum === totalPaise exactly.
 */
export function calculateEqualSplit(totalPaise: number, memberIds: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  if (memberIds.length === 0 || totalPaise <= 0) return result;

  const count = memberIds.length;
  const basePaise = Math.floor(totalPaise / count);
  let remainder = totalPaise % count;

  memberIds.forEach((id) => {
    let extra = 0;
    if (remainder > 0) {
      extra = 1;
      remainder--;
    }
    result[id] = basePaise + extra;
  });

  return result;
}

/**
 * Computes live balances across all members in a group.
 * Strictly adheres to rule: ONLY CONFIRMED expenses affect balances.
 */
export function calculateGroupBalances(
  members: GroupMember[],
  expenses: Expense[],
  payments: Payment[]
): Record<string, MemberBalance> {
  const balances: Record<string, MemberBalance> = {};

  // Initialize for all known members
  for (const member of members) {
    balances[member.userId] = {
      userId: member.userId,
      name: member.name,
      totalPaidPaise: 0,
      totalOwedPaise: 0,
      totalPaymentsSentPaise: 0,
      totalPaymentsReceivedPaise: 0,
      netBalancePaise: 0,
    };
  }

  // 1. Process confirmed expenses only
  for (const exp of expenses) {
    if (exp.status !== 'CONFIRMED') continue;

    // Ensure payer has an entry
    if (!balances[exp.payerId]) {
      balances[exp.payerId] = {
        userId: exp.payerId,
        name: exp.payerName || 'Friend',
        totalPaidPaise: 0,
        totalOwedPaise: 0,
        totalPaymentsSentPaise: 0,
        totalPaymentsReceivedPaise: 0,
        netBalancePaise: 0,
      };
    }

    balances[exp.payerId].totalPaidPaise += exp.totalAmountPaise;

    // Each friend who owes part of this expense
    for (const due of exp.dues) {
      if (!balances[due.userId]) {
        balances[due.userId] = {
          userId: due.userId,
          name: due.userName || 'Friend',
          totalPaidPaise: 0,
          totalOwedPaise: 0,
          totalPaymentsSentPaise: 0,
          totalPaymentsReceivedPaise: 0,
          netBalancePaise: 0,
        };
      }
      balances[due.userId].totalOwedPaise += due.amountPaise;
    }
  }

  // 2. Process payments (ONLY CONFIRMED payments affect balances, pending must be receiver-approved)
  for (const p of payments) {
    if (p.status && p.status !== 'CONFIRMED') continue;

    if (!balances[p.fromUserId]) {
      balances[p.fromUserId] = {
        userId: p.fromUserId,
        name: p.fromUserName || 'Friend',
        totalPaidPaise: 0,
        totalOwedPaise: 0,
        totalPaymentsSentPaise: 0,
        totalPaymentsReceivedPaise: 0,
        netBalancePaise: 0,
      };
    }
    balances[p.fromUserId].totalPaymentsSentPaise += p.amountPaise;

    if (!balances[p.toUserId]) {
      balances[p.toUserId] = {
        userId: p.toUserId,
        name: p.toUserName || 'Friend',
        totalPaidPaise: 0,
        totalOwedPaise: 0,
        totalPaymentsSentPaise: 0,
        totalPaymentsReceivedPaise: 0,
        netBalancePaise: 0,
      };
    }
    balances[p.toUserId].totalPaymentsReceivedPaise += p.amountPaise;
  }

  // 3. Compute net balance
  // Net balance = (total owed in expenses - total paid in expenses) - (payments sent) + (payments received)
  // Positive (> 0): Friend owes money (due)
  // Negative (< 0): Friend is owed money (credit)
  for (const userId in balances) {
    const b = balances[userId];
    b.netBalancePaise =
      b.totalOwedPaise -
      b.totalPaidPaise -
      b.totalPaymentsSentPaise +
      b.totalPaymentsReceivedPaise;
  }

  // Calculate direct pairwise debts without adjusting with other friends
  const directSettlements = calculateDirectPairwiseDebts(members, expenses, payments);
  for (const s of directSettlements) {
    if (balances[s.fromUserId]) {
      balances[s.fromUserId].totalDirectOwedToOthersPaise =
        (balances[s.fromUserId].totalDirectOwedToOthersPaise || 0) + s.amountPaise;
    }
    if (balances[s.toUserId]) {
      balances[s.toUserId].totalDirectOwedFromOthersPaise =
        (balances[s.toUserId].totalDirectOwedFromOthersPaise || 0) + s.amountPaise;
    }
  }

  return balances;
}

/**
 * Direct settlement: Who needs to give money to whom.
 * Strictly bilateral between the actual payer and debtor.
 * DOES NOT adjust or shuffle debts with other friends!
 * If Rahul paid for Aman's share, Aman gives money directly to Rahul.
 * Rohit or Vivek are never asked to pay or collect on their behalf.
 */
export function calculateDirectPairwiseDebts(
  members: GroupMember[],
  expenses: Expense[],
  payments: Payment[]
): SettlementDebt[] {
  // Build name dictionary
  const nameMap = new Map<string, string>();
  members.forEach((m) => nameMap.set(m.userId, m.name.replace(' (You)', '')));

  expenses.forEach((e) => {
    if (e.payerId && e.payerName && !nameMap.has(e.payerId)) {
      nameMap.set(e.payerId, e.payerName.replace(' (You)', ''));
    }
    e.dues.forEach((d) => {
      if (d.userId && d.userName && !nameMap.has(d.userId)) {
        nameMap.set(d.userId, d.userName.replace(' (You)', ''));
      }
    });
  });

  payments.forEach((p) => {
    if (p.fromUserId && p.fromUserName && !nameMap.has(p.fromUserId)) {
      nameMap.set(p.fromUserId, p.fromUserName.replace(' (You)', ''));
    }
    if (p.toUserId && p.toUserName && !nameMap.has(p.toUserId)) {
      nameMap.set(p.toUserId, p.toUserName.replace(' (You)', ''));
    }
  });

  // Pair tracker: key = `${minId}___${maxId}`
  interface PairData {
    idA: string;
    idB: string;
    duesAtoB: number; // A owes B from expenses where B was payer
    duesBtoA: number; // B owes A from expenses where A was payer
    paymentsAtoB: number; // A paid B directly
    paymentsBtoA: number; // B paid A directly
  }

  const pairs = new Map<string, PairData>();

  function getPair(userId1: string, userId2: string): { pair: PairData; isUserA: boolean } {
    const isUserA = userId1 < userId2;
    const idA = isUserA ? userId1 : userId2;
    const idB = isUserA ? userId2 : userId1;
    const key = `${idA}___${idB}`;

    if (!pairs.has(key)) {
      pairs.set(key, {
        idA,
        idB,
        duesAtoB: 0,
        duesBtoA: 0,
        paymentsAtoB: 0,
        paymentsBtoA: 0,
      });
    }

    return { pair: pairs.get(key)!, isUserA };
  }

  // 1. Accumulate confirmed expense dues directly between debtor and payer
  for (const exp of expenses) {
    if (exp.status !== 'CONFIRMED') continue;
    const payerId = exp.payerId;
    if (!payerId) continue;

    for (const due of exp.dues) {
      const debtorId = due.userId;
      if (!debtorId || debtorId === payerId || due.amountPaise <= 0) continue;

      const { pair, isUserA } = getPair(debtorId, payerId);
      // debtor owes payer
      if (isUserA) {
        // debtor is idA, payer is idB => duesAtoB
        pair.duesAtoB += due.amountPaise;
      } else {
        // debtor is idB, payer is idA => duesBtoA
        pair.duesBtoA += due.amountPaise;
      }
    }
  }

  // 2. Accumulate confirmed direct payments directly between sender and receiver
  for (const pay of payments) {
    if (pay.status && pay.status !== 'CONFIRMED') continue;
    if (pay.amountPaise <= 0) continue;
    const senderId = pay.fromUserId;
    const receiverId = pay.toUserId;
    if (!senderId || !receiverId || senderId === receiverId) continue;

    const { pair, isUserA } = getPair(senderId, receiverId);
    if (isUserA) {
      // sender is idA, receiver is idB => paymentsAtoB
      pair.paymentsAtoB += pay.amountPaise;
    } else {
      // sender is idB, receiver is idA => paymentsBtoA
      pair.paymentsBtoA += pay.amountPaise;
    }
  }

  // 3. Compute net direct settlement for each friend pair (no cross-adjustments!)
  const settlements: SettlementDebt[] = [];

  for (const pair of pairs.values()) {
    // Net A owes B:
    // (what A owes B from expenses - what A paid B) - (what B owes A from expenses - what B paid A)
    const netAtoB = (pair.duesAtoB - pair.paymentsAtoB) - (pair.duesBtoA - pair.paymentsBtoA);

    if (netAtoB > 0) {
      // idA needs to give netAtoB to idB
      settlements.push({
        fromUserId: pair.idA,
        fromUserName: nameMap.get(pair.idA) || 'Friend',
        toUserId: pair.idB,
        toUserName: nameMap.get(pair.idB) || 'Friend',
        amountPaise: netAtoB,
      });
    } else if (netAtoB < 0) {
      // idB needs to give |netAtoB| to idA
      settlements.push({
        fromUserId: pair.idB,
        fromUserName: nameMap.get(pair.idB) || 'Friend',
        toUserId: pair.idA,
        toUserName: nameMap.get(pair.idA) || 'Friend',
        amountPaise: Math.abs(netAtoB),
      });
    }
  }

  // Sort descending to show largest settlements at the top
  settlements.sort((a, b) => b.amountPaise - a.amountPaise);
  return settlements;
}

/**
 * Calculates direct pairwise balance between two specific members
 * Returns how much userA owes userB, or gets back from userB.
 */
export function calculateDirectBalanceBetween(
  userAId: string,
  userBId: string,
  expenses: Expense[],
  payments: Payment[]
): {
  userAOwesUserBPaise: number;
  userAGetsFromUserBPaise: number;
  isSettled: boolean;
} {
  if (userAId === userBId) {
    return { userAOwesUserBPaise: 0, userAGetsFromUserBPaise: 0, isSettled: true };
  }

  let duesAtoB = 0;
  let duesBtoA = 0;
  let paymentsAtoB = 0;
  let paymentsBtoA = 0;

  for (const exp of expenses) {
    if (exp.status !== 'CONFIRMED') continue;
    if (exp.payerId === userBId) {
      const due = exp.dues.find((d) => d.userId === userAId);
      if (due) duesAtoB += due.amountPaise;
    } else if (exp.payerId === userAId) {
      const due = exp.dues.find((d) => d.userId === userBId);
      if (due) duesBtoA += due.amountPaise;
    }
  }

  for (const pay of payments) {
    if (pay.status && pay.status !== 'CONFIRMED') continue;
    if (pay.fromUserId === userAId && pay.toUserId === userBId) {
      paymentsAtoB += pay.amountPaise;
    } else if (pay.fromUserId === userBId && pay.toUserId === userAId) {
      paymentsBtoA += pay.amountPaise;
    }
  }

  const netAtoB = (duesAtoB - paymentsAtoB) - (duesBtoA - paymentsBtoA);

  if (netAtoB > 0) {
    return { userAOwesUserBPaise: netAtoB, userAGetsFromUserBPaise: 0, isSettled: false };
  } else if (netAtoB < 0) {
    return { userAOwesUserBPaise: 0, userAGetsFromUserBPaise: Math.abs(netAtoB), isSettled: false };
  } else {
    return { userAOwesUserBPaise: 0, userAGetsFromUserBPaise: 0, isSettled: true };
  }
}

/**
 * Calculates who owes whom directly.
 * Overloaded for compatibility with previous calls, but always computes direct pairwise debts
 * without adjusting with other friends.
 */
export function calculateWhoOwesWhom(
  membersOrBalances: GroupMember[] | Record<string, MemberBalance>,
  expenses?: Expense[],
  payments?: Payment[]
): SettlementDebt[] {
  if (Array.isArray(membersOrBalances) && expenses && payments) {
    return calculateDirectPairwiseDebts(membersOrBalances, expenses, payments);
  }

  // Fallback for legacy balance map calls: simple greedy only if expenses aren't supplied
  const debtors: { userId: string; name: string; amount: number }[] = [];
  const creditors: { userId: string; name: string; amount: number }[] = [];

  for (const b of Object.values(membersOrBalances as Record<string, MemberBalance>)) {
    if (b.netBalancePaise > 0) {
      debtors.push({ userId: b.userId, name: b.name, amount: b.netBalancePaise });
    } else if (b.netBalancePaise < 0) {
      creditors.push({ userId: b.userId, name: b.name, amount: Math.abs(b.netBalancePaise) });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: SettlementDebt[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];
    const settlePaise = Math.min(debtor.amount, creditor.amount);

    if (settlePaise > 0) {
      settlements.push({
        fromUserId: debtor.userId,
        fromUserName: debtor.name,
        toUserId: creditor.userId,
        toUserName: creditor.name,
        amountPaise: settlePaise,
      });
    }

    debtor.amount -= settlePaise;
    creditor.amount -= settlePaise;

    if (debtor.amount <= 0) d++;
    if (creditor.amount <= 0) c++;
  }

  return settlements;
}
