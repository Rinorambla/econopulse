package com.econopulse.app.ui.econoai

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.econopulse.app.data.repository.MarketRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EconoAIUiState(
    val messages: List<ChatMessage> = emptyList(),
    val currentMessage: String = "",
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class EconoAIViewModel @Inject constructor(
    private val marketRepository: MarketRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(EconoAIUiState())
    val uiState: StateFlow<EconoAIUiState> = _uiState.asStateFlow()
    
    fun updateMessage(message: String) {
        _uiState.value = _uiState.value.copy(currentMessage = message)
    }
    
    fun sendMessage() {
        val message = _uiState.value.currentMessage.trim()
        if (message.isBlank()) return
        
        viewModelScope.launch {
            // Add user message
            val userMessage = ChatMessage(text = message, isUser = true)
            _uiState.value = _uiState.value.copy(
                messages = _uiState.value.messages + userMessage,
                currentMessage = "",
                isLoading = true
            )
            
            // Get AI response
            marketRepository.chatWithEconoAI(message).collect { result ->
                result.fold(
                    onSuccess = { response ->
                        val aiMessage = ChatMessage(text = response.response, isUser = false)
                        _uiState.value = _uiState.value.copy(
                            messages = _uiState.value.messages + aiMessage,
                            isLoading = false
                        )
                    },
                    onFailure = { exception ->
                        val errorMessage = ChatMessage(
                            text = "Sorry, I encountered an error: ${exception.message}",
                            isUser = false
                        )
                        _uiState.value = _uiState.value.copy(
                            messages = _uiState.value.messages + errorMessage,
                            isLoading = false
                        )
                    }
                )
            }
        }
    }
}