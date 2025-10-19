package com.econopulse.app.data.repository

import com.econopulse.app.data.model.*
import com.econopulse.app.network.ApiService
import com.econopulse.app.network.dto.EconoAIChatRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MarketRepository @Inject constructor(
    private val api: ApiService
) {
    fun getMarketData(category: String = "all", limit: Int? = null): Flow<Result<MarketResponse>> = flow {
        try {
            val resp = api.getYahooUnified(category = category, limit = limit)
            val items = resp.data.map {
                MarketData(
                    symbol = it.symbol,
                    name = it.name,
                    price = it.price,
                    changePercent = it.changePercent,
                    volume = it.volume ?: 0L
                )
            }
            emit(Result.success(MarketResponse("success", items, System.currentTimeMillis())))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }.flowOn(Dispatchers.IO)

    fun getRecessionIndex(limit: Int = 120): Flow<Result<RecessionIndex>> = flow {
        try {
            val resp = api.getRecessionIndex(limit)
            val points = resp.series.map { RecessionDataPoint(it.date, it.value) }
            val current = resp.latest?.value ?: (points.lastOrNull()?.value ?: 0.0)
            val trend = if (points.size >= 2 && points.last().value >= points.first().value) "increasing" else "decreasing"
            emit(Result.success(
                RecessionIndex(
                    status = if (resp.success) "success" else "error",
                    currentIndex = current,
                    trend = trend,
                    data = points,
                    lastUpdated = points.lastOrNull()?.date ?: ""
                )
            ))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }.flowOn(Dispatchers.IO)

    fun getAIAnalysis(): Flow<Result<AIAnalysisResponse>> = flow {
        try {
            val s = api.getMarketSentiment()
            val analysis = "${s.aiPrediction} Sentiment: ${s.sentiment}. Volatility ~${s.volatility}."
            val probability = when (s.sentiment.lowercase()) {
                "extreme greed","greed" -> 0.2
                "neutral" -> 0.35
                "fear","extreme fear" -> 0.5
                else -> 0.35
            }
            emit(Result.success(
                AIAnalysisResponse(
                    status = "success",
                    analysis = analysis,
                    recessionProbability = probability,
                    keyIndicators = listOf("FearGreedIndex=${s.fearGreedIndex}", "Trend=${s.trend}"),
                    marketSentiment = s.sentiment,
                    timestamp = System.currentTimeMillis()
                )
            ))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }.flowOn(Dispatchers.IO)

    fun getTopNews(limit: Int = 8): Flow<Result<NewsResponse>> = flow {
        try {
            val resp = api.getTopNews()
            val articles = resp.data.take(limit).map {
                NewsArticle(
                    title = it.title,
                    description = it.description,
                    url = it.url,
                    urlToImage = null,
                    publishedAt = it.publishedDate,
                    source = NewsSource(null, it.source ?: "")
                )
            }
            emit(Result.success(NewsResponse(status = if (resp.success) "ok" else "error", totalResults = articles.size, articles = articles)))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }.flowOn(Dispatchers.IO)

    fun getAIPulse(): Flow<Result<AIPulseData>> = flow {
        try {
            // Reuse market sentiment + recession index
            val s = api.getMarketSentiment()
            val r = api.getRecessionIndex(60)
            val rec = r.latest?.value ?: r.series.lastOrNull()?.value ?: 0.0
            val signals = listOf(
                "Sentiment: ${s.sentiment}",
                "Trend: ${s.trend}",
                "VIX ~${s.volatility}",
                "RecessionIdx: ${"%.2f".format(rec)}"
            )
            emit(Result.success(AIPulseData(recessionIndex = rec, signals = signals, lastUpdated = s.lastUpdated)))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }.flowOn(Dispatchers.IO)

    fun chatWithEconoAI(message: String): Flow<Result<ChatResponse>> = flow {
        try {
            val resp = api.econoAIChat(EconoAIChatRequest(question = message))
            val txt = resp.answer ?: resp.error ?: ""
            emit(Result.success(ChatResponse(response = txt, timestamp = System.currentTimeMillis())))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }.flowOn(Dispatchers.IO)
}