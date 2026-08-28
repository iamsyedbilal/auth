import { useMutation } from "@tanstack/react-query";
import { signout } from "../services/auth.service";

export function useSignout() {
  return useMutation({
    mutationFn: signout,
  });
}
