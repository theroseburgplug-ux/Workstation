import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Bot,
  Users,
  CheckSquare,
  Calendar,
  PenTool,
  BarChart3,
  DollarSign,
  Zap,
  Share2,
  FolderLock,
  Mic,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Search,
  Bell,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { ROUTE_PATHS, type TabId } from '@/lib/index';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const NAV_ITEMS = [
  { id: 'DASHBOARD' as TabId, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'AI_ASSISTANT' as TabId, label: 'AI Assistant', icon: Bot },
  { id: 'CLIENTS' as TabId, label: 'Clients', icon: Users },
  { id: 'TASKS' as TabId, label: 'Tasks', icon: CheckSquare },
  { id: 'CALENDAR' as TabId, label: 'Calendar', icon: Calendar },
  { id: 'CONTENT' as TabId, label: 'Content', icon: PenTool },
  { id: 'ANALYTICS' as TabId, label: 'Analytics', icon: BarChart3 },
  { id: 'FINANCES' as TabId, label: 'Finances', icon: DollarSign },
  { id: 'AUTOMATION' as TabId, label: 'Automation', icon: Zap },
  { id: 'INTEGRATIONS' as TabId, label: 'Integrations', icon: Share2 },
  { id: 'FILE_VAULT' as TabId, label: 'File Vault', icon: FolderLock },
  { id: 'VOICE' as TabId, label: 'Voice Memos', icon: Mic },
  { id: 'STRATEGY_CONNECTIONS' as TabId, label: 'Strategy & Connections', icon: Share2 },
  { id: 'SETTINGS' as TabId, label: 'Settings', icon: SettingsIcon },
];

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useLocalStorage('user-settings', {
    theme: 'light' as 'light' | 'dark',
    apiKey: '',
    aiModel: 'gpt-4o',
    notificationsEnabled: true,
    autoTranscribe: false,
  });

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const toggleTheme = () => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
    }));
  };

  const activeItem = NAV_ITEMS.find((item) => item.id === activeTab);
  const { toast } = useToast();
  type Notification = { id: string; title: string; description?: string; createdAt?: string; read?: boolean };
  const [notifications, setNotifications] = useLocalStorage('trp-notifications', [] as Notification[]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex h-screen w-full bg-background overflow-visible">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 lg:static",
          isSidebarOpen ? "w-64" : "w-20",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
              <Zap className="w-5 h-5" />
            </div>
            {isSidebarOpen && (
              <span className="font-bold text-lg tracking-tight whitespace-nowrap">TRP WORKSTATION</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "flex items-center w-full rounded-md px-3 py-2.5 transition-colors group",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive ? "text-sidebar-primary" : "group-hover:text-sidebar-foreground"
                )} />
                {isSidebarOpen && (
                  <span className="ml-3 text-sm font-medium">{item.label}</span>
                )}
                {!isSidebarOpen && isActive && (
                  <div className="absolute left-0 w-1 h-5 bg-sidebar-primary rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="icon"
            className="w-full flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-border bg-card/50 backdrop-blur-md z-30">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold tracking-tight">{activeItem?.label}</h1>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {/* Search - Desktop only */}
            <div className="hidden md:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search everything..."
                className="pl-9 w-64 bg-background/50 border-border focus-visible:ring-primary"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleTheme}
                className="text-muted-foreground hover:text-foreground"
              >
                {settings.theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground relative"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full ring-2 ring-background" />
                    )}
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-80 bg-card border-border dark:bg-black">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  {notifications.length === 0 && (
                    <div className="p-3 text-sm text-muted-foreground">No notifications</div>
                  )}
                  {notifications.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className="flex flex-col items-start gap-1 py-2"
                      onClick={() => {
                        setNotifications((prev: Notification[]) =>
                          prev.map((p) => (p.id === n.id ? { ...p, read: true } : p))
                        );
                      }}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-sm ${n.read ? 'text-muted-foreground' : 'font-medium'}`}>
                          {n.title}
                        </span>
                        <span className="text-xs text-muted-foreground">{n.createdAt ? n.createdAt : ''}</span>
                      </div>
                      {n.description && <span className="text-xs text-muted-foreground">{n.description}</span>}
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator />
                  <div className="flex items-center justify-between px-3 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNotifications((prev: Notification[]) => prev.map((p) => ({ ...p, read: true })));
                        toast({ title: 'Marked all read' });
                      }}
                    >
                      Mark all read
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNotifications([]);
                        toast({ title: 'Cleared notifications' });
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="h-8 w-px bg-border hidden sm:block" />

            {/* Profile */}
            <div className="flex items-center gap-3 pl-2 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="hidden lg:block text-right">
                <p className="text-sm font-medium leading-none">Admin User</p>
                <p className="text-xs text-muted-foreground mt-1">The Roseburg Plug</p>
              </div>
              <Avatar className="h-9 w-9 border-2 border-primary/20">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">RP</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto relative">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>

          {/* Subtle decorative background elements */}
          <div className="absolute top-0 right-0 -z-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl opacity-50" />
          <div className="absolute bottom-0 left-0 -z-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl opacity-50" />
        </main>
      </div>
    </div>
  );
}
