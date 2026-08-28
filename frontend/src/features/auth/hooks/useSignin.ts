import { useMutation } from "@tanstack/react-query";
import { signin, type SigninPayload } from "../services/auth.service";

export function useSignin() {
  return useMutation({
    mutationFn: (payload: SigninPayload) => signin(payload),
  });
}
