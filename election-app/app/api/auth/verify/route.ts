import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Agent from '@/models/Agent';

export async function POST(request: Request) {
  await dbConnect();
  const { phone, otp } = await request.json();

  const agent = await Agent.findOne({ phone });

  if (!agent || agent.otp !== otp) {
    return NextResponse.json({ error: 'Invalid OTP or Phone' }, { status: 401 });
  }

  // Clear OTP after successful login
  agent.otp = undefined; // or keep it valid for session? let's clear it
  agent.isVerified = true;
  await agent.save();

  // Return user info
  return NextResponse.json({
      success: true,
      token: 'dummy-jwt-token', // In real app use JWT
      agent: {
          phone: agent.phone,
          name: agent.name,
          assignedCenterId: agent.assignedCenterId
      }
  });
}
