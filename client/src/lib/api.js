import axios from "axios";
import { auth } from "./firebase";

const api = axios.create({
  baseURL: "/api", // proxied to Express by Vite in dev
});

// Attach the Firebase ID-token to every outgoing request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
