package com.due.friendskhata.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.due.friendskhata.data.model.User
import com.due.friendskhata.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class AuthUiState {
    data object Idle : AuthUiState()
    data object Loading : AuthUiState()
    data class Authenticated(val user: User) : AuthUiState()
    data class Unauthenticated(val message: String? = null) : AuthUiState()
    data class Error(val message: String) : AuthUiState()
}

class AuthViewModel(
    private val authRepository: AuthRepository = AuthRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    val currentUserId: String?
        get() = authRepository.currentUserId

    init {
        checkCurrentAuth()
    }

    fun checkCurrentAuth() {
        val uid = authRepository.currentUserId
        if (uid != null) {
            viewModelScope.launch {
                val result = authRepository.getUserProfile(uid)
                result.onSuccess { user ->
                    if (user != null) {
                        _uiState.value = AuthUiState.Authenticated(user)
                    } else {
                        _uiState.value = AuthUiState.Unauthenticated()
                    }
                }.onFailure {
                    _uiState.value = AuthUiState.Unauthenticated()
                }
            }
        } else {
            _uiState.value = AuthUiState.Unauthenticated()
        }
    }

    fun signUp(email: String, pass: String, displayName: String) {
        if (email.isBlank() || pass.isBlank() || displayName.isBlank()) {
            _uiState.value = AuthUiState.Error("Please fill in all fields.")
            return
        }
        if (pass.length < 6) {
            _uiState.value = AuthUiState.Error("Password must be at least 6 characters.")
            return
        }

        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            val result = authRepository.signUp(email, pass, displayName)
            result.onSuccess { user ->
                _uiState.value = AuthUiState.Authenticated(user)
            }.onFailure { error ->
                _uiState.value = AuthUiState.Error(error.localizedMessage ?: "Sign up failed")
            }
        }
    }

    fun login(email: String, pass: String) {
        if (email.isBlank() || pass.isBlank()) {
            _uiState.value = AuthUiState.Error("Please enter email and password.")
            return
        }

        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            val result = authRepository.login(email, pass)
            result.onSuccess { user ->
                _uiState.value = AuthUiState.Authenticated(user)
            }.onFailure { error ->
                _uiState.value = AuthUiState.Error(error.localizedMessage ?: "Login failed")
            }
        }
    }

    fun updateProfile(displayName: String, onComplete: () -> Unit) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            val result = authRepository.updateProfile(displayName)
            result.onSuccess {
                checkCurrentAuth()
                onComplete()
            }.onFailure { error ->
                _uiState.value = AuthUiState.Error(error.localizedMessage ?: "Failed to update profile")
            }
        }
    }

    fun logout() {
        authRepository.logout()
        _uiState.value = AuthUiState.Unauthenticated()
    }
}
