import { useMutation } from "@tanstack/react-query";
import { verifyEmail, type VerifyEmailPayload } from "../services/auth.service";

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (payload: VerifyEmailPayload) => verifyEmail(payload),
  });
}
