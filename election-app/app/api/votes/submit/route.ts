import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Vote from '@/models/Vote';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    // Validate body structure
    // { division, zilla, upazila, seat_name, polling_center_name, vote_status: { marker: count } }

    const vote = new Vote({
        pollingCenterId: body.polling_center_id, // We need ID to link easily
        seatId: body.seat_name, // Using seat_name as ID for now
        division: body.division,
        district: body.zilla,
        upazila: body.upazila,
        counts: body.vote_status,
        submittedBy: body.phone || 'anonymous',
    });

    await vote.save();

    return NextResponse.json({ success: true, message: 'Vote submitted successfully' });
  } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
