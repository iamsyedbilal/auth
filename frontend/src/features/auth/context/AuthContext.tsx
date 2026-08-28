import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SigninResponse } from "../services/auth.service";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  subscribeToAccessToken,
} from "../../../api/tokenStore";

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: SigninResponse) => void;
  logout: () => void;
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
      if (getAccessToken()) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await refreshAccessToken();
        setAccessToken(data.accessToken);
      } catch {
        clearAccessToken();
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
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
