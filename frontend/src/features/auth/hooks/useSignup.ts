import { useMutation } from "@tanstack/react-query";
import { signup, type SignupPayload } from "../services/auth.service";

export function useSignup() {
  return useMutation({
    mutationFn: (payload: SignupPayload) => signup(payload),
  });
}
