# Expense Tracker

Personal expense tracker: React (Vite) client + Express + MongoDB server.

## First-time setup

```sh
npm run setup        # installs root, server and client dependencies
```

Then set up a database (next section) and create `server/.env` with:

```
PORT=4000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/expense-tracker?retryWrites=true&w=majority
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

`server/.env` is git-ignored. Never commit it, because it holds your database and email passwords.
Restart the server after changing it: `npm run dev` reloads on code changes, but not on `.env` changes.

## Database setup

The app uses MongoDB. You don't need to create collections, tables or a schema: the server
creates the database, collections (`users`, `expenses`, `sessions`, `otps`) and indexes
automatically the first time it runs.

### Option A: MongoDB Atlas (free cloud database, recommended)

1. Sign up at [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register).
2. **Create a cluster.** Choose the free **M0** tier and pick the region closest to you
   (e.g. AWS / Sydney `ap-southeast-2`).
3. **Create a database user.** Go to **Security → Database Access → Add New Database User**,
   choose *Password* authentication, and give it the **Read and write to any database** role.
   Avoid special characters like `@ : / ? # %` in the password; if you do use them, they must be
   [URL-encoded](https://www.mongodb.com/docs/manual/reference/connection-string/#std-label-connections-standard-connection-string-format)
   in the connection string.
4. **Allow your network.** Go to **Security → Network Access → Add IP Address**:
   - **Add Current IP Address** is the safest option. If your home IP changes later, the server will
     fail to connect until you add the new one.
   - Alternatively, `0.0.0.0/0` allows any IP. It's more convenient, but your password is then the only protection.
5. **Get the connection string.** Go to **Database → Connect → Drivers → Node.js** and copy the string.
   It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```
6. Paste it as `MONGODB_URI` in `server/.env`. Replace `<password>` with your real password, and
   add the database name `expense-tracker` after `.mongodb.net/`:
   ```
   MONGODB_URI=mongodb+srv://me:s3cret@cluster0.abcde.mongodb.net/expense-tracker?retryWrites=true&w=majority
   ```
   Without a database name, MongoDB stores everything in a database called `test`.

### Option B: MongoDB on your own PC

1. Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) and keep
   "Install MongoDB as a Service" ticked, so it starts automatically with Windows.
2. In `server/.env`:
   ```
   MONGODB_URI=mongodb://127.0.0.1:27017/expense-tracker
   ```

Your data then lives only on this PC, so back it up yourself
(e.g. with [`mongodump`](https://www.mongodb.com/docs/database-tools/mongodump/)).

### Check that it works

Run `npm run dev` (or `npm run app`). You should see:

```
✅ Connected to MongoDB
```

If it fails instead:

| Error contains                                   | Fix                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| `MONGODB_URI is missing from .env`               | `server/.env` doesn't exist or has a typo in the variable name            |
| `bad auth` / `Authentication failed`             | Wrong username or password in the URI (or special characters not encoded) |
| `Could not connect to any servers` / timeout     | Atlas: your current IP isn't in **Network Access**                        |
| `ECONNREFUSED 127.0.0.1:27017`                   | Local MongoDB isn't running. Start the "MongoDB" service in Windows Services |
| `querySrv ENOTFOUND`                             | Cluster address is wrong, or your network/DNS blocks `mongodb+srv` lookups |

To browse your data, use [MongoDB Compass](https://www.mongodb.com/products/compass) (paste the
same connection string) or **Browse Collections** in Atlas.

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
