import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Subscriber from '@/models/Subscriber';
import { EmailService } from '@/services/EmailService';

// Fallback in-memory storage per sviluppo quando MongoDB non è disponibile
const inMemorySubscribers: Array<{
  email: string;
  isActive: boolean;
  subscribedAt: Date;
  preferences: {
    weeklyNewsletter: boolean;
    marketAlerts: boolean;
    productUpdates: boolean;
  };
}> = [];

export async function POST(request: NextRequest) {
  try {
    let useDatabase = true;
    
    // Prova a connettersi al database
    try {
      await connectDB();
    } catch (dbError) {
      console.warn('⚠️ MongoDB non disponibile, usando storage in-memory per sviluppo');
      useDatabase = false;
    }
    
    const { email } = await request.json();

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (useDatabase) {
      // Logica con MongoDB
      const existingSubscriber = await Subscriber.findOne({ 
        email: email.toLowerCase() 
      });

      if (existingSubscriber) {
        if (existingSubscriber.isActive) {
          return NextResponse.json(
            { error: 'Email already subscribed' },
            { status: 409 }
          );
        } else {
          // Reactivate subscription
          existingSubscriber.isActive = true;
          existingSubscriber.subscribedAt = new Date();
          await existingSubscriber.save();

          console.log(`🔄 Reactivated subscription: ${email}`);
          
          return NextResponse.json(
            { 
              success: true, 
              message: 'Successfully reactivated subscription',
              subscriber: {
                email: existingSubscriber.email,
                subscribedAt: existingSubscriber.subscribedAt,
              }
            },
            { status: 200 }
          );
        }
      }

      // Get client info for metadata
      const userAgent = request.headers.get('user-agent');
      const forwardedFor = request.headers.get('x-forwarded-for');
      const clientIP = forwardedFor?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown';

      // Create new subscriber
      const newSubscriber = new Subscriber({
        email: email.toLowerCase(),
        isActive: true,
        subscribedAt: new Date(),
        preferences: {
          weeklyNewsletter: true,
          marketAlerts: true,
          productUpdates: true,
        },
        metadata: {
          source: 'website',
          userAgent: userAgent || undefined,
          ipAddress: clientIP,
        },
      });

      await newSubscriber.save();

      // Send welcome email (only if email service is configured)
      let emailSent = false;
      try {
        emailSent = await EmailService.sendWelcomeEmail(email);
      } catch (emailError) {
        console.warn(`⚠️ Welcome email failed for: ${email}`, emailError);
      }

      // Get total subscriber count
      const totalSubscribers = await Subscriber.countDocuments({ isActive: true });

      console.log(`📧 New newsletter subscription: ${email}`);
      console.log(`📊 Total active subscribers: ${totalSubscribers}`);

      return NextResponse.json(
        { 
          success: true, 
          message: 'Successfully subscribed to newsletter',
          subscriber: {
            email: newSubscriber.email,
            subscribedAt: newSubscriber.subscribedAt,
          },
          totalSubscribers,
          welcomeEmailSent: emailSent,
          storage: 'database'
        },
        { status: 201 }
      );

    } else {
      // Fallback con in-memory storage
      const existingIndex = inMemorySubscribers.findIndex(
        sub => sub.email === email.toLowerCase()
      );

      if (existingIndex !== -1) {
        if (inMemorySubscribers[existingIndex].isActive) {
          return NextResponse.json(
            { error: 'Email already subscribed' },
            { status: 409 }
          );
        } else {
          // Reactivate
          inMemorySubscribers[existingIndex].isActive = true;
          inMemorySubscribers[existingIndex].subscribedAt = new Date();
          
          return NextResponse.json(
            { 
              success: true, 
              message: 'Successfully reactivated subscription',
              subscriber: {
                email: inMemorySubscribers[existingIndex].email,
                subscribedAt: inMemorySubscribers[existingIndex].subscribedAt,
              },
              storage: 'memory'
            },
            { status: 200 }
          );
        }
      }

      // Add new subscriber
      const newSubscriber = {
        email: email.toLowerCase(),
        isActive: true,
        subscribedAt: new Date(),
        preferences: {
          weeklyNewsletter: true,
          marketAlerts: true,
          productUpdates: true,
        }
      };

      inMemorySubscribers.push(newSubscriber);

      console.log(`📧 New newsletter subscription (in-memory): ${email}`);
      console.log(`📊 Total in-memory subscribers: ${inMemorySubscribers.length}`);

      return NextResponse.json(
        { 
          success: true, 
          message: 'Successfully subscribed to newsletter',
          subscriber: {
            email: newSubscriber.email,
            subscribedAt: newSubscriber.subscribedAt,
          },
          totalSubscribers: inMemorySubscribers.filter(s => s.isActive).length,
          storage: 'memory',
          note: 'Using in-memory storage for development. Configure MongoDB for production.'
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    
    // Handle duplicate key error specifically
    if ((error as any).code === 11000) {
      return NextResponse.json(
        { error: 'Email already subscribed' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to subscribe to newsletter' },
      { status: 500 }
    );
  }
}

// GET endpoint to get subscriber stats
export async function GET() {
  try {
    let useDatabase = true;
    
    // Try to connect to database
    try {
      await connectDB();
    } catch (dbError) {
      console.warn('⚠️ MongoDB non disponibile per stats, usando dati in-memory');
      useDatabase = false;
    }

    if (useDatabase) {
      const totalSubscribers = await Subscriber.countDocuments({ isActive: true });
      const totalInactive = await Subscriber.countDocuments({ isActive: false });
      const recentSubscriptions = await Subscriber.countDocuments({
        isActive: true,
        subscribedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      });

      return NextResponse.json(
        { 
          totalSubscribers,
          totalInactive,
          recentSubscriptions,
          message: 'Newsletter service is active (MongoDB)',
          storage: 'database'
        },
        { status: 200 }
      );
    } else {
      const activeSubscribers = inMemorySubscribers.filter(s => s.isActive);
      const inactiveSubscribers = inMemorySubscribers.filter(s => !s.isActive);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentSubscriptions = activeSubscribers.filter(s => s.subscribedAt >= weekAgo);

      return NextResponse.json(
        { 
          totalSubscribers: activeSubscribers.length,
          totalInactive: inactiveSubscribers.length,
          recentSubscriptions: recentSubscriptions.length,
          message: 'Newsletter service is active (In-Memory)',
          storage: 'memory',
          note: 'Using in-memory storage for development. Configure MongoDB for production.'
        },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('Newsletter stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get newsletter stats' },
      { status: 500 }
    );
  }
}
