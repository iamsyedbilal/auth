import { useMutation, useQueryClient } from "@tanstack/react-query";
import { revokeSession } from "../services/auth.service";

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeSession,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["sessions"],
      });
    },
  });
}
