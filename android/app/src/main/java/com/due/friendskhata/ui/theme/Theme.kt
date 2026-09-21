package com.due.friendskhata.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = DueIndigoPrimary,
    onPrimary = DueSurfaceLight,
    primaryContainer = DueSurfaceVariant,
    onPrimaryContainer = DueIndigoDark,
    secondary = DueTealSecondary,
    onSecondary = DueSurfaceLight,
    background = DueBackgroundLight,
    onBackground = DueTextPrimary,
    surface = DueSurfaceLight,
    onSurface = DueTextPrimary,
    surfaceVariant = DueSurfaceVariant,
    onSurfaceVariant = DueTextSecondary,
    outline = DueBorder,
    error = DueStatusRed,
    onError = DueSurfaceLight
)

private val DarkColorScheme = darkColorScheme(
    primary = DueIndigoLight,
    onPrimary = DueIndigoDark,
    secondary = DueTealLight,
    onSecondary = DueIndigoDark,
    background = DueIndigoDark,
    surface = Color(0xFF1E293B),
    onSurface = Color(0xFFF1F5F9),
    outline = Color(0xFF334155)
)

@Composable
fun DUEFriendsKhataTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window
            if (window != null) {
                window.statusBarColor = colorScheme.background.toArgb()
                WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
