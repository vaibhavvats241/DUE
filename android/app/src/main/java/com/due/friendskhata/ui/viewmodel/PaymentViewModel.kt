package com.due.friendskhata.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.due.friendskhata.data.model.Expense
import com.due.friendskhata.data.model.LedgerEntry
import com.due.friendskhata.data.model.Member
import com.due.friendskhata.data.model.MemberBalance
import com.due.friendskhata.data.model.Payment
import com.due.friendskhata.data.repository.PaymentRepository
import com.due.friendskhata.domain.BalanceCalculator
import com.due.friendskhata.util.CurrencyUtils
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class RecordPaymentUiState(
    val amountRupeesStr: String = "",
    val amountPaise: Long = 0L,
    val note: String = "",
    val currentDuePaise: Long = 0L,
    val isSubmitting: Boolean = false,
    val errorMessage: String? = null
)

data class MemberDetailsUiState(
    val member: Member? = null,
    val balance: MemberBalance? = null,
    val ledgerEntries: List<LedgerEntry> = emptyList(),
    val isLoading: Boolean = false
)

class PaymentViewModel(
    private val paymentRepository: PaymentRepository = PaymentRepository()
) : ViewModel() {

    private val _paymentState = MutableStateFlow(RecordPaymentUiState())
    val paymentState: StateFlow<RecordPaymentUiState> = _paymentState.asStateFlow()

    private val _memberDetailsState = MutableStateFlow(MemberDetailsUiState())
    val memberDetailsState: StateFlow<MemberDetailsUiState> = _memberDetailsState.asStateFlow()

    fun setInitialDue(duePaise: Long) {
        _paymentState.value = _paymentState.value.copy(currentDuePaise = duePaise)
    }

    fun updatePaymentAmount(input: String) {
        val paise = CurrencyUtils.parseRupeesToPaise(input) ?: 0L
        _paymentState.value = _paymentState.value.copy(
            amountRupeesStr = input,
            amountPaise = paise
        )
    }

    fun updatePaymentNote(note: String) {
        _paymentState.value = _paymentState.value.copy(note = note)
    }

    fun recordPayment(
        groupId: String,
        memberId: String,
        memberName: String,
        recordedById: String,
        recordedByName: String,
        onSuccess: () -> Unit
    ) {
        val state = _paymentState.value
        val (isValid, errorMsg) = BalanceCalculator.validatePaymentAmount(
            proposedPaymentPaise = state.amountPaise,
            currentDuePaise = state.currentDuePaise,
            allowOverpayment = false
        )
        if (!isValid) {
            _paymentState.value = state.copy(errorMessage = errorMsg)
            return
        }

        viewModelScope.launch {
            _paymentState.value = _paymentState.value.copy(isSubmitting = true)
            val result = paymentRepository.recordPayment(
                groupId = groupId,
                memberId = memberId,
                memberName = memberName,
                amountPaise = state.amountPaise,
                recordedById = recordedById,
                recordedByName = recordedByName,
                currentDuePaise = state.currentDuePaise,
                note = state.note
            )

            result.onSuccess {
                _paymentState.value = RecordPaymentUiState()
                onSuccess()
            }.onFailure { error ->
                _paymentState.value = _paymentState.value.copy(
                    isSubmitting = false,
                    errorMessage = error.localizedMessage
                )
            }
        }
    }

    fun loadMemberDetails(
        member: Member,
        expenses: List<Expense>,
        payments: List<Payment>
    ) {
        val balance = BalanceCalculator.calculateMemberBalance(
            memberId = member.userId,
            memberName = member.displayName,
            expenses = expenses,
            payments = payments
        )
        val ledger = BalanceCalculator.buildMemberLedger(
            memberId = member.userId,
            expenses = expenses,
            payments = payments
        )

        _memberDetailsState.value = MemberDetailsUiState(
            member = member,
            balance = balance,
            ledgerEntries = ledger,
            isLoading = false
        )
    }

    fun clearError() {
        _paymentState.value = _paymentState.value.copy(errorMessage = null)
    }
}
