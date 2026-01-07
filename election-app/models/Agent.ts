import mongoose from 'mongoose';

const AgentSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  otp: {
    type: String,
    required: false, // In real app, this should be hashed and temporary
  },
  assignedCenterId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });

export default mongoose.models.Agent || mongoose.model('Agent', AgentSchema);
