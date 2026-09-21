package com.due.friendskhata.data.model

import com.google.firebase.Timestamp

enum class MemberRole {
    OWNER,
    MEMBER
}

data class Member(
    val userId: String = "",
    val displayName: String = "",
    val email: String = "",
    val joinedAt: Timestamp? = null,
    val role: String = MemberRole.MEMBER.name
)
