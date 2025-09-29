import * as cron from 'node-cron';

class NewsletterCronService {
  private static instance: NewsletterCronService;
  private cronJob: cron.ScheduledTask | null = null;

  private constructor() {}

  public static getInstance(): NewsletterCronService {
    if (!NewsletterCronService.instance) {
      NewsletterCronService.instance = new NewsletterCronService();
    }
    return NewsletterCronService.instance;
  }

  /**
   * Avvia il cron job per la newsletter settimanale
   * Invia ogni domenica alle 8:00 AM EST
   */
  public startWeeklyNewsletter(): void {
    if (this.cronJob) {
      console.log('⏰ Newsletter cron job is already running');
      return;
    }

    // Cron expression: "0 8 * * 0" = Ogni domenica alle 8:00 AM
    // Per test: "0 */1 * * *" = Ogni ora
    // Per test: "*/30 * * * *" = Ogni 30 minuti
    const cronExpression = process.env.NODE_ENV === 'development' 
      ? '0 */1 * * *'  // Ogni ora in sviluppo
      : '0 8 * * 0';   // Ogni domenica alle 8 AM in produzione

    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.sendWeeklyNewsletter();
    }, {
      timezone: 'America/New_York' // EST timezone
    });

    console.log(`⏰ Weekly newsletter cron job started`);
    console.log(`📅 Schedule: ${cronExpression} (EST timezone)`);
  }

  /**
   * Ferma il cron job
   */
  public stopWeeklyNewsletter(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob.destroy();
      this.cronJob = null;
      console.log('⏹️  Newsletter cron job stopped');
    }
  }

  /**
   * Ottiene il prossimo orario di esecuzione
   */
  public getNextScheduledRun(): string | null {
    if (!this.cronJob) {
      return null;
    }
    
    // Per node-cron, mostriamo solo la programmazione
    const cronExpression = process.env.NODE_ENV === 'development' 
      ? '0 */1 * * * (Every hour)'
      : '0 8 * * 0 (Every Sunday at 8 AM EST)';
    
    return cronExpression;
  }

  /**
   * Verifica se il cron job è attivo
   */
  public isRunning(): boolean {
    return this.cronJob !== null;
  }

  /**
   * Invia manualmente la newsletter (per test)
   */
  public async sendManualNewsletter(): Promise<any> {
    console.log('🔧 Manual newsletter send triggered');
    return await this.sendWeeklyNewsletter();
  }

  /**
   * Logica principale per inviare la newsletter
   */
  private async sendWeeklyNewsletter(): Promise<any> {
    try {
      console.log('🚀 Weekly newsletter cron job triggered');
      console.log('📅 Timestamp:', new Date().toISOString());

      // Chiamiamo la nostra API per inviare la newsletter
  const base = process.env.BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const response = await fetch(`${base}/api/newsletter/weekly`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEWSLETTER_CRON_SECRET || 'your-secret-key'}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Newsletter API failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      console.log('✅ Weekly newsletter sent successfully');
      console.log('📊 Stats:', result.stats);

      return result;

    } catch (error) {
      console.error('❌ Weekly newsletter cron job failed:', error);
      
      // In produzione, potresti voler inviare un alert agli admin
      // await this.sendAdminAlert(error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Invia alert agli amministratori in caso di errore
   * (implementazione futura)
   */
  private async sendAdminAlert(error: any): Promise<void> {
    // TODO: Implementare invio alert agli admin
    console.error('🚨 Admin alert should be sent:', error);
  }
}

// Singleton instance
export const newsletterCron = NewsletterCronService.getInstance();

// Auto-start quando il modulo viene importato (solo in produzione)
if (process.env.NODE_ENV === 'production') {
  newsletterCron.startWeeklyNewsletter();
}
