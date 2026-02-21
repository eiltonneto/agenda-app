// Módulo de configuração de cliente HTTP -> Central de comunicação entre o frontend e o servidor.
// Garçom do app, responsável por levar pedidos (requisições) do frontend para o backend e trazer as respostas de volta com setAuth token (carregando dados do usuário, eventos, etc).

import axios from "axios"; // < -- Traz a biblioteca axios para facilitar as requisições HTTP.

const api = axios.create({ // < -- Cria uma instância personalizada. A baseURL é o end principal do servidor. Assim o resto do código
  // não é preciso digitar toda URL, apenas o final (ex: /login, /bootstrap, etc).
  baseURL:'https://agenda-app-i8nj.onrender.com', 
});

export function setAuthToken(token) { // < -- Função para configurar o token de autenticação. Será chamada no Login e Logout para manter o token atualizado. 
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`; // Usuário para o servidor (Bearer - token ). 
  } else {
    delete api.defaults.headers.common["Authorization"]; // Limpa essa configuração se não houver token (ex: Logout).
  }
}

export default api; // < -- Exporta a instância personalizada para ser usada em todo o app. Assim, todas as requisições passam por aqui, mantendo a organização e centralização de comunicação com o backend.