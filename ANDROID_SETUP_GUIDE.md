# EconoPulse Android App - Setup Guide

## Configurazione Rapida

### 1. Prerequisiti
- **Android Studio Ladybug (2024.2.1)** o più recente
- **JDK 17** o superiore
- **Android SDK 34** 

### 2. Setup Progetto

1. **Apri Android Studio**
2. **"Open an Existing Project"** 
3. Seleziona la cartella: `C:\Users\HP\Desktop\mysite`
4. Android Studio dovrebbe riconoscere automaticamente il progetto

### 3. Configurazione SDK
- Vai a **File > Project Structure > SDK Location**
- Assicurati che l'Android SDK sia installato in: `%LOCALAPPDATA%\Android\Sdk`
- Verifica che sia installato **Android SDK 34**

### 4. Variabili d'Ambiente (Opzionale)
- Copia `local.properties.example` in `local.properties`
- Aggiorna con le tue chiavi API Supabase reali

### 5. Primo Build
```bash
# In Android Studio Terminal o cmd nella root del progetto
.\gradlew assembleDebug
```

### 6. Esecuzione
- Configura un **Android Virtual Device (AVD)** 
- Clicca il pulsante **Run** in Android Studio
- Oppure usa: `.\gradlew installDebug`

## Troubleshooting

### Errori Comuni

**"Compose Compiler Plugin is required"**
- Risolto ✅ - La configurazione è corretta nel build.gradle.kts

**"SDK not found"**
- Vai a File > Project Structure > SDK Location
- Imposta il percorso corretto dell'Android SDK

**"Gradle sync failed"**
- Verifica connessione internet
- Prova: Build > Clean Project
- Poi: Build > Rebuild Project

## Struttura App

### Architettura: MVVM + Hilt DI
- **UI Layer**: Jetpack Compose con Material 3
- **Business Logic**: ViewModels con StateFlow
- **Data Layer**: Repository pattern con Retrofit + Supabase

### 6 Schermate Principali:
1. **Authentication** - Login/registrazione con Supabase
2. **Dashboard** - Overview mercati e portfolio
3. **AI Pulse** - Analisi AI del mercato
4. **Visual AI** - Grafici e visualizzazioni
5. **Market DNA** - Sentiment e trends
6. **Portfolio** - Gestione investimenti
7. **EconoAI** - Chat AI economica

### Tecnologie:
- **Kotlin 2.0** + **Jetpack Compose**
- **Hilt** per dependency injection
- **Retrofit** per networking
- **Supabase** per auth e database
- **MPAndroidChart** per grafici
- **Material 3** design system

## Prossimi Passi

1. ✅ **Build System**: Completato
2. 🔄 **Test Build**: In corso
3. ⏳ **API Integration**: Collegamento dati reali
4. ⏳ **Testing**: Validazione features
5. ⏳ **Play Store**: Preparazione release

---
**Nota**: Questo progetto usa le versioni più recenti di Android development stack (2024) per garantire performance e compatibilità ottimali.