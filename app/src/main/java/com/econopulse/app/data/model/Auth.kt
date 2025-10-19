package com.econopulse.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val email: String,
    @SerialName("user_metadata")
    val userMetadata: UserMetadata? = null,
    @SerialName("created_at")
    val createdAt: String? = null
)

@Serializable
data class UserMetadata(
    @SerialName("subscription_plan")
    val subscriptionPlan: String? = "free",
    @SerialName("full_name")
    val fullName: String? = null,
    val avatar: String? = null
)

@Serializable
data class AuthResponse(
    val user: User? = null,
    val session: Session? = null,
    val error: String? = null
)

@Serializable
data class Session(
    @SerialName("access_token")
    val accessToken: String,
    @SerialName("refresh_token")
    val refreshToken: String,
    @SerialName("expires_at")
    val expiresAt: Long,
    val user: User
)