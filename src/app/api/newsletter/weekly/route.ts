import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Subscriber from '@/models/Subscriber';
import { EmailService } from '@/services/EmailService';
import { NewsletterDataService } from '@/services/NewsletterDataService';

export async function POST(request: NextRequest) {
  try {
    // Verifica autorizzazione (in produzione usare un API key o webhook secret)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.NEWSLETTER_CRON_SECRET || 'your-secret-key'}`;
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🚀 Starting weekly newsletter send...');
    
    await connectDB();

    // 1. Raccogliamo tutti i subscriber attivi
    const activeSubscribers = await Subscriber.find(
      { 
        isActive: true,
        'preferences.weeklyNewsletter': true 
      },
      'email'
    ).lean();

    if (activeSubscribers.length === 0) {
      console.log('📭 No active subscribers found');
      return NextResponse.json({
        success: true,
        message: 'No active subscribers found',
        stats: { sent: 0, failed: 0, total: 0 }
      });
    }

    console.log(`📬 Found ${activeSubscribers.length} active subscribers`);

    // 2. Raccogliamo i dati della settimana
    const weeklyData = await NewsletterDataService.collectWeeklyData();

    // 3. Inviamo le email a batch per evitare rate limiting
    const emailAddresses = activeSubscribers.map(sub => sub.email);
    const batchSize = 50; // Invia 50 email alla volta
    const results = { sent: 0, failed: 0, total: activeSubscribers.length };

    for (let i = 0; i < emailAddresses.length; i += batchSize) {
      const batch = emailAddresses.slice(i, i + batchSize);
      console.log(`📤 Sending batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(emailAddresses.length / batchSize)}`);
      
      const batchResults = await EmailService.sendBulkNewsletter(batch, weeklyData);
      
      results.sent += batchResults.success;
      results.failed += batchResults.failed;

      // Pausa tra i batch per evitare rate limiting
      if (i + batchSize < emailAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // 4. Aggiorniamo la data dell'ultimo invio per tutti i subscriber
    await Subscriber.updateMany(
      { 
        isActive: true,
        'preferences.weeklyNewsletter': true 
      },
      { 
        lastEmailSent: new Date() 
      }
    );

    const successRate = ((results.sent / results.total) * 100).toFixed(1);

    console.log(`✅ Weekly newsletter completed:`);
    console.log(`   📧 Sent: ${results.sent}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   📊 Success rate: ${successRate}%`);

    return NextResponse.json({
      success: true,
      message: 'Weekly newsletter sent successfully',
      stats: {
        sent: results.sent,
        failed: results.failed,
        total: results.total,
        successRate: `${successRate}%`
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Weekly newsletter error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send weekly newsletter',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint per testare il sistema
export async function GET() {
  try {
    await connectDB();
    
    const activeCount = await Subscriber.countDocuments({ 
      isActive: true,
      'preferences.weeklyNewsletter': true 
    });

    const lastSentCount = await Subscriber.countDocuments({ 
      isActive: true,
      lastEmailSent: { 
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
      }
    });

    return NextResponse.json({
      status: 'ready',
      subscribers: {
        activeWeeklySubscribers: activeCount,
        sentInLast7Days: lastSentCount,
        nextScheduledSend: 'Every Sunday at 8:00 AM EST'
      },
      message: 'Weekly newsletter service is ready'
    });

  } catch (error) {
    console.error('Error checking newsletter status:', error);
    return NextResponse.json(
      { error: 'Failed to check newsletter status' },
      { status: 500 }
    );
  }
}
