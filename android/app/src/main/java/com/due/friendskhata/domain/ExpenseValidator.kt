package com.due.friendskhata.domain

import com.due.friendskhata.util.CurrencyUtils

sealed class ExpenseValidationResult {
    data object Valid : ExpenseValidationResult()
    data class UnderAssigned(val unassignedPaise: Long, val message: String) : ExpenseValidationResult()
    data class OverAssigned(val excessPaise: Long, val message: String) : ExpenseValidationResult()
    data class InvalidInput(val error: String) : ExpenseValidationResult()
}

object ExpenseValidator {
    /**
     * Validates whether friend dues match total amount paid exactly.
     * All calculations are done purely in Long paise.
     */
    fun validateExpenseDues(totalPaidPaise: Long, memberDues: Map<String, Long>): ExpenseValidationResult {
        if (totalPaidPaise <= 0L) {
            return ExpenseValidationResult.InvalidInput("Total amount paid must be greater than zero.")
        }

        // Verify no negative dues
        for ((_, due) in memberDues) {
            if (due < 0L) {
                return ExpenseValidationResult.InvalidInput("Member dues cannot be negative.")
            }
        }

        val sumDues = memberDues.values.sum()
        val difference = totalPaidPaise - sumDues

        return when {
            difference == 0L -> ExpenseValidationResult.Valid
            difference > 0L -> {
                val formattedDiff = CurrencyUtils.formatPaiseToRupees(difference)
                ExpenseValidationResult.UnderAssigned(
                    unassignedPaise = difference,
                    message = "$formattedDiff is still unassigned."
                )
            }
            else -> {
                val excess = -difference
                val formattedExcess = CurrencyUtils.formatPaiseToRupees(excess)
                ExpenseValidationResult.OverAssigned(
                    excessPaise = excess,
                    message = "Entered dues exceed the total by $formattedExcess."
                )
            }
        }
    }
}
