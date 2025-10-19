package com.econopulse.app.navigation

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.econopulse.app.ui.auth.AuthScreen
import com.econopulse.app.ui.auth.AuthViewModel
import com.econopulse.app.ui.dashboard.DashboardScreen
import com.econopulse.app.ui.aipulse.AIPulseScreen
import com.econopulse.app.ui.visualai.VisualAIScreen
import com.econopulse.app.ui.marketdna.MarketDNAScreen
import com.econopulse.app.ui.portfolio.PortfolioScreen
import com.econopulse.app.ui.econoai.EconoAIScreen

@Composable
fun EconoPulseNavigation(
    navController: NavHostController,
    authViewModel: AuthViewModel = hiltViewModel(),
    modifier: Modifier = Modifier
) {
    val authState by authViewModel.uiState.collectAsStateWithLifecycle()
    
    NavHost(
        navController = navController,
        startDestination = if (authState.isAuthenticated) Screen.Dashboard.route else Screen.Auth.route,
        modifier = modifier
    ) {
        composable(Screen.Auth.route) {
            AuthScreen(
                onAuthSuccess = {
                    navController.navigate(Screen.Dashboard.route) {
                        popUpTo(Screen.Auth.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(Screen.Dashboard.route) {
            DashboardScreen()
        }
        
        composable(Screen.AIPulse.route) {
            AIPulseScreen()
        }
        
        composable(Screen.VisualAI.route) {
            VisualAIScreen()
        }
        
        composable(Screen.MarketDNA.route) {
            MarketDNAScreen()
        }
        
        composable(Screen.Portfolio.route) {
            PortfolioScreen()
        }
        
        composable(Screen.EconoAI.route) {
            EconoAIScreen()
        }
    }
}