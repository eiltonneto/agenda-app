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
  const [categoriasGlobais, setCategoriasGlobais] = useState([]);
  const [statusTrial, setStatusTrial] = useState("ATIVO");

  useEffect(() => {
    async function loadStorageData() {
      try {
        // 1. Busca tudo do celular em paralelo (MUITO mais rápido)
        const keys = [
          "@YourFlow:user", "@YourFlow:token", "@YourFlow:eventos", 
          "@YourFlow:receitas", "@YourFlow:despesas", "@YourFlow:categorias"
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
          if (data["@YourFlow:categorias"]) setCategoriasGlobais(JSON.parse(data["@YourFlow:categorias"]));
          
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

  useEffect(() => {
    if (user) AsyncStorage.setItem("@YourFlow:eventos", JSON.stringify(eventosGlobais));
  }, [eventosGlobais, user]);

  useEffect(() => {
    if (user) AsyncStorage.setItem("@YourFlow:receitas", JSON.stringify(receitasGlobais));
  }, [receitasGlobais, user]);

  useEffect(() => {
    if (user) AsyncStorage.setItem("@YourFlow:despesas", JSON.stringify(despesasGlobais));
  }, [despesasGlobais, user]);

  useEffect(() => {
    if (user) AsyncStorage.setItem("@YourFlow:categorias", JSON.stringify(categoriasGlobais));
  }, [categoriasGlobais, user]);

  async function sincronizarCategoriasLegadas(categorias) {
    const categoriasDoServidor = (categorias || []).map(categoria => ({
      id: categoria.id,
      name: categoria.nome,
      color: categoria.cor
    }));

    try {
      const legado = await AsyncStorage.getItem("@YourFlow:categories");
      const categoriasLocais = legado ? JSON.parse(legado) : [];
      const nomesExistentes = new Set(categoriasDoServidor.map(categoria => categoria.name.toLowerCase()));
      const categoriasMigradas = await Promise.all(
        categoriasLocais
          .filter(categoria => categoria.name && !nomesExistentes.has(categoria.name.trim().toLowerCase()))
          .map(async categoria => {
            const response = await api.post("/categorias-evento", {
              nome: categoria.name.trim(),
              cor: categoria.color
            });
            return { id: response.data.id, name: response.data.nome, color: response.data.cor };
          })
      );
      return [...categoriasDoServidor, ...categoriasMigradas];
    } catch (error) {
      return categoriasDoServidor;
    }
  }

  // --- BOOTSTRAP SILENCIOSO ---
  async function loadBootstrapData() {
    try {
      // Agora o bootstrap no backend também deve ser leve
      const response = await api.get('/bootstrap');
      const { usuario, eventos, receitas, despesas, categorias, statusTrial } = response.data;
      
      setUser(usuario);
      setEventosGlobais(eventos || []);
      setReceitasGlobais(receitas || []);
      setDespesasGlobais(despesas || []);
      setCategoriasGlobais(await sincronizarCategoriasLegadas(categorias));
      setStatusTrial(statusTrial || "ATIVO");
      
      // Atualiza o cache para a próxima abertura
      AsyncStorage.multiSet([
        ["@YourFlow:user", JSON.stringify(usuario)],
        ["@YourFlow:eventos", JSON.stringify(eventos || [])],
        ["@YourFlow:receitas", JSON.stringify(receitas || [])],
        ["@YourFlow:despesas", JSON.stringify(despesas || [])],
        ["@YourFlow:categorias", JSON.stringify(categorias || [])],
      ]);
    } catch (error) {
      console.log("Bootstrap em background falhou (sem problemas):", error.message);
    }
  }

async function login(email, senha) {
    try {
      // Pega o Token no backend
      const authResponse = await api.post("/login", { email, senha });
      const { user: userData, token } = authResponse.data;

      //  Coloca o crachá na porta da API para permitir as próximas requisições
      api.defaults.headers.Authorization = `Bearer ${token}`;

      // BOOTSTRAP IMEDIATO: Puxa Completo do mês vigente
      const bootResponse = await api.get('/bootstrap');
      const { eventos, receitas, despesas, statusTrial } = bootResponse.data;
      const categorias = await sincronizarCategoriasLegadas(bootResponse.data.categorias || []);

      // Salva tudo no AsyncStorage primeiro.
      await AsyncStorage.multiSet([
        ["@YourFlow:token", token],
        ["@YourFlow:user", JSON.stringify(userData)],
        ["@YourFlow:eventos", JSON.stringify(eventos || [])],
        ["@YourFlow:receitas", JSON.stringify(receitas || [])],
        ["@YourFlow:despesas", JSON.stringify(despesas || [])],
        ["@YourFlow:categorias", JSON.stringify(categorias)]
      ]);

      // POPULA A MEMÓRIA RAM DO APP
      setEventosGlobais(eventos || []);
      setReceitasGlobais(receitas || []);
      setDespesasGlobais(despesas || []);
      setCategoriasGlobais(categorias);
      setStatusTrial(statusTrial || "ATIVO");

      // Muda a tela
      // Como o 'signed' depende do 'user', ao setar isso o app navega pra Home.
      // E como os dados já estão no estado acima, a tela nasce pronta, sem loading.
      setUser(userData); 

    } catch (error) {
      console.error("Erro no fluxo de Login/Bootstrap:", error);
      throw error; // Repassa o erro para a AuthScreen mostrar o alerta (ex: "Senha Incorreta")
    }
  }

  function logout() {
    // Limpa tudo e volta para o login
    AsyncStorage.multiRemove([
      "@YourFlow:user", "@YourFlow:token", "@YourFlow:eventos", 
      "@YourFlow:receitas", "@YourFlow:despesas", "@YourFlow:categorias"
    ]).then(() => {
      setUser(null);
      setEventosGlobais([]);
      setReceitasGlobais([]);
      setDespesasGlobais([]);
      setCategoriasGlobais([]);
      delete api.defaults.headers.Authorization;
    });
  }

  // ... (restante das funções update e register)

  async function register(nome, email, senha) {
    try {
      // Ajuste a rota "/usuarios" ou "/register" dependendo de como está no seu backend Node
      await api.post("/usuarios", { nome, email, senha }); 
    } catch (error) {
      console.error("Erro no cadastro (AuthContext):", error);
      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        signed: !!user,
        user,
        loading,
        eventosGlobais, setEventosGlobais,
        receitasGlobais, setReceitasGlobais,
        despesasGlobais, setDespesasGlobais,
        categoriasGlobais, setCategoriasGlobais,
        statusTrial,
        login, logout, loadBootstrapData, register
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