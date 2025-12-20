import { Link, useNavigate } from "@tanstack/react-router";
import { Brain, Loader2, Lock, LogIn, Mail } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
	const navigate = useNavigate();
	const { login } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		try {
			await login(email, password);
			navigate({ to: "/" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
			<div className="w-full max-w-md space-y-6">
				<div className="text-center space-y-4">
					<div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
						<Brain className="w-8 h-8 text-white" />
					</div>
					<h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
						Welcome Back
					</h1>
					<p className="text-gray-600">
						Sign in to continue to OCEAN Personality Detection
					</p>
				</div>

				<Card className="border-0 shadow-lg bg-white/70 backdrop-blur">
					<CardHeader className="pb-4">
						<CardTitle className="flex items-center gap-3">
							<div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
								<LogIn className="w-5 h-5 text-white" />
							</div>
							Sign In
						</CardTitle>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-4">
							{error && (
								<Alert variant="destructive">
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							<div className="space-y-2">
								<Label htmlFor="email" className="flex items-center gap-2">
									<Mail className="w-4 h-4 text-gray-500" />
									Email
								</Label>
								<Input
									id="email"
									type="email"
									placeholder="Enter your email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									className="bg-white"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="password" className="flex items-center gap-2">
									<Lock className="w-4 h-4 text-gray-500" />
									Password
								</Label>
								<Input
									id="password"
									type="password"
									placeholder="Enter your password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									className="bg-white"
								/>
							</div>

							<Button
								type="submit"
								className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
								disabled={isLoading}
							>
								{isLoading ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin" />
										Signing in...
									</>
								) : (
									<>
										<LogIn className="w-4 h-4" />
										Sign In
									</>
								)}
							</Button>
						</form>

						<div className="mt-6 text-center text-sm text-gray-600">
							Don't have an account?{" "}
							<Link
								to="/register"
								className="font-medium text-blue-600 hover:text-blue-500"
							>
								Sign up here
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
