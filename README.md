# Full-Stack Authentication & Authorization System

A security-focused authentication and authorization backend built with **Node.js, Express, MongoDB, JWT, and bcrypt**.

This repository is being developed as a complete full-stack identity system. The current phase focuses on the backend authentication foundation; a frontend client and a more complete authorization layer will be implemented next.

## Current Stack

- **Node.js** — JavaScript runtime
- **Express 5** — HTTP API framework
- **MongoDB + Mongoose** — persistence and data modeling
- **JWT** — short-lived access tokens and refresh tokens
- **bcryptjs** — password and refresh-token hashing
- **cookie-parser** — HTTP cookie handling
- **morgan** — development HTTP logging
- **dotenv** — environment configuration

## Project Structure

```text
.
├── server.js
├── src/
│   ├── app.js
│   ├── controllers/
│   │   └── auth.controller.js
│   ├── db/
│   │   └── connectDB.js
│   ├── middlewares/
│   │   └── auth.middleware.js
│   ├── models/
│   │   ├── auth.model.js
│   │   └── session.model.js
│   └── routes/
│       └── auth.route.js
├── .gitignore
├── package.json
└── package-lock.json
```

## Authentication Flow

The current backend implements the following core flow:

1. **Signup**
   - Validates required fields.
   - Checks for an existing username/email.
   - Hashes the password with bcrypt.
   - Creates the user.
   - Creates a server-side session record.
   - Issues a short-lived access token and a refresh token.

2. **Signin**
   - Looks up the user by username or email.
   - Verifies the password with bcrypt.
   - Creates a new session.
   - Issues access and refresh tokens.

3. **Refresh Token**
   - Reads the refresh token from an HttpOnly cookie.
   - Verifies the JWT.
   - Looks up the corresponding session.
   - Checks revocation and expiration.
   - Compares the presented token with the stored hash.
   - Rotates the refresh token and creates a new session.

4. **Signout**
   - Attempts to identify and revoke the current refresh-token session.
   - Clears the refresh-token cookie.

5. **Protected User Endpoint**
   - `GET /api/auth/me` requires a valid access token.
   - The authenticated user is attached to `req.user` by the authentication middleware.

## API Endpoints

Base URL:

```text
/api/auth
```

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/signup` | Public | Create an account |
| POST | `/signin` | Public | Sign in |
| POST | `/signout` | Public | Revoke the refresh-token session |
| POST | `/refreshToken` | Refresh cookie | Rotate refresh/access tokens |
| GET | `/me` | Access token | Get the authenticated user |

### Access Token

The protected middleware currently accepts an access token from:

```text
Authorization: Bearer <access-token>
```

It also contains support for an `accessToken` cookie, although the current controller does not set that cookie. This should be standardized before the frontend is implemented.

## Environment Variables

Create a `.env` file locally. Never commit secrets.

```env
PORT=3001
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=auth
ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-secret
NODE_ENV=development
```

Use strong, independent secrets for access and refresh tokens in production.

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

## Security Model — Current State

The project already has several good foundations:

- Passwords are hashed instead of stored as plaintext.
- Refresh tokens are hashed before being persisted.
- Refresh tokens are stored in an HttpOnly cookie.
- Access tokens are short-lived (`15m`).
- Refresh tokens are short-lived (`7d`) and rotated.
- Sessions have revocation and expiration fields.
- Session records retain IP address and user-agent information.
- Protected routes verify JWT signatures before loading the user.

However, this is **not yet production-ready**. The issues below should be addressed before treating this as a complete authentication/authorization system.

## Important Issues Found During Initial Review

### 1. Logout cookie path is incorrect — high priority

The refresh cookie is created with:

```text
/api/auth/refreshToken
```

but `signout()` attempts to clear it using:

```text
/api/auth/refresh
```

These paths do not match, so the browser may keep the refresh cookie after logout.

**Fix:** use exactly the same cookie options/path when clearing the cookie as when setting it.

### 2. Access-token cookie is inconsistent

The authentication middleware checks both an `accessToken` cookie and an `Authorization` header, but signup/signin only return the access token in JSON. No `accessToken` cookie is created.

**Fix:** choose one clear strategy. For a browser-based frontend, we should decide whether the access token lives in memory or a secure cookie and design the API around that choice.

### 3. Authorization is not implemented yet

The project currently provides **authentication**, but not a real authorization system. There are no roles, permissions, resource ownership checks, or policy middleware.

This is important because authentication answers **"Who are you?"**, while authorization answers **"What are you allowed to do?"**

The next backend phase should introduce roles/permissions and reusable authorization middleware.

### 4. Request validation is too weak

Signup currently checks whether fields exist, but does not robustly validate username format, email normalization, password strength, length limits, or unexpected input.

**Recommended direction:** add a schema validation layer such as Zod/Joi/express-validator and normalize emails/usernames consistently.

### 5. Authentication error responses reveal account state

Responses such as `User is not registered` and `Invalid password` allow an attacker to distinguish existing accounts from non-existing accounts.

**Recommended direction:** return a generic authentication failure message for login failures.

### 6. Refresh-token reuse detection is incomplete

Refresh-token rotation is implemented, which is good. However, if a previously rotated refresh token is presented again, the system currently sees the old session as revoked and rejects it, but it does not yet perform a broader session-family compromise response.

**Recommended direction:** model refresh-token families and revoke the relevant session family when reuse is detected.

### 7. No rate limiting or brute-force protection

Signup, signin, and refresh endpoints currently have no visible rate limiting.

**Recommended direction:** add rate limiting, especially for login and token endpoints, with appropriate production storage if the app is horizontally scaled.

### 8. CORS and browser security policy are not configured

The backend currently does not configure CORS. This will become important when the frontend is introduced, especially if the frontend and API use different origins.

We should configure an explicit allowlist rather than allowing arbitrary origins.

### 9. CSRF strategy needs to be designed before frontend work

Because the refresh token is cookie-based, browser requests need a deliberate CSRF strategy. `SameSite=Strict` provides some protection, but it should not be treated as the complete application security model.

Before frontend implementation, we should decide on the final cookie, CSRF, CORS, and credential strategy together.

### 10. Production logging should be reviewed

The application uses Morgan for request logging and still contains direct `console.log`/`console.error` calls. Logs can become noisy and may accidentally expose sensitive debugging information.

**Fix:** introduce structured logging and ensure tokens, passwords, secrets, and sensitive request data are never logged.

### 11. Controller error handling should not expose raw errors

`signin()` currently includes the caught error in the HTTP response:

```text
Something went wrong ${error}
```

That can expose implementation details to clients.

**Fix:** log the internal error server-side and return a generic error response.

### 12. Database constraints and input normalization need strengthening

The schema has unique username/email constraints, which is good, but the application-level lookup should also normalize values such as email casing. Race conditions around uniqueness should be handled through MongoDB duplicate-key errors rather than relying only on a prior `findOne()` check.

### 13. Session lifecycle needs additional management

Sessions currently support creation, expiration, and revocation, but the system does not yet expose features such as:

- list active sessions
- revoke one session
- revoke all other sessions
- logout from all devices
- session cleanup/TTL strategy
- device/session metadata management

These are useful capabilities for a serious authentication system.

## Planned Roadmap

### Phase 1 — Backend Foundation

- [x] Express API structure
- [x] MongoDB connection
- [x] User model
- [x] Password hashing
- [x] Signup
- [x] Signin
- [x] Access JWT
- [x] Refresh JWT
- [x] Refresh-token hashing
- [x] Session storage
- [x] Refresh-token rotation
- [x] Protected `/me` endpoint
- [ ] Fix logout cookie path
- [ ] Add robust request validation
- [ ] Standardize token transport
- [ ] Add rate limiting
- [ ] Add CORS configuration
- [ ] Add CSRF strategy
- [ ] Improve security logging

### Phase 2 — Authorization

- [ ] Roles
- [ ] Permissions
- [ ] Role/permission middleware
- [ ] Resource ownership checks
- [ ] Admin authorization
- [ ] Permission-aware route protection
- [ ] Audit logging

### Phase 3 — Account Security

- [ ] Email verification
- [ ] Forgot password
- [ ] Reset password
- [ ] Change password
- [ ] Revoke all sessions after password change
- [ ] Account lockout/abuse protection
- [ ] Optional two-factor authentication
- [ ] Session/device management

### Phase 4 — Frontend

Build a frontend client against the finalized API, including:

- [ ] Signup
- [ ] Signin
- [ ] Protected routes
- [ ] Persistent authentication
- [ ] Token refresh handling
- [ ] Logout
- [ ] Account/session management
- [ ] Authorization-aware UI
- [ ] Role/permission-based navigation

### Phase 5 — Production Hardening

- [ ] Automated tests
- [ ] Security tests
- [ ] Integration tests
- [ ] API documentation
- [ ] Health checks
- [ ] Structured logging
- [ ] Monitoring
- [ ] Secret management
- [ ] CI checks
- [ ] Deployment configuration

## Development Principle

This project is intentionally being built in stages. The goal is not just to make login and signup work, but to build a reusable **full-stack authentication and authorization architecture** with clear separation between authentication, authorization, sessions, account security, and frontend state management.

The backend should be hardened and its security model finalized **before** the frontend is built on top of it.

## Status

**Current status: Backend authentication foundation — under active development.**

The next step should be a focused backend security/code-quality pass, followed by the authorization architecture, and then the frontend implementation.
