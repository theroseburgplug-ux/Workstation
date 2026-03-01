import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Badge } from '@/components/ui/badge';
import {
  type ClientStatus,
  type TaskStatus,
  type Priority,
} from '@/lib/index';

/**
 * Utility to merge tailwind classes safely
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatusBadgeProps {
  status: string;
  type: 'client' | 'task' | 'priority' | 'connection';
  className?: string;
}

/**
 * Reusable status badge component for displaying client status, task priority, 
 * and connection states with appropriate colors based on the Roseburg Organic design system.
 */
export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();

  const getStyles = () => {
    // Common base styles for the physical bento-box feel
    const base = "font-medium px-2.5 py-0.5 rounded-full border transition-all duration-200 uppercase tracking-wider text-[10px]";

    switch (type) {
      case 'client':
        switch (normalizedStatus as ClientStatus) {
          case 'active':
            return cn(base, "bg-primary/10 text-primary border-primary/20");
          case 'inactive':
            return cn(base, "bg-muted text-muted-foreground border-border");
          case 'onboarding':
            return cn(base, "bg-chart-4/10 text-chart-4 border-chart-4/20");
          case 'pending':
            return cn(base, "bg-accent/10 text-accent border-accent/20");
          case 'waiting_on_client':
            return cn(base, "bg-yellow-50 text-yellow-600 border-yellow-100");
          case 'blocked':
            return cn(base, "bg-yellow-50 text-amber-700 border-amber-100");
          case 'delayed_by_us':
            return cn(base, "bg-destructive/10 text-destructive border-destructive/20");
          case 'long_task':
            return cn(base, "bg-muted text-muted-foreground border-border");
          case 'on_hold':
            return cn(base, "bg-muted text-muted-foreground border-border");
          default: 
            return cn(base, "bg-muted text-muted-foreground border-border");
        }

      case 'task':
        switch (normalizedStatus as TaskStatus) {
          case 'todo':
            return cn(base, "bg-muted text-muted-foreground border-border");
          case 'in-progress':
            return cn(base, "bg-chart-4/10 text-chart-4 border-chart-4/20");
          case 'review':
            return cn(base, "bg-accent/10 text-accent border-accent/20");
          case 'completed':
            return cn(base, "bg-primary/10 text-primary border-primary/20");
          default:
            return cn(base, "bg-muted text-muted-foreground border-border");
        }

      case 'priority':
        switch (normalizedStatus as Priority) {
          case 'low':
            return cn(base, "bg-muted text-muted-foreground border-border");
          case 'medium':
            return cn(base, "bg-accent/10 text-accent border-accent/20");
          case 'high':
            return cn(base, "bg-destructive/10 text-destructive border-destructive/20 font-bold");
          case 'urgent':
            return cn(base, "bg-destructive text-destructive-foreground border-destructive shadow-sm shadow-destructive/20 font-bold animate-pulse");
          default:
            return cn(base, "bg-muted text-muted-foreground border-border");
        }

      case 'connection':
        switch (normalizedStatus) {
          case 'connected':
            return cn(base, "bg-primary/10 text-primary border-primary/20");
          case 'disconnected':
            return cn(base, "bg-muted text-muted-foreground border-border");
          case 'error':
            return cn(base, "bg-destructive/10 text-destructive border-destructive/20");
          default:
            return cn(base, "bg-muted text-muted-foreground border-border");
        }

      default:
        return cn(base, "bg-muted text-muted-foreground border-border");
    }
  };

  // Humanize the status text for display (e.g., "in-progress" -> "In Progress")
  const displayStatus = status.replace(/-/g, ' ');

  return (
    <Badge
      variant="outline"
      className={cn(getStyles(), className)}
    >
      {displayStatus}
    </Badge>
  );
}
