import axios from "axios";

// IP do seu backend
const API_URL = "http://192.168.0.106:3333";

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
