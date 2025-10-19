package com.econopulse.app.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.PieChart
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(
    val route: String,
    val title: String,
    val icon: ImageVector? = null
) {
    object Auth : Screen("auth", "Authentication")
    object Dashboard : Screen("dashboard", "Dashboard", Icons.Default.Dashboard)
    object AIPulse : Screen("ai_pulse", "AI Pulse", Icons.Default.Psychology)
    object VisualAI : Screen("visual_ai", "Visual AI", Icons.Default.Analytics)
    object MarketDNA : Screen("market_dna", "Market DNA", Icons.AutoMirrored.Filled.TrendingUp)
    object Portfolio : Screen("portfolio", "Portfolio", Icons.Default.PieChart)
    object EconoAI : Screen("econo_ai", "EconoAI", Icons.AutoMirrored.Filled.Chat)
    
    companion object {
        val bottomNavItems = listOf(Dashboard, AIPulse, VisualAI, MarketDNA, Portfolio, EconoAI)
    }
}