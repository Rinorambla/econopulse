import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Subscriber from '@/models/Subscriber';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const subscriber = await Subscriber.findOne(
      { email: email.toLowerCase() },
      'email isActive preferences subscribedAt lastEmailSent'
    );

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Email not found in our records' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      subscriber: {
        email: subscriber.email,
        isActive: subscriber.isActive,
        preferences: subscriber.preferences,
        subscribedAt: subscriber.subscribedAt,
        lastEmailSent: subscriber.lastEmailSent
      }
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { email, preferences } = await request.json();

    if (!email || !preferences) {
      return NextResponse.json(
        { error: 'Email and preferences are required' },
        { status: 400 }
      );
    }

    const subscriber = await Subscriber.findOneAndUpdate(
      { email: email.toLowerCase() },
      { 
        preferences,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Email not found in our records' },
        { status: 404 }
      );
    }

    console.log(`⚙️ Updated preferences for: ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: subscriber.preferences
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
