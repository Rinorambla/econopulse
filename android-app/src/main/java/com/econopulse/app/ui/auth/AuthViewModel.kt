package com.econopulse.app.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.econopulse.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class AuthMode {
    SIGN_IN, SIGN_UP
}

data class AuthUiState(
    val email: String = "",
    val password: String = "",
    val authMode: AuthMode = AuthMode.SIGN_IN,
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val isSuccess: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _email = MutableStateFlow("")
    private val _password = MutableStateFlow("")
    private val _authMode = MutableStateFlow(AuthMode.SIGN_IN)
    private val _isLoading = MutableStateFlow(false)
    private val _isSuccess = MutableStateFlow(false)
    private val _errorMessage = MutableStateFlow<String?>(null)
    
    private val isLoggedInFlow = authRepository.isUserLoggedIn()

    val uiState: StateFlow<AuthUiState> = combine(
        combine(_email, _password) { email, password -> email to password },
        combine(_authMode, _isLoading) { mode, loading -> mode to loading },
        combine(_isSuccess, _errorMessage) { success, error -> success to error },
        isLoggedInFlow
    ) { ep, ml, se, isLoggedIn ->
        val (email, password) = ep
        val (mode, loading) = ml
        val (success, error) = se
        AuthUiState(
            email = email,
            password = password,
            authMode = mode,
            isLoading = loading,
            isAuthenticated = isLoggedIn,
            isSuccess = success,
            errorMessage = error
        )
    }.stateIn(
        scope = viewModelScope,
        started = kotlinx.coroutines.flow.SharingStarted.WhileSubscribed(5000),
        initialValue = AuthUiState()
    )
    
    fun setEmail(email: String) {
        _email.value = email
        _errorMessage.value = null
    }
    
    fun setPassword(password: String) {
        _password.value = password
        _errorMessage.value = null
    }
    
    fun setAuthMode(mode: AuthMode) {
        _authMode.value = mode
        _errorMessage.value = null
        _isSuccess.value = false
    }
    
    fun authenticate() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            _isSuccess.value = false
            
            val result = if (_authMode.value == AuthMode.SIGN_IN) {
                authRepository.signIn(_email.value, _password.value)
            } else {
                authRepository.signUp(_email.value, _password.value)
            }
            
            result.fold(
                onSuccess = { authResponse ->
                    _isSuccess.value = true
                    if (_authMode.value == AuthMode.SIGN_UP && authResponse.session == null) {
                        // Email verification required
                        _errorMessage.value = null
                    }
                    // For sign in, the user will be automatically navigated via uiState.isAuthenticated
                },
                onFailure = { exception ->
                    _errorMessage.value = exception.message ?: "Authentication failed"
                }
            )
            
            _isLoading.value = false
        }
    }
    
    fun signOut() {
        viewModelScope.launch {
            authRepository.signOut()
        }
    }
}