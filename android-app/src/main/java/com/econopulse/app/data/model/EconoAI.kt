package com.econopulse.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Portfolio(
    val name: String,
    val type: String,
    val allocation: List<PortfolioAllocation>,
    @SerialName("expectedReturn")
    val expectedReturn: Double,
    @SerialName("riskScore")
    val riskScore: Int,
    val reasoning: String
)

@Serializable
data class PortfolioAllocation(
    val asset: String,
    val symbol: String,
    val percentage: Int,
    val sector: String? = null
)

@Serializable
data class PortfolioRequest(
    @SerialName("riskTolerance")
    val riskTolerance: String, // conservative, balanced, aggressive, smart_pick
    @SerialName("timeHorizon")
    val timeHorizon: String,
    @SerialName("marketData")
    val marketData: String,
    @SerialName("economicIndicators")
    val economicIndicators: String
)

@Serializable
data class EconoAIRequest(
    val question: String,
    @SerialName("userId")
    val userId: String,
    val context: EconoAIContext? = null
)

@Serializable
data class EconoAIContext(
    val market: MarketContext? = null,
    val macro: MacroContext? = null,
    val news: List<NewsItem>? = null
)

@Serializable
data class MarketContext(
    val summary: MarketSummary? = null,
    val sample: List<MarketSample>
)

@Serializable
data class MarketSample(
    val symbol: String,
    val name: String,
    val price: Double,
    val change: Double
)

@Serializable
data class MacroContext(
    val recession: RecessionPoint,
    @SerialName("seriesLen")
    val seriesLen: Int
)

@Serializable
data class NewsItem(
    val title: String,
    val url: String,
    val source: String,
    @SerialName("publishedAt")
    val publishedAt: String,
    val summary: String? = null,
    val tickers: List<String>? = null
)

@Serializable
data class EconoAIResponse(
    val answer: String,
    val question: String,
    @SerialName("usedContext")
    val usedContext: Boolean,
    val timestamp: String,
    val model: String
)