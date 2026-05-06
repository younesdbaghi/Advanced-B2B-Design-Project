// socket.js
import { io } from "socket.io-client";

const ENDPOINT = "http://localhost:5000"; // L'URL de votre serveur
export const socket = io(ENDPOINT, {
  autoConnect: false, // On connectera manuellement
  reconnection: true
});