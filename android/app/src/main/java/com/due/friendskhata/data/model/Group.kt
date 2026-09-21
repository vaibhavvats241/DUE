package com.due.friendskhata.data.model

import com.google.firebase.Timestamp

data class Group(
    val groupId: String = "",
    val groupName: String = "",
    val createdBy: String = "",
    val createdAt: Timestamp? = null,
    val inviteCode: String = "",
    val memberIds: List<String> = emptyList()
)
