/**
 * Detection History Component
 *
 * Displays the user's detection history with compact result views.
 */

import { Calendar, FileText, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TRAIT_CONFIG, TRAIT_KEYS } from "@/lib/constants";
import {DetectionResult, downloadReport, OceanScores} from "@/lib/hooks";

interface DetectionHistoryProps {
	history: DetectionResult[] | undefined;
	isLoading: boolean;
}

export function DetectionHistory({
	history,
	isLoading,
}: DetectionHistoryProps) {
	return (
		<Card className="border-0 shadow-lg bg-white/70 backdrop-blur">
			<CardHeader>
				<CardTitle className="flex items-center gap-3">
					<div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
						<Calendar className="w-5 h-5 text-white" />
					</div>
					Your Analysis History
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading ? (
					<HistoryLoadingSkeleton />
				) : !history?.length ? (
					<EmptyHistory />
				) : (
					<HistoryList history={history}/>
				)}
			</CardContent>
		</Card>
	);
}

// =============================================================================
// Sub-components
// =============================================================================

function HistoryLoadingSkeleton() {
	return (
		<div className="space-y-4">
			{[1, 2, 3].map((i) => (
				<div key={i} className="animate-pulse">
					<div className="flex items-center gap-3 mb-3">
						<div className="w-10 h-10 bg-gray-200 rounded-full" />
						<div className="space-y-1 flex-1">
							<div className="h-4 bg-gray-200 rounded w-3/4" />
							<div className="h-3 bg-gray-200 rounded w-1/2" />
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

function EmptyHistory() {
	return (
		<div className="text-center py-8 space-y-3">
			<div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
				<Video className="w-8 h-8 text-gray-400" />
			</div>
			<p className="text-gray-500">No analysis history yet</p>
			<p className="text-sm text-gray-400">
				Upload your first video to get started
			</p>
		</div>
	);
}

interface HistoryListProps {
	history: DetectionResult[];
}

function HistoryList({ history }: HistoryListProps) {
	return (
		<div className="space-y-4 max-h-96 overflow-y-auto">
			{history.slice(0, 10).map((item) => (
				<HistoryItem
					key={item.id}
					item={item}
				/>
			))}
		</div>
	);
}

interface HistoryItemProps {
	item: DetectionResult;
}

function HistoryItem({ item }: HistoryItemProps) {
	const formattedDate = new Date(item.created_at).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	return (
		<Card className="p-4 hover:shadow-md transition-shadow bg-white/50 group">
			<div className="flex items-start gap-3 mb-3">
				<div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
					<span className="text-white text-sm font-bold">
						{item.name.charAt(0).toUpperCase()}
					</span>
				</div>
				<div className="min-w-0 flex-1">
					<p className="font-medium text-gray-900 truncate">{item.name}</p>
					<div className="flex items-center gap-2 text-xs text-gray-500">
						<span>{item.age} years</span>
						<span>•</span>
						<span className="capitalize">{item.gender}</span>
						<span>•</span>
						<Video className="w-3 h-3" />
					</div>
					<p className="text-xs text-gray-400 mt-1">{formattedDate}</p>
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => downloadReport(item.id)}
					className="opacity-0 group-hover:opacity-100 transition-opacity"
					title="Download PDF Report"
				>
					<FileText className="w-4 h-4 text-gray-500" />
				</Button>
			</div>

			<CompactResults results={item.results} />
		</Card>
	);
}

interface CompactResultsProps {
	results: OceanScores;
}

function CompactResults({ results }: CompactResultsProps) {
	return (
		<div className="grid grid-cols-5 gap-1">
			{TRAIT_KEYS.map((key) => {
				const config = TRAIT_CONFIG[key];
				const value = results[key as keyof OceanScores];

				return (
					<div key={key} className="text-center">
						<div className={`text-xs font-medium ${config.textColor}`}>
							{value}%
						</div>
						<Progress value={value} className="h-1 mt-1" />
					</div>
				);
			})}
		</div>
	);
}
