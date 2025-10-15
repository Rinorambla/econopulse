// MARKET DATA SCHEDULER - Aggiornamenti automatici 2x al giorno
// Gestisce cache intelligente e aggiornamenti programmati

export class MarketDataScheduler {
  private updateTimes = [
    { hour: 9, minute: 0 },   // 9:00 AM - Apertura mercati
    { hour: 15, minute: 0 }   // 3:00 PM - Durante trading
  ];
  
  private cacheDuration = 6 * 60 * 60 * 1000; // 6 ore
  private scheduler: NodeJS.Timeout | null = null;
  
  constructor() {
    // Avoid background timers in serverless/Node runtimes
    // Only initialize periodic checks in a real browser environment
    if (typeof window !== 'undefined') {
      this.initializeScheduler();
    }
  }

  private initializeScheduler() {
    // Controlla ogni 10 minuti se è ora di aggiornare
    this.scheduler = setInterval(() => {
      this.checkForUpdates();
    }, 10 * 60 * 1000); // 10 minuti

    console.log('📅 Market Data Scheduler initialized - 2x daily updates at 9:00 and 15:00');
  }

  private async checkForUpdates() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Verifica se siamo in uno degli orari di aggiornamento (± 10 minuti)
    for (const updateTime of this.updateTimes) {
      const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (updateTime.hour * 60 + updateTime.minute));
      
      if (timeDiff <= 10) { // Entro 10 minuti dall'orario programmato
        const lastUpdate = this.getLastUpdateTime();
        const hoursSinceUpdate = lastUpdate ? (Date.now() - lastUpdate) / (1000 * 60 * 60) : 24;
        
        // Aggiorna se sono passate più di 5 ore dall'ultimo aggiornamento
        if (hoursSinceUpdate >= 5) {
          console.log(`🔄 Scheduled market data update triggered at ${now.toLocaleTimeString()}`);
          await this.performScheduledUpdate();
          this.setLastUpdateTime(Date.now());
        }
      }
    }
  }

  private async performScheduledUpdate() {
    try {
      // Importa dinamicamente per evitare dipendenze circolari
      const { unifiedMarketAPI } = await import('./unified-market-api');
      
      console.log('🚀 Starting scheduled market data refresh...');
      const result = await unifiedMarketAPI.getMarketData(true); // Force refresh
      
      console.log(`✅ Scheduled update completed - ${result.data?.length || 0} assets updated`);
      
      // Notifica il client se necessario (WebSocket, Server-Sent Events, etc.)
      this.notifyClients(result);
      
    } catch (error) {
      console.error('❌ Scheduled update failed:', error);
    }
  }

  private getLastUpdateTime(): number | null {
    if (typeof localStorage !== 'undefined') {
      const timestamp = localStorage.getItem('lastScheduledUpdate');
      return timestamp ? parseInt(timestamp) : null;
    }
    return null;
  }

  private setLastUpdateTime(timestamp: number) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lastScheduledUpdate', timestamp.toString());
    }
  }

  private notifyClients(data: any) {
    // Qui potresti implementare notifiche real-time
    // WebSocket, Server-Sent Events, Push Notifications, etc.
    console.log('📡 Market data updated - clients can be notified');
  }

  // Metodo per controllare manualmente se è ora di aggiornare
  public shouldUpdateNow(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Aggiorna durante gli orari di mercato (9:00-16:00)
    if (currentHour >= 9 && currentHour <= 16) {
      const lastUpdate = this.getLastUpdateTime();
      if (!lastUpdate) return true;
      
      const hoursSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60);
      return hoursSinceUpdate >= 6; // Aggiorna ogni 6 ore durante market hours
    }
    
    return false;
  }

  // Ottieni il prossimo orario di aggiornamento
  public getNextUpdateTime(): Date {
    const now = new Date();
    const today = new Date(now);
    
    for (const updateTime of this.updateTimes) {
      const scheduledTime = new Date(today);
      scheduledTime.setHours(updateTime.hour, updateTime.minute, 0, 0);
      
      if (scheduledTime > now) {
        return scheduledTime;
      }
    }
    
    // Se tutti gli orari di oggi sono passati, restituisci il primo di domani
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(this.updateTimes[0].hour, this.updateTimes[0].minute, 0, 0);
    
    return tomorrow;
  }

  // Statistiche del scheduler
  public getSchedulerStats(): {
    nextUpdate: string;
    lastUpdate: string | null;
    updateFrequency: string;
    cacheDuration: string;
  } {
    const nextUpdate = this.getNextUpdateTime();
    const lastUpdate = this.getLastUpdateTime();
    
    return {
      nextUpdate: nextUpdate.toLocaleString(),
      lastUpdate: lastUpdate ? new Date(lastUpdate).toLocaleString() : null,
      updateFrequency: '2x daily at 9:00 and 15:00',
      cacheDuration: '6 hours'
    };
  }

  // Cleanup del scheduler
  public destroy() {
    if (this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
    }
  }
}

// Funzione helper per controllare se è in orario di mercato
export function isMarketHours(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0 = Domenica, 6 = Sabato
  const hour = now.getHours();
  
  // Lunedì-Venerdì, 9:00-16:00
  return day >= 1 && day <= 5 && hour >= 9 && hour <= 16;
}

// Funzione helper per calcolare il prossimo giorno lavorativo
export function getNextTradingDay(): Date {
  const now = new Date();
  const nextDay = new Date(now);
  nextDay.setDate(now.getDate() + 1);
  
  // Se domani è sabato (6), vai a lunedì
  if (nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 2);
  }
  // Se domani è domenica (0), vai a lunedì  
  else if (nextDay.getDay() === 0) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  nextDay.setHours(9, 0, 0, 0); // 9:00 AM
  return nextDay;
}

// Export del singleton scheduler
export const marketScheduler = new MarketDataScheduler();
