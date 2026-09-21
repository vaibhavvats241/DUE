package com.due.friendskhata.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.due.friendskhata.data.model.User
import com.due.friendskhata.ui.screens.AddExpenseScreen
import com.due.friendskhata.ui.screens.CreateGroupScreen
import com.due.friendskhata.ui.screens.ExpenseDetailsScreen
import com.due.friendskhata.ui.screens.GroupDashboardScreen
import com.due.friendskhata.ui.screens.GroupHistoryScreen
import com.due.friendskhata.ui.screens.HomeScreen
import com.due.friendskhata.ui.screens.JoinGroupScreen
import com.due.friendskhata.ui.screens.LoginScreen
import com.due.friendskhata.ui.screens.MemberDetailsScreen
import com.due.friendskhata.ui.screens.MembersScreen
import com.due.friendskhata.ui.screens.PendingConfirmationsScreen
import com.due.friendskhata.ui.screens.ProfileScreen
import com.due.friendskhata.ui.screens.ProfileSetupScreen
import com.due.friendskhata.ui.screens.RecordPaymentScreen
import com.due.friendskhata.ui.screens.SignUpScreen
import com.due.friendskhata.ui.screens.SplashScreen
import com.due.friendskhata.ui.viewmodel.AuthUiState
import com.due.friendskhata.ui.viewmodel.AuthViewModel
import com.due.friendskhata.ui.viewmodel.ExpenseViewModel
import com.due.friendskhata.ui.viewmodel.GroupViewModel
import com.due.friendskhata.ui.viewmodel.HomeViewModel
import com.due.friendskhata.ui.viewmodel.PaymentViewModel

@Composable
fun DueNavGraph(
    navController: NavHostController,
    authViewModel: AuthViewModel = viewModel()
) {
    val authState by authViewModel.uiState.collectAsState()
    val currentUser = (authState as? AuthUiState.Authenticated)?.user

    NavHost(
        navController = navController,
        startDestination = Screen.Splash.route
    ) {
        // 1. Splash Screen
        composable(Screen.Splash.route) {
            SplashScreen(
                isLoggedIn = authState is AuthUiState.Authenticated,
                onNavigateNext = { loggedIn ->
                    if (loggedIn) {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    } else {
                        navController.navigate(Screen.Login.route) {
                            popUpTo(Screen.Splash.route) { inclusive = true }
                        }
                    }
                }
            )
        }

        // 2. Login Screen
        composable(Screen.Login.route) {
            val isLoading = authState is AuthUiState.Loading
            val errorMessage = (authState as? AuthUiState.Error)?.message

            LaunchedEffect(authState) {
                if (authState is AuthUiState.Authenticated) {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            }

            LoginScreen(
                isLoading = isLoading,
                errorMessage = errorMessage,
                onLogin = { email, pass -> authViewModel.login(email, pass) },
                onNavigateToSignUp = { navController.navigate(Screen.SignUp.route) }
            )
        }

        // 3. Sign Up Screen
        composable(Screen.SignUp.route) {
            val isLoading = authState is AuthUiState.Loading
            val errorMessage = (authState as? AuthUiState.Error)?.message

            LaunchedEffect(authState) {
                if (authState is AuthUiState.Authenticated) {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.SignUp.route) { inclusive = true }
                    }
                }
            }

            SignUpScreen(
                isLoading = isLoading,
                errorMessage = errorMessage,
                onSignUp = { email, pass, name -> authViewModel.signUp(email, pass, name) },
                onNavigateToLogin = { navController.popBackStack() }
            )
        }

        // 4. Profile Setup Screen
        composable(Screen.ProfileSetup.route) {
            val isLoading = authState is AuthUiState.Loading
            ProfileSetupScreen(
                currentName = currentUser?.displayName ?: "",
                isLoading = isLoading,
                onSaveName = { name ->
                    authViewModel.updateProfile(name) {
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.ProfileSetup.route) { inclusive = true }
                        }
                    }
                }
            )
        }

        // 5. Home Screen
        composable(Screen.Home.route) {
            val homeViewModel: HomeViewModel = viewModel()
            val homeState by homeViewModel.uiState.collectAsState()

            LaunchedEffect(currentUser?.userId) {
                currentUser?.userId?.let { homeViewModel.loadUserGroups(it) }
            }

            HomeScreen(
                userName = currentUser?.displayName ?: "Friend",
                groups = homeState.groups,
                totalIOwePaise = homeState.totalIOwePaise,
                totalOthersOweMePaise = homeState.totalOthersOweMePaise,
                isLoading = homeState.isLoading,
                onGroupClick = { groupId -> navController.navigate(Screen.GroupDashboard.createRoute(groupId)) },
                onCreateGroupClick = { navController.navigate(Screen.CreateGroup.route) },
                onJoinGroupClick = { navController.navigate(Screen.JoinGroup.route) },
                onProfileClick = { navController.navigate(Screen.Profile.route) }
            )
        }

        // 6. Create Group Screen
        composable(Screen.CreateGroup.route) {
            val groupViewModel: GroupViewModel = viewModel()
            val groupState by groupViewModel.uiState.collectAsState()

            CreateGroupScreen(
                errorMessage = groupState.errorMessage,
                onCreateGroup = { name ->
                    if (currentUser != null) {
                        groupViewModel.createGroup(
                            groupName = name,
                            userId = currentUser.userId,
                            userName = currentUser.displayName,
                            userEmail = currentUser.email,
                            onSuccess = { newGroupId ->
                                navController.navigate(Screen.GroupDashboard.createRoute(newGroupId)) {
                                    popUpTo(Screen.CreateGroup.route) { inclusive = true }
                                }
                            }
                        )
                    }
                },
                onBack = { navController.popBackStack() }
            )
        }

        // 7. Join Group Screen
        composable(Screen.JoinGroup.route) {
            val homeViewModel: HomeViewModel = viewModel()
            val homeState by homeViewModel.uiState.collectAsState()

            JoinGroupScreen(
                errorMessage = homeState.errorMessage,
                onJoinGroup = { code ->
                    if (currentUser != null) {
                        homeViewModel.joinGroup(
                            inviteCode = code,
                            userId = currentUser.userId,
                            userName = currentUser.displayName,
                            userEmail = currentUser.email,
                            onSuccess = { groupId ->
                                navController.navigate(Screen.GroupDashboard.createRoute(groupId)) {
                                    popUpTo(Screen.JoinGroup.route) { inclusive = true }
                                }
                            }
                        )
                    }
                },
                onBack = { navController.popBackStack() }
            )
        }

        // 8. Group Dashboard Screen
        composable(
            route = Screen.GroupDashboard.route,
            arguments = listOf(navArgument("groupId") { type = NavType.StringType })
        ) { backStackEntry ->
            val groupId = backStackEntry.arguments?.getString("groupId") ?: return@composable
            val groupViewModel: GroupViewModel = viewModel()
            val groupState by groupViewModel.uiState.collectAsState()

            LaunchedEffect(groupId) {
                groupViewModel.initGroup(groupId)
            }

            GroupDashboardScreen(
                group = groupState.group,
                memberBalances = groupState.memberBalances,
                totalGroupExpensesPaise = groupState.totalGroupExpensesPaise,
                pendingConfirmationCount = groupState.pendingConfirmationCount,
                isLoading = groupState.isLoading,
                onBack = { navController.popBackStack() },
                onAddExpenseClick = { navController.navigate(Screen.AddExpense.createRoute(groupId)) },
                onPendingConfirmationsClick = { navController.navigate(Screen.PendingConfirmations.createRoute(groupId)) },
                onMembersClick = { navController.navigate(Screen.Members.createRoute(groupId)) },
                onHistoryClick = { navController.navigate(Screen.GroupHistory.createRoute(groupId)) },
                onMemberDetailsClick = { memberId -> navController.navigate(Screen.MemberDetails.createRoute(groupId, memberId)) },
                onRecordPaymentClick = { memberId -> navController.navigate(Screen.RecordPayment.createRoute(groupId, memberId)) }
            )
        }

        // 9. Add Expense Screen
        composable(
            route = Screen.AddExpense.route,
            arguments = listOf(navArgument("groupId") { type = NavType.StringType })
        ) { backStackEntry ->
            val groupId = backStackEntry.arguments?.getString("groupId") ?: return@composable
            val expenseViewModel: ExpenseViewModel = viewModel()
            val expenseState by expenseViewModel.uiState.collectAsState()
            val groupViewModel: GroupViewModel = viewModel()
            val groupState by groupViewModel.uiState.collectAsState()

            LaunchedEffect(groupId) {
                groupViewModel.initGroup(groupId)
            }

            AddExpenseScreen(
                state = expenseState,
                members = groupState.members,
                currentUserId = currentUser?.userId ?: "",
                onTitleChange = { expenseViewModel.updateTitle(it) },
                onTotalPaidChange = { expenseViewModel.updateTotalPaid(it) },
                onPayerSelect = { expenseViewModel.selectPayer(it) },
                onMemberDueChange = { id, text -> expenseViewModel.updateMemberDue(id, text) },
                onNoteChange = { expenseViewModel.updateNote(it) },
                onSubmit = {
                    if (currentUser != null) {
                        expenseViewModel.submitExpense(
                            groupId = groupId,
                            currentUserId = currentUser.userId,
                            currentUserName = currentUser.displayName,
                            onSuccess = { navController.popBackStack() }
                        )
                    }
                },
                onBack = { navController.popBackStack() }
            )
        }

        // 10. Pending Confirmations Screen
        composable(
            route = Screen.PendingConfirmations.route,
            arguments = listOf(navArgument("groupId") { type = NavType.StringType })
        ) { backStackEntry ->
            val groupId = backStackEntry.arguments?.getString("groupId") ?: return@composable
            val groupViewModel: GroupViewModel = viewModel()
            val groupState by groupViewModel.uiState.collectAsState()
            val expenseViewModel: ExpenseViewModel = viewModel()

            LaunchedEffect(groupId) {
                groupViewModel.initGroup(groupId)
            }

            PendingConfirmationsScreen(
                expenses = groupState.expenses,
                members = groupState.members,
                currentUserId = currentUser?.userId ?: "",
                onConfirm = { expenseId ->
                    if (currentUser != null) {
                        expenseViewModel.confirmExpense(
                            groupId = groupId,
                            expenseId = expenseId,
                            currentUserId = currentUser.userId,
                            currentUserName = currentUser.displayName,
                            onSuccess = {}
                        )
                    }
                },
                onReject = { expenseId, reason ->
                    if (currentUser != null) {
                        expenseViewModel.rejectExpense(
                            groupId = groupId,
                            expenseId = expenseId,
                            currentUserId = currentUser.userId,
                            currentUserName = currentUser.displayName,
                            reason = reason,
                            onSuccess = {}
                        )
                    }
                },
                onBack = { navController.popBackStack() }
            )
        }

        // 11. Expense Details Screen
        composable(
            route = Screen.ExpenseDetails.route,
            arguments = listOf(
                navArgument("groupId") { type = NavType.StringType },
                navArgument("expenseId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val groupId = backStackEntry.arguments?.getString("groupId") ?: return@composable
            val expenseId = backStackEntry.arguments?.getString("expenseId") ?: return@composable
            val groupViewModel: GroupViewModel = viewModel()
            val groupState by groupViewModel.uiState.collectAsState()

            LaunchedEffect(groupId) {
                groupViewModel.initGroup(groupId)
            }

            val expense = groupState.expenses.find { it.expenseId == expenseId }

            ExpenseDetailsScreen(
                expense = expense,
                members = groupState.members,
                onBack = { navController.popBackStack() }
            )
        }

        // 12. Members Screen
        composable(
            route = Screen.Members.route,
            arguments = listOf(navArgument("groupId") { type = NavType.StringType })
        ) { backStackEntry ->
            val groupId = backStackEntry.arguments?.getString("groupId") ?: return@composable
            val groupViewModel: GroupViewModel = viewModel()
            val groupState by groupViewModel.uiState.collectAsState()

            LaunchedEffect(groupId) {
                groupViewModel.initGroup(groupId)
            }

            MembersScreen(
                members = groupState.members,
                onMemberClick = { memberId ->
                    navController.navigate(Screen.MemberDetails.createRoute(groupId, memberId))
                },
                onBack = { navController.popBackStack() }
            )
        }

        // 13. Member Details Screen
        composable(
            route = Screen.MemberDetails.route,
            arguments = listOf(
                navArgument("groupId") { type = NavType.StringType },
                navArgument("memberId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val groupId = backStackEntry.arguments?.getString("groupId") ?: return@composable
            val memberId = backStackEntry.arguments?.getString("memberId") ?: return@composable
            val groupViewModel: GroupViewModel = viewModel()
            val groupState by groupViewModel.uiState.collectAsState()
            val paymentViewModel: PaymentViewModel = viewModel()
            val memberDetailsState by paymentViewModel.memberDetailsState.collectAsState()

            LaunchedEffect(groupId, memberId, groupState.expenses, groupState.payments) {
                groupViewModel.initGroup(groupId)
                val mem = groupState.members.find { it.userId == memberId }
                if (mem != null) {
                    paymentViewModel.loadMemberDetails(mem, groupState.expenses, groupState.payments)
                }
            }

            MemberDetailsScreen(
                member = memberDetailsState.member,
                balance = memberDetailsState.balance,
                ledgerEntries = memberDetailsState.ledgerEntries,
                onRecordPaymentClick = {
                    navController.navigate(Screen.RecordPayment.createRoute(groupId, memberId))
                },
                onBack = { navController.popBackStack() }
            )
        }

        // 14. Record Payment Screen
        composable(
            route = Screen.RecordPayment.route,
            arguments = listOf(
                navArgument("groupId") { type = NavType.StringType },
                navArgument("memberId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val groupId = backStackEntry.arguments?.getString("groupId") ?: return@composable
            val memberId = backStackEntry.arguments?.getString("memberId") ?: return@composable
            val groupViewModel: GroupViewModel = viewModel()
            val groupState by groupViewModel.uiState.collectAsState()
            val paymentViewModel: PaymentViewModel = viewModel()
            val paymentState by paymentViewModel.paymentState.collectAsState()

            LaunchedEffect(groupId, memberId) {
                groupViewModel.initGroup(groupId)
            }

            val member = groupState.members.find { it.userId == memberId }
            val memberBalance = groupState.memberBalances.find { it.memberId == memberId }

            LaunchedEffect(memberBalance) {
                memberBalance?.let { paymentViewModel.setInitialDue(it.remainingBalancePaise) }
            }

            RecordPaymentScreen(
                member = member,
                state = paymentState,
                recordedByName = currentUser?.displayName ?: "Friend",
                onAmountChange = { paymentViewModel.updatePaymentAmount(it) },
                onNoteChange = { paymentViewModel.updatePaymentNote(it) },
                onSubmitPayment = {
                    if (currentUser != null && member != null) {
                        paymentViewModel.recordPayment(
                            groupId = groupId,
                            memberId = member.userId,
                            memberName = member.displayName,
                            recordedById = currentUser.userId,
                            recordedByName = currentUser.displayName,
                            onSuccess = { navController.popBackStack() }
                        )
                    }
                },
                onBack = { navController.popBackStack() }
            )
        }

        // 15. Group History Screen
        composable(
            route = Screen.GroupHistory.route,
            arguments = listOf(navArgument("groupId") { type = NavType.StringType })
        ) { backStackEntry ->
            val groupId = backStackEntry.arguments?.getString("groupId") ?: return@composable
            val groupViewModel: GroupViewModel = viewModel()
            val groupState by groupViewModel.uiState.collectAsState()

            LaunchedEffect(groupId) {
                groupViewModel.initGroup(groupId)
            }

            GroupHistoryScreen(
                activities = groupState.activities,
                onBack = { navController.popBackStack() }
            )
        }

        // 16. Profile/Settings Screen
        composable(Screen.Profile.route) {
            ProfileScreen(
                user = currentUser,
                onUpdateName = { name -> authViewModel.updateProfile(name) {} },
                onLogout = {
                    authViewModel.logout()
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                },
                onBack = { navController.popBackStack() }
            )
        }
    }
}
