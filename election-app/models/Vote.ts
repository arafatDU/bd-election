import mongoose from 'mongoose';

const VoteSchema = new mongoose.Schema({
  pollingCenterId: {
    type: String,
    required: true,
  },
  seatId: {
    type: String,
    required: true,
  },
  division: String,
  district: String,
  upazila: String,
  counts: {
    type: Map,
    of: Number, // markerName -> count
  },
  submittedBy: {
    type: String, // Agent Phone or ID
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

// We might want to aggregate these later
export default mongoose.models.Vote || mongoose.model('Vote', VoteSchema);
