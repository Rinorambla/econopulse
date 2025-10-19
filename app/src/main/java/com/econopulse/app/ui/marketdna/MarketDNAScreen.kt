package com.econopulse.app.ui.marketdna

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.github.mikephil.charting.charts.PieChart
import com.github.mikephil.charting.data.PieData
import com.github.mikephil.charting.data.PieDataSet
import com.github.mikephil.charting.data.PieEntry
import com.github.mikephil.charting.utils.ColorTemplate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MarketDNAScreen(
    viewModel: MarketDNAViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    
    LaunchedEffect(Unit) {
        viewModel.loadMarketDNA()
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Analytics,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(32.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Market DNA",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
            }
            
            IconButton(
                onClick = viewModel::loadMarketDNA,
                enabled = !uiState.isLoading
            ) {
                Icon(
                    imageVector = Icons.Default.Refresh,
                    contentDescription = "Refresh"
                )
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Loading State
        if (uiState.isLoading) {
            Box(
                modifier = Modifier.fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        }
        
        // Error State
        uiState.errorMessage?.let { error ->
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    modifier = Modifier.padding(16.dp)
                )
            }
        }
        
        // Sector Allocation Chart
        if (uiState.sectorData.isNotEmpty()) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(300.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        text = "Sector Allocation",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    
                    AndroidView(
                        factory = { context ->
                            PieChart(context).apply {
                                description.isEnabled = false
                                setUsePercentValues(true)
                                setDrawHoleEnabled(true)
                                setHoleColor(android.graphics.Color.WHITE)
                                setTransparentCircleColor(android.graphics.Color.WHITE)
                                setTransparentCircleAlpha(110)
                                setHoleRadius(40f)
                                setTransparentCircleRadius(45f)
                                setDrawCenterText(true)
                                centerText = "Market\nSectors"
                                setRotationAngle(0f)
                                setRotationEnabled(true)
                                setHighlightPerTapEnabled(true)
                            }
                        },
                        update = { chart ->
                            val entries = uiState.sectorData.map { sector ->
                                PieEntry(sector.percentage, sector.name)
                            }
                            
                            val dataSet = PieDataSet(entries, "Sectors").apply {
                                setDrawIcons(false)
                                sliceSpace = 3f
                                selectionShift = 5f
                                colors = ColorTemplate.MATERIAL_COLORS.toList()
                            }
                            
                            chart.data = PieData(dataSet).apply {
                                setValueTextSize(11f)
                                setValueTextColor(android.graphics.Color.BLACK)
                            }
                            chart.invalidate()
                        },
                        modifier = Modifier
                            .fillMaxSize()
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
        }
        
        // Sector Performance List
        if (uiState.sectorData.isNotEmpty()) {
            Text(
                text = "Sector Performance",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(uiState.sectorData) { sector ->
                    SectorPerformanceCard(sector = sector)
                }
            }
        }
    }
}

@Composable
private fun SectorPerformanceCard(
    sector: SectorData
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = sector.name,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${sector.percentage}% allocation",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            Text(
                text = "${if (sector.performance >= 0) "+" else ""}${"%.2f".format(sector.performance)}%",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = if (sector.performance >= 0) {
                    Color(0xFF4CAF50)
                } else {
                    Color(0xFFF44336)
                }
            )
        }
    }
}

data class SectorData(
    val name: String,
    val percentage: Float,
    val performance: Double
)