import React, { createContext, useContext, useState } from "react";
import api, { setAuthToken } from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);

  async function login(email, senha) {
    setLoading(true);
    try {
      const response = await api.post("/auth/login", { email, senha });
      const { token: tk, usuario } = response.data;

      setToken(tk);
      setUser(usuario);
      setAuthToken(tk);

      return true;
    } catch (err) {
      console.log("Erro no login:", err.response?.data || err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
    setAuthToken(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
