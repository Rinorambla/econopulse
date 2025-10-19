package com.econopulse.app.network.dto

// Yahoo Unified
data class YahooUnifiedResponse(
    val ok: Boolean? = null,
    val data: List<YahooAssetDTO> = emptyList()
)

data class YahooAssetDTO(
    val symbol: String,
    val name: String,
    val price: Double,
    val change: Double,
    val changePercent: Double,
    val volume: Long?,
    val category: String,
    val assetClass: String,
    val performance: Double,
    val timestamp: String,
    val source: String
)

// Recession Index
data class RecessionIndexResponse(
    val success: Boolean,
    val id: String,
    val name: String,
    val formula: String,
    val latest: RecessionPointDTO?,
    val series: List<RecessionPointDTO> = emptyList(),
    val source: String
)

data class RecessionPointDTO(
    val date: String,
    val value: Double
)

// News
data class NewsApiResponse(
    val success: Boolean,
    val provider: String,
    val count: Int,
    val data: List<NewsItemDTO> = emptyList(),
    val lastUpdated: String
)

data class NewsItemDTO(
    val id: String?,
    val title: String,
    val description: String?,
    val url: String,
    val source: String?,
    val publishedDate: String,
    val tickers: List<String>?,
    val tags: List<String>?
)

// Market Sentiment (used to synthesize AI Pulse signals)
data class MarketSentimentResponse(
    val fearGreedIndex: Int,
    val sentiment: String,
    val trend: String,
    val volatility: Int,
    val aiPrediction: String,
    val lastUpdated: String,
    val sources: Map<String, String>
)

// EconoAI Chat
data class EconoAIChatRequest(
    val question: String,
    val userId: String? = null,
    val context: Any? = null
)

data class EconoAIChatResponse(
    val answer: String?,
    val error: String? = null,
    val timestamp: String? = null,
    val model: String? = null
)

// Sector Performance
data class SectorPerformanceResponse(
    val success: Boolean,
    val sectors: List<SectorPerfDTO> = emptyList(),
    val lastUpdated: String,
    val summary: Map<String, Any?>? = null,
    val timestamp: String? = null,
    val source: String? = null,
    val dataType: String? = null
)

data class SectorPerfDTO(
    val sector: String,
    val daily: Double,
    val weekly: Double,
    val monthly: Double,
    val quarterly: Double,
    val yearly: Double,
    val marketCap: Number?,
    val volume: Number?,
    val topStocks: List<String>?
)

// Yield Curve
data class YieldCurveResponse(
    val data: List<YieldCurvePointDTO>,
    val source: String?,
    val lastUpdated: String?
)

data class YieldCurvePointDTO(
    val maturity: String,
    val us: Double,
    val eu: Double,
    val em: Double
)
