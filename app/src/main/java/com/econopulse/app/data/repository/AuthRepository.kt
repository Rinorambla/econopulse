package com.econopulse.app.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.econopulse.app.data.model.AuthResponse
import com.econopulse.app.data.model.Session
import com.econopulse.app.data.model.User
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_prefs")

@Singleton
class AuthRepository @Inject constructor(
    @ApplicationContext private val context: Context
) {
    
    companion object {
        private val SESSION_KEY = stringPreferencesKey("session")
        private val USER_KEY = stringPreferencesKey("user")
    }
    
    suspend fun signIn(email: String, password: String): Result<AuthResponse> {
        return try {
            // Simulate API call
            delay(1000)
            
            // Simple mock auth - accept any email/password for demo
            if (email.isNotEmpty() && password.isNotEmpty()) {
                val user = User(
                    id = "demo_user_123",
                    email = email,
                    userMetadata = null,
                    createdAt = null
                )
                
                val session = Session(
                    accessToken = "demo_token_123",
                    refreshToken = "demo_refresh_123",
                    expiresAt = System.currentTimeMillis() + 3600000L, // 1 hour
                    user = user
                )
                
                saveSession(session)
                Result.success(AuthResponse(session = session, user = user))
            } else {
                Result.failure(Exception("Invalid credentials"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun signUp(email: String, password: String): Result<AuthResponse> {
        return try {
            // Simulate API call
            delay(1000)
            
            if (email.isNotEmpty() && password.isNotEmpty()) {
                val user = User(
                    id = "demo_user_${System.currentTimeMillis()}",
                    email = email,
                    userMetadata = null,
                    createdAt = null
                )
                
                val session = Session(
                    accessToken = "demo_token_${System.currentTimeMillis()}",
                    refreshToken = "demo_refresh_${System.currentTimeMillis()}",
                    expiresAt = System.currentTimeMillis() + 3600000L,
                    user = user
                )
                
                saveSession(session)
                Result.success(AuthResponse(session = session, user = user))
            } else {
                Result.failure(Exception("Invalid credentials"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun signOut(): Result<Unit> {
        return try {
            clearSession()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getCurrentUser(): User? {
        return try {
            val preferences = context.dataStore.data.first()
            val userId = preferences[USER_KEY]
            if (userId != null) {
                User(
                    id = userId,
                    email = "demo@econopulse.ai",
                    userMetadata = null,
                    createdAt = null
                )
            } else null
        } catch (e: Exception) {
            null
        }
    }
    
    fun isUserLoggedIn(): Flow<Boolean> {
        return context.dataStore.data.map { preferences ->
            preferences[SESSION_KEY] != null
        }
    }
    
    private suspend fun saveSession(session: Session) {
        context.dataStore.edit { preferences ->
            preferences[SESSION_KEY] = session.accessToken
            preferences[USER_KEY] = session.user.id
        }
    }
    
    private suspend fun clearSession() {
        context.dataStore.edit { preferences ->
            preferences.remove(SESSION_KEY)
            preferences.remove(USER_KEY)
        }
    }
    
    suspend fun getStoredSession(): Session? {
        return try {
            val preferences = context.dataStore.data.first()
            val accessToken = preferences[SESSION_KEY]
            val userId = preferences[USER_KEY]
            
            if (accessToken != null && userId != null) {
                Session(
                    accessToken = accessToken,
                    refreshToken = "",
                    expiresAt = System.currentTimeMillis() + 3600000L,
                    user = User(
                        id = userId,
                        email = "demo@econopulse.ai",
                        userMetadata = null,
                        createdAt = null
                    )
                )
            } else null
        } catch (e: Exception) {
            null
        }
    }
}