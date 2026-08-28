import { useQuery } from "@tanstack/react-query";
import { getSessions } from "../services/auth.service";

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: getSessions,
  });
}
