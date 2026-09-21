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

  return balances;
}

/**
 * Calculates the minimal pairwise debt settlement plan ("Who Owes Whom").
 * Uses a deterministic greedy algorithm to simplify multiple debts into minimal payments.
 */
export function calculateWhoOwesWhom(
  memberBalances: Record<string, MemberBalance>
): SettlementDebt[] {
  const debtors: { userId: string; name: string; amount: number }[] = [];
  const creditors: { userId: string; name: string; amount: number }[] = [];

  for (const b of Object.values(memberBalances)) {
    // Positive netBalancePaise means the member owes money to the group
    if (b.netBalancePaise > 0) {
      debtors.push({ userId: b.userId, name: b.name, amount: b.netBalancePaise });
    } else if (b.netBalancePaise < 0) {
      // Negative netBalancePaise means the member is owed money by the group
      creditors.push({ userId: b.userId, name: b.name, amount: Math.abs(b.netBalancePaise) });
    }
  }

  // Sort descending to settle largest amounts first
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
