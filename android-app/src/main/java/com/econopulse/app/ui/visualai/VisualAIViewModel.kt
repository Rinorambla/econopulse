package com.econopulse.app.ui.visualai

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.econopulse.app.data.repository.MarketRepository
import com.econopulse.app.network.ApiService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

data class VisualAIUiState(
    val chartData: List<Double> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class VisualAIViewModel @Inject constructor(
    private val marketRepository: MarketRepository,
    private val api: ApiService
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(VisualAIUiState())
    val uiState: StateFlow<VisualAIUiState> = _uiState.asStateFlow()
    
    fun loadChartData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            
            try {
                val chartData = withContext(Dispatchers.IO) {
                    val resp = api.getYieldCurve()
                    resp.data.map { it.us }
                }
                _uiState.value = _uiState.value.copy(
                    chartData = chartData,
                    isLoading = false
                )
            } catch (exception: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = exception.message ?: "Failed to load chart data"
                )
            }
        }
    }
}