import { create } from "zustand";
import { api, ApiError } from "@/lib/api";

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  is_admin: boolean;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      const data = await api.post<{ user: User }>("/auth/login", null, {
        email,
        password,
      });
      set({ user: data.user });
    } catch (error) {
      console.log(error);
      console.log(await error.response.text());
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw new Error("Login failed");
    }
  },

  register: async (name: string, email: string, password: string) => {
    try {
      const data = await api.post<{ user: User }>("/auth/register", null, {
        name,
        email,
        password,
      });
      set({ user: data.user });
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(error.message);
      }
      throw new Error("Registration failed");
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout", null, {});
    } catch {
      // Ignore logout errors
    }
    set({ user: null });
  },

  fetchUser: async () => {
    try {
      const user = await api.get<User>("/auth/me", null);
      set({ user, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },
}));

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };
}
