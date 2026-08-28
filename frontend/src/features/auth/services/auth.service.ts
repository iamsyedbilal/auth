import { apiClient } from "../../../api/apiClient";

export interface SignupPayload {
  username: string;
  email: string;
  password: string;
}

export interface SignupResponse {
  message: string;
  email: string;
}

export interface VerifyEmailPayload {
  email: string;
  otp: string;
}

export interface VerifyEmailResponse {
  message: string;
}
export interface ResendVerificationPayload {
  email: string;
}

export interface ResendVerificationResponse {
  message: string;
}

export interface SigninPayload {
  email: string;
  password: string;
}

export interface SigninResponse {
  message: string;
  accessToken: string;
  user: User;
}

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface SignoutResponse {
  message: string;
}

export interface Session {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  lastUsedAt?: string;
  expiresAt: string;
  revokedAt?: string | null;
}

export interface SessionsResponse {
  sessions: Session[];
}

export async function signup(payload: SignupPayload): Promise<SignupResponse> {
  return apiClient<SignupResponse>("/auth/signup", {
    method: "POST",
    body: payload,
  });
}

export async function verifyEmail(
  payload: VerifyEmailPayload,
): Promise<VerifyEmailResponse> {
  return apiClient<VerifyEmailResponse>("/auth/verify-email", {
    method: "POST",
    body: payload,
  });
}

export async function resendVerification(
  payload: ResendVerificationPayload,
): Promise<ResendVerificationResponse> {
  return apiClient<ResendVerificationResponse>("/auth/resend-verification", {
    method: "POST",
    body: payload,
  });
}

export async function signin(payload: SigninPayload): Promise<SigninResponse> {
  return apiClient<SigninResponse>("/auth/signin", {
    method: "POST",
    body: payload,
  });
}

export async function getMe(): Promise<User> {
  return apiClient<User>("/auth/me", {
    method: "GET",
  });
}

export async function signout(): Promise<SignoutResponse> {
  return apiClient<SignoutResponse>("/auth/signout", {
    method: "POST",
  });
}

export async function signoutAll(): Promise<SignoutResponse> {
  return apiClient<SignoutResponse>("/auth/signout-all", {
    method: "POST",
  });
}

export async function getSessions(): Promise<SessionsResponse> {
  return apiClient<SessionsResponse>("/auth/sessions", {
    method: "GET",
  });
}

export async function revokeSession(
  sessionId: string,
): Promise<{ message: string }> {
  return apiClient<{ message: string }>(`/auth/sessions/${sessionId}`, {
    method: "DELETE",
  });
}
