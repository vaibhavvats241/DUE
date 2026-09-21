package com.due.friendskhata.data.model

import com.google.firebase.Timestamp

enum class PaymentStatus {
    CONFIRMED,
    PENDING
}

data class Payment(
    val paymentId: String = "",
    val groupId: String = "",
    val memberId: String = "",
    val memberName: String = "",
    val amountPaise: Long = 0L,
    val recordedById: String = "",
    val recordedByName: String = "",
    val note: String? = null,
    val createdAt: Timestamp? = null,
    val status: String = PaymentStatus.CONFIRMED.name
)
