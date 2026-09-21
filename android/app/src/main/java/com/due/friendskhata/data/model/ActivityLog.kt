package com.due.friendskhata.data.model

import com.google.firebase.Timestamp

enum class ActivityType {
    EXPENSE_CREATED,
    EXPENSE_CONFIRMED,
    EXPENSE_REJECTED,
    PAYMENT_RECORDED,
    MEMBER_JOINED,
    MEMBER_LEFT
}

data class ActivityLog(
    val activityId: String = "",
    val groupId: String = "",
    val type: String = ActivityType.EXPENSE_CREATED.name,
    val description: String = "",
    val amountPaise: Long = 0L,
    val personName: String = "",
    val personId: String = "",
    val timestamp: Timestamp? = null,
    val status: String = "CONFIRMED",
    val referenceId: String = ""
)
