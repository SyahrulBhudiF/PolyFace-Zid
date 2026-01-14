/**
 * User Bar Component
 *
 * Displays user information and action buttons in the header.
 */

import { LogOut, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserBarProps {
	user: {
		name: string;
		email: string;
		is_admin?: boolean;
	} | null;
	onLogout: () => void;
	onAdminClick?: () => void;
}

export function UserBar({ user, onLogout, onAdminClick }: UserBarProps) {
	if (!user) {
		return null;
	}

	return (
		<div className="flex items-center justify-between bg-white/70 backdrop-blur rounded-xl p-4 shadow-sm">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
					<User className="w-5 h-5 text-white" />
				</div>
				<div>
					<p className="font-medium text-gray-900">{user.name}</p>
					<p className="text-sm text-gray-500">{user.email}</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				{user.is_admin && onAdminClick && (
					<Button
						variant="outline"
						onClick={onAdminClick}
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
