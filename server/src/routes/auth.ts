import { Router } from "express";
import crypto from "node:crypto";
import { User } from "../models/user.js";
import { Otp } from "../models/otp.js";
import { Session } from "../models/session.js";
import { Expense } from "../models/expense.js";
import { sendLoginCode } from "../lib/mailer.js";
import { clearSessionCookie, requireAuth, sha256, SESSION_COOKIE, startSession } from "../middleware/auth.js";
import { deleteAccountSchema, requestOtpSchema, verifyOtpSchema } from "../schemas/auth.js";

export const authRouter = Router();

const CODE_TTL_MS = 10 * 60 * 1000; // a code is valid for 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // at most one email per address per minute
const MAX_ATTEMPTS = 5; // wrong guesses allowed before the code is discarded

const hashCode = (email: string, code: string) => sha256(`${email}:${code}`);

function codesMatch(a: string, b: string) {
  return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// POST /api/auth/request-otp — emails a 6-digit code. Logging in and signing up are the same flow.
authRouter.post("/request-otp", async (req, res) => {
  const { email } = requestOtpSchema.parse(req.body);

  const existing = await Otp.findOne({ email });
  const waitMs = existing ? existing.sentAt.getTime() + RESEND_COOLDOWN_MS - Date.now() : 0;
  if (waitMs > 0) {
    const resendInSeconds = Math.ceil(waitMs / 1000);
    res.set("Retry-After", String(resendInSeconds));
    res.status(429).json({ error: `Please wait ${resendInSeconds}s before requesting another code`, resendInSeconds });
    return;
  }

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const now = new Date();
  await Otp.findOneAndUpdate(
    { email },
    {
      codeHash: hashCode(email, code),
      attempts: 0,
      sentAt: now,
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    },
    { upsert: true },
  );

  try {
    await sendLoginCode(email, code);
  } catch (err) {
    await Otp.deleteOne({ email });
    console.error("Failed to send login code:", err);
    res.status(502).json({ error: "Couldn't send the email. Please try again." });
    return;
  }
  // Relative seconds (not a timestamp) so the client's countdown doesn't depend on its clock matching ours.
  res.json({ ok: true, resendInSeconds: RESEND_COOLDOWN_MS / 1000 });
});

// POST /api/auth/verify-otp — checks the code, creates the account on first login, starts a session.
authRouter.post("/verify-otp", async (req, res) => {
  const { email, code } = verifyOtpSchema.parse(req.body);

  const otp = await Otp.findOne({ email, expiresAt: { $gt: new Date() } });
  if (!otp) {
    res.status(400).json({ error: "That code has expired. Request a new one." });
    return;
  }
  if (!codesMatch(otp.codeHash, hashCode(email, code))) {
    otp.attempts += 1;
    if (otp.attempts >= MAX_ATTEMPTS) {
      await otp.deleteOne();
      res.status(400).json({ error: "Too many wrong attempts. Request a new code." });
    } else {
      await otp.save();
      res.status(400).json({ error: "Incorrect code" });
    }
    return;
  }
  // Single use: only the request that actually deletes the code may continue.
  const consumed = await Otp.deleteOne({ _id: otp._id });
  if (consumed.deletedCount === 0) {
    res.status(400).json({ error: "That code has already been used. Request a new one." });
    return;
  }

  let user = await User.findOne({ email });
  if (!user) {
    const isFirstUser = (await User.countDocuments()) === 0;
    try {
      user = await User.create({ email });
    } catch (err) {
      // Unique index: if another request created this email's account first, use that one.
      if ((err as { code?: number }).code !== 11000) throw err;
      user = await User.findOne({ email });
      if (!user) throw err;
    }
    // Entries saved before accounts existed belong to whoever signs up first.
    if (isFirstUser) {
      await Expense.updateMany({ userId: { $exists: false } }, { $set: { userId: user._id } });
    }
  }

  await startSession(res, user.id);
  res.json({ email: user.email });
});

// GET /api/auth/me — who is logged in (401 if nobody)
authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    clearSessionCookie(res);
    res.status(401).json({ error: "Please log in" });
    return;
  }
  res.json({ email: user.email });
});

// POST /api/auth/logout
authRouter.post("/logout", async (req, res) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === "string") await Session.deleteOne({ tokenHash: sha256(token) });
  clearSessionCookie(res);
  res.status(204).end();
});

// DELETE /api/auth/account — permanently removes the account and all of its entries.
// The client must send the account's email back as confirmation.
authRouter.delete("/account", requireAuth, async (req, res) => {
  const { email } = deleteAccountSchema.parse(req.body);
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  if (user.email !== email) {
    res.status(400).json({ error: "The email doesn't match this account" });
    return;
  }

  await Expense.deleteMany({ userId: user._id });
  await Session.deleteMany({ userId: user._id });
  await Otp.deleteOne({ email: user.email });
  await user.deleteOne();

  clearSessionCookie(res);
  res.status(204).end();
});
