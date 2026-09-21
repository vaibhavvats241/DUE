package com.due.friendskhata.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.due.friendskhata.data.model.Expense
import com.due.friendskhata.data.model.ExpenseStatus
import com.due.friendskhata.data.model.Member
import com.due.friendskhata.ui.theme.DueIndigoPrimary
import com.due.friendskhata.ui.theme.DueStatusGreen
import com.due.friendskhata.ui.theme.DueStatusOrange
import com.due.friendskhata.ui.theme.DueStatusRed
import com.due.friendskhata.util.CurrencyUtils
import java.text.SimpleDateFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExpenseDetailsScreen(
    expense: Expense?,
    members: List<Member>,
    onBack: () -> Unit
) {
    val memberMap = members.associateBy { it.userId }
    val dateFormat = remember { SimpleDateFormat("dd MMMM yyyy, hh:mm a", Locale.getDefault()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Expense Details", fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        if (expense == null) {
            Box(
                modifier = Modifier.fillMaxSize().padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Text("Expense not found.")
            }
        } else {
            val statusColor = when (expense.status) {
                ExpenseStatus.CONFIRMED.name -> DueStatusGreen
                ExpenseStatus.PENDING_CONFIRMATION.name -> DueStatusOrange
                else -> DueStatusRed
            }

            val statusLabel = when (expense.status) {
                ExpenseStatus.CONFIRMED.name -> "Confirmed"
                ExpenseStatus.PENDING_CONFIRMATION.name -> "Pending Confirmation"
                else -> "Rejected"
            }

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
                    .padding(paddingValues)
                    .padding(20.dp)
            ) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                text = expense.title,
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = CurrencyUtils.formatPaiseToRupees(expense.totalPaidPaise),
                                fontSize = 32.sp,
                                fontWeight = FontWeight.Bold,
                                color = DueIndigoPrimary
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            Surface(
                                color = statusColor.copy(alpha = 0.12f),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = statusLabel,
                                    color = statusColor,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }

                            Spacer(modifier = Modifier.height(20.dp))
                            HorizontalDivider()
                            Spacer(modifier = Modifier.height(16.dp))

                            DetailRow("Paid By", expense.payerName)
                            DetailRow("Created By", expense.createdByName)
                            DetailRow("Created On", expense.createdAt?.toDate()?.let { dateFormat.format(it) } ?: "—")

                            if (expense.confirmedAt != null) {
                                DetailRow("Confirmed On", dateFormat.format(expense.confirmedAt.toDate()))
                            }
                            if (expense.rejectedAt != null) {
                                DetailRow("Rejected On", dateFormat.format(expense.rejectedAt.toDate()))
                                if (!expense.rejectionReason.isNullOrBlank()) {
                                    DetailRow("Rejection Reason", expense.rejectionReason)
                                }
                            }
                            if (!expense.note.isNullOrBlank()) {
                                DetailRow("Note", expense.note)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Text(
                        text = "Assigned Friend Dues",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onBackground
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 0.5.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            expense.memberDues.forEach { (debtorId, duePaise) ->
                                val name = memberMap[debtorId]?.displayName ?: "Friend"
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 6.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(name, fontWeight = FontWeight.Medium)
                                    Text(
                                        CurrencyUtils.formatPaiseToRupees(duePaise),
                                        fontWeight = FontWeight.Bold,
                                        color = if (expense.status == ExpenseStatus.CONFIRMED.name) DueStatusOrange else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
    }
}
