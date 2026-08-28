# Full-Stack Authentication & Authorization System

A security-focused full-stack authentication system built from the backend up and connected to a React frontend.

The project is designed as a practical authentication/authorization implementation using Node.js, Express, MongoDB, JWT, secure cookies, session management, email verification, rate limiting, and a TypeScript React frontend.

> **Status:** Backend authentication and security flows are implemented and tested. Frontend UI and API integration are currently being built incrementally.

## About

This project demonstrates the architecture and security concepts behind a modern authentication system:

- Account signup and signin
- Email verification with a six-digit OTP
- Short-lived access tokens
- HttpOnly refresh-token cookies
- Refresh-token rotation
- Hashed refresh tokens stored server-side
- Server-side session management
- Individual logout and logout-all-devices
- Session activity tracking
- Role-based access control (RBAC)
- Permission-based authorization
- Zod request validation
- Rate limiting for sensitive authentication endpoints
- Helmet security headers
- CORS configuration
- Centralized error handling
- React frontend with TypeScript
- TanStack Query for frontend server-state mutations
- React Router for frontend routing

The project is intentionally built in layers so the authentication and security behavior can be understood, tested, and then consumed by the frontend.

## Tech Stack

### Backend

- **Node.js** — JavaScript runtime
- **Express 5** — HTTP API framework
- **MongoDB + Mongoose** — database and data modeling
- **jsonwebtoken** — JWT access and refresh tokens
- **bcryptjs** — password and refresh-token hashing
- **Zod** — request validation and normalization
- **Resend** — verification email delivery
- **cookie-parser** — HTTP cookie handling
- **Helmet** — security headers
- **CORS** — controlled cross-origin requests
- **express-rate-limit** — rate limiting
- **Morgan** — HTTP request logging
- **dotenv** — environment configuration

### Frontend

- **React** — UI library
- **TypeScript** — type safety
- **Vite** — frontend tooling and development server
- **React Router** — client-side routing
- **TanStack Query** — server-state and API mutations
- **CSS** — component/page styling

### Testing

- **Jest** — test runner
- **Supertest** — HTTP API testing

## Architecture

```text
                         ┌─────────────────────┐
                         │     React Frontend   │
                         │ React + TypeScript   │
                         │ React Router         │
                         │ TanStack Query       │
                         └──────────┬──────────┘
                                    │
                                    │ HTTP / JSON
                                    ▼
                         ┌─────────────────────┐
                         │    Express API      │
                         ├─────────────────────┤
                         │ CORS                │
                         │ Helmet              │
                         │ Rate Limiting       │
                         │ Zod Validation      │
                         │ Auth Middleware      │
                         │ Role/Permission     │
                         └──────────┬──────────┘
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
                 ┌──────────────┐      ┌──────────────┐
                 │   MongoDB    │      │    Resend    │
                 │ Users        │      │ Email / OTP  │
                 │ Sessions     │      └──────────────┘
                 │ Verification │
                 └──────────────┘
```

## Authentication Flow

### 1. Signup

```text
Signup Form
    ↓
POST /api/auth/signup
    ↓
Validate request with Zod
    ↓
Create user + hash password
    ↓
Generate verification OTP
    ↓
Send OTP through Resend
    ↓
Return email to frontend
    ↓
Navigate to Verify Email
```

The frontend passes the returned email to the verification page using React Router state.

### 2. Email Verification

```text
Verify Email Form
    ↓
Enter 6-digit OTP
    ↓
POST /api/auth/verify-email
    ↓
Validate email + OTP
    ↓
Check verification record
    ↓
Mark user as verified
    ↓
Navigate to Login
```

A verification OTP is limited by expiration and verification-attempt rules on the backend.

The frontend also supports requesting a new verification code through:

```text
POST /api/auth/resend-verification
```

### 3. Signin

```text
Login Form
    ↓
POST /api/auth/signin
    ↓
Validate credentials
    ↓
Verify password
    ↓
Create server-side session
    ↓
Create access token
    ↓
Create refresh token
    ↓
Set refresh token as HttpOnly cookie
```

### 4. Refresh Token

The refresh-token flow is session-based rather than simply trusting a JWT by itself.

```text
Browser
   │
   │ HttpOnly refreshToken cookie
   ▼
POST /api/auth/refreshToken
   │
   ├── Verify refresh JWT
   ├── Find session
   ├── Check session state
   ├── Compare refresh token hash
   ├── Generate new access token
   ├── Generate new refresh token
   ├── Hash new refresh token
   └── Update existing session
             │
             ▼
        New tokens
```

The refresh token is rotated instead of creating another session.

```text
Login on Device A
        ↓
Session A
        ↓
Refresh
        ↓
Session A + new refresh token
```

A second login creates a separate session:

```text
Device A → Session A
Device B → Session B
```

This allows users to manage individual devices/sessions independently.

## Session Management

Sessions are stored in MongoDB and are associated with users.

The session system supports:

- Creating a session during signin
- Listing active sessions
- Tracking `lastUsedAt`
- Tracking IP/user-agent information
- Session expiration
- Individual session revocation
- Current-session logout
- Logout from all devices
- Rejecting revoked sessions
- Refresh-token rotation within the same session

Revoked sessions can remain stored for lifecycle/history purposes instead of being immediately deleted.

## Authorization

The backend includes role and permission concepts for protected routes.

Current role examples include:

```text
user
admin
```

Authorization is separated from authentication so that a successfully authenticated user can still be denied access to resources they are not authorized to use.

## Security Hardening

The backend includes:

- Password hashing with bcrypt
- Hashed refresh tokens in MongoDB
- HttpOnly refresh-token cookies
- Secure cookie configuration for production
- SameSite cookie configuration
- Short-lived access tokens
- Refresh-token rotation
- Server-side session revocation
- Helmet security headers
- Explicit CORS configuration
- Request body size limits
- Zod request validation
- Rate limiting for sensitive endpoints
- Generic internal server-error responses
- Environment-variable based secrets

Redis-backed distributed rate limiting is intentionally deferred.

## API Endpoints

Base URL:

```text
/api/auth
```

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| POST | `/signup` | Public | Create an account and send verification OTP |
| POST | `/signin` | Public | Authenticate and create a session |
| POST | `/verify-email` | Public | Verify email using OTP |
| POST | `/resend-verification` | Public | Send a new verification OTP |
| POST | `/refreshToken` | Refresh cookie | Refresh access token and rotate refresh token |
| POST | `/signout` | Refresh cookie | Revoke the current session |
| POST | `/signout-all` | Access token | Revoke all user sessions |
| GET | `/sessions` | Access token | List user sessions |
| DELETE | `/sessions/:sessionId` | Access token | Revoke a specific session |
| GET | `/me` | Access token | Get the authenticated user |

Authorization/admin endpoints are also present for role and permission-related functionality.

## Token Strategy

### Access Token

The access token is short-lived and is intended for authenticated API requests:

```http
Authorization: Bearer <access-token>
```

The access token contains the information required by the backend for authentication/authorization, including the user ID and role.

### Refresh Token

Refresh tokens are:

- JWTs
- Stored in an HttpOnly cookie
- Associated with a server-side session
- Hashed before database storage
- Rotated after successful refresh
- Rejected when invalid, expired, or associated with a revoked session

The raw refresh token is not stored in MongoDB.

## Validation

Authentication requests use Zod schemas before controller logic.

```text
Request
   ↓
Rate Limiter
   ↓
Zod Validation
   ↓
Controller
   ↓
Service / Database Logic
```

Current authentication validation covers signup, signin, email verification, and resend-verification requests.

## Frontend Architecture

The frontend lives inside the `frontend/` directory.

The current frontend follows a feature-oriented structure:

```text
frontend/
├── src/
│   ├── api/
│   │   └── apiClient.ts
│   ├── features/
│   │   └── auth/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── services/
│   ├── layouts/
│   ├── pages/
│   ├── routes/
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── ...
```

The frontend API flow is intentionally separated into layers:

```text
Component
    ↓
TanStack Query Hook
    ↓
Auth Service
    ↓
apiClient
    ↓
Express API
```

`apiClient.ts` is the generic HTTP layer. TanStack Query is used at the feature/hook layer for server-state mutations rather than inside the generic API client.

## Current Frontend Auth UI

The authentication UI currently includes:

- Signup page
- Login page UI
- Email verification page
- Auth layout
- Dashboard page UI
- Sessions page UI
- React Router navigation
- Signup API integration
- Email verification API integration
- Resend verification API integration
- API error display
- Loading states for authentication mutations

The frontend is being connected to the backend incrementally rather than implementing the entire API layer at once.

## Project Structure

```text
.
├── server.js
├── src/
│   ├── app.js
│   ├── constants/
│   │   └── permissions.js
│   ├── controllers/
│   │   ├── admin.controller.js
│   │   └── auth.controller.js
│   ├── db/
│   │   └── connectDB.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── permission.middleware.js
│   │   ├── rate-limit.middleware.js
│   │   ├── role.middleware.js
│   │   └── validate.middleware.js
│   ├── models/
│   │   ├── auth.model.js
│   │   ├── email-verification.model.js
│   │   └── session.model.js
│   ├── routes/
│   │   ├── admin.route.js
│   │   └── auth.route.js
│   ├── services/
│   │   ├── auth.service.js
│   │   └── email.service.js
│   ├── utils/
│   │   ├── cookie.js
│   │   └── otp.js
│   └── validators/
│       └── auth.validator.js
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── features/
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── routes/
│   ├── package.json
│   └── vite.config.ts
│
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## Environment Variables

### Backend

Create a local `.env` file and never commit real secrets.

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=auth

ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-secret

ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

NODE_ENV=development
CLIENT_URL=http://localhost:5173

RESEND_API_KEY=replace-with-your-resend-api-key
RESEND_FROM_EMAIL=replace-with-your-verified-sender
```

The frontend development server runs on Vite, while the Express API runs separately. `CLIENT_URL` must match the frontend origin used during local development.

Use different strong secrets for access and refresh tokens. Never commit `.env` or production credentials.

## Installation

Install backend dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

## Development

Start the backend:

```bash
npm run dev
```

Start the frontend in a separate terminal:

```bash
cd frontend
npm run dev
```

The local development setup is typically:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

## Testing

Backend tests use Jest and Supertest to exercise the API through HTTP requests.

Authentication tests cover both successful and failure/security paths, including:

- Signup
- Signin
- Email verification
- Refresh-token behavior
- Refresh-token rotation
- Invalid refresh tokens
- Invalid sessions
- Revoked sessions
- Session listing
- Individual session revocation
- Logout
- Logout from all devices
- Authentication failures

Run the full backend test suite with:

```bash
npm test
```

Run an individual authentication test file with:

```bash
npm test -- src/test/auth/signup.test.js
```

## Development Roadmap

### Backend

- [x] Express API structure
- [x] MongoDB/Mongoose
- [x] User model
- [x] Password hashing
- [x] Signup
- [x] Signin
- [x] Email verification with OTP
- [x] Access JWT
- [x] Refresh JWT
- [x] Refresh-token hashing
- [x] Refresh-token rotation
- [x] Server-side sessions
- [x] Session activity tracking
- [x] Logout
- [x] Logout all devices
- [x] Session listing
- [x] Individual session revocation
- [x] RBAC foundation
- [x] Permission middleware foundation
- [x] Rate limiting
- [x] Zod validation
- [x] Security middleware
- [x] Authentication test suite

### Frontend

- [x] React + TypeScript + Vite setup
- [x] React Router setup
- [x] Auth layout
- [x] Signup page UI
- [x] Login page UI
- [x] Email verification page UI
- [x] Dashboard UI foundation
- [x] Sessions UI foundation
- [x] Signup API integration
- [x] Email verification API integration
- [x] Resend verification integration
- [x] Authentication error/loading states
- [ ] Signin API integration
- [ ] Access-token authentication state
- [ ] Protected routes
- [ ] Refresh-token handling
- [ ] Session management integration
- [ ] Logout integration
- [ ] Logout-all integration
- [ ] Role-aware UI
- [ ] Permission-aware UI

### Deferred Features

These features are intentionally deferred for the current practice project:

- [ ] Forgot password
- [ ] Reset password
- [ ] Redis-backed distributed rate limiting
- [ ] Advanced audit logging
- [ ] Two-factor authentication
- [ ] Resource ownership/authorization rules beyond the current RBAC foundation

## Development Principle

The project is built in stages to make the security boundaries clear:

```text
Authentication
      ↓
Sessions
      ↓
Token Rotation
      ↓
Authorization
      ↓
Backend Testing
      ↓
Frontend UI
      ↓
Frontend API Integration
      ↓
Protected Application
```

The frontend is intentionally being connected to the backend one feature at a time. This keeps the API client, services, TanStack Query hooks, and UI components separated and easier to understand.

## Status

**Current phase: Frontend API integration.**

The backend authentication foundation and core session flows are implemented. The React frontend has been built and the signup/email-verification flows are now connected to the API. The next frontend work is signin, authentication state, protected routes, refresh-token handling, sessions, and logout.
