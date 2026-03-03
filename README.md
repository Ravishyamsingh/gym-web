# GymWeb — Premium Fitness Platform

## Quick Start

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (or local MongoDB)
- Firebase project with Authentication enabled

### Backend
```bash
cd server
npm install
# Copy .env.example → .env and fill in your values
npm run dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

See [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) for the full architectural spec.








Modify the current authentication UI and flow of the gym web application. On the registration page (as shown in the image), remove the “Next — Capture Face” button text completely. Replace it with a proper and standard authentication button label such as “Sign Up” (for registration page) or “Log In” (for login page). The login and signup pages must look clean and professional, showing only authentication-related elements. There should be no face capture wording visible during initial login or signup.

After a user successfully logs in or signs in (either via email/password or Google), they must be redirected to their personal dashboard. The Google login button must authenticate the user properly through the backend. If the user already exists in the database, log them in directly. If the user logs in with Google and does not exist in the database, create a new user record automatically and then log them in.

For first-time users (whether registered via email/password or Google), implement a post-login onboarding flow:

Redirect them to a face registration page.

Before allowing gym entry verification, require them to:

Select a membership plan.

Complete payment.

Register their face.

On the membership selection page:

Clearly display three membership plans:

1 Month – ₹500

6 Months – ₹2500

1 Year – ₹5000

For each membership option, show the plan details on the left.

On the right side of each plan, add a green “Pay Now” button.

Only one payment option per membership plan.

The UI must be clean, properly aligned, and responsive.

After successful payment:

Allow the user to proceed to face registration.

Store selected membership details in the database.

Save payment status.

Save the 128-length face descriptor after validation.

Mark the user as “membership active” and “face registered.”

Face verification for gym entry should only be available after:

Payment is successful.

Face is registered.

Ensure:

Proper backend validation for login, Google authentication, membership purchase, and face descriptor format.

Secure database storage.

Clean redirect logic.

No user can access the dashboard gym-entry feature without completing membership payment and face registration.

Proper route protection and middleware validation.

Maintain modular structure, clean UI, and secure authentication flow throughout the implementation.