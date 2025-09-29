import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Subscriber from '@/models/Subscriber';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Trova e disattiva il subscriber
    const subscriber = await Subscriber.findOneAndUpdate(
      { email: email.toLowerCase() },
      { 
        isActive: false,
        unsubscribedAt: new Date()
      },
      { new: true }
    );

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Email not found in our records' },
        { status: 404 }
      );
    }

    console.log(`📧 Unsubscribed: ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}
