package com.due.friendskhata

import com.due.friendskhata.data.model.BalanceStatus
import com.due.friendskhata.data.model.Expense
import com.due.friendskhata.data.model.ExpenseStatus
import com.due.friendskhata.data.model.Payment
import com.due.friendskhata.data.model.PaymentStatus
import com.due.friendskhata.domain.BalanceCalculator
import com.due.friendskhata.domain.ExpenseValidationResult
import com.due.friendskhata.domain.ExpenseValidator
import com.google.common.truth.Truth.assertThat
import org.junit.Test

class BalanceCalculatorTest {

    @Test
    fun testCorePromptExample_OldDuePlusNewDueMinusPayment() {
        // Rahul already owes ₹700
        // A new expense adds ₹500
        // Rahul’s total due becomes: ₹700 + ₹500 = ₹1,200
        // If Rahul pays ₹300: ₹1,200 - ₹300 = ₹900 remaining.

        val memberId = "user_rahul"
        val memberName = "Rahul"

        val expense1 = Expense(
            expenseId = "exp_1",
            title = "Lunch",
            totalPaidPaise = 70000L,
            payerId = "user_payer",
            status = ExpenseStatus.CONFIRMED.name,
            memberDues = mapOf(memberId to 70000L) // ₹700
        )

        val expense2 = Expense(
            expenseId = "exp_2",
            title = "Movie",
            totalPaidPaise = 50000L,
            payerId = "user_payer",
            status = ExpenseStatus.CONFIRMED.name,
            memberDues = mapOf(memberId to 50000L) // ₹500
        )

        val payment1 = Payment(
            paymentId = "pay_1",
            memberId = memberId,
            memberName = memberName,
            amountPaise = 30000L, // ₹300
            status = PaymentStatus.CONFIRMED.name
        )

        val balance = BalanceCalculator.calculateMemberBalance(
            memberId = memberId,
            memberName = memberName,
            expenses = listOf(expense1, expense2),
            payments = listOf(payment1)
        )

        assertThat(balance.totalDuePaise).isEqualTo(120000L) // ₹1,200
        assertThat(balance.totalPaidPaise).isEqualTo(30000L) // ₹300
        assertThat(balance.remainingBalancePaise).isEqualTo(90000L) // ₹900
        assertThat(balance.status).isEqualTo(BalanceStatus.PENDING)
    }

    @Test
    fun testExpenseValidation_ExactMatchValid() {
        // Total paid = ₹2500
        // Dues: Aman ₹700, Rohit ₹1000, Vivek ₹800 (Sum = ₹2500)
        val totalPaidPaise = 250000L
        val dues = mapOf(
            "user_aman" to 70000L,
            "user_rohit" to 100000L,
            "user_vivek" to 80000L
        )

        val result = ExpenseValidator.validateExpenseDues(totalPaidPaise, dues)
        assertThat(result).isInstanceOf(ExpenseValidationResult.Valid::class.java)
    }

    @Test
    fun testExpenseValidation_UnderAssignedMismatch() {
        // Total paid = ₹2500, entered dues = ₹700 + ₹1000 = ₹1700 (₹800 unassigned)
        val totalPaidPaise = 250000L
        val dues = mapOf(
            "user_aman" to 70000L,
            "user_rohit" to 100000L
        )

        val result = ExpenseValidator.validateExpenseDues(totalPaidPaise, dues)
        assertThat(result).isInstanceOf(ExpenseValidationResult.UnderAssigned::class.java)
        val under = result as ExpenseValidationResult.UnderAssigned
        assertThat(under.unassignedPaise).isEqualTo(80000L)
        assertThat(under.message).contains("is still unassigned")
    }

    @Test
    fun testExpenseValidation_OverAssignedMismatch() {
        // Total paid = ₹2000, entered dues = ₹2500 (₹500 excess)
        val totalPaidPaise = 200000L
        val dues = mapOf(
            "user_aman" to 150000L,
            "user_rohit" to 100000L
        )

        val result = ExpenseValidator.validateExpenseDues(totalPaidPaise, dues)
        assertThat(result).isInstanceOf(ExpenseValidationResult.OverAssigned::class.java)
        val over = result as ExpenseValidationResult.OverAssigned
        assertThat(over.excessPaise).isEqualTo(50000L)
        assertThat(over.message).contains("exceed the total")
    }

    @Test
    fun testPendingAndRejectedExpenses_DoNotAffectBalances() {
        val memberId = "user_aman"
        val memberName = "Aman"

        val confirmedExpense = Expense(
            expenseId = "exp_confirmed",
            title = "Dinner",
            totalPaidPaise = 100000L,
            payerId = "user_rahul",
            status = ExpenseStatus.CONFIRMED.name,
            memberDues = mapOf(memberId to 40000L) // ₹400
        )

        val pendingExpense = Expense(
            expenseId = "exp_pending",
            title = "Snacks",
            totalPaidPaise = 60000L,
            payerId = "user_rahul",
            status = ExpenseStatus.PENDING_CONFIRMATION.name,
            memberDues = mapOf(memberId to 60000L) // ₹600 (PENDING)
        )

        val rejectedExpense = Expense(
            expenseId = "exp_rejected",
            title = "Uber",
            totalPaidPaise = 50000L,
            payerId = "user_rahul",
            status = ExpenseStatus.REJECTED.name,
            memberDues = mapOf(memberId to 50000L) // ₹500 (REJECTED)
        )

        val balance = BalanceCalculator.calculateMemberBalance(
            memberId = memberId,
            memberName = memberName,
            expenses = listOf(confirmedExpense, pendingExpense, rejectedExpense),
            payments = emptyList()
        )

        // Only the ₹400 confirmed expense must be counted
        assertThat(balance.totalDuePaise).isEqualTo(40000L)
        assertThat(balance.remainingBalancePaise).isEqualTo(40000L)
    }

    @Test
    fun testPreventOverpayment() {
        val currentDuePaise = 50000L // ₹500

        // Proposed payment ₹600 (Overpayment)
        val (isValidExcess, errorExcess) = BalanceCalculator.validatePaymentAmount(
            proposedPaymentPaise = 60000L,
            currentDuePaise = currentDuePaise,
            allowOverpayment = false
        )
        assertThat(isValidExcess).isFalse()
        assertThat(errorExcess).contains("cannot exceed current due")

        // Proposed payment ₹500 (Exact)
        val (isValidExact, _) = BalanceCalculator.validatePaymentAmount(
            proposedPaymentPaise = 50000L,
            currentDuePaise = currentDuePaise,
            allowOverpayment = false
        )
        assertThat(isValidExact).isTrue()

        // Proposed payment ₹0 (Invalid)
        val (isValidZero, errorZero) = BalanceCalculator.validatePaymentAmount(
            proposedPaymentPaise = 0L,
            currentDuePaise = currentDuePaise,
            allowOverpayment = false
        )
        assertThat(isValidZero).isFalse()
        assertThat(errorZero).contains("greater than ₹0")
    }

    @Test
    fun testMultipleExpensesAndPayments_ClearedStatus() {
        val memberId = "user_vivek"
        val memberName = "Vivek"

        val exp1 = Expense(
            expenseId = "e1",
            totalPaidPaise = 50000L,
            status = ExpenseStatus.CONFIRMED.name,
            memberDues = mapOf(memberId to 50000L)
        )
        val exp2 = Expense(
            expenseId = "e2",
            totalPaidPaise = 25000L,
            status = ExpenseStatus.CONFIRMED.name,
            memberDues = mapOf(memberId to 25000L)
        )

        val pay1 = Payment(
            paymentId = "p1",
            memberId = memberId,
            amountPaise = 40000L,
            status = PaymentStatus.CONFIRMED.name
        )
        val pay2 = Payment(
            paymentId = "p2",
            memberId = memberId,
            amountPaise = 35000L,
            status = PaymentStatus.CONFIRMED.name
        )

        val balance = BalanceCalculator.calculateMemberBalance(
            memberId = memberId,
            memberName = memberName,
            expenses = listOf(exp1, exp2),
            payments = listOf(pay1, pay2)
        )

        // Total due = ₹500 + ₹250 = ₹750
        // Total paid = ₹400 + ₹350 = ₹750
        // Remaining = ₹0, Status = CLEARED
        assertThat(balance.totalDuePaise).isEqualTo(75000L)
        assertThat(balance.totalPaidPaise).isEqualTo(75000L)
        assertThat(balance.remainingBalancePaise).isEqualTo(0L)
        assertThat(balance.status).isEqualTo(BalanceStatus.CLEARED)
    }
}
