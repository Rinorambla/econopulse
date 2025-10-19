package com.econopulse.app.network

import com.econopulse.app.network.dto.*
import retrofit2.http.*

interface ApiService {
    // Yahoo unified market
    @GET("/api/yahoo-unified")
    suspend fun getYahooUnified(
        @Query("category") category: String? = null,
        @Query("limit") limit: Int? = null,
        @Query("symbols") symbols: String? = null
    ): YahooUnifiedResponse

    // Recession index
    @GET("/api/recession-index")
    suspend fun getRecessionIndex(@Query("limit") limit: Int? = null): RecessionIndexResponse

    // Top news
    @GET("/api/news")
    suspend fun getTopNews(): NewsApiResponse

    // Market sentiment
    @GET("/api/market-sentiment")
    suspend fun getMarketSentiment(): MarketSentimentResponse

    // EconoAI chat
    @POST("/api/econoai/chat")
    suspend fun econoAIChat(@Body body: EconoAIChatRequest): EconoAIChatResponse

    // Sector performance
    @GET("/api/sector-performance")
    suspend fun getSectorPerformance(): SectorPerformanceResponse

    // Yield curve for Visual AI
    @GET("/api/visual-ai/yields")
    suspend fun getYieldCurve(): YieldCurveResponse
}
