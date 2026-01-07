import React, { createContext, useContext, useState } from "react";
import api, { setAuthToken } from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);

  // LOGIN
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
      console.log("Erro login:", err.response?.data || err.message);
      return false;
    } finally { setLoading(false); }
  }

  // REGISTRO (NOVO)
  async function register(nome, email, senha) {
    setLoading(true);
    try {
      await api.post("/auth/register", { nome, email, senha });
      // Após registrar, já faz o login automático
      return await login(email, senha);
    } catch (err) {
      console.log("Erro registro:", err.response?.data);
      return false;
    } finally { setLoading(false); }
  }

  // LOGOUT
  function logout() {
    setUser(null); setToken(null); setAuthToken(null);
  }

  // UPDATE USER (Para a foto)
  function updateUser(userData) {
    setUser(prev => ({ ...prev, ...userData }));
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }