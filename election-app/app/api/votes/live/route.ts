import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vote from '@/models/Vote';

export async function GET() {
  await dbConnect();

  // Aggregate votes by Seat
  // We want to return data structure that Map can consume easily.
  // Group by SeatId.

  // For the demo, let's just fetch all votes and aggregte in memory
  // (Scale warning: this is bad for production but fine for demo with <10k records)
  const allVotes = await Vote.find({});

  const seatResults: Record<string, Record<string, number>> = {}; // seatId -> { party1: 0, party2: 0 ... }

  allVotes.forEach(vote => {
      const seatId = vote.seatId;
      if (!seatResults[seatId]) seatResults[seatId] = {};

      if (vote.counts) {
          // vote.counts is a Map in Mongoose, but might be object in JSON if not hydrated fully or if lean()
          // If it's a Map:
          if (vote.counts instanceof Map) {
             for (const [party, count] of vote.counts.entries()) {
                  seatResults[seatId][party] = (seatResults[seatId][party] || 0) + (count as number);
              }
          } else {
              // If it is a plain object
              for (const [party, count] of Object.entries(vote.counts)) {
                  seatResults[seatId][party] = (seatResults[seatId][party] || 0) + (count as number);
              }
          }
      }
  });

  return NextResponse.json({ success: true, data: seatResults });
}
