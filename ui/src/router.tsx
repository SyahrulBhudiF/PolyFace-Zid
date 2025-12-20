import {
	createRootRoute,
	createRoute,
	createRouter,
	Navigate,
	Outlet,
} from "@tanstack/react-router";
import { useAuth } from "./contexts/AuthContext";
import Detector from "./pages/Detector";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Auth guard component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" />;
	}

	return <>{children}</>;
}

// Guest route (redirect if already logged in)
function GuestRoute({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (isAuthenticated) {
		return <Navigate to="/" />;
	}

	return <>{children}</>;
}

// Root route
const rootRoute = createRootRoute({
	component: () => <Outlet />,
});

// Home/Detector route (protected)
const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: () => (
		<ProtectedRoute>
			<Detector />
		</ProtectedRoute>
	),
});

// Login route (guest only)
const loginRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/login",
	component: () => (
		<GuestRoute>
			<Login />
		</GuestRoute>
	),
});

// Register route (guest only)
const registerRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/register",
	component: () => (
		<GuestRoute>
			<Register />
		</GuestRoute>
	),
});

// Route tree
const routeTree = rootRoute.addChildren([indexRoute, loginRoute, registerRoute]);

// Create router
export const router = createRouter({ routeTree });

// Type declaration for router
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
