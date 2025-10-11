import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  login: () => undefined,
  logout: () => undefined,
  setUser: () => undefined,
});

const STORAGE_KEYS = {
  token: "authToken",
  user: "authUser",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedToken = window.localStorage.getItem(STORAGE_KEYS.token);
    const storedUser = window.localStorage.getItem(STORAGE_KEYS.user);

    if (storedToken) {
      setToken(storedToken);
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.warn("Failed to parse stored user", error);
        window.localStorage.removeItem(STORAGE_KEYS.user);
      }
    }

    setLoading(false);
  }, []);

  const login = (nextUser, jwt) => {
    setUser(nextUser);
    setToken(jwt);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
      window.localStorage.setItem(STORAGE_KEYS.token, jwt);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEYS.user);
      window.localStorage.removeItem(STORAGE_KEYS.token);
    }
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      setUser,
    }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
