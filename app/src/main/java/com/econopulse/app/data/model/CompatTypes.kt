package com.econopulse.app.data.model

import kotlinx.serialization.Serializable

@Serializable
data class MarketSummary(
    val gainers: Int? = null,
    val losers: Int? = null,
    val volume: Long? = null
)

@Serializable
data class RecessionPoint(
    val date: String,
    val value: Double
)