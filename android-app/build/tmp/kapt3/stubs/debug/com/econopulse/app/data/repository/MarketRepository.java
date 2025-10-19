package com.econopulse.app.data.repository;

@javax.inject.Singleton()
@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000N\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u000e\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0010\b\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\b\u0007\u0018\u00002\u00020\u0001B\u000f\b\u0007\u0012\u0006\u0010\u0002\u001a\u00020\u0003\u00a2\u0006\u0002\u0010\u0004J\u001a\u0010\u0005\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\b0\u00070\u00062\u0006\u0010\t\u001a\u00020\nJ\u0012\u0010\u000b\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\f0\u00070\u0006J\u0012\u0010\r\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\u000e0\u00070\u0006J-\u0010\u000f\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\u00100\u00070\u00062\b\b\u0002\u0010\u0011\u001a\u00020\n2\n\b\u0002\u0010\u0012\u001a\u0004\u0018\u00010\u0013\u00a2\u0006\u0002\u0010\u0014J\u001c\u0010\u0015\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\u00160\u00070\u00062\b\b\u0002\u0010\u0012\u001a\u00020\u0013J\u001c\u0010\u0017\u001a\u000e\u0012\n\u0012\b\u0012\u0004\u0012\u00020\u00180\u00070\u00062\b\b\u0002\u0010\u0012\u001a\u00020\u0013R\u000e\u0010\u0002\u001a\u00020\u0003X\u0082\u0004\u00a2\u0006\u0002\n\u0000\u00a8\u0006\u0019"}, d2 = {"Lcom/econopulse/app/data/repository/MarketRepository;", "", "api", "Lcom/econopulse/app/network/ApiService;", "(Lcom/econopulse/app/network/ApiService;)V", "chatWithEconoAI", "Lkotlinx/coroutines/flow/Flow;", "Lkotlin/Result;", "Lcom/econopulse/app/data/model/ChatResponse;", "message", "", "getAIAnalysis", "Lcom/econopulse/app/data/model/AIAnalysisResponse;", "getAIPulse", "Lcom/econopulse/app/data/model/AIPulseData;", "getMarketData", "Lcom/econopulse/app/data/model/MarketResponse;", "category", "limit", "", "(Ljava/lang/String;Ljava/lang/Integer;)Lkotlinx/coroutines/flow/Flow;", "getRecessionIndex", "Lcom/econopulse/app/data/model/RecessionIndex;", "getTopNews", "Lcom/econopulse/app/data/model/NewsResponse;", "app_debug"})
public final class MarketRepository {
    @org.jetbrains.annotations.NotNull()
    private final com.econopulse.app.network.ApiService api = null;
    
    @javax.inject.Inject()
    public MarketRepository(@org.jetbrains.annotations.NotNull()
    com.econopulse.app.network.ApiService api) {
        super();
    }
    
    @org.jetbrains.annotations.NotNull()
    public final kotlinx.coroutines.flow.Flow<kotlin.Result<com.econopulse.app.data.model.MarketResponse>> getMarketData(@org.jetbrains.annotations.NotNull()
    java.lang.String category, @org.jetbrains.annotations.Nullable()
    java.lang.Integer limit) {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final kotlinx.coroutines.flow.Flow<kotlin.Result<com.econopulse.app.data.model.RecessionIndex>> getRecessionIndex(int limit) {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final kotlinx.coroutines.flow.Flow<kotlin.Result<com.econopulse.app.data.model.AIAnalysisResponse>> getAIAnalysis() {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final kotlinx.coroutines.flow.Flow<kotlin.Result<com.econopulse.app.data.model.NewsResponse>> getTopNews(int limit) {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final kotlinx.coroutines.flow.Flow<kotlin.Result<com.econopulse.app.data.model.AIPulseData>> getAIPulse() {
        return null;
    }
    
    @org.jetbrains.annotations.NotNull()
    public final kotlinx.coroutines.flow.Flow<kotlin.Result<com.econopulse.app.data.model.ChatResponse>> chatWithEconoAI(@org.jetbrains.annotations.NotNull()
    java.lang.String message) {
        return null;
    }
}