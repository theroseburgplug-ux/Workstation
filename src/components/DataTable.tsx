import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import ClientLabel from '@/components/ClientLabel';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge tailwind classes safely
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ColumnDefinition {
  header: string;
  key: string;
  type?: 'text' | 'badge' | 'avatar' | 'currency' | 'date' | 'status' | 'priority' | 'connection';
  className?: string;
}

interface DataTableProps {
  data: any[];
  columns: ColumnDefinition[];
  actions?: (item: any) => React.ReactNode;
}

/**
 * Generic DataTable component designed for the TRP Workstation.
 * Features responsive scrolling, brand-consistent styling, and intelligent field formatting.
 */
export function DataTable({ data, columns, actions }: DataTableProps) {
  /**
   * Formats cell content based on column type and data properties
   */
  const formatValue = (item: any, column: ColumnDefinition) => {
    const value = item[column.key];

    if (column.type === 'avatar') {
      const name = item.name || item.clientName || item.title || 'User';
      const initials = name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 border border-border/50 ring-1 ring-background shadow-sm">
            <AvatarImage src={value} alt={name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <Link to={`/clients/${item.id}`} className="font-medium text-sm text-foreground hover:underline">
              {name}
            </Link>
            {item.email && <span className="text-[11px] text-muted-foreground">{item.email}</span>}
          </div>
        </div>
      );
    }

    if (column.type === 'status') {
      // Heuristic to determine if the item is a client or a task
      const statusType = item.company || item.revenue !== undefined ? 'client' : 'task';
      return <StatusBadge status={value} type={statusType} />;
    }

    // Render client label with badge for client-name columns
    if (column.key === 'clientName') {
      return <ClientLabel clientId={item.clientId} clientName={item.clientName} />;
    }

    if (column.type === 'priority') {
      return <StatusBadge status={value} type="priority" />;
    }

    if (column.type === 'connection') {
      return <StatusBadge status={value} type="connection" />;
    }

    if (column.type === 'currency') {
      return (
        <span className="font-mono text-sm">
          {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(value || 0)}
        </span>
      );
    }

    if (column.type === 'date') {
      if (!value) return <span className="text-muted-foreground/50">—</span>;
      return (
        <span className="text-sm text-muted-foreground">
          {new Date(value).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      );
    }

    if (column.type === 'badge') {
      if (Array.isArray(value)) {
        return (
          <div className="flex flex-wrap gap-1.5">
            {value.map((tag, idx) => (
              <span 
                key={idx} 
                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-secondary/50 text-secondary-foreground border border-border/40"
              >
                {tag}
              </span>
            ))}
          </div>
        );
      }
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-secondary/50 text-secondary-foreground border border-border/40">
          {value}
        </span>
      );
    }

    return (
      <div className="text-sm text-foreground/90 font-medium truncate max-w-[420px]" title={String(value || '')}>
        {value || <span className="text-muted-foreground/30">N/A</span>}
      </div>
    );
  };

  return (
    <div className="relative rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <ScrollArea className="w-full">
        <Table className="min-w-[800px]">
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent border-b-border/60">
              {columns.map((column) => (
                <TableHead 
                  key={column.key} 
                  className={cn(
                    "h-10 text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-4",
                    column.className
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
              {actions && (
                <TableHead className="h-10 text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-4">
                  Actions
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (actions ? 1 : 0)} 
                  className="h-28 text-center text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-sm">No data matches your current filters</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, rowIndex) => (
                <TableRow 
                  key={item.id || rowIndex} 
                  className="group border-b-border/40 hover:bg-muted/20 transition-all duration-200"
                >
                  {columns.map((column) => (
                    <TableCell 
                      key={`${rowIndex}-${column.key}`} 
                      className={cn("py-3 px-4", column.className)}
                    >
                      {formatValue(item, column)}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell className="py-4 px-6 text-right">
                      <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:translate-x-0 translate-x-2">
                        {actions(item)}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
