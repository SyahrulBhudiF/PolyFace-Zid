import { Link, useNavigate } from "@tanstack/react-router";
import { Brain, Loader2, Lock, Mail, User, UserPlus } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
	const navigate = useNavigate();
	const { register } = useAuth();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		if (password.length < 6) {
			setError("Password must be at least 6 characters");
			return;
		}

		setIsLoading(true);

		try {
			await register(name, email, password);
			navigate({ to: "/" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Registration failed");
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
						Create Account
					</h1>
					<p className="text-gray-600">
						Sign up to start using OCEAN Personality Detection
					</p>
				</div>

				<Card className="border-0 shadow-lg bg-white/70 backdrop-blur">
					<CardHeader className="pb-4">
						<CardTitle className="flex items-center gap-3">
							<div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
								<UserPlus className="w-5 h-5 text-white" />
							</div>
							Sign Up
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
								<Label htmlFor="name" className="flex items-center gap-2">
									<User className="w-4 h-4 text-gray-500" />
									Full Name
								</Label>
								<Input
									id="name"
									type="text"
									placeholder="Enter your full name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
									className="bg-white"
								/>
							</div>

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
									placeholder="Enter your password (min 6 characters)"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									className="bg-white"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="confirmPassword" className="flex items-center gap-2">
									<Lock className="w-4 h-4 text-gray-500" />
									Confirm Password
								</Label>
								<Input
									id="confirmPassword"
									type="password"
									placeholder="Confirm your password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
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
										Creating account...
									</>
								) : (
									<>
										<UserPlus className="w-4 h-4" />
										Create Account
									</>
								)}
							</Button>
						</form>

						<div className="mt-6 text-center text-sm text-gray-600">
							Already have an account?{" "}
							<Link
								to="/login"
								className="font-medium text-blue-600 hover:text-blue-500"
							>
								Sign in here
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
