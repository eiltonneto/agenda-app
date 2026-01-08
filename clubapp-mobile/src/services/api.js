import axios from "axios";

// IP do seu backend
const API_URL = "https://agenda-app-i8nj.onrender.com";

const api = axios.create({
  baseURL: API_URL,
});

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export default api;
