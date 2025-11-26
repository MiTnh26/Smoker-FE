import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility để merge Tailwind classes một cách an toàn
 * Kết hợp clsx (conditional classes) và twMerge (merge conflicts)
 * 
 * @example
 * cn("px-2 py-1", isActive && "bg-primary", "text-white")
 * cn("px-2", "px-4") // => "px-4" (twMerge resolves conflict)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

