package com.due.friendskhata.ui.navigation

sealed class Screen(val route: String) {
    data object Splash : Screen("splash")
    data object Login : Screen("login")
    data object SignUp : Screen("sign_up")
    data object ProfileSetup : Screen("profile_setup")
    data object Home : Screen("home")
    data object CreateGroup : Screen("create_group")
    data object JoinGroup : Screen("join_group")
    data object GroupDashboard : Screen("group_dashboard/{groupId}") {
        fun createRoute(groupId: String) = "group_dashboard/$groupId"
    }
    data object AddExpense : Screen("add_expense/{groupId}") {
        fun createRoute(groupId: String) = "add_expense/$groupId"
    }
    data object PendingConfirmations : Screen("pending_confirmations/{groupId}") {
        fun createRoute(groupId: String) = "pending_confirmations/$groupId"
    }
    data object ExpenseDetails : Screen("expense_details/{groupId}/{expenseId}") {
        fun createRoute(groupId: String, expenseId: String) = "expense_details/$groupId/$expenseId"
    }
    data object Members : Screen("members/{groupId}") {
        fun createRoute(groupId: String) = "members/$groupId"
    }
    data object MemberDetails : Screen("member_details/{groupId}/{memberId}") {
        fun createRoute(groupId: String, memberId: String) = "member_details/$groupId/$memberId"
    }
    data object RecordPayment : Screen("record_payment/{groupId}/{memberId}") {
        fun createRoute(groupId: String, memberId: String) = "record_payment/$groupId/$memberId"
    }
    data object GroupHistory : Screen("group_history/{groupId}") {
        fun createRoute(groupId: String) = "group_history/$groupId"
    }
    data object Profile : Screen("profile")
}
