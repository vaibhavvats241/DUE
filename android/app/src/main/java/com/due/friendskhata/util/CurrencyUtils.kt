package com.due.friendskhata.util

import java.text.DecimalFormat
import java.text.NumberFormat
import java.util.Locale

object CurrencyUtils {
    /**
     * Converts paise (Long) to formatted Indian Rupee string.
     * Example: 250000L -> "₹2,500"
     * Example: 2550L -> "₹25.50"
     * Example: 0L -> "₹0"
     */
    fun formatPaiseToRupees(paise: Long, alwaysShowDecimals: Boolean = false): String {
        val isNegative = paise < 0
        val absPaise = kotlin.math.abs(paise)
        val rupees = absPaise / 100
        val remainingPaise = absPaise % 100

        val indianFormat = NumberFormat.getNumberInstance(Locale("en", "IN"))

        val formattedRupees = indianFormat.format(rupees)
        val prefix = if (isNegative) "-₹" else "₹"

        return if (remainingPaise == 0L && !alwaysShowDecimals) {
            "$prefix$formattedRupees"
        } else {
            val paiseStr = remainingPaise.toString().padStart(2, '0')
            "$prefix$formattedRupees.$paiseStr"
        }
    }

    /**
     * Converts a user entered Rupee string (e.g. "2500" or "25.50") into paise (Long).
     * Rejects invalid formats, multiple decimals, negative inputs, and fractions smaller than paise.
     */
    fun parseRupeesToPaise(input: String): Long? {
        val trimmed = input.trim().replace("₹", "").replace(",", "")
        if (trimmed.isEmpty()) return null

        val parts = trimmed.split(".")
        if (parts.size > 2) return null

        val wholePart = parts[0].toLongOrNull() ?: return null
        if (wholePart < 0) return null

        val fractionPart = if (parts.size == 2) {
            val fracStr = parts[1]
            if (fracStr.length > 2) return null // More than 2 decimal places not supported (paise is 2 digits)
            fracStr.padEnd(2, '0').toLongOrNull() ?: return null
        } else {
            0L
        }

        return (wholePart * 100L) + fractionPart
    }

    /**
     * Helper to parse double or float for display only, but math is purely Long paise.
     */
    fun toPaise(rupees: Long): Long = rupees * 100L
}
