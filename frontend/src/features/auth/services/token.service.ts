import { apiClient } from "../../../api/apiClient";

export interface RefreshTokenResponse {
  message: string;
  accessToken: string;
}

export async function refreshAccessToken(): Promise<RefreshTokenResponse> {
  return apiClient<RefreshTokenResponse>("/auth/refreshToken", {
    method: "POST",
  });
}
