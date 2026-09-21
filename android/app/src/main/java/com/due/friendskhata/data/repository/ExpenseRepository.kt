package com.due.friendskhata.data.repository

import com.due.friendskhata.data.model.ActivityLog
import com.due.friendskhata.data.model.ActivityType
import com.due.friendskhata.data.model.Expense
import com.due.friendskhata.data.model.ExpenseStatus
import com.due.friendskhata.domain.ExpenseValidationResult
import com.due.friendskhata.domain.ExpenseValidator
import com.due.friendskhata.util.CurrencyUtils
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class ExpenseRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {

    /**
     * Creates an expense.
     * If the creator is the payer, it is directly CONFIRMED.
     * If someone else created the draft, it is saved as PENDING_CONFIRMATION.
     */
    suspend fun createExpense(
        groupId: String,
        title: String,
        totalPaidPaise: Long,
        payerId: String,
        payerName: String,
        creatorId: String,
        creatorName: String,
        memberDues: Map<String, Long>,
        note: String?
    ): Result<Expense> {
        // Enforce validation before saving
        val validation = ExpenseValidator.validateExpenseDues(totalPaidPaise, memberDues)
        if (validation !is ExpenseValidationResult.Valid) {
            val errorMsg = when (validation) {
                is ExpenseValidationResult.UnderAssigned -> validation.message
                is ExpenseValidationResult.OverAssigned -> validation.message
                is ExpenseValidationResult.InvalidInput -> validation.error
                else -> "Entered dues must exactly match the total amount paid."
            }
            return Result.failure(Exception(errorMsg))
        }

        return try {
            val expenseRef = firestore.collection("groups").document(groupId)
                .collection("expenses").document()
            val expenseId = expenseRef.id
            val now = Timestamp.now()

            val isPayerCreator = (creatorId == payerId)
            val initialStatus = if (isPayerCreator) {
                ExpenseStatus.CONFIRMED.name
            } else {
                ExpenseStatus.PENDING_CONFIRMATION.name
            }

            val expense = Expense(
                expenseId = expenseId,
                groupId = groupId,
                title = title.trim(),
                totalPaidPaise = totalPaidPaise,
                payerId = payerId,
                payerName = payerName,
                createdById = creatorId,
                createdByName = creatorName,
                status = initialStatus,
                memberDues = memberDues,
                note = note?.trim()?.ifEmpty { null },
                createdAt = now,
                confirmedAt = if (isPayerCreator) now else null,
                confirmedById = if (isPayerCreator) payerId else null
            )

            val batch = firestore.batch()
            batch.set(expenseRef, expense)

            // Log activity
            val activityRef = firestore.collection("groups").document(groupId)
                .collection("activities").document()
            val amountFormatted = CurrencyUtils.formatPaiseToRupees(totalPaidPaise)
            val desc = if (isPayerCreator) {
                "$creatorName added & confirmed \"$title\" ($amountFormatted)"
            } else {
                "$creatorName created expense draft \"$title\" ($amountFormatted) awaiting $payerName's confirmation"
            }

            batch.set(
                activityRef,
                ActivityLog(
                    activityId = activityRef.id,
                    groupId = groupId,
                    type = if (isPayerCreator) ActivityType.EXPENSE_CONFIRMED.name else ActivityType.EXPENSE_CREATED.name,
                    description = desc,
                    amountPaise = totalPaidPaise,
                    personName = creatorName,
                    personId = creatorId,
                    timestamp = now,
                    status = initialStatus,
                    referenceId = expenseId
                )
            )

            batch.commit().await()
            Result.success(expense)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Confirms a pending expense.
     * Enforces: Only the assigned payer can confirm!
     */
    suspend fun confirmExpense(
        groupId: String,
        expenseId: String,
        actingUserId: String,
        actingUserName: String
    ): Result<Unit> {
        return try {
            val expenseRef = firestore.collection("groups").document(groupId)
                .collection("expenses").document(expenseId)

            firestore.runTransaction { transaction ->
                val snapshot = transaction.get(expenseRef)
                val expense = snapshot.toObject(Expense::class.java)
                    ?: throw Exception("Expense document not found.")

                if (expense.status != ExpenseStatus.PENDING_CONFIRMATION.name) {
                    throw Exception("This expense is already ${expense.status}.")
                }

                // Strict Payer Authority Check
                if (expense.payerId != actingUserId) {
                    throw Exception("Unauthorized: Only the assigned payer (${expense.payerName}) can confirm this expense.")
                }

                val now = Timestamp.now()
                transaction.update(
                    expenseRef,
                    mapOf(
                        "status" to ExpenseStatus.CONFIRMED.name,
                        "confirmedAt" to now,
                        "confirmedById" to actingUserId
                    )
                )

                // Activity log
                val activityRef = firestore.collection("groups").document(groupId)
                    .collection("activities").document()
                val amountFormatted = CurrencyUtils.formatPaiseToRupees(expense.totalPaidPaise)
                transaction.set(
                    activityRef,
                    ActivityLog(
                        activityId = activityRef.id,
                        groupId = groupId,
                        type = ActivityType.EXPENSE_CONFIRMED.name,
                        description = "$actingUserName confirmed expense \"${expense.title}\" ($amountFormatted)",
                        amountPaise = expense.totalPaidPaise,
                        personName = actingUserName,
                        personId = actingUserId,
                        timestamp = now,
                        status = ExpenseStatus.CONFIRMED.name,
                        referenceId = expenseId
                    )
                )
            }.await()

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Rejects a pending expense.
     * Enforces: Only the assigned payer can reject!
     */
    suspend fun rejectExpense(
        groupId: String,
        expenseId: String,
        actingUserId: String,
        actingUserName: String,
        reason: String?
    ): Result<Unit> {
        return try {
            val expenseRef = firestore.collection("groups").document(groupId)
                .collection("expenses").document(expenseId)

            firestore.runTransaction { transaction ->
                val snapshot = transaction.get(expenseRef)
                val expense = snapshot.toObject(Expense::class.java)
                    ?: throw Exception("Expense document not found.")

                if (expense.status != ExpenseStatus.PENDING_CONFIRMATION.name) {
                    throw Exception("This expense is already ${expense.status}.")
                }

                if (expense.payerId != actingUserId) {
                    throw Exception("Unauthorized: Only the assigned payer (${expense.payerName}) can reject this expense.")
                }

                val now = Timestamp.now()
                transaction.update(
                    expenseRef,
                    mapOf(
                        "status" to ExpenseStatus.REJECTED.name,
                        "rejectedAt" to now,
                        "rejectedById" to actingUserId,
                        "rejectionReason" to (reason?.trim()?.ifEmpty { null })
                    )
                )

                val activityRef = firestore.collection("groups").document(groupId)
                    .collection("activities").document()
                val reasonSuffix = if (!reason.isNullOrBlank()) " Reason: $reason" else ""
                transaction.set(
                    activityRef,
                    ActivityLog(
                        activityId = activityRef.id,
                        groupId = groupId,
                        type = ActivityType.EXPENSE_REJECTED.name,
                        description = "$actingUserName rejected expense \"${expense.title}\".$reasonSuffix",
                        amountPaise = expense.totalPaidPaise,
                        personName = actingUserName,
                        personId = actingUserId,
                        timestamp = now,
                        status = ExpenseStatus.REJECTED.name,
                        referenceId = expenseId
                    )
                )
            }.await()

            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun observeGroupExpenses(groupId: String): Flow<List<Expense>> = callbackFlow {
        val listener = firestore.collection("groups").document(groupId)
            .collection("expenses")
            .orderBy("createdAt", com.google.firebase.firestore.Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val list = snapshot?.documents?.mapNotNull { it.toObject(Expense::class.java) } ?: emptyList()
                trySend(list)
            }
        awaitClose { listener.remove() }
    }
}
