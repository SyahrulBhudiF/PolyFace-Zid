/**
 * Application Header Component
 *
 * Displays the app branding and user information bar.
 */

import { Brain, LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserInfo {
	name: string;
	email: string;
	is_admin: boolean;
}

interface AppHeaderProps {
	user: UserInfo | null;
	onLogout: () => void;
	onGoToAdmin?: () => void;
}

export function AppHeader({ user, onLogout, onGoToAdmin }: AppHeaderProps) {
	return (
		<div className="space-y-8">
			{/* Branding */}
			<div className="text-center flex-1 space-y-4">
				<div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
					<Brain className="w-8 h-8 text-white" />
				</div>
				<h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
					OCEAN Personality Detection
				</h1>
				<p className="text-gray-600 max-w-2xl mx-auto">
					Discover the Big Five personality traits through advanced video
					analysis. Upload a video and get detailed insights into personality
					dimensions through facial expressions and behavior.
				</p>
			</div>

			{/* User bar */}
			<UserBar user={user} onLogout={onLogout} onGoToAdmin={onGoToAdmin} />
		</div>
	);
}

// =============================================================================
// Sub-components
// =============================================================================

interface UserBarProps {
	user: UserInfo | null;
	onLogout: () => void;
	onGoToAdmin?: () => void;
}

function UserBar({ user, onLogout, onGoToAdmin }: UserBarProps) {
	return (
		<div className="flex items-center justify-between bg-white/70 backdrop-blur rounded-xl p-4 shadow-sm">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
					<User className="w-5 h-5 text-white" />
				</div>
				<div>
					<p className="font-medium text-gray-900">{user?.name}</p>
					<p className="text-sm text-gray-500">{user?.email}</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				{user?.is_admin && onGoToAdmin && (
					<Button
						variant="outline"
						onClick={onGoToAdmin}
						className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
					>
						<Settings className="w-4 h-4" />
						Admin
					</Button>
				)}
				<Button variant="outline" onClick={onLogout} className="gap-2">
					<LogOut className="w-4 h-4" />
					Logout
				</Button>
			</div>
		</div>
	);
}
