import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

const API_BASE = "http://localhost:5000";

interface User {
	id: number;
	name: string;
	email: string;
	created_at?: string;
}

interface AuthContextType {
	user: User | null;
	token: string | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	login: (email: string, password: string) => Promise<void>;
	register: (name: string, email: string, password: string) => Promise<void>;
	logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [token, setToken] = useState<string | null>(() => {
		return localStorage.getItem("access_token");
	});
	const [isLoading, setIsLoading] = useState(true);

	const logout = useCallback(() => {
		setUser(null);
		setToken(null);
		localStorage.removeItem("access_token");
	}, []);

	// Fetch current user on mount if token exists
	useEffect(() => {
		const fetchUser = async () => {
			if (!token) {
				setIsLoading(false);
				return;
			}

			try {
				const response = await fetch(`${API_BASE}/auth/me`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				});

				if (response.ok) {
					const userData = await response.json();
					setUser(userData);
				} else {
					// Token invalid, clear it
					logout();
				}
			} catch {
				logout();
			} finally {
				setIsLoading(false);
			}
		};

		fetchUser();
	}, [token, logout]);

	const login = async (email: string, password: string) => {
		const response = await fetch(`${API_BASE}/auth/login`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ email, password }),
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error || "Login failed");
		}

		setToken(data.access_token);
		setUser(data.user);
		localStorage.setItem("access_token", data.access_token);
	};

	const register = async (name: string, email: string, password: string) => {
		const response = await fetch(`${API_BASE}/auth/register`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ name, email, password }),
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error || "Registration failed");
		}

		setToken(data.access_token);
		setUser(data.user);
		localStorage.setItem("access_token", data.access_token);
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				token,
				isLoading,
				isAuthenticated: !!user,
				login,
				register,
				logout,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
