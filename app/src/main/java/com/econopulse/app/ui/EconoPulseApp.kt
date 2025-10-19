package com.econopulse.app.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.rememberNavController
import com.econopulse.app.navigation.EconoPulseNavigation
import com.econopulse.app.navigation.Screen
import com.econopulse.app.ui.auth.AuthViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EconoPulseApp() {
    val navController = rememberNavController()
    val authViewModel: AuthViewModel = hiltViewModel()
    val authState by authViewModel.uiState.collectAsStateWithLifecycle()
    
    Scaffold(
        bottomBar = {
            if (authState.isAuthenticated) {
                EconoPulseBottomNavigation(
                    navController = navController,
                    onSignOut = authViewModel::signOut
                )
            }
        }
    ) { innerPadding ->
        EconoPulseNavigation(
            navController = navController,
            authViewModel = authViewModel,
            modifier = Modifier.padding(innerPadding)
        )
    }
}

@Composable
private fun EconoPulseBottomNavigation(
    navController: androidx.navigation.NavHostController,
    onSignOut: () -> Unit
) {
    var currentRoute by remember { mutableStateOf(Screen.Dashboard.route) }
    
    LaunchedEffect(navController) {
        navController.currentBackStackEntryFlow.collect { backStackEntry ->
            currentRoute = backStackEntry.destination.route ?: Screen.Dashboard.route
        }
    }
    
    NavigationBar {
        Screen.bottomNavItems.forEach { screen ->
            NavigationBarItem(
                icon = {
                    Icon(
                        imageVector = screen.icon!!,
                        contentDescription = screen.title
                    )
                },
                label = { Text(screen.title) },
                selected = currentRoute == screen.route,
                onClick = {
                    if (currentRoute != screen.route) {
                        navController.navigate(screen.route) {
                            popUpTo(navController.graph.startDestinationId) {
                                saveState = true
                            }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                }
            )
        }
    }
}