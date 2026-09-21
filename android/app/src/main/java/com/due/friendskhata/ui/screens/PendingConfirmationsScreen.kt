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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
fun PendingConfirmationsScreen(
    expenses: List<Expense>,
    members: List<Member>,
    currentUserId: String,
    onConfirm: (String) -> Unit,
    onReject: (String, String?) -> Unit,
    onBack: () -> Unit
) {
    val pendingExpenses = expenses.filter { it.status == ExpenseStatus.PENDING_CONFIRMATION.name }
    val memberMap = members.associateBy { it.userId }
    val dateFormat = remember { SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault()) }

    var rejectingExpenseId by remember { mutableStateOf<String?>(null) }
    var rejectionReason by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Pending Approvals", fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { paddingValues ->
        if (pendingExpenses.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "No Pending Approvals",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "All expenses in this group are confirmed or settled.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
                    .padding(paddingValues)
                    .padding(horizontal = 20.dp)
            ) {
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Awaiting Payer Confirmation",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    Text(
                        text = "Only the friend who actually paid the amount can confirm or reject.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 2.dp, bottom = 12.dp)
                    )
                }

                items(pendingExpenses) { expense ->
                    val isPayer = expense.payerId == currentUserId
                    val formattedDate = expense.createdAt?.toDate()?.let { dateFormat.format(it) } ?: "Recently"

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.Top
                            ) {
                                Column {
                                    Text(
                                        text = expense.title,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        text = "Created by ${expense.createdByName}  •  $formattedDate",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }

                                Text(
                                    text = CurrencyUtils.formatPaiseToRupees(expense.totalPaidPaise),
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = DueIndigoPrimary
                                )
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            Surface(
                                color = DueStatusOrange.copy(alpha = 0.12f),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "Payer: ${expense.payerName} ${if (isPayer) "(You)" else ""}",
                                    color = DueStatusOrange,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            Text(
                                text = "Due Breakdown:",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )

                            // Breakdown items
                            expense.memberDues.forEach { (debtorId, duePaise) ->
                                val debtorName = memberMap[debtorId]?.displayName ?: "Friend"
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 2.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(text = "• $debtorName", style = MaterialTheme.typography.bodySmall)
                                    Text(
                                        text = CurrencyUtils.formatPaiseToRupees(duePaise),
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }

                            if (!expense.note.isNullOrBlank()) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Note: ${expense.note}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            if (isPayer) {
                                // Payer actions: Confirm or Reject
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Button(
                                        onClick = { onConfirm(expense.expenseId) },
                                        modifier = Modifier.weight(1f).height(42.dp),
                                        shape = RoundedCornerShape(10.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = DueStatusGreen)
                                    ) {
                                        Icon(imageVector = Icons.Default.Check, contentDescription = null, modifier = Modifier.size(18.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Confirm & Apply")
                                    }

                                    OutlinedButton(
                                        onClick = {
                                            rejectingExpenseId = expense.expenseId
                                            rejectionReason = ""
                                        },
                                        modifier = Modifier.height(42.dp),
                                        shape = RoundedCornerShape(10.dp)
                                    ) {
                                        Icon(imageVector = Icons.Default.Close, contentDescription = null, modifier = Modifier.size(18.dp), tint = DueStatusRed)
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Reject", color = DueStatusRed)
                                    }
                                }
                            } else {
                                Text(
                                    text = "Waiting for ${expense.payerName} to confirm this payment.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(36.dp))
                }
            }
        }

        // Rejection Dialog
        if (rejectingExpenseId != null) {
            AlertDialog(
                onDismissRequest = { rejectingExpenseId = null },
                title = { Text("Reject Expense Draft") },
                text = {
                    Column {
                        Text("Are you sure? This expense will be marked as rejected and will not affect any member balances.")
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedTextField(
                            value = rejectionReason,
                            onValueChange = { rejectionReason = it },
                            label = { Text("Reason (optional)") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            rejectingExpenseId?.let { onReject(it, rejectionReason) }
                            rejectingExpenseId = null
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = DueStatusRed)
                    ) {
                        Text("Confirm Rejection")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { rejectingExpenseId = null }) {
                        Text("Cancel")
                    }
                }
            )
        }
    }
}
