package com.due.friendskhata.data.model

import com.google.firebase.Timestamp

enum class ExpenseStatus {
    PENDING_CONFIRMATION,
    CONFIRMED,
    REJECTED
}

data class Expense(
    val expenseId: String = "",
    val groupId: String = "",
    val title: String = "",
    val totalPaidPaise: Long = 0L,
    val payerId: String = "",
    val payerName: String = "",
    val createdById: String = "",
    val createdByName: String = "",
    val status: String = ExpenseStatus.PENDING_CONFIRMATION.name,
    val memberDues: Map<String, Long> = emptyMap(),
    val note: String? = null,
    val createdAt: Timestamp? = null,
    val confirmedAt: Timestamp? = null,
    val confirmedById: String? = null,
    val rejectedAt: Timestamp? = null,
    val rejectedById: String? = null,
    val rejectionReason: String? = null
)
