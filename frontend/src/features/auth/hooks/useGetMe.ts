import { useQuery } from "@tanstack/react-query";
import { getMe } from "../services/auth.service";
import { useAuth } from "./useAuth";

export function useGetMe() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["user"],
    queryFn: getMe,
    enabled: !!accessToken,
  });
}
