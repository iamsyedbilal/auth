import { useMutation } from "@tanstack/react-query";
import {
  resendVerification,
  type ResendVerificationPayload,
} from "../services/auth.service";

export function useResendVerification() {
  return useMutation({
    mutationFn: (payload: ResendVerificationPayload) =>
      resendVerification(payload),
  });
}
