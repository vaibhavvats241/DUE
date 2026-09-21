package com.due.friendskhata.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.due.friendskhata.data.model.Member
import com.due.friendskhata.data.repository.ExpenseRepository
import com.due.friendskhata.domain.ExpenseValidationResult
import com.due.friendskhata.domain.ExpenseValidator
import com.due.friendskhata.util.CurrencyUtils
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AddExpenseUiState(
    val title: String = "",
    val totalPaidRupeesStr: String = "",
    val totalPaidPaise: Long = 0L,
    val selectedPayer: Member? = null,
    val duesMap: Map<String, Long> = emptyMap(), // memberId -> paise
    val duesInputStrings: Map<String, String> = emptyMap(), // memberId -> rupees string
    val note: String = "",
    val enteredDuesPaise: Long = 0L,
    val differencePaise: Long = 0L,
    val validationMessage: String = "",
    val isValid: Boolean = false,
    val isSubmitting: Boolean = false,
    val errorMessage: String? = null
)

class ExpenseViewModel(
    private val expenseRepository: ExpenseRepository = ExpenseRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(AddExpenseUiState())
    val uiState: StateFlow<AddExpenseUiState> = _uiState.asStateFlow()

    fun updateTitle(newTitle: String) {
        _uiState.value = _uiState.value.copy(title = newTitle)
    }

    fun updateTotalPaid(input: String) {
        val paise = CurrencyUtils.parseRupeesToPaise(input) ?: 0L
        _uiState.value = _uiState.value.copy(
            totalPaidRupeesStr = input,
            totalPaidPaise = paise
        )
        recalculateValidation()
    }

    fun selectPayer(payer: Member) {
        _uiState.value = _uiState.value.copy(selectedPayer = payer)
    }

    fun updateMemberDue(memberId: String, input: String) {
        val paise = CurrencyUtils.parseRupeesToPaise(input) ?: 0L
        val updatedInputs = _uiState.value.duesInputStrings.toMutableMap()
        updatedInputs[memberId] = input

        val updatedDues = _uiState.value.duesMap.toMutableMap()
        if (paise > 0L) {
            updatedDues[memberId] = paise
        } else {
            updatedDues.remove(memberId)
        }

        _uiState.value = _uiState.value.copy(
            duesInputStrings = updatedInputs,
            duesMap = updatedDues
        )
        recalculateValidation()
    }

    fun updateNote(newNote: String) {
        _uiState.value = _uiState.value.copy(note = newNote)
    }

    private fun recalculateValidation() {
        val total = _uiState.value.totalPaidPaise
        val dues = _uiState.value.duesMap
        val enteredSum = dues.values.sum()
        val diff = total - enteredSum

        if (total <= 0L) {
            _uiState.value = _uiState.value.copy(
                enteredDuesPaise = enteredSum,
                differencePaise = diff,
                validationMessage = "Enter total amount paid.",
                isValid = false
            )
            return
        }

        val result = ExpenseValidator.validateExpenseDues(total, dues)
        when (result) {
            is ExpenseValidationResult.Valid -> {
                _uiState.value = _uiState.value.copy(
                    enteredDuesPaise = enteredSum,
                    differencePaise = 0L,
                    validationMessage = "Amounts match. Ready to submit.",
                    isValid = true
                )
            }
            is ExpenseValidationResult.UnderAssigned -> {
                _uiState.value = _uiState.value.copy(
                    enteredDuesPaise = enteredSum,
                    differencePaise = diff,
                    validationMessage = result.message,
                    isValid = false
                )
            }
            is ExpenseValidationResult.OverAssigned -> {
                _uiState.value = _uiState.value.copy(
                    enteredDuesPaise = enteredSum,
                    differencePaise = diff,
                    validationMessage = result.message,
                    isValid = false
                )
            }
            is ExpenseValidationResult.InvalidInput -> {
                _uiState.value = _uiState.value.copy(
                    enteredDuesPaise = enteredSum,
                    differencePaise = diff,
                    validationMessage = result.error,
                    isValid = false
                )
            }
        }
    }

    fun submitExpense(
        groupId: String,
        currentUserId: String,
        currentUserName: String,
        onSuccess: () -> Unit
    ) {
        val state = _uiState.value
        val payer = state.selectedPayer
        if (payer == null) {
            _uiState.value = state.copy(errorMessage = "Please select who paid.")
            return
        }
        if (state.title.isBlank()) {
            _uiState.value = state.copy(errorMessage = "Please enter an expense title.")
            return
        }
        if (!state.isValid) {
            _uiState.value = state.copy(errorMessage = "Entered dues must exactly match the total amount paid.")
            return
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSubmitting = true)
            val result = expenseRepository.createExpense(
                groupId = groupId,
                title = state.title,
                totalPaidPaise = state.totalPaidPaise,
                payerId = payer.userId,
                payerName = payer.displayName,
                creatorId = currentUserId,
                creatorName = currentUserName,
                memberDues = state.duesMap,
                note = state.note
            )

            result.onSuccess {
                _uiState.value = AddExpenseUiState() // reset
                onSuccess()
            }.onFailure { error ->
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    errorMessage = error.localizedMessage
                )
            }
        }
    }

    fun confirmExpense(groupId: String, expenseId: String, currentUserId: String, currentUserName: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            val result = expenseRepository.confirmExpense(groupId, expenseId, currentUserId, currentUserName)
            result.onSuccess { onSuccess() }
                .onFailure { error -> _uiState.value = _uiState.value.copy(errorMessage = error.localizedMessage) }
        }
    }

    fun rejectExpense(
        groupId: String,
        expenseId: String,
        currentUserId: String,
        currentUserName: String,
        reason: String?,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            val result = expenseRepository.rejectExpense(groupId, expenseId, currentUserId, currentUserName, reason)
            result.onSuccess { onSuccess() }
                .onFailure { error -> _uiState.value = _uiState.value.copy(errorMessage = error.localizedMessage) }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
}
