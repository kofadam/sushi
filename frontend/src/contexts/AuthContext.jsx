import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const data = await api.get("/me/");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const devLogin = async (username) => {
    await api.post("/auth/dev-login/", { username });
    await fetchMe();
  };

  const logout = async () => {
    await api.post("/auth/logout/", {});
    setUser(null);
  };

  const hasPerm = (codename) => {
    if (!user?.permissions) return false;
    return user.permissions.includes(codename) || user.permissions.includes("manage_all");
  };

  return (
    <AuthContext.Provider value={{ user, loading, devLogin, logout, hasPerm, refetch: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
