package com.due.friendskhata.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.due.friendskhata.data.model.Expense
import com.due.friendskhata.data.model.ExpenseStatus
import com.due.friendskhata.data.model.Group
import com.due.friendskhata.data.model.Payment
import com.due.friendskhata.data.model.PaymentStatus
import com.due.friendskhata.data.repository.GroupRepository
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

data class HomeUiState(
    val isLoading: Boolean = true,
    val groups: List<Group> = emptyList(),
    val totalIOwePaise: Long = 0L,
    val totalOthersOweMePaise: Long = 0L,
    val errorMessage: String? = null
)

class HomeViewModel(
    private val groupRepository: GroupRepository = GroupRepository(),
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    fun loadUserGroups(userId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            groupRepository.observeUserGroups(userId).collect { groups ->
                _uiState.value = _uiState.value.copy(
                    groups = groups,
                    isLoading = false
                )
                calculateTotalsAcrossGroups(userId, groups)
            }
        }
    }

    private fun calculateTotalsAcrossGroups(userId: String, groups: List<Group>) {
        viewModelScope.launch {
            var iOweSum = 0L
            var othersOweSum = 0L

            for (group in groups) {
                try {
                    // Confirmed expenses for this group
                    val expSnap = firestore.collection("groups").document(group.groupId)
                        .collection("expenses")
                        .whereEqualTo("status", ExpenseStatus.CONFIRMED.name)
                        .get()
                        .await()
                    val expenses = expSnap.documents.mapNotNull { it.toObject(Expense::class.java) }

                    // Confirmed payments for this group
                    val paySnap = firestore.collection("groups").document(group.groupId)
                        .collection("payments")
                        .whereEqualTo("status", PaymentStatus.CONFIRMED.name)
                        .get()
                        .await()
                    val payments = paySnap.documents.mapNotNull { it.toObject(Payment::class.java) }

                    // How much this user owes in this group
                    val myDue = expenses.sumOf { it.memberDues[userId] ?: 0L }
                    val myPaid = payments.filter { it.memberId == userId }.sumOf { it.amountPaise }
                    val myNetBalance = myDue - myPaid
                    if (myNetBalance > 0L) {
                        iOweSum += myNetBalance
                    }

                    // How much others owe this user in this group (expenses where this user was payer)
                    val expensesPaidByMe = expenses.filter { it.payerId == userId }
                    for (exp in expensesPaidByMe) {
                        for ((debtorId, assigned) in exp.memberDues) {
                            if (debtorId != userId) {
                                othersOweSum += assigned
                            }
                        }
                    }
                } catch (_: Exception) {
                    // Fail gracefully for preview
                }
            }

            _uiState.value = _uiState.value.copy(
                totalIOwePaise = iOweSum,
                totalOthersOweMePaise = othersOweSum
            )
        }
    }

    fun joinGroup(inviteCode: String, userId: String, userName: String, userEmail: String, onSuccess: (String) -> Unit) {
        viewModelScope.launch {
            val result = groupRepository.joinGroupWithInviteCode(inviteCode, userId, userName, userEmail)
            result.onSuccess { group ->
                onSuccess(group.groupId)
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(errorMessage = error.localizedMessage)
            }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
}
