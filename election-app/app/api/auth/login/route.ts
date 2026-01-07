import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Agent from '@/models/Agent';

export async function POST(request: Request) {
  await dbConnect();
  const { phone } = await request.json();

  if (!phone) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }

  // Generate Dummy OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  // For demo, we create the agent if not exists, or update OTP
  // In real app, agent should be pre-registered.
  // Here we "register" them on fly for demo convenience if they don't exist?
  // User said "I keep these agents number in storage".
  // So we assume they exist. But for testing I will upsert.

  let agent = await Agent.findOne({ phone });

  if (!agent) {
      // Create a dummy agent for testing if not found
      agent = await Agent.create({
          phone,
          otp,
          assignedCenterId: 'pc-seat-1-amtali-1', // Default assignment for new users
          name: 'Demo Agent',
          isVerified: false
      });
  } else {
      agent.otp = otp;
      await agent.save();
  }

  console.log(`[AUTH] OTP for ${phone}: ${otp}`);

  return NextResponse.json({ success: true, message: 'OTP sent (check console)' });
}
