package com.econopulse.app

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class EconoPulseApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
    }
}