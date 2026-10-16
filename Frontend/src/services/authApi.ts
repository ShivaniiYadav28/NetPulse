import { api } from "./api";
import type { AuthResponse } from "../types/auth";

export const registerRequest = (input: {
  email: string;
  displayName: string;
  password: string;
}) => api.post<AuthResponse>("/auth/register", input);

export const loginRequest = (input: { email: string; password: string }) =>
  api.post<AuthResponse>("/auth/login", input);

export const getCurrentUser = () => api.get<AuthResponse>("/auth/me");

export const logoutRequest = () => api.post<{ success: true }>("/auth/logout");
