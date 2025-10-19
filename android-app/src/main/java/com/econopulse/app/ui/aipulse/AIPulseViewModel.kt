package com.econopulse.app.ui.aipulse

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.econopulse.app.data.repository.MarketRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AIPulseUiState(
    val recessionIndex: Double? = null,
    val aiSignals: List<String> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class AIPulseViewModel @Inject constructor(
    private val marketRepository: MarketRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(AIPulseUiState())
    val uiState: StateFlow<AIPulseUiState> = _uiState.asStateFlow()
    
    fun loadAIPulseData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            marketRepository.getAIPulse().collect { result ->
                result.fold(
                    onSuccess = { aiPulse ->
                        _uiState.value = _uiState.value.copy(
                            recessionIndex = aiPulse.recessionIndex,
                            aiSignals = aiPulse.signals,
                            isLoading = false
                        )
                    },
                    onFailure = { exception ->
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            errorMessage = exception.message ?: "Failed to load AI Pulse data"
                        )
                    }
                )
            }
        }
    }
}