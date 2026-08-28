import { createContext, useEffect, useState, type ReactNode } from "react";
import {
  signout,
  signoutAll,
  type SigninResponse,
  type User,
} from "../services/auth.service";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  subscribeToAccessToken,
} from "../../../api/tokenStore";
import { refreshAccessToken } from "../../../api/apiClient";

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: SigninResponse) => void;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(
    getAccessToken(),
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAccessToken(setAccessTokenState);

    async function restoreSession() {
      try {
        const currentToken = getAccessToken();

        if (currentToken) {
          setIsLoading(false);
          return;
        }

        const newAccessToken = await refreshAccessToken();

        if (!newAccessToken) {
          setUser(null);
        }
      } catch {
        clearAccessToken();
        await signout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();

    return unsubscribe;
  }, []);

  const login = (data: SigninResponse) => {
    setUser(data.user);
    setAccessToken(data.accessToken);
  };

  const logout = async () => {
    try {
      await signout();
    } finally {
      setUser(null);
      clearAccessToken();
    }
  };

  const logoutAll = async () => {
    try {
      await signoutAll();
    } finally {
      setUser(null);
      clearAccessToken();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: Boolean(accessToken),
        isLoading,
        login,
        logout,
        logoutAll,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
