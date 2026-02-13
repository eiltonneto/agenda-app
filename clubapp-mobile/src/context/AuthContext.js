import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // 👈 Controla o Splash Screen

  useEffect(() => {
    async function loadStorageData() {
      try {
        const storagedUser = await AsyncStorage.getItem("@YourFlow:user");
        const storagedToken = await AsyncStorage.getItem("@YourFlow:token");

        if (storagedUser && storagedToken) {
          // Reatribui o token ao axios para requisições futuras
          api.defaults.headers.Authorization = `Bearer ${storagedToken}`;
          setUser(JSON.parse(storagedUser));
        }
      } catch (error) {
        console.log("Erro ao hidratar estado de auth:", error);
      } finally {
        setLoading(false); // 👈 Libera o App para renderizar as rotas
      }
    }
    loadStorageData();
  }, []);

  async function login(email, senha) {
    // Note: O erro de login deve ser tratado na tela (AuthScreen) com try/catch
    const response = await api.post("/login", { email, senha });
    const { user: userData, token } = response.data;

    await AsyncStorage.setItem("@YourFlow:user", JSON.stringify(userData));
    await AsyncStorage.setItem("@YourFlow:token", token);

    api.defaults.headers.Authorization = `Bearer ${token}`;
    setUser(userData);
  }

  async function register(nome, email, senha) {
    try {
      await api.post("/usuarios", { nome, email, senha });
      // Login automático após cadastro bem-sucedido
      await login(email, senha);
    } catch (error) {
      throw error; // Repassa o erro (ex: e-mail duplicado) para a UI
    }
  }

  async function updateUser(userData) {
    setUser(userData);
    await AsyncStorage.setItem("@YourFlow:user", JSON.stringify(userData));
  }

  function logout() {
    AsyncStorage.multiRemove(["@YourFlow:user", "@YourFlow:token"]).then(() => {
      setUser(null);
      delete api.defaults.headers.Authorization;
    });
  }

  return (
    <AuthContext.Provider
      value={{
        signed: !!user,
        user,
        loading, // 👈 ESSENCIAL: Adicionado para o App.js funcionar
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
}

export default AuthProvider;