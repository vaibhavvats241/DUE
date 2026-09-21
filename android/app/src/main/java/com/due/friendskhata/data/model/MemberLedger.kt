package com.due.friendskhata.data.model

import com.google.firebase.Timestamp

enum class BalanceStatus {
    CLEARED,
    PENDING,
    OVERPAID
}

data class MemberBalance(
    val memberId: String,
    val memberName: String,
    val totalDuePaise: Long,
    val totalPaidPaise: Long,
    val remainingBalancePaise: Long,
    val status: BalanceStatus
)

data class LedgerEntry(
    val id: String,
    val date: Timestamp?,
    val description: String,
    val addedPaise: Long,
    val paidPaise: Long,
    val runningBalancePaise: Long,
    val referenceId: String
)
