import axios from "axios"; // <--- ESTA LINHA É OBRIGATÓRIA NO TOPO!

const api = axios.create({
  // Coloque aqui o IP do seu computador que você pegou no ipconfig
  // Exemplo: 'http://192.168.0.15:3333'
  baseURL:'http://192.168.0.102:3333', 
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export default api;