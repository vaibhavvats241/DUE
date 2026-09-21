package com.due.friendskhata.data.model

import com.google.firebase.Timestamp

data class User(
    val userId: String = "",
    val displayName: String = "",
    val email: String = "",
    val createdAt: Timestamp? = null
)
