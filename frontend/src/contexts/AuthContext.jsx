import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

const STORAGE_KEY = "abah_auth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setUser(parsed.user);
        setToken(parsed.token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${parsed.token}`;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (identity, password) => {
    const res = await axios.post(`${API}/auth/login`, { identity, password });
    const { token: tk, user: u } = res.data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: tk, user: u }));
    axios.defaults.headers.common["Authorization"] = `Bearer ${tk}`;
    setUser(u);
    setToken(tk);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, logout }),
    [user, token, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
