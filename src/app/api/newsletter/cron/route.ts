import { NextRequest, NextResponse } from 'next/server';
import { newsletterCron } from '@/services/NewsletterCronService';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'start':
        newsletterCron.startWeeklyNewsletter();
        return NextResponse.json({
          success: true,
          message: 'Newsletter cron job started',
          isRunning: newsletterCron.isRunning(),
          nextRun: newsletterCron.getNextScheduledRun()
        });

      case 'stop':
        newsletterCron.stopWeeklyNewsletter();
        return NextResponse.json({
          success: true,
          message: 'Newsletter cron job stopped',
          isRunning: newsletterCron.isRunning()
        });

      case 'send_now':
        const result = await newsletterCron.sendManualNewsletter();
        return NextResponse.json({
          success: true,
          message: 'Manual newsletter sent',
          result
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, or send_now' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Newsletter cron API error:', error);
    return NextResponse.json(
      { error: 'Failed to manage newsletter cron job' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      status: 'active',
      cronJob: {
        isRunning: newsletterCron.isRunning(),
        schedule: newsletterCron.getNextScheduledRun(),
        environment: process.env.NODE_ENV
      },
      actions: {
        available: ['start', 'stop', 'send_now'],
        examples: {
          start: 'POST /api/newsletter/cron with {"action": "start"}',
          stop: 'POST /api/newsletter/cron with {"action": "stop"}',
          sendNow: 'POST /api/newsletter/cron with {"action": "send_now"}'
        }
      }
    });

  } catch (error) {
    console.error('Newsletter cron status error:', error);
    return NextResponse.json(
      { error: 'Failed to get cron status' },
      { status: 500 }
    );
  }
}
