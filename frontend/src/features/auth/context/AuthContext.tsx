import { createContext, useEffect, useState, type ReactNode } from "react";
import type { SigninResponse } from "../services/auth.service";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  subscribeToAccessToken,
} from "../../../api/tokenStore";

interface AuthContextValue {
  user: SigninResponse["user"] | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (data: SigninResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<SigninResponse["user"] | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(
    getAccessToken(),
  );

  useEffect(() => {
    return subscribeToAccessToken(setAccessTokenState);
  }, []);

  const login = (data: SigninResponse) => {
    setUser(data.user);
    setAccessToken(data.accessToken);
  };

  const logout = () => {
    setUser(null);
    clearAccessToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: Boolean(accessToken),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
