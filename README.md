# Full-Stack Authentication & Authorization System

A security-focused full-stack authentication system built from the backend up and connected to a React frontend.

The project demonstrates a modern authentication architecture using Node.js, Express, MongoDB, JWT, secure HTTP-only cookies, refresh-token rotation, server-side sessions, email verification, rate limiting, and a TypeScript React frontend.

> **Status:** Core backend authentication and session flows are implemented and tested. The React frontend is now connected to the authentication API.

## Features

### Authentication

- User signup
- User signin
- Email verification with six-digit OTP
- Resend verification OTP
- Password hashing with bcrypt
- Short-lived access tokens
- Refresh tokens stored in HTTP-only cookies
- Refresh-token rotation
- Refresh-token hashing
- Server-side session management
- Individual session revocation
- Logout current device
- Logout all devices
- Authenticated `/me` endpoint

### Security

- JWT authentication
- HTTP-only refresh-token cookies
- Refresh-token rotation
- Server-side refresh-token hashes
- Session expiration
- Session revocation
- Refresh-token reuse detection
- Zod request validation
- Authentication rate limiting
- Helmet security headers
- CORS configuration
- Request body size limits
- Centralized error handling
- Environment-based secrets

### Frontend

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Auth layout
- Signup page
- Login page
- Email verification page
- Dashboard
- Sessions management
- Protected routes
- Access-token state management
- Automatic access-token refresh
- Logout
- Logout all devices
- API error handling
- Loading states

### Testing

- Jest
- Supertest
- Authentication and session test coverage

## Tech Stack

### Backend

- **Node.js** — JavaScript runtime
- **Express 5** — HTTP API framework
- **MongoDB + Mongoose** — database and data modeling
- **jsonwebtoken** — JWT authentication
- **bcryptjs** — password and token hashing
- **Zod** — request validation
- **Resend** — email delivery
- **cookie-parser** — cookie handling
- **Helmet** — security headers
- **CORS** — cross-origin request configuration
- **express-rate-limit** — rate limiting
- **Morgan** — HTTP request logging
- **dotenv** — environment configuration

### Frontend

- **React** — UI library
- **TypeScript** — type safety
- **Vite** — development tooling
- **React Router** — client-side routing
- **TanStack Query** — server-state management
- **CSS** — styling

### Testing

- **Jest** — test runner
- **Supertest** — HTTP API testing

## Architecture

```text
                         ┌──────────────────────────┐
                         │      React Frontend      │
                         │                          │
                         │ React + TypeScript       │
                         │ React Router             │
                         │ TanStack Query           │
                         └────────────┬─────────────┘
                                      │
                              HTTP / JSON / Cookies
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │       Express API        │
                         │                          │
                         │ CORS                     │
                         │ Helmet                   │
                         │ Rate Limiting            │
                         │ Zod Validation           │
                         │ Authentication           │
                         │ Authorization            │
                         └────────────┬─────────────┘
                                      │
                         ┌────────────┴────────────┐
                         ▼                         ▼
                 ┌───────────────┐         ┌──────────────┐
                 │    MongoDB    │         │    Resend    │
                 │               │         │              │
                 │ Users         │         │ Email / OTP  │
                 │ Sessions      │         │              │
                 │ Verification  │         └──────────────┘
                 └───────────────┘
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
Create user
     ↓
Hash password
     ↓
Generate verification OTP
     ↓
Send OTP through Resend
     ↓
Return response
     ↓
Frontend navigates to Verify Email
```

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
Frontend navigates to Login
```

A new OTP can be requested through:

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
Generate access token
     ↓
Generate refresh token
     ↓
Hash refresh token
     ↓
Set refresh token as HTTP-only cookie
     ↓
Return access token + user
```

## Token Strategy

### Access Token

The access token is short-lived and is used for protected API requests.

```http
Authorization: Bearer <access-token>
```

The frontend keeps the access token in memory rather than localStorage.

### Refresh Token

The refresh token:

- Is a JWT
- Is stored in an HTTP-only cookie
- Is associated with a server-side session
- Is hashed before being stored in MongoDB
- Is rotated after successful refresh
- Is rejected when invalid
- Is rejected when expired
- Is rejected when the session is revoked
- Triggers reuse detection when an old rotated token is used

The raw refresh token is never stored in MongoDB.

## Refresh Token Rotation

```text
Browser
   │
   │ HTTP-only refreshToken cookie
   ▼
POST /api/auth/refreshToken
   │
   ├── Verify refresh JWT
   ├── Find session
   ├── Check session status
   ├── Compare token hash
   ├── Generate new access token
   ├── Generate new refresh token
   ├── Hash new refresh token
   ├── Update existing session
   └── Set new refresh cookie
```

A successful refresh keeps the same server-side session while rotating the refresh token.

```text
Device A → Session A → Refresh → Session A + new refresh token
Device B → Session B
```

## Frontend Token Lifecycle

The frontend uses a single refresh mechanism through `apiClient.ts`.

```text
                    ┌─────────────────┐
                    │   React App     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   apiClient     │
                    └────────┬────────┘
                             │
                       Access Token
                             │
                             ▼
                    Protected API
                             │
                    ┌────────┴────────┐
                    │                 │
                   200               401
                    │                 │
                    │                 ▼
                    │          Refresh Token
                    │                 │
                    │                 ▼
                    │          New Access Token
                    │                 │
                    │                 ▼
                    │          Retry Request
                    │
                    ▼
                  Response
```

Concurrent refresh requests are coordinated so multiple requests do not unnecessarily perform independent refresh operations.

## Browser Refresh

Because the access token is stored only in memory, refreshing the browser clears it. The application restores authentication using the HTTP-only refresh token.

```text
Browser Refresh
      ↓
Access Token = null
      ↓
AuthProvider starts
      ↓
POST /api/auth/refreshToken
      ↓
Backend validates refresh token
      ↓
New access token
      ↓
Store access token in memory
      ↓
Protected routes become available
```

## Protected Routes

Authenticated pages are protected using React Router.

Current protected routes include:

```text
/dashboard
/sessions
```

The frontend waits for authentication restoration before deciding whether the user should be redirected.

```text
ProtectedRoute
      ↓
isLoading?
   ├── yes → Loading
   └── no
       ↓
isAuthenticated?
   ├── yes → Render page
   └── no  → /login
```

## User Information

The authenticated user can be retrieved through:

```text
GET /api/auth/me
```

The frontend uses TanStack Query for this server state.

```text
Dashboard
    ↓
useGetMe()
    ↓
TanStack Query
    ↓
GET /api/auth/me
    ↓
User
```

The response provides information such as `id`, `username`, and `email`.

## Session Management

Sessions are stored in MongoDB and associated with users.

The session system supports:

- Creating sessions during signin
- Listing sessions
- Session expiration
- Session activity tracking
- IP address information
- User-agent information
- Individual session revocation
- Current-session logout
- Logout from all devices
- Refresh-token rotation
- Revoked-session detection
- Refresh-token reuse detection

The frontend Sessions page lets users view active sessions and revoke an individual session.

## Logout

### Logout Current Device

```text
POST /api/auth/signout
```

Flow:

```text
User clicks Sign out
       ↓
POST /auth/signout
       ↓
Current session revoked
       ↓
Clear access token
       ↓
Clear authenticated state
       ↓
Navigate to /login
```

### Logout All Devices

```text
POST /api/auth/signout-all
```

Flow:

```text
User clicks Sign out all devices
       ↓
POST /auth/signout-all
       ↓
All active sessions revoked
       ↓
Clear access token
       ↓
Clear authenticated state
       ↓
Navigate to /login
```

## Session API

The frontend connects to:

```http
GET /api/auth/sessions
```

to retrieve active sessions.

Individual sessions can be revoked through:

```http
DELETE /api/auth/sessions/:sessionId
```

After a session is revoked, the frontend invalidates the sessions query so the UI reflects the latest server state.

## API Endpoints

Base URL:

```text
/api/auth
```

| Method | Endpoint | Authentication | Purpose |
|---|---|---|---|
| POST | `/signup` | Public | Create account and send verification OTP |
| POST | `/signin` | Public | Authenticate user and create session |
| POST | `/verify-email` | Public | Verify email using OTP |
| POST | `/resend-verification` | Public | Send a new verification OTP |
| POST | `/refreshToken` | Refresh cookie | Refresh access token and rotate refresh token |
| POST | `/signout` | Refresh cookie | Revoke the current session |
| POST | `/signout-all` | Access token | Revoke all active sessions |
| GET | `/sessions` | Access token | List user sessions |
| DELETE | `/sessions/:sessionId` | Access token | Revoke a specific session |
| GET | `/me` | Access token | Get authenticated user |

## Validation

Authentication requests use Zod schemas before reaching controller logic.

```text
Request
   ↓
Rate Limiter
   ↓
Zod Validation
   ↓
Controller
   ↓
Service
   ↓
MongoDB
```

Validation covers signup, signin, email verification, and resend-verification requests.

## Security Hardening

The backend includes:

- bcrypt password hashing
- Refresh-token hashing
- HTTP-only refresh cookies
- Short-lived access tokens
- Refresh-token rotation
- Refresh-token reuse detection
- Server-side session management
- Session revocation
- Helmet
- CORS
- Rate limiting
- Zod validation
- Request body limits
- Generic internal server errors
- Environment-based secrets

Redis-backed distributed rate limiting is intentionally deferred.

## Frontend Architecture

The frontend lives inside `frontend/`.

```text
frontend/
├── src/
│   ├── api/
│   │   ├── apiClient.ts
│   │   └── tokenStore.ts
│   │
│   ├── features/
│   │   └── auth/
│   │       ├── components/
│   │       ├── context/
│   │       ├── hooks/
│   │       └── services/
│   │
│   ├── layouts/
│   ├── pages/
│   ├── routes/
│   ├── App.tsx
│   └── main.tsx
│
├── package.json
├── tsconfig.json
└── vite.config.ts
```

The frontend follows this separation:

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

`apiClient` is responsible for HTTP concerns such as fetch, headers, cookies, authorization, token refresh, and API errors. TanStack Query manages server state such as caching, loading, mutations, refetching, and query invalidation.

## Current Frontend Pages

```text
/login
/signup
/verify-email
/dashboard
/sessions
```

Public pages:

```text
/login
/signup
/verify-email
```

Protected pages:

```text
/dashboard
/sessions
```

## Installation

### Backend

```bash
npm install
```

### Frontend

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

Local development:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

## Environment Variables

Create a local `.env` file for the backend.

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

Never commit real secrets to Git.

## Testing

Backend API tests use Jest and Supertest.

The authentication test suite covers successful and failure/security scenarios including:

- Signup
- Signin
- Email verification
- Resend verification
- Refresh-token rotation
- Invalid refresh tokens
- Invalid sessions
- Revoked sessions
- Session listing
- Individual session revocation
- Signout
- Signout all devices
- Authentication failures
- Rate limiting behavior

Run all tests:

```bash
npm test
```

Run an individual test:

```bash
npm test -- src/test/auth/signup.test.js
```

## Project Structure

```text
.
├── server.js
├── src/
│   ├── app.js
│   ├── constants/
│   ├── controllers/
│   ├── db/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── test/
│   ├── utils/
│   └── validators/
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

## Development Roadmap

### Backend

- [x] Express API structure
- [x] MongoDB/Mongoose
- [x] User model
- [x] Password hashing
- [x] Signup
- [x] Signin
- [x] Email verification
- [x] OTP generation
- [x] Resend verification
- [x] Access JWT
- [x] Refresh JWT
- [x] Refresh-token hashing
- [x] Refresh-token rotation
- [x] Refresh-token reuse detection
- [x] Server-side sessions
- [x] Session activity tracking
- [x] Session listing
- [x] Individual session revocation
- [x] Logout
- [x] Logout all devices
- [x] `/auth/me`
- [x] RBAC foundation
- [x] Permission middleware foundation
- [x] Rate limiting
- [x] Zod validation
- [x] Helmet
- [x] CORS
- [x] Authentication test suite

### Frontend

- [x] React + TypeScript + Vite
- [x] React Router
- [x] Auth layout
- [x] Signup page
- [x] Login page
- [x] Email verification page
- [x] Dashboard
- [x] Sessions page
- [x] Signup API integration
- [x] Signin API integration
- [x] Email verification API integration
- [x] Resend verification integration
- [x] API error handling
- [x] Loading states
- [x] Access-token state management
- [x] HTTP-only refresh-token integration
- [x] Automatic access-token refresh
- [x] Protected routes
- [x] `/auth/me` integration
- [x] Signout integration
- [x] Signout-all integration
- [x] Sessions API integration
- [x] Individual session revocation

## Development Principle

The project is intentionally built in layers:

```text
Authentication
      ↓
Email Verification
      ↓
Sessions
      ↓
Access + Refresh Tokens
      ↓
Refresh Token Rotation
      ↓
Logout
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

The frontend separates UI, API services, TanStack Query hooks, authentication state, and the generic API client. This keeps security boundaries clear and makes the authentication system easier to understand, test, and extend.

## Current Status

**Current phase: Full-stack authentication integration.**

The backend authentication system, refresh-token rotation, session management, logout flows, and security tests are implemented.

The React frontend now provides:

```text
Signup
   ↓
Email Verification
   ↓
Login
   ↓
Access Token
   ↓
Protected Dashboard
   ↓
GET /auth/me
   ↓
Sessions
   ↓
Individual Session Revocation
   ↓
Logout
   ↓
Logout All Devices
```

The core authentication flow is now connected end-to-end between the React frontend and Express backend.