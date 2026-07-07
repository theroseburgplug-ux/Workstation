import ClientWorkspace from '@/pages/ClientWorkspace';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ROUTE_PATHS, TabId } from "@/lib/index";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Studio from "@/pages/Studio";
import StudioDoc from "@/pages/StudioDoc";
import MeetingHub from "@/pages/MeetingHub";
import PlugCall from "@/pages/PlugCall";
import AIAssistant from "@/pages/AIAssistant";
import Clients from "@/pages/Clients";
import Tasks from "@/pages/Tasks";
import CalendarPage from "@/pages/Calendar";
import Content from "@/pages/Content";
import Analytics from "@/pages/Analytics";
import Automation from "@/pages/Automation";
import Integrations from "@/pages/Integrations";
import FileVault from "@/pages/FileVault";
import Voice from "@/pages/Voice";
import Finances from '@/pages/Finances';
import Settings from "@/pages/Settings";
import StrategyConnections from '@/pages/StrategyConnections';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const AppContent = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = (() => {
    if (location.pathname.startsWith('/studio')) return 'STUDIO' as TabId;
    if (location.pathname.startsWith('/clients')) return 'CLIENTS' as TabId;
    return (Object.keys(ROUTE_PATHS).find(
      (key) => ROUTE_PATHS[key as TabId] === location.pathname
    ) || "DASHBOARD") as TabId;
  })();

  const handleTabChange = (tabId: TabId) => {
    navigate(ROUTE_PATHS[tabId]);
  };

  return (
    <Layout activeTab={activeTab} onTabChange={handleTabChange}>
      <Routes>
        <Route path={ROUTE_PATHS.DASHBOARD} element={<Dashboard />} />
        <Route path={ROUTE_PATHS.STUDIO} element={<Studio />} />
        <Route path="/studio/docs/:id" element={<StudioDoc />} />
        <Route path="/studio/meetings/:id" element={<MeetingHub />} />
        <Route path="/studio/calls/:id" element={<PlugCall />} />
        <Route path={ROUTE_PATHS.AI_ASSISTANT} element={<AIAssistant />} />
        <Route path={ROUTE_PATHS.FINANCES} element={<Finances />} />
        <Route path={ROUTE_PATHS.CLIENTS} element={<Clients />} />
          <Route path="/clients/:id" element={<ClientWorkspace />} />
        <Route path={ROUTE_PATHS.TASKS} element={<Tasks />} />
        <Route path={ROUTE_PATHS.CALENDAR} element={<CalendarPage />} />
        <Route path={ROUTE_PATHS.CONTENT} element={<Content />} />
        <Route path={ROUTE_PATHS.ANALYTICS} element={<Analytics />} />
        <Route path={ROUTE_PATHS.AUTOMATION} element={<Automation />} />
        <Route path={ROUTE_PATHS.INTEGRATIONS} element={<Integrations />} />
        <Route path={ROUTE_PATHS.FILE_VAULT} element={<FileVault />} />
        <Route path={ROUTE_PATHS.VOICE} element={<Voice />} />
        <Route path={ROUTE_PATHS.SETTINGS} element={<Settings />} />
        <Route path={ROUTE_PATHS.STRATEGY_CONNECTIONS} element={<StrategyConnections />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Layout>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <HashRouter>
          <AppContent />
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
