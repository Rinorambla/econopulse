package com.econopulse.app.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val DarkColorScheme = darkColorScheme(
    primary = EPBlue,
    onPrimary = DarkOnSurface,
    primaryContainer = EPBlueDark,
    onPrimaryContainer = DarkOnSurfaceVariant,
    secondary = EPCyan,
    onSecondary = DarkOnSurface,
    secondaryContainer = EPCyanDark,
    onSecondaryContainer = DarkOnSurfaceVariant,
    tertiary = EPEmerald,
    onTertiary = DarkOnSurface,
    tertiaryContainer = EPEmeraldDark,
    onTertiaryContainer = DarkOnSurfaceVariant,
    error = EPError,
    onError = DarkOnSurface,
    errorContainer = Color(0xFF601410),
    onErrorContainer = Color(0xFFF2B8B5),
    background = DarkBackground,
    onBackground = DarkOnSurface,
    surface = DarkSurface,
    onSurface = DarkOnSurface,
    surfaceVariant = DarkSurfaceVariant,
    onSurfaceVariant = DarkOnSurfaceVariant,
    outline = EPSlate,
    outlineVariant = EPSlateLight
)

private val LightColorScheme = lightColorScheme(
    primary = EPBlue,
    onPrimary = LightOnSurface,
    primaryContainer = EPBlueLight,
    onPrimaryContainer = LightOnSurfaceVariant,
    secondary = EPCyan,
    onSecondary = LightOnSurface,
    secondaryContainer = EPCyanLight,
    onSecondaryContainer = LightOnSurfaceVariant,
    tertiary = EPEmerald,
    onTertiary = LightOnSurface,
    tertiaryContainer = EPEmeraldLight,
    onTertiaryContainer = LightOnSurfaceVariant,
    error = EPError,
    onError = LightOnSurface,
    errorContainer = Color(0xFFFFDAD6),
    onErrorContainer = Color(0xFF410E0B),
    background = LightBackground,
    onBackground = LightOnSurface,
    surface = LightSurface,
    onSurface = LightOnSurface,
    surfaceVariant = LightSurfaceVariant,
    onSurfaceVariant = LightOnSurfaceVariant,
    outline = EPSlate,
    outlineVariant = EPSlateLight
)

@Composable
fun EconoPulseTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false, // Set to false to use EconoPulse brand colors
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}