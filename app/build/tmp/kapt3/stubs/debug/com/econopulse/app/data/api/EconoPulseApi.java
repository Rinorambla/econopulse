package com.econopulse.app.data.api;

@kotlin.Metadata(mv = {1, 9, 0}, k = 1, xi = 48, d1 = {"\u0000R\n\u0002\u0018\u0002\n\u0002\u0010\u0000\n\u0000\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\n\u0002\u0010\u000e\n\u0000\n\u0002\u0010\b\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0002\b\u0002\n\u0002\u0018\u0002\n\u0000\bf\u0018\u00002\u00020\u0001J\u001e\u0010\u0002\u001a\b\u0012\u0004\u0012\u00020\u00040\u00032\b\b\u0001\u0010\u0005\u001a\u00020\u0006H\u00a7@\u00a2\u0006\u0002\u0010\u0007J\u001e\u0010\b\u001a\b\u0012\u0004\u0012\u00020\t0\u00032\b\b\u0001\u0010\u0005\u001a\u00020\nH\u00a7@\u00a2\u0006\u0002\u0010\u000bJ\u0014\u0010\f\u001a\b\u0012\u0004\u0012\u00020\r0\u0003H\u00a7@\u00a2\u0006\u0002\u0010\u000eJ*\u0010\u000f\u001a\b\u0012\u0004\u0012\u00020\u00100\u00032\b\b\u0003\u0010\u0011\u001a\u00020\u00122\n\b\u0003\u0010\u0013\u001a\u0004\u0018\u00010\u0014H\u00a7@\u00a2\u0006\u0002\u0010\u0015J\u001e\u0010\u0016\u001a\b\u0012\u0004\u0012\u00020\u00170\u00032\b\b\u0003\u0010\u0013\u001a\u00020\u0014H\u00a7@\u00a2\u0006\u0002\u0010\u0018J\u001e\u0010\u0019\u001a\b\u0012\u0004\u0012\u00020\u001a0\u00032\b\b\u0003\u0010\u0013\u001a\u00020\u0014H\u00a7@\u00a2\u0006\u0002\u0010\u0018\u00a8\u0006\u001b"}, d2 = {"Lcom/econopulse/app/data/api/EconoPulseApi;", "", "askEconoAI", "Lretrofit2/Response;", "Lcom/econopulse/app/data/model/EconoAIResponse;", "request", "Lcom/econopulse/app/data/model/EconoAIRequest;", "(Lcom/econopulse/app/data/model/EconoAIRequest;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "generatePortfolio", "Lcom/econopulse/app/data/model/Portfolio;", "Lcom/econopulse/app/data/model/PortfolioRequest;", "(Lcom/econopulse/app/data/model/PortfolioRequest;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "getAIAnalysis", "Lcom/econopulse/app/data/model/AIAnalysisResponse;", "(Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "getMarketData", "Lcom/econopulse/app/data/model/MarketResponse;", "category", "", "limit", "", "(Ljava/lang/String;Ljava/lang/Integer;Lkotlin/coroutines/Continuation;)Ljava/lang/Object;", "getRecessionIndex", "Lcom/econopulse/app/data/model/RecessionIndex;", "(ILkotlin/coroutines/Continuation;)Ljava/lang/Object;", "getTopNews", "Lcom/econopulse/app/data/api/NewsResponse;", "app_debug"})
public abstract interface EconoPulseApi {
    
    @retrofit2.http.GET(value = "yahoo-unified")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getMarketData(@retrofit2.http.Query(value = "category")
    @org.jetbrains.annotations.NotNull()
    java.lang.String category, @retrofit2.http.Query(value = "limit")
    @org.jetbrains.annotations.Nullable()
    java.lang.Integer limit, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<com.econopulse.app.data.model.MarketResponse>> $completion);
    
    @retrofit2.http.GET(value = "recession-index")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getRecessionIndex(@retrofit2.http.Query(value = "limit")
    int limit, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<com.econopulse.app.data.model.RecessionIndex>> $completion);
    
    @retrofit2.http.GET(value = "ai-economic-analysis")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getAIAnalysis(@org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<com.econopulse.app.data.model.AIAnalysisResponse>> $completion);
    
    @retrofit2.http.POST(value = "econoai/chat")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object askEconoAI(@retrofit2.http.Body()
    @org.jetbrains.annotations.NotNull()
    com.econopulse.app.data.model.EconoAIRequest request, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<com.econopulse.app.data.model.EconoAIResponse>> $completion);
    
    @retrofit2.http.POST(value = "ai-portfolio/generate")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object generatePortfolio(@retrofit2.http.Body()
    @org.jetbrains.annotations.NotNull()
    com.econopulse.app.data.model.PortfolioRequest request, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<com.econopulse.app.data.model.Portfolio>> $completion);
    
    @retrofit2.http.GET(value = "news/top")
    @org.jetbrains.annotations.Nullable()
    public abstract java.lang.Object getTopNews(@retrofit2.http.Query(value = "limit")
    int limit, @org.jetbrains.annotations.NotNull()
    kotlin.coroutines.Continuation<? super retrofit2.Response<com.econopulse.app.data.api.NewsResponse>> $completion);
    
    @kotlin.Metadata(mv = {1, 9, 0}, k = 3, xi = 48)
    public static final class DefaultImpls {
    }
}