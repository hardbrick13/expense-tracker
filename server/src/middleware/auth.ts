import type { CookieOptions, RequestHandler, Response } from "express";
import crypto from "node:crypto";
import { Session } from "../models/session.js";

export const SESSION_COOKIE = "session";
const SESSION_DAYS = 30;

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  // Set COOKIE_SECURE=true when the app is served over HTTPS.
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
};

export async function startSession(res: Response, userId: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await Session.create({ userId, tokenHash: sha256(token), expiresAt });
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, expires: expiresAt });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

/** Rejects the request with 401 unless it carries a valid session cookie. */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token === "string" && token) {
    const session = await Session.findOne({ tokenHash: sha256(token), expiresAt: { $gt: new Date() } });
    if (session) {
      req.userId = session.userId.toString();
      next();
      return;
    }
  }
  res.status(401).json({ error: "Please log in" });
};
