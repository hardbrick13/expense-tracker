# Expense Tracker

Personal expense tracker: React (Vite) client + Express + MongoDB server.

## First-time setup

```sh
npm run setup        # installs root, server and client dependencies
```

`server/.env` needs:

```
PORT=4000
MONGODB_URI=mongodb+srv://...
CLIENT_URL=http://localhost:5173

# Email delivery for login codes (optional in development, see below)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM="Expense Tracker <you@gmail.com>"

# Set to true only if you serve the app over HTTPS
COOKIE_SECURE=false
```

## Accounts & login

Login is passwordless: enter your email, receive a 6-digit code, enter it. The first login with
an email creates the account, and each email can only have one account.

- Codes expire after 10 minutes, are single-use, and are discarded after 5 wrong guesses.
  A new code can be requested once a minute.
- Sessions last 30 days (httpOnly cookie, stored hashed in MongoDB).
- **No SMTP configured?** The server prints the code to its console instead of emailing it,
  which is handy for development. For Gmail, create an
  [App Password](https://myaccount.google.com/apppasswords) and use it as `SMTP_PASS`.
- Entries created before accounts existed are given to the **first account that signs up**.
- **Deleting an account** (tap your initial at the top right, then Delete account) permanently
  removes the account and all of its entries. The app warns about this and asks you to type
  your email to confirm.

## Run it

| Command         | What it does                                                                 |
| --------------- | ---------------------------------------------------------------------------- |
| `npm run app`   | Build everything and start on port 4000 — the normal way to use it          |
| `npm start`     | Start without rebuilding (after `npm run build`)                             |
| `npm run dev`   | Development: server (port 4000) + Vite with hot reload (port 5173)           |

On startup the server prints the URLs, e.g.

```
🚀 Server running on http://localhost:4000
📱 On your phone (same Wi-Fi): http://192.168.0.78:4000
```

## Use it on your iPhone

1. Make sure the PC is running the app (`npm run app`) and the iPhone is on the same Wi-Fi.
2. Open **Safari** on the iPhone and go to the 📱 URL printed above.
3. Tap **Share → Add to Home Screen**. It now opens full-screen with its own icon, like an app.

If the phone can't connect: check Windows Firewall allows Node.js on your network, and that
the PC's IP hasn't changed (set a DHCP reservation in your router to keep it fixed).
