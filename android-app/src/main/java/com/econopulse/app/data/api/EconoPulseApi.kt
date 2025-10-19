package com.econopulse.app.data.api

import com.econopulse.app.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface EconoPulseApi {
    
    // Market Data
    @GET("yahoo-unified")
    suspend fun getMarketData(
        @Query("category") category: String = "all",
        @Query("limit") limit: Int? = null
    ): Response<MarketResponse>
    
    @GET("recession-index")
    suspend fun getRecessionIndex(
        @Query("limit") limit: Int = 120
    ): Response<RecessionIndex>
    
    @GET("ai-economic-analysis")
    suspend fun getAIAnalysis(): Response<AIAnalysisResponse>
    
    // AI Features
    @POST("econoai/chat")
    suspend fun askEconoAI(
        @Body request: EconoAIRequest
    ): Response<EconoAIResponse>
    
    @POST("ai-portfolio/generate")
    suspend fun generatePortfolio(
        @Body request: PortfolioRequest
    ): Response<Portfolio>
    
    // News
    @GET("news/top")
    suspend fun getTopNews(
        @Query("limit") limit: Int = 8
    ): Response<NewsResponse>
}

data class NewsResponse(
    val ok: Boolean,
    val count: Int,
    val data: List<NewsItem>
)