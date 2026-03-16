Render deployment instructions for the server

Required environment variables (add these as Render Service Environment variables / Secrets)
- MONGO_URI: MongoDB Atlas connection string
- JWT_SECRET: long random secret for JWT
- FIREBASE_SERVICE_ACCOUNT_JSON: full Firebase service-account JSON (paste file contents). Alternatively set `FIREBASE_SERVICE_ACCOUNT_PATH` if you upload the file (not recommended).
- ADMIN_EMAIL or ADMIN_EMAILS: comma-separated admin emails
- CLIENT_URL: frontend origin (production URL)
- RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET: Razorpay API keys
- RAZORPAY_WEBHOOK_SECRET: webhook secret from Razorpay
- RAZORPAY_PAYMENT_MODE: `test` or `production`
- PAYMENT_GATEWAY_ENABLED: `true`/`false`
- RESEND_API_KEY and RESEND_FROM_EMAIL: (optional) for emails
- ATTENDANCE_OTP_TTL_MINUTES and ATTENDANCE_OTP_MAX_ATTEMPTS: optional tuning values

Notes and best practices
- Do NOT commit any secret files or `.env` to the repository. Use Render's Environment and Secrets UI.
- For Firebase on Render, set `FIREBASE_SERVICE_ACCOUNT_JSON` to the full JSON content. The server supports parsing this env var and will use it if present.
- Render provides a `PORT` env var; the server reads `process.env.PORT` so no change is needed.

Quick Render steps
1. Create a new Web Service on Render and connect your GitHub repo.
2. In the service settings either set the "Root Directory" to `/server` (recommended) or leave root and use the repository start command below.
3. Build command: `npm install --prefix server` (if using root) or `npm install` (if Root Directory = `server`).
4. Start command: `npm start --prefix server` (if using root) or `npm start` (if Root Directory = `server`). The server's `package.json` already exposes `start: node server.js`.
5. Add the env vars listed above in Render's dashboard (paste full JSON into `FIREBASE_SERVICE_ACCOUNT_JSON`).

Local testing
- Keep a local `.env` (not committed) for development. Use `npm run dev` in `server/` to run with `nodemon`.

Troubleshooting
- If Firebase fails to initialize, ensure `FIREBASE_SERVICE_ACCOUNT_JSON` is valid JSON.
- If DB connection fails, check `MONGO_URI` and Atlas network access.

Optional: `render.yaml`
You can add a `render.yaml` to define the service in code. If you want, I can scaffold a basic `render.yaml` that points to the `server` directory and sets start/build commands.

Contact
- Tell me if you want me to scaffold `render.yaml` or add a Dockerfile/Procfile for Render.
