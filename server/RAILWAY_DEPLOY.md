Railway deployment instructions for the server

Required environment variables
- MONGO_URI: MongoDB connection string (Atlas)
- PORT: (optional) Railway provides a `PORT` env; leave unset or use default
- NODE_ENV: production
- JWT_SECRET: long random secret for JWT
- FIREBASE_SERVICE_ACCOUNT_JSON: JSON content of Firebase service account key (use Railway secret). Alternatively, set FIREBASE_SERVICE_ACCOUNT_PATH if you upload the file (not recommended).
- ADMIN_EMAIL or ADMIN_EMAILS: comma-separated admin emails
- CLIENT_URL: frontend origin (e.g., https://your-frontend.example)
- RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET: Razorpay API keys
- RAZORPAY_WEBHOOK_SECRET: webhook secret from Razorpay
- RAZORPAY_PAYMENT_MODE: test or production
- PAYMENT_GATEWAY_ENABLED: true/false
- RESEND_API_KEY and RESEND_FROM_EMAIL: (optional) for emails
- ATTENDANCE_OTP_TTL_MINUTES and ATTENDANCE_OTP_MAX_ATTEMPTS: optional settings

Notes and best practices
- Do NOT commit any secret files or `.env` to the repository. Use Railway's Environment/Secrets UI.
- For Firebase, set `FIREBASE_SERVICE_ACCOUNT_JSON` to the full JSON content (stringified). The server supports parsing this env var and will use it if present.
- Railway injects `PORT`; the server reads `process.env.PORT` so no change is needed.

Quick Railway steps
1. Create a new Railway project and add a new "Service" -> "Deploy from GitHub".
2. Connect your repo and choose the branch.
3. In the service settings set the root to `/server` (so Railway runs `npm install` in that folder).
4. In Railway Settings -> Variables, add the env vars listed above (copy from `server/.env.example`).
   - For `FIREBASE_SERVICE_ACCOUNT_JSON` paste the entire JSON file content as the value.
5. Deploy; Railway will run `npm install` then `npm start` which runs `node server.js`.

Local testing
- Keep a local `.env` (not committed) for development. Use `npm run dev` in `server/` to run with `nodemon`.

Security
- Rotate keys/secrets when moving from test to production.
- Use strong `JWT_SECRET` and keep it secret.

Troubleshooting
- If Firebase fails to initialize, ensure `FIREBASE_SERVICE_ACCOUNT_JSON` is valid JSON.
- If DB connection fails, check `MONGO_URI` and IP/network access for Atlas.

Contact
- If you want, I can also add a `Procfile` or CI config for automated deployments. Let me know.