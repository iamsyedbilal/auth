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
