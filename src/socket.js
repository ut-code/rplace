import { io } from 'socket.io-client';
import env from "dotenv";

env.config(process.env.NODE_ENV === 'production' ? {
    path: ".env.production",
} : undefined);

const URL = process.env.VITE_API_ENDPOINT;

export const socket = io(URL);
