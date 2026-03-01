import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Plus, 
  ExternalLink, 
  Filter, 
  ArrowUpRight, 
  TrendingUp,
  UserPlus
} from 'lucide-react';
import { ROUTE_PATHS, Client } from '@/lib/index';
import { useTRPData } from '@/lib/trpData';
import { DataTable } from '@/components/DataTable';
import { AddClientModal } from '@/components/Modals';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Clients() {
  const navigate = useNavigate();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { state, addClient } = useTRPData();

  const filteredClients = useMemo(() => {
    return state.clients.filter(client => {
      const matchesSearch = 
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter, state.clients]);

  const stats = useMemo(() => ({
    total: state.clients.length,
    active: state.clients.filter(c => c.status === 'active').length,
    revenue: state.clients.reduce((acc, c) => acc + c.revenue, 0),
    pending: state.clients.filter(c => c.status === 'pending' || c.status === 'onboarding').length
  }), [state.clients]);

  const columns = [
    {
      header: 'Client',
      key: 'avatar',
      type: 'avatar' as const,
      className: 'min-w-[260px]'
    },
    {
      header: 'Company',
      key: 'company',
      type: 'text' as const,
      className: 'min-w-[160px]'
    },
    {
      header: 'Status',
      key: 'status',
      type: 'status' as const
    },
    {
      header: 'Revenue',
      key: 'revenue',
      type: 'currency' as const
    },
    {
      header: 'Tags',
      key: 'tags',
      type: 'badge' as const
    }
  ];

  const handleAddClient = (data: any) => {
    addClient(data);
    setIsAddModalOpen(false);
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Client Management</h1>
          <p className="text-muted-foreground">
            Manage your agency partnerships, monitor revenue, and access dedicated workspaces.
          </p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Add New Client
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Users className="h-4 w-4 mr-2 text-primary" />
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered partners</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-primary" />
              Active Retainers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground mt-1">High-engagement clients</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <ArrowUpRight className="h-4 w-4 mr-2 text-accent" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.revenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Gross monthly income</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Plus className="h-4 w-4 mr-2 text-accent" />
              In Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Onboarding or pending</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row gap-4 justify-between bg-muted/30">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients, companies, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-border/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-background border border-border/50 rounded-md p-1">
              {['all', 'active', 'onboarding', 'pending', 'inactive'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 text-xs rounded-sm transition-all capitalize ${
                    statusFilter === status 
                      ? 'bg-primary text-primary-foreground font-medium shadow-sm' 
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <Button variant="outline" size="icon" className="border-border/50">
              <Filter className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

            <DataTable
              data={filteredClients}
              columns={columns}
                  actions={(client: Client) => (
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                        title="Open Client Workspace"
                        onClick={() => navigate(`/clients/${client.id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span className="ml-2 hidden sm:inline">Workspace</span>
                      </Button>
                    </div>
                  )}
                />
      </div>

      <AddClientModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSubmit={handleAddClient}
      />
    </div>
  );
}
