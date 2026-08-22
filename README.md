# Full-Stack Authentication & Authorization System

A security-focused authentication and authorization backend built with **Node.js, Express, MongoDB, JWT, bcrypt, Zod, and Resend**.

This repository is a practice project for building a modern full-stack identity system from the backend up. The backend authentication, session management, authorization, and security-hardening foundations are being completed before the Next.js frontend is implemented.

> **Status:** Backend foundation and security hardening are in progress. Frontend implementation comes after backend testing.

## About

This project is designed to practice and demonstrate the core architecture behind a full-stack authentication and authorization system:

- Secure account signup and signin
- Email verification with OTP
- Short-lived access tokens
- HttpOnly refresh-token cookies
- Refresh-token rotation
- Server-side session management
- Logout and logout-all-devices
- Role-based access control (RBAC)
- Permission-based authorization
- Request validation with Zod
- Rate limiting for sensitive authentication endpoints
- Security headers and CORS configuration
- Centralized error handling

The goal is to build the backend deliberately, understand the security trade-offs, test the authentication flows, and then build a frontend on top of a stable API.

## Tech Stack

- **Node.js** — JavaScript runtime
- **Express 5** — HTTP API framework
- **MongoDB + Mongoose** — database and data modeling
- **JWT** — access and refresh token signing
- **bcryptjs** — password and refresh-token hashing
- **Zod** — request validation and normalization
- **Resend** — verification email delivery
- **cookie-parser** — HTTP cookie handling
- **Helmet** — security-related HTTP headers
- **CORS** — controlled cross-origin requests
- **express-rate-limit** — authentication endpoint rate limiting
- **Morgan** — development HTTP logging
- **dotenv** — environment configuration

## Current Architecture

```text
Client
  │
  ├── Access Token ────────────────┐
  │                                │
  └── Refresh Token (HttpOnly)     │
                                   ▼
                            Express API
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
              Rate Limiting                 Zod Validation
                    │                             │
                    └──────────────┬──────────────┘
                                   ▼
                             Auth Middleware
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
              Authentication              Authorization
                    │                    ┌────────┴────────┐
                    │                    │                 │
                    │                  Roles          Permissions
                    │
                    ▼
                 MongoDB
                    │
             User + Sessions
```

## Authentication Flow

### Signup

1. Request passes through rate limiting and Zod validation.
2. Username/email are normalized and validated.
3. Password is hashed with bcrypt.
4. User account is created.
5. Email verification OTP is generated and sent through Resend.
6. Verification is required before the account is considered verified.

### Email Verification

The user submits their email and six-digit OTP. The backend validates the request and verifies the OTP before marking the account as verified.

### Signin

1. Validate credentials.
2. Find the user.
3. Verify the password with bcrypt.
4. Create a server-side session.
5. Issue a short-lived access token.
6. Issue a refresh token in an HttpOnly cookie.

### Refresh Token

The refresh endpoint:

1. Reads the refresh token from the HttpOnly cookie.
2. Verifies the refresh JWT.
3. Finds the matching server-side session.
4. Checks revocation and expiration.
5. Compares the presented refresh token against the stored hash.
6. Rotates the refresh token.
7. Updates the existing session instead of creating a new session.
8. Updates session activity such as `lastUsedAt`.

The important property is:

```text
Login A → Session A
Login B → Session B
Refresh A → Session A (same session, new refresh token)
```

Refreshing a token does **not** create another session.

## Session Management

Sessions are stored server-side and include lifecycle information such as expiration, revocation, IP address, user-agent, and activity timestamps.

Current session capabilities include:

- Create a session on login
- List active sessions
- Revoke an individual session
- Logout from the current session
- Logout from all devices
- Track session activity
- Reject revoked or expired sessions
- Rotate refresh tokens without creating duplicate sessions

Revoked sessions are retained for server-side history rather than immediately deleted.

## Authorization

The project currently uses two authorization layers.

### Roles

Current roles:

```text
user
admin
```

Example:

```js
requireRole("admin")
```

### Permissions

Permissions are mapped to roles and checked through reusable middleware.

Current practice permissions include:

```text
profile.read
profile.update

users.read
users.create
users.update
users.delete
```

Example:

```js
requirePermission(PERMISSIONS.USERS_DELETE)
```

This separates the concepts clearly:

```text
Authentication → Who are you?
Role           → What type of user are you?
Permission     → What are you allowed to do?
```

Resource ownership is intentionally deferred for this practice project.

## Security Hardening

The backend currently includes:

- Helmet security headers
- Explicit CORS configuration
- HttpOnly refresh-token cookies
- Secure cookie settings for production
- SameSite cookie configuration
- JSON and URL-encoded request body limits
- Zod request validation
- Rate limiting for sensitive authentication endpoints
- Password hashing with bcrypt
- Hashed refresh tokens in the database
- Short-lived access tokens
- Refresh-token rotation
- Server-side session revocation
- Generic internal server-error responses
- Environment-variable based secrets

Redis-backed rate limiting is intentionally deferred until the project reaches the appropriate stage.

## API Endpoints

Base URL:

```text
/api/auth
```

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/signup` | Public | Create an account and start email verification |
| POST | `/signin` | Public | Sign in and create a session |
| POST | `/verify-email` | Public | Verify email with OTP |
| POST | `/resend-verification` | Public | Resend verification OTP |
| POST | `/refreshToken` | Refresh cookie | Rotate refresh/access tokens |
| POST | `/signout` | Public / refresh cookie | Revoke the current session |
| POST | `/signout-all` | Access token | Revoke all user sessions |
| GET | `/sessions` | Access token | List active sessions |
| DELETE | `/sessions/:sessionId` | Access token | Revoke one session |
| GET | `/me` | Access token | Get the authenticated user |

Admin/authorization routes are used for RBAC and permission testing.

## Token Strategy

### Access Token

Access tokens are short-lived and sent to protected API requests using:

```http
Authorization: Bearer <access-token>
```

The token contains only the information needed by the API for authentication/authorization, such as the user ID and role.

### Refresh Token

Refresh tokens are:

- Stored in an HttpOnly cookie
- Signed as JWTs
- Hashed before being stored in MongoDB
- Associated with a server-side session
- Rotated on refresh
- Rejected when the session is revoked or expired

The raw refresh token is not stored in the database.

## Validation

Request validation is handled before controllers using Zod.

Example flow:

```text
Request
  ↓
Rate limiter
  ↓
Zod validation
  ↓
Controller
  ↓
Database / service logic
```

Current authentication schemas cover:

- Signup
- Signin
- Email verification
- Resend verification

Validation for route parameters and query parameters will be expanded as the API grows.

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
│   │   └── session.model.js
│   ├── routes/
│   │   ├── admin.route.js
│   │   └── auth.route.js
│   ├── utils/
│   │   └── cookie.js
│   └── validators/
│       └── auth.validator.js
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## Environment Variables

Create a local `.env` file and never commit real secrets.

```env
PORT=3001
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=auth

ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-secret

ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

NODE_ENV=development
CLIENT_URL=http://localhost:3000

RESEND_API_KEY=replace-with-your-resend-api-key
RESEND_FROM_EMAIL=replace-with-your-verified-sender
```

Use strong, independent secrets for access and refresh tokens. Never commit `.env` or production credentials.

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Production

```bash
npm start
```

## Testing Strategy

Before the frontend is implemented, the backend will go through a dedicated security/testing pass covering:

- Authentication failures
- Expired access tokens
- Invalid access tokens
- Refresh-token rotation
- Refresh-token reuse
- Revoked sessions
- Session expiration
- Logout and logout-all
- RBAC failures
- Permission failures
- Invalid request payloads
- Rate-limit behavior
- Cookie and CORS behavior

The goal is to test both the happy path and the failure/security paths.

## Roadmap

### Phase 1 — Authentication Foundation

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
- [x] Active session listing
- [x] Individual session revocation

### Phase 2 — Authorization

- [x] Roles
- [x] RBAC middleware
- [x] Permissions
- [x] Permission middleware
- [x] Admin protected routes
- [x] Permission-aware route protection
- [ ] Resource ownership — intentionally deferred

### Phase 3 — Backend Security

- [x] Helmet
- [x] CORS
- [x] Secure cookies
- [x] Request body limits
- [x] Rate limiting
- [x] Zod validation
- [x] Generic internal error responses
- [ ] Security test suite
- [ ] Final environment/secrets review
- [ ] Production logging review

### Phase 4 — Frontend

Build the frontend after the backend API and security model are finalized.

Planned stack:

- Next.js
- TypeScript
- TanStack Query
- Modern component/UI system

Frontend areas:

- [ ] Signup
- [ ] Email verification
- [ ] Signin
- [ ] Authentication state
- [ ] Access-token handling
- [ ] Refresh-token flow
- [ ] Protected routes
- [ ] Session management UI
- [ ] Logout / logout all
- [ ] Role-aware UI
- [ ] Permission-aware UI

### Deferred Features

The following are intentionally out of scope for this practice phase:

- [ ] Forgot password
- [ ] Reset password
- [ ] Redis-backed rate limiting
- [ ] Resource ownership
- [ ] Advanced audit logging
- [ ] Two-factor authentication

These can be implemented later in a production-oriented project.

## Development Principle

This project is being built in stages to understand the security boundaries between authentication, sessions, authorization, account security, and frontend state management.

The backend is intentionally being hardened and tested **before** the frontend is built on top of it.

## Status

**Current phase: Backend security hardening and testing.**

After the security test pass, the project will move to the Next.js frontend and implement the full authentication flow using the finalized API.
