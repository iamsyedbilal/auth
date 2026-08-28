import { useMutation } from "@tanstack/react-query";
import { signoutAll } from "../services/auth.service";

export function useSignoutAll() {
  return useMutation({
    mutationFn: signoutAll,
  });
}
