import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [despesasGlobais, setDespesasGlobais] = useState([]);
  const [eventosGlobais, setEventosGlobais] = useState([]);
  const [receitasGlobais, setReceitasGlobais] = useState([]);
  const [statusTrial, setStatusTrial] = useState("ATIVO");

  useEffect(() => {
    async function loadStorageData() {
      try {
        // 1. Busca tudo do celular em paralelo (MUITO mais rápido)
        const keys = [
          "@YourFlow:user", "@YourFlow:token", "@YourFlow:eventos", 
          "@YourFlow:receitas", "@YourFlow:despesas"
        ];
        const storaged = await AsyncStorage.multiGet(keys);
        const data = Object.fromEntries(storaged);

        if (data["@YourFlow:user"] && data["@YourFlow:token"]) {
          api.defaults.headers.Authorization = `Bearer ${data["@YourFlow:token"]}`;
          
          // 2. POPULA A TELA INSTANTANEAMENTE (Offline-First)
          // O usuário já vê o app aberto com os dados da última vez
          setUser(JSON.parse(data["@YourFlow:user"]));
          if (data["@YourFlow:eventos"]) setEventosGlobais(JSON.parse(data["@YourFlow:eventos"]));
          if (data["@YourFlow:receitas"]) setReceitasGlobais(JSON.parse(data["@YourFlow:receitas"]));
          if (data["@YourFlow:despesas"]) setDespesasGlobais(JSON.parse(data["@YourFlow:despesas"]));
          
          // 3. ATUALIZA EM SILÊNCIO (Background Sync)
          // O app já abriu, agora ele só "refresca" os dados do Render
          loadBootstrapData();
        }
      } catch (error) {
        console.log("Erro na hidratação:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStorageData();
  }, []);

  // --- BOOTSTRAP SILENCIOSO ---
  async function loadBootstrapData() {
    try {
      // Agora o bootstrap no backend também deve ser leve
      const response = await api.get('/bootstrap');
      const { usuario, eventos, receitas, despesas, statusTrial } = response.data;
      
      setUser(usuario);
      setEventosGlobais(eventos || []);
      setReceitasGlobais(receitas || []);
      setDespesasGlobais(despesas || []);
      setStatusTrial(statusTrial || "ATIVO");
      
      // Atualiza o cache para a próxima abertura
      AsyncStorage.multiSet([
        ["@YourFlow:user", JSON.stringify(usuario)],
        ["@YourFlow:eventos", JSON.stringify(eventos || [])],
        ["@YourFlow:receitas", JSON.stringify(receitas || [])],
        ["@YourFlow:despesas", JSON.stringify(despesas || [])],
      ]);
    } catch (error) {
      console.log("Bootstrap em background falhou (sem problemas):", error.message);
    }
  }

async function login(email, senha) {
    // 1. Request ultra-rápido para o backend (já com o filtro de mês atual)
    const response = await api.post("/login", { email, senha });
    const { user: userData, token, eventos, receitas, despesas, statusTrial } = response.data;

    // 2. Autenticação imediata
    api.defaults.headers.Authorization = `Bearer ${token}`;

    // 3. PRIORIDADE: Muda a tela na hora para o usuário não esperar
    setUser(userData); 

    // 4. Popula a memória com os dados do Regime de Caixa
    setEventosGlobais(eventos || []);
    setReceitasGlobais(receitas || []);
    setDespesasGlobais(despesas || []);
    setStatusTrial(statusTrial || "ATIVO");

    // 5. Salva no celular em background (sem await para não travar a UI)
    AsyncStorage.multiSet([
      ["@YourFlow:token", token],
      ["@YourFlow:user", JSON.stringify(userData)],
      ["@YourFlow:eventos", JSON.stringify(eventos || [])],
      ["@YourFlow:receitas", JSON.stringify(receitas || [])],
      ["@YourFlow:despesas", JSON.stringify(despesas || [])],
    ]);
  }

  function logout() {
    // Limpa tudo e volta para o login
    AsyncStorage.multiRemove([
      "@YourFlow:user", "@YourFlow:token", "@YourFlow:eventos", 
      "@YourFlow:receitas", "@YourFlow:despesas"
    ]).then(() => {
      setUser(null);
      setEventosGlobais([]);
      setReceitasGlobais([]);
      setDespesasGlobais([]);
      delete api.defaults.headers.Authorization;
    });
  }

  // ... (restante das funções update e register)

  return (
    <AuthContext.Provider
      value={{
        signed: !!user,
        user,
        loading,
        eventosGlobais, setEventosGlobais,
        receitasGlobais, setReceitasGlobais,
        despesasGlobais, setDespesasGlobais,
        statusTrial,
        login, logout, loadBootstrapData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}

export default AuthProvider;