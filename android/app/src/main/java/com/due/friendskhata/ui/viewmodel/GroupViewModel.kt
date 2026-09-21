package com.due.friendskhata.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.due.friendskhata.data.model.ActivityLog
import com.due.friendskhata.data.model.Expense
import com.due.friendskhata.data.model.ExpenseStatus
import com.due.friendskhata.data.model.Group
import com.due.friendskhata.data.model.Member
import com.due.friendskhata.data.model.MemberBalance
import com.due.friendskhata.data.model.Payment
import com.due.friendskhata.data.repository.ExpenseRepository
import com.due.friendskhata.data.repository.GroupRepository
import com.due.friendskhata.data.repository.PaymentRepository
import com.due.friendskhata.domain.BalanceCalculator
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

data class GroupDashboardUiState(
    val isLoading: Boolean = true,
    val group: Group? = null,
    val members: List<Member> = emptyList(),
    val expenses: List<Expense> = emptyList(),
    val payments: List<Payment> = emptyList(),
    val activities: List<ActivityLog> = emptyList(),
    val memberBalances: List<MemberBalance> = emptyList(),
    val pendingConfirmationCount: Int = 0,
    val totalGroupExpensesPaise: Long = 0L,
    val errorMessage: String? = null
)

class GroupViewModel(
    private val groupRepository: GroupRepository = GroupRepository(),
    private val expenseRepository: ExpenseRepository = ExpenseRepository(),
    private val paymentRepository: PaymentRepository = PaymentRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(GroupDashboardUiState())
    val uiState: StateFlow<GroupDashboardUiState> = _uiState.asStateFlow()

    fun initGroup(groupId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)

            // Combine real-time streams for seamless single source of truth
            combine(
                groupRepository.observeGroup(groupId),
                groupRepository.observeGroupMembers(groupId),
                expenseRepository.observeGroupExpenses(groupId),
                paymentRepository.observeGroupPayments(groupId),
                paymentRepository.observeGroupActivities(groupId)
            ) { group, members, expenses, payments, activities ->
                val balances = BalanceCalculator.calculateAllMemberBalances(members, expenses, payments)
                val pendingCount = expenses.count { it.status == ExpenseStatus.PENDING_CONFIRMATION.name }
                val totalConfirmedExpenses = expenses
                    .filter { it.status == ExpenseStatus.CONFIRMED.name }
                    .sumOf { it.totalPaidPaise }

                GroupDashboardUiState(
                    isLoading = false,
                    group = group,
                    members = members,
                    expenses = expenses,
                    payments = payments,
                    activities = activities,
                    memberBalances = balances,
                    pendingConfirmationCount = pendingCount,
                    totalGroupExpensesPaise = totalConfirmedExpenses,
                    errorMessage = null
                )
            }.collect { state ->
                _uiState.value = state
            }
        }
    }

    fun createGroup(groupName: String, userId: String, userName: String, userEmail: String, onSuccess: (String) -> Unit) {
        if (groupName.isBlank()) {
            _uiState.value = _uiState.value.copy(errorMessage = "Please enter a group name.")
            return
        }

        viewModelScope.launch {
            val result = groupRepository.createGroup(groupName, userId, userName, userEmail)
            result.onSuccess { group ->
                onSuccess(group.groupId)
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(errorMessage = error.localizedMessage)
            }
        }
    }

    fun regenerateInviteCode(groupId: String) {
        viewModelScope.launch {
            groupRepository.regenerateInviteCode(groupId)
        }
    }

    fun renameGroup(groupId: String, newName: String) {
        if (newName.isBlank()) return
        viewModelScope.launch {
            groupRepository.renameGroup(groupId, newName)
        }
    }

    fun leaveGroup(groupId: String, userId: String, userName: String, onLeft: () -> Unit) {
        viewModelScope.launch {
            val result = groupRepository.leaveGroup(groupId, userId, userName)
            result.onSuccess { onLeft() }
                .onFailure { error -> _uiState.value = _uiState.value.copy(errorMessage = error.localizedMessage) }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
}
