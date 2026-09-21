package com.due.friendskhata.domain

import com.due.friendskhata.data.model.BalanceStatus
import com.due.friendskhata.data.model.Expense
import com.due.friendskhata.data.model.ExpenseStatus
import com.due.friendskhata.data.model.LedgerEntry
import com.due.friendskhata.data.model.Member
import com.due.friendskhata.data.model.MemberBalance
import com.due.friendskhata.data.model.Payment
import com.due.friendskhata.data.model.PaymentStatus

object BalanceCalculator {

    /**
     * Computes the balance for a single member:
     * Current Due = Confirmed Assigned Dues - Confirmed Payments
     *
     * Only CONFIRMED expenses and payments are included.
     * Pending or rejected records are strictly omitted from balances.
     */
    fun calculateMemberBalance(
        memberId: String,
        memberName: String,
        expenses: List<Expense>,
        payments: List<Payment>
    ): MemberBalance {
        // Only confirmed expenses count
        val totalDuePaise = expenses
            .filter { it.status == ExpenseStatus.CONFIRMED.name }
            .sumOf { it.memberDues[memberId] ?: 0L }

        // Only confirmed payments count
        val totalPaidPaise = payments
            .filter { it.memberId == memberId && it.status == PaymentStatus.CONFIRMED.name }
            .sumOf { it.amountPaise }

        val remainingBalancePaise = totalDuePaise - totalPaidPaise

        val status = when {
            remainingBalancePaise == 0L -> BalanceStatus.CLEARED
            remainingBalancePaise > 0L -> BalanceStatus.PENDING
            else -> BalanceStatus.OVERPAID
        }

        return MemberBalance(
            memberId = memberId,
            memberName = memberName,
            totalDuePaise = totalDuePaise,
            totalPaidPaise = totalPaidPaise,
            remainingBalancePaise = remainingBalancePaise,
            status = status
        )
    }

    /**
     * Computes balances for all members in a group.
     */
    fun calculateAllMemberBalances(
        members: List<Member>,
        expenses: List<Expense>,
        payments: List<Payment>
    ): List<MemberBalance> {
        return members.map { member ->
            calculateMemberBalance(
                memberId = member.userId,
                memberName = member.displayName,
                expenses = expenses,
                payments = payments
            )
        }
    }

    /**
     * Builds the chronological ledger for a member:
     * Date | Description | Added | Paid | Running Balance
     */
    fun buildMemberLedger(
        memberId: String,
        expenses: List<Expense>,
        payments: List<Payment>
    ): List<LedgerEntry> {
        data class RawItem(
            val id: String,
            val timestamp: Long,
            val description: String,
            val added: Long,
            val paid: Long,
            val originalTimestamp: com.google.firebase.Timestamp?
        )

        val rawItems = mutableListOf<RawItem>()

        // 1. Confirmed expenses where this member was assigned dues
        expenses
            .filter { it.status == ExpenseStatus.CONFIRMED.name }
            .forEach { expense ->
                val due = expense.memberDues[memberId] ?: 0L
                if (due > 0L) {
                    val time = expense.confirmedAt?.toDate()?.time ?: expense.createdAt?.toDate()?.time ?: 0L
                    rawItems.add(
                        RawItem(
                            id = expense.expenseId,
                            timestamp = time,
                            description = expense.title,
                            added = due,
                            paid = 0L,
                            originalTimestamp = expense.confirmedAt ?: expense.createdAt
                        )
                    )
                }
            }

        // 2. Confirmed payments recorded for this member
        payments
            .filter { it.memberId == memberId && it.status == PaymentStatus.CONFIRMED.name }
            .forEach { payment ->
                val time = payment.createdAt?.toDate()?.time ?: 0L
                rawItems.add(
                    RawItem(
                        id = payment.paymentId,
                        timestamp = time,
                        description = if (!payment.note.isNullOrBlank()) "Payment (${payment.note})" else "Payment to group",
                        added = 0L,
                        paid = payment.amountPaise,
                        originalTimestamp = payment.createdAt
                    )
                )
            }

        // Sort chronologically (oldest first to compute running balance)
        rawItems.sortBy { it.timestamp }

        var runningBalance = 0L
        val ledger = mutableListOf<LedgerEntry>()

        for (item in rawItems) {
            runningBalance += item.added
            runningBalance -= item.paid
            ledger.add(
                LedgerEntry(
                    id = item.id,
                    date = item.originalTimestamp,
                    description = item.description,
                    addedPaise = item.added,
                    paidPaise = item.paid,
                    runningBalancePaise = runningBalance,
                    referenceId = item.id
                )
            )
        }

        // Return sorted newest first for UI display
        return ledger.reversed()
    }

    /**
     * Validates whether a proposed payment exceeds current due.
     */
    fun validatePaymentAmount(
        proposedPaymentPaise: Long,
        currentDuePaise: Long,
        allowOverpayment: Boolean = false
    ): Pair<Boolean, String?> {
        if (proposedPaymentPaise <= 0L) {
            return Pair(false, "Payment amount must be greater than ₹0.")
        }
        if (!allowOverpayment && proposedPaymentPaise > currentDuePaise) {
            return Pair(false, "Payment cannot exceed current due of ₹${currentDuePaise / 100}.")
        }
        return Pair(true, null)
    }
}
