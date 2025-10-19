package com.econopulse.app.network;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000N\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\b\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u000e\n\u0002\b\u0003\n\u0002\u0018\u0002\n\u0000\bf\u0018\u00002\u00020\u0001J\u0018\u0010\u0002\u001a\u00020\u00032\b\b\u0001\u0010\u0004\u001a\u00020\u0005H\u00a7@\u00a2\u0006\u0002\u0010\u0006J\u000e\u0010\u0007\u001a\u00020\bH\u00a7@\u00a2\u0006\u0002\u0010\tJ\u001a\u0010\n\u001a\u00020\u000b2\n\b\u0003\u0010\f\u001a\u0004\u0018\u00010\rH\u00a7@\u00a2\u0006\u0002\u0010\u000eJ\u000e\u0010\u000f\u001a\u00020\u0010H\u00a7@\u00a2\u0006\u0002\u0010\tJ\u000e\u0010\u0011\u001a\u00020\u0012H\u00a7@\u00a2\u0006\u0002\u0010\tJ2\u0010\u0013\u001a\u00020\u00142\n\b\u0003\u0010\u0015\u001a\u0004\u0018\u00010\u00162\n\b\u0003\u0010\f\u001a\u0004\u0018\u00010\r2\n\b\u0003\u0010\u0017\u001a\u0004\u0018\u00010\u0016H\u00a7@\u00a2\u0006\u0002\u0010\u0018J\u000e\u0010\u0019\u001a\u00020\u001aH\u00a7@\u00a2\u0006\u0002\u0010\t\u00a8\u0006\u001b"}, d2 = {"Lcom/econopulse/app/network/ApiService;", "", "econoAIChat", "Lcom/econopulse/app/network/dto/EconoAIChatResponse;", "body", "Lcom/econopulse/app/network/dto/EconoAIChatRequest;", "(Lcom/econopulse/app/network/dto/EconoAIChatRequest;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "getMarketSentiment", "Lcom/econopulse/app/network/dto/MarketSentimentResponse;", "(Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "getRecessionIndex", "Lcom/econopulse/app/network/dto/RecessionIndexResponse;", "limit", "", "(Ljava/lang/Integer;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "getSectorPerformance", "Lcom/econopulse/app/network/dto/SectorPerformanceResponse;", "getTopNews", "Lcom/econopulse/app/network/dto/NewsApiResponse;", "getYahooUnified", "Lcom/econopulse/app/network/dto/YahooUnifiedResponse;", "category", "", "symbols", "(Ljava/lang/String;Ljava/lang/Integer;Ljava/lang/String;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "getYieldCurve", "Lcom/econopulse/app/network/dto/YieldCurveResponse;", "app_debug"})
public abstract interface ApiService {
    
    @retrofit2.http.GET(value = "/api/yahoo-unified")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getYahooUnified(@retrofit2.http.Query(value = "category")
    @org.jetbrains.annotations.Nullable()
    java.lang.String category, @retrofit2.http.Query(value = "limit")
    @org.jetbrains.annotations.Nullable()
    java.lang.Integer limit, @retrofit2.http.Query(value = "symbols")
    @org.jetbrains.annotations.Nullable()
    java.lang.String symbols, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super com.econopulse.app.network.dto.YahooUnifiedResponse> $completion);
    
    @retrofit2.http.GET(value = "/api/recession-index")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getRecessionIndex(@retrofit2.http.Query(value = "limit")
    @org.jetbrains.annotations.Nullable()
    java.lang.Integer limit, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super com.econopulse.app.network.dto.RecessionIndexResponse> $completion);
    
    @retrofit2.http.GET(value = "/api/news")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getTopNews(@org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super com.econopulse.app.network.dto.NewsApiResponse> $completion);
    
    @retrofit2.http.GET(value = "/api/market-sentiment")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getMarketSentiment(@org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super com.econopulse.app.network.dto.MarketSentimentResponse> $completion);
    
    @retrofit2.http.POST(value = "/api/econoai/chat")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object econoAIChat(@retrofit2.http.Body()
    @org.jetbrains.annotations.NotNull()
    com.econopulse.app.network.dto.EconoAIChatRequest body, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super com.econopulse.app.network.dto.EconoAIChatResponse> $completion);
    
    @retrofit2.http.GET(value = "/api/sector-performance")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getSectorPerformance(@org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super com.econopulse.app.network.dto.SectorPerformanceResponse> $completion);
    
    @retrofit2.http.GET(value = "/api/visual-ai/yields")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getYieldCurve(@org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super com.econopulse.app.network.dto.YieldCurveResponse> $completion);
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 3, xi = 48)
    public static final class DefaultImpls {
    }
}