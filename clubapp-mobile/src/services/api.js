// Módulo de configuração de cliente HTTP -> Central de comunicação entre o frontend e o servidor.
// Garçom do app, responsável por levar pedidos (requisições) do frontend para o backend e trazer as respostas de volta com setAuth token (carregando dados do usuário, eventos, etc).

import axios from "axios";
import { Platform } from "react-native";

// 10.0.2.2 só existe dentro do emulador Android (alias para o localhost da máquina host).
// Em navegador (expo start --web), iOS simulator e Node não faz sentido, então cai para localhost.
const defaultBaseURL = Platform.OS === "android" ? "http://10.0.2.2:3333" : "http://localhost:3333";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || defaultBaseURL,
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export default api;