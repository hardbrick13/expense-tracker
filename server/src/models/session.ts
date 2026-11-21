import { Schema, model } from "mongoose";

// Only a hash of the session token is stored, so a DB leak can't be used to log in.
const sessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const Session = model("Session", sessionSchema);
