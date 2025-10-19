package com.econopulse.app.ui.marketdna

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

data class MarketDNAUiState(
    val sectorData: List<SectorData> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class MarketDNAViewModel @Inject constructor(
    private val marketRepository: MarketRepository,
    private val api: ApiService
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(MarketDNAUiState())
    val uiState: StateFlow<MarketDNAUiState> = _uiState.asStateFlow()
    
    fun loadMarketDNA() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            
            try {
                val sectorData = withContext(Dispatchers.IO) {
                    val resp = api.getSectorPerformance()
                    resp.sectors.map { s ->
                        SectorData(
                            name = s.sector,
                            percentage = 0f, // non fornito dall'endpoint; lasciamo 0 e mostriamo performance
                            performance = s.daily
                        )
                    }
                }

                _uiState.value = _uiState.value.copy(
                    sectorData = sectorData,
                    isLoading = false
                )
            } catch (exception: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    errorMessage = exception.message ?: "Failed to load market DNA data"
                )
            }
        }
    }
}