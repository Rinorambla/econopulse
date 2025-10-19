package com.econopulse.app.navigation;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u00008\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0000\n\u0002\u0010\u000e\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u000e\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\b7\u0018\u0000 \u000f2\u00020\u0001:\b\r\u000e\u000f\u0010\u0011\u0012\u0013\u0014B#\b\u0004\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u0012\u0006\u0010\u0004\u001a\u00020\u0003\u0012\n\b\u0002\u0010\u0005\u001a\u0004\u0018\u00010\u0006\u00a2\u0006\u0002\u0010\u0007R\u0013\u0010\u0005\u001a\u0004\u0018\u00010\u0006\u00a2\u0006\b\n\u0000\u001a\u0004\b\b\u0010\tR\u0011\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\b\n\u0000\u001a\u0004\b\n\u0010\u000bR\u0011\u0010\u0004\u001a\u00020\u0003\u00a2\u0006\b\n\u0000\u001a\u0004\b\f\u0010\u000b\u0082\u0001\u0007\u0015\u0016\u0017\u0018\u0019\u001a\u001b\u00a8\u0006\u001c"}, d2 = {"Lcom/econopulse/app/navigation/Screen;", "", "route", "", "title", "icon", "Landroidx/compose/ui/graphics/vector/ImageVector;", "(Ljava/lang/String;Ljava/lang/String;Landroidx/compose/ui/graphics/vector/ImageVector;)V", "getIcon", "()Landroidx/compose/ui/graphics/vector/ImageVector;", "getRoute", "()Ljava/lang/String;", "getTitle", "AIPulse", "Auth", "Companion", "Dashboard", "EconoAI", "MarketDNA", "Portfolio", "VisualAI", "Lcom/econopulse/app/navigation/Screen$AIPulse;", "Lcom/econopulse/app/navigation/Screen$Auth;", "Lcom/econopulse/app/navigation/Screen$Dashboard;", "Lcom/econopulse/app/navigation/Screen$EconoAI;", "Lcom/econopulse/app/navigation/Screen$MarketDNA;", "Lcom/econopulse/app/navigation/Screen$Portfolio;", "Lcom/econopulse/app/navigation/Screen$VisualAI;", "app_debug"})
public abstract class Screen {
    @org.jetbrains.annotations.NotNull()
    private final java.lang.String route = null;
    @org.jetbrains.annotations.NotNull()
    private final java.lang.String title = null;
    @org.jetbrains.annotations.Nullable()
    private final androidx.compose.ui.graphics.vector.ImageVector icon = null;
    @org.jetbrains.annotations.NotNull()
    private static final java.util.List<com.econopulse.app.navigation.Screen> bottomNavItems = null;
    @org.jetbrains.annotations.NotNull()
    public static final com.econopulse.app.navigation.Screen.Companion Companion = null;
    
    private Screen(java.lang.String route, java.lang.String title, androidx.compose.ui.graphics.vector.ImageVector icon) {
        super();
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getRoute() {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final java.lang.String getTitle() {
        return null;
    }
    
    @org.jetbrains.annotations.Nullable()
    public final androidx.compose.ui.graphics.vector.ImageVector getIcon() {
        return null;
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\f\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\b\u00c7\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002\u00a8\u0006\u0003"}, d2 = {"Lcom/econopulse/app/navigation/Screen$AIPulse;", "Lcom/econopulse/app/navigation/Screen;", "()V", "app_debug"})
    public static final class AIPulse extends com.econopulse.app.navigation.Screen {
        @org.jetbrains.annotations.NotNull()
        public static final com.econopulse.app.navigation.Screen.AIPulse INSTANCE = null;
        
        private AIPulse() {
        }
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\f\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\b\u00c7\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002\u00a8\u0006\u0003"}, d2 = {"Lcom/econopulse/app/navigation/Screen$Auth;", "Lcom/econopulse/app/navigation/Screen;", "()V", "app_debug"})
    public static final class Auth extends com.econopulse.app.navigation.Screen {
        @org.jetbrains.annotations.NotNull()
        public static final com.econopulse.app.navigation.Screen.Auth INSTANCE = null;
        
        private Auth() {
        }
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\u0018\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0002\b\u0002\n\u0002\u0010 \n\u0002\u0018\u0002\n\u0002\b\u0003\b\u0086\u0003\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002R\u0017\u0010\u0003\u001a\b\u0012\u0004\u0012\u00020\u00050\u0004\u00a2\u0006\b\n\u0000\u001a\u0004\b\u0006\u0010\u0007\u00a8\u0006\b"}, d2 = {"Lcom/econopulse/app/navigation/Screen$Companion;", "", "()V", "bottomNavItems", "", "Lcom/econopulse/app/navigation/Screen;", "getBottomNavItems", "()Ljava/util/List;", "app_debug"})
    public static final class Companion {
        
        private Companion() {
            super();
        }
        
        @org.jetbrains.annotations.NotNull()
        public final java.util.List<com.econopulse.app.navigation.Screen> getBottomNavItems() {
            return null;
        }
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\f\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\b\u00c7\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002\u00a8\u0006\u0003"}, d2 = {"Lcom/econopulse/app/navigation/Screen$Dashboard;", "Lcom/econopulse/app/navigation/Screen;", "()V", "app_debug"})
    public static final class Dashboard extends com.econopulse.app.navigation.Screen {
        @org.jetbrains.annotations.NotNull()
        public static final com.econopulse.app.navigation.Screen.Dashboard INSTANCE = null;
        
        private Dashboard() {
        }
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\f\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\b\u00c7\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002\u00a8\u0006\u0003"}, d2 = {"Lcom/econopulse/app/navigation/Screen$EconoAI;", "Lcom/econopulse/app/navigation/Screen;", "()V", "app_debug"})
    public static final class EconoAI extends com.econopulse.app.navigation.Screen {
        @org.jetbrains.annotations.NotNull()
        public static final com.econopulse.app.navigation.Screen.EconoAI INSTANCE = null;
        
        private EconoAI() {
        }
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\f\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\b\u00c7\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002\u00a8\u0006\u0003"}, d2 = {"Lcom/econopulse/app/navigation/Screen$MarketDNA;", "Lcom/econopulse/app/navigation/Screen;", "()V", "app_debug"})
    public static final class MarketDNA extends com.econopulse.app.navigation.Screen {
        @org.jetbrains.annotations.NotNull()
        public static final com.econopulse.app.navigation.Screen.MarketDNA INSTANCE = null;
        
        private MarketDNA() {
        }
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\f\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\b\u00c7\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002\u00a8\u0006\u0003"}, d2 = {"Lcom/econopulse/app/navigation/Screen$Portfolio;", "Lcom/econopulse/app/navigation/Screen;", "()V", "app_debug"})
    public static final class Portfolio extends com.econopulse.app.navigation.Screen {
        @org.jetbrains.annotations.NotNull()
        public static final com.econopulse.app.navigation.Screen.Portfolio INSTANCE = null;
        
        private Portfolio() {
        }
    }
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000\f\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\b\u00c7\u0002\u0018\u00002\u00020\u0001B\u0007\b\u0002\u00a2\u0006\u0002\u0010\u0002\u00a8\u0006\u0003"}, d2 = {"Lcom/econopulse/app/navigation/Screen$VisualAI;", "Lcom/econopulse/app/navigation/Screen;", "()V", "app_debug"})
    public static final class VisualAI extends com.econopulse.app.navigation.Screen {
        @org.jetbrains.annotations.NotNull()
        public static final com.econopulse.app.navigation.Screen.VisualAI INSTANCE = null;
        
        private VisualAI() {
        }
    }
}