/**
 * Utility functions for the UI library.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind CSS classes.
 *
 * Combines clsx for conditional class names with tailwind-merge
 * to handle Tailwind CSS class conflicts.
 *
 * @param inputs - Class names to merge.
 * @returns Merged class name string.
 *
 * @example
 * cn("px-2 py-1", "px-4") // "py-1 px-4"
 * cn("text-red-500", isActive && "text-blue-500")
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

/**
 * Format a date string for display.
 *
 * @param dateString - ISO date string.
 * @param options - Intl.DateTimeFormat options.
 * @returns Formatted date string.
 */
export function formatDate(
	dateString: string,
	options: Intl.DateTimeFormatOptions = {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	},
): string {
	return new Date(dateString).toLocaleDateString("en-US", options);
}

/**
 * Format a number as a percentage.
 *
 * @param value - Number to format (0-100).
 * @param decimals - Number of decimal places.
 * @returns Formatted percentage string.
 */
export function formatPercentage(value: number, decimals: number = 1): string {
	return `${value.toFixed(decimals)}%`;
}

/**
 * Get initials from a name.
 *
 * @param name - Full name.
 * @param maxLength - Maximum number of initials.
 * @returns Uppercase initials.
 *
 * @example
 * getInitials("John Doe") // "JD"
 * getInitials("Alice Bob Charlie", 2) // "AB"
 */
export function getInitials(name: string, maxLength: number = 2): string {
	return name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.toUpperCase()
		.slice(0, maxLength);
}

/**
 * Debounce a function.
 *
 * @param fn - Function to debounce.
 * @param delay - Delay in milliseconds.
 * @returns Debounced function.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	fn: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout>;

	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), delay);
	};
}

/**
 * Sleep for a specified duration.
 *
 * @param ms - Duration in milliseconds.
 * @returns Promise that resolves after the duration.
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a value is defined (not null or undefined).
 *
 * @param value - Value to check.
 * @returns True if value is defined.
 */
export function isDefined<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

/**
 * Clamp a number between min and max values.
 *
 * @param value - Number to clamp.
 * @param min - Minimum value.
 * @param max - Maximum value.
 * @returns Clamped number.
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
