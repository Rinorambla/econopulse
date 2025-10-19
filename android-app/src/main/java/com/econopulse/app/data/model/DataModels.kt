package com.econopulse.app.data.model

data class MarketData(
    val symbol: String,
    val name: String,
    val price: Double,
    val changePercent: Double,
    val volume: Long
)

data class NewsResponse(
    val status: String,
    val totalResults: Int,
    val articles: List<NewsArticle>
)

data class NewsArticle(
    val title: String,
    val description: String?,
    val url: String,
    val urlToImage: String?,
    val publishedAt: String,
    val source: NewsSource
)

data class NewsSource(
    val id: String?,
    val name: String
)

data class AIPulseData(
    val recessionIndex: Double,
    val signals: List<String>,
    val lastUpdated: String
)

data class ChatMessage(
    val id: String,
    val content: String,
    val isFromUser: Boolean,
    val timestamp: Long
)

data class ChatResponse(
    val response: String,
    val timestamp: Long
)

// API Response Models
data class MarketResponse(
    val status: String,
    val data: List<MarketData>,
    val timestamp: Long
)

data class RecessionIndex(
    val status: String,
    val currentIndex: Double,
    val trend: String,
    val data: List<RecessionDataPoint>,
    val lastUpdated: String
)

data class RecessionDataPoint(
    val date: String,
    val value: Double
)

data class AIAnalysisResponse(
    val status: String,
    val analysis: String,
    val recessionProbability: Double,
    val keyIndicators: List<String>,
    val marketSentiment: String,
    val timestamp: Long
)