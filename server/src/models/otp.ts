import { Schema, model } from "mongoose";

// One pending code per email. MongoDB's TTL index removes it once it expires.
const otpSchema = new Schema({
  email: { type: String, required: true, unique: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  sentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const Otp = model("Otp", otpSchema);
