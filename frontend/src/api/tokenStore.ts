let accessToken: string | null = null;

type TokenListener = (token: string | null) => void;

const listeners = new Set<TokenListener>();

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string) {
  accessToken = token;
  listeners.forEach((listener) => listener(accessToken));
}

export function clearAccessToken() {
  accessToken = null;
  listeners.forEach((listener) => listener(null));
}

export function subscribeToAccessToken(listener: TokenListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
