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

export async function signup(payload: SignupPayload): Promise<SignupResponse> {
  return apiClient<SignupResponse>("/auth/signup", {
    method: "POST",
    body: payload,
  });
}
