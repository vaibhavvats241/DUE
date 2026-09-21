package com.due.friendskhata.data.repository

import com.due.friendskhata.data.model.ActivityLog
import com.due.friendskhata.data.model.ActivityType
import com.due.friendskhata.data.model.Payment
import com.due.friendskhata.data.model.PaymentStatus
import com.due.friendskhata.domain.BalanceCalculator
import com.due.friendskhata.util.CurrencyUtils
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class PaymentRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {

    /**
     * Records a payment made by a member.
     * Enforces non-negative amount and overpayment rules.
     */
    suspend fun recordPayment(
        groupId: String,
        memberId: String,
        memberName: String,
        amountPaise: Long,
        recordedById: String,
        recordedByName: String,
        currentDuePaise: Long,
        note: String?
    ): Result<Payment> {
        val (isValid, errorMsg) = BalanceCalculator.validatePaymentAmount(
            proposedPaymentPaise = amountPaise,
            currentDuePaise = currentDuePaise,
            allowOverpayment = false
        )
        if (!isValid) {
            return Result.failure(Exception(errorMsg ?: "Invalid payment amount."))
        }

        return try {
            val paymentRef = firestore.collection("groups").document(groupId)
                .collection("payments").document()
            val paymentId = paymentRef.id
            val now = Timestamp.now()

            val payment = Payment(
                paymentId = paymentId,
                groupId = groupId,
                memberId = memberId,
                memberName = memberName,
                amountPaise = amountPaise,
                recordedById = recordedById,
                recordedByName = recordedByName,
                note = note?.trim()?.ifEmpty { null },
                createdAt = now,
                status = PaymentStatus.CONFIRMED.name
            )

            val batch = firestore.batch()
            batch.set(paymentRef, payment)

            // Log activity
            val activityRef = firestore.collection("groups").document(groupId)
                .collection("activities").document()
            val formattedAmount = CurrencyUtils.formatPaiseToRupees(amountPaise)
            val desc = "$recordedByName recorded $memberName's payment of $formattedAmount"

            batch.set(
                activityRef,
                ActivityLog(
                    activityId = activityRef.id,
                    groupId = groupId,
                    type = ActivityType.PAYMENT_RECORDED.name,
                    description = desc,
                    amountPaise = amountPaise,
                    personName = recordedByName,
                    personId = recordedById,
                    timestamp = now,
                    status = PaymentStatus.CONFIRMED.name,
                    referenceId = paymentId
                )
            )

            batch.commit().await()
            Result.success(payment)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun observeGroupPayments(groupId: String): Flow<List<Payment>> = callbackFlow {
        val listener = firestore.collection("groups").document(groupId)
            .collection("payments")
            .orderBy("createdAt", com.google.firebase.firestore.Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val list = snapshot?.documents?.mapNotNull { it.toObject(Payment::class.java) } ?: emptyList()
                trySend(list)
            }
        awaitClose { listener.remove() }
    }

    fun observeGroupActivities(groupId: String): Flow<List<ActivityLog>> = callbackFlow {
        val listener = firestore.collection("groups").document(groupId)
            .collection("activities")
            .orderBy("timestamp", com.google.firebase.firestore.Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val list = snapshot?.documents?.mapNotNull { it.toObject(ActivityLog::class.java) } ?: emptyList()
                trySend(list)
            }
        awaitClose { listener.remove() }
    }
}
