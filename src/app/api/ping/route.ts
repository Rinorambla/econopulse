import { NextRequest, NextResponse } from 'next/server';

// API SUPER LEGGERA - Solo per ping del server
export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      status: 'OK',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ method: 'POST', status: 'OK' });
}
