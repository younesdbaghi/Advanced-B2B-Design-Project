import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/Api_B2B', // L'URL de ton backend
});

// Intercepteur pour ajouter le token JWT
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;