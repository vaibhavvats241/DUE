package com.due.friendskhata.data.repository

import com.due.friendskhata.data.model.ActivityLog
import com.due.friendskhata.data.model.ActivityType
import com.due.friendskhata.data.model.Group
import com.due.friendskhata.data.model.Member
import com.due.friendskhata.data.model.MemberRole
import com.google.firebase.Timestamp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.util.UUID

class GroupRepository(
    private val firestore: FirebaseFirestore = FirebaseFirestore.getInstance()
) {

    private fun generateInviteCode(): String {
        val allowedChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        return (1..6).map { allowedChars.random() }.joinToString("")
    }

    suspend fun createGroup(groupName: String, creatorId: String, creatorName: String, creatorEmail: String): Result<Group> {
        return try {
            val groupRef = firestore.collection("groups").document()
            val groupId = groupRef.id
            val inviteCode = generateInviteCode()
            val now = Timestamp.now()

            val group = Group(
                groupId = groupId,
                groupName = groupName.trim(),
                createdBy = creatorId,
                createdAt = now,
                inviteCode = inviteCode,
                memberIds = listOf(creatorId)
            )

            val ownerMember = Member(
                userId = creatorId,
                displayName = creatorName,
                email = creatorEmail,
                joinedAt = now,
                role = MemberRole.OWNER.name
            )

            // Batch write group + owner member doc
            val batch = firestore.batch()
            batch.set(groupRef, group)
            batch.set(groupRef.collection("members").document(creatorId), ownerMember)

            // Activity log
            val activityRef = groupRef.collection("activities").document()
            batch.set(
                activityRef,
                ActivityLog(
                    activityId = activityRef.id,
                    groupId = groupId,
                    type = ActivityType.MEMBER_JOINED.name,
                    description = "$creatorName created group \"$groupName\"",
                    personName = creatorName,
                    personId = creatorId,
                    timestamp = now
                )
            )

            batch.commit().await()
            Result.success(group)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun joinGroupWithInviteCode(inviteCode: String, userId: String, userName: String, userEmail: String): Result<Group> {
        return try {
            val trimmedCode = inviteCode.trim().uppercase()
            val querySnapshot = firestore.collection("groups")
                .whereEqualTo("inviteCode", trimmedCode)
                .limit(1)
                .get()
                .await()

            if (querySnapshot.isEmpty) {
                return Result.failure(Exception("No group found with invite code \"$trimmedCode\"."))
            }

            val groupDoc = querySnapshot.documents[0]
            val group = groupDoc.toObject(Group::class.java)
                ?: return Result.failure(Exception("Failed to decode group data."))

            if (group.memberIds.contains(userId)) {
                return Result.failure(Exception("You are already a member of this group."))
            }

            val now = Timestamp.now()
            val newMember = Member(
                userId = userId,
                displayName = userName,
                email = userEmail,
                joinedAt = now,
                role = MemberRole.MEMBER.name
            )

            val batch = firestore.batch()
            // Add to memberIds list
            batch.update(groupDoc.reference, "memberIds", FieldValue.arrayUnion(userId))
            // Add subcollection member document
            batch.set(groupDoc.reference.collection("members").document(userId), newMember)

            // Activity log
            val activityRef = groupDoc.reference.collection("activities").document()
            batch.set(
                activityRef,
                ActivityLog(
                    activityId = activityRef.id,
                    groupId = group.groupId,
                    type = ActivityType.MEMBER_JOINED.name,
                    description = "$userName joined using invite code",
                    personName = userName,
                    personId = userId,
                    timestamp = now
                )
            )

            batch.commit().await()
            Result.success(group.copy(memberIds = group.memberIds + userId))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun observeUserGroups(userId: String): Flow<List<Group>> = callbackFlow {
        val listener = firestore.collection("groups")
            .whereArrayContains("memberIds", userId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val groups = snapshot?.documents?.mapNotNull { it.toObject(Group::class.java) } ?: emptyList()
                trySend(groups)
            }
        awaitClose { listener.remove() }
    }

    fun observeGroup(groupId: String): Flow<Group?> = callbackFlow {
        val listener = firestore.collection("groups").document(groupId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                trySend(snapshot?.toObject(Group::class.java))
            }
        awaitClose { listener.remove() }
    }

    fun observeGroupMembers(groupId: String): Flow<List<Member>> = callbackFlow {
        val listener = firestore.collection("groups").document(groupId)
            .collection("members")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val members = snapshot?.documents?.mapNotNull { it.toObject(Member::class.java) } ?: emptyList()
                trySend(members)
            }
        awaitClose { listener.remove() }
    }

    suspend fun leaveGroup(groupId: String, userId: String, userName: String): Result<Unit> {
        return try {
            val groupRef = firestore.collection("groups").document(groupId)
            val batch = firestore.batch()
            batch.update(groupRef, "memberIds", FieldValue.arrayRemove(userId))
            batch.delete(groupRef.collection("members").document(userId))

            val activityRef = groupRef.collection("activities").document()
            batch.set(
                activityRef,
                ActivityLog(
                    activityId = activityRef.id,
                    groupId = groupId,
                    type = ActivityType.MEMBER_LEFT.name,
                    description = "$userName left the group",
                    personName = userName,
                    personId = userId,
                    timestamp = Timestamp.now()
                )
            )

            batch.commit().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun regenerateInviteCode(groupId: String): Result<String> {
        return try {
            val newCode = generateInviteCode()
            firestore.collection("groups").document(groupId)
                .update("inviteCode", newCode)
                .await()
            Result.success(newCode)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun renameGroup(groupId: String, newName: String): Result<Unit> {
        return try {
            firestore.collection("groups").document(groupId)
                .update("groupName", newName.trim())
                .await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteGroup(groupId: String): Result<Unit> {
        return try {
            // Note: In production, a Cloud Function triggers recursive deletion of subcollections
            firestore.collection("groups").document(groupId).delete().await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
