'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Target, 
  Shield, 
  Percent,
  RefreshCw,
  Activity,
  Volume2,
  BarChart3
} from 'lucide-react';

interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
}

interface AISignal {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  signal: 'LONG' | 'SHORT';
  confidence: number;
  timeframe: 'INTRADAY' | 'SWING';
  indicators: TechnicalIndicators;
  aiReasoning: string;
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2?: number;
  riskReward: number;
  lastUpdated: string;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
}

interface AISignalsResponse {
  success: boolean;
  signals: AISignal[];
  count: number;
  lastUpdated: string;
  nextUpdate: string;
  longSignals: number;
  shortSignals: number;
  avgConfidence: number | null;
  message?: string;
  dataSource?: string;
  analysisType?: string;
}

export default function AISignalsWidget() {
  const [signals, setSignals] = useState<AISignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  // nextUpdate intentionally unused in UI to keep auto-refresh silent
  const [stats, setStats] = useState({
    longSignals: 0,
    shortSignals: 0,
    avgConfidence: 0
  });
  const [message, setMessage] = useState<string>('');
  const [dataSource, setDataSource] = useState<string>('');
  const [selectedSignal, setSelectedSignal] = useState<AISignal | null>(null);

  const fetchSignals = async () => {
    try {
      setError(null);
      const response = await fetch('/api/ai-signals');
      
      if (!response.ok) {
        throw new Error('Failed to fetch AI signals');
      }
      
      const data: AISignalsResponse = await response.json();
      
      if (data.success) {
        setSignals(data.signals);
        setLastUpdated(data.lastUpdated);
  // nextUpdate is used internally only; do not surface in UI
  // setNextUpdate(data.nextUpdate);
        setStats({
          longSignals: data.longSignals,
          shortSignals: data.shortSignals,
          avgConfidence: data.avgConfidence || 0
        });
        setMessage(data.message || '');
        setDataSource(data.dataSource || '');
      } else {
        throw new Error('API returned error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    
    // Auto-refresh ogni 5 minuti
    const interval = setInterval(fetchSignals, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const getSignalColor = (signal: 'LONG' | 'SHORT') => {
    return signal === 'LONG' ? 'text-green-400' : 'text-red-400';
  };

  const getSignalBg = (signal: 'LONG' | 'SHORT') => {
    return signal === 'LONG' 
      ? 'bg-green-900/20 border-green-500/30' 
      : 'bg-red-900/20 border-red-500/30';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 65) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const formatPrice = (price: number) => {
    return price > 1000 ? price.toFixed(0) : price.toFixed(2);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Countdown intentionally removed from UI

  if (loading) {
    return (
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-blue-400">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>Generazione segnali AI...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
        <div className="text-center py-8">
          <div className="text-red-400 mb-2">
            <Zap className="w-12 h-12 mx-auto mb-2" />
            <p className="font-semibold">Errore caricamento segnali</p>
          </div>
          <p className="text-sm text-gray-400">Dati temporaneamente non disponibili.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Zap className="w-7 h-7 text-yellow-400" />
          <h2 className="text-2xl font-bold text-white">AI Trading Signals</h2>
        </div>
        {/* No visible auto-refresh controls per requirements */}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm font-semibold">LONG</span>
          </div>
          <p className="text-white text-xl font-bold">{stats.longSignals}</p>
        </div>
        
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-semibold">SHORT</span>
          </div>
          <p className="text-white text-xl font-bold">{stats.shortSignals}</p>
        </div>
        
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-semibold">Totale</span>
          </div>
          <p className="text-white text-xl font-bold">{signals.length}</p>
        </div>
        
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Percent className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-semibold">Confidenza</span>
          </div>
          <p className="text-white text-xl font-bold">{stats.avgConfidence}%</p>
        </div>
      </div>

      {/* Signals List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {signals.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 mx-auto mb-4 text-blue-400 opacity-50" />
            <div className="space-y-2">
              <p className="text-white font-semibold">Nessun segnale di qualità disponibile</p>
              {message && (
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mx-auto max-w-md">
                  <p className="text-blue-200 text-sm leading-relaxed">{message}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          signals.map((signal, index) => (
            <div
              key={`${signal.symbol}-${index}`}
              className={`p-4 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${getSignalBg(signal.signal)}`}
              onClick={() => setSelectedSignal(selectedSignal?.symbol === signal.symbol ? null : signal)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {signal.signal === 'LONG' ? (
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    )}
                    <span className={`font-bold text-lg ${getSignalColor(signal.signal)}`}>
                      {signal.symbol}
                    </span>
                  </div>
                  
                  <div className={`px-2 py-1 rounded text-xs font-semibold ${getSignalBg(signal.signal)}`}>
                    {signal.signal}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-white font-semibold">${formatPrice(signal.price)}</div>
                  <div className={`text-sm ${signal.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {signal.changePercent >= 0 ? '+' : ''}{signal.changePercent.toFixed(2)}%
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3 text-blue-400" />
                    <span className={getConfidenceColor(signal.confidence)}>
                      {signal.confidence}%
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-purple-400" />
                    <span className="text-purple-400">
                      R/R: {signal.riskReward}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Volume2 className="w-3 h-3 text-orange-400" />
                    <span className="text-orange-400">
                      {signal.volumeRatio}x
                    </span>
                  </div>
                </div>
                
                <div className="text-gray-400 text-xs">
                  {formatTime(signal.lastUpdated)}
                </div>
              </div>
              
              {/* Dettagli espansi */}
              {selectedSignal?.symbol === signal.symbol && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Livelli di Prezzo
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Entrata:</span>
                          <span className="text-white">${formatPrice(signal.entryPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Stop Loss:</span>
                          <span className="text-red-400">${formatPrice(signal.stopLoss)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Target 1:</span>
                          <span className="text-green-400">${formatPrice(signal.target1)}</span>
                        </div>
                        {signal.target2 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Target 2:</span>
                            <span className="text-green-400">${formatPrice(signal.target2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Indicatori Tecnici
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">RSI:</span>
                          <span className={`${signal.indicators.rsi > 70 ? 'text-red-400' : signal.indicators.rsi < 30 ? 'text-green-400' : 'text-white'}`}>
                            {signal.indicators.rsi.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">MACD:</span>
                          <span className={signal.indicators.macd.histogram > 0 ? 'text-green-400' : 'text-red-400'}>
                            {signal.indicators.macd.macd.toFixed(3)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Stocastico K:</span>
                          <span className={`${signal.indicators.stochastic.k > 80 ? 'text-red-400' : signal.indicators.stochastic.k < 20 ? 'text-green-400' : 'text-white'}`}>
                            {signal.indicators.stochastic.k.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="text-white font-semibold mb-2">Analisi AI</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {signal.aiReasoning}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {lastUpdated && (
        <div className="mt-4 pt-4 border-t border-white/10 text-center">
          <p className="text-gray-400 text-sm">
            Ultimo aggiornamento: {new Date(lastUpdated).toLocaleString('it-IT')}
          </p>
        </div>
      )}
    </div>
  );
}
