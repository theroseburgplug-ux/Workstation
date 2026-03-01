import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Power,
  Settings,
  Filter,
  ExternalLink,
  Plus
} from 'lucide-react';
import {
  SiFacebook,
  SiX,
  SiLinkedin,
  SiHubspot,
  SiGoogledrive,
  SiSlack,
  SiMailchimp,
  SiShopify
} from 'react-icons/si';
import { Integration } from '@/lib/index';
import { mockIntegrations } from '@/data/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Icon mapping for dynamic rendering from mock data
const IconMap: Record<string, React.ElementType> = {
  SiFacebook,
  SiX,
  SiLinkedin,
  SiHubspot,
  SiGoogledrive,
  SiSlack,
  SiMailchimp,
  SiShopify,
};

export default function Integrations() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredIntegrations = mockIntegrations.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'error':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'disconnected':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 mr-1" />;
      case 'disconnected':
        return <Power className="w-3 h-3 mr-1" />;
    }
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect and manage your marketing stack, CRM, and social media platforms.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Sync All
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Request Integration
          </Button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
        <Tabs 
          value={activeCategory} 
          onValueChange={setActiveCategory} 
          className="w-full md:w-auto"
        >
          <TabsList className="grid grid-cols-3 md:flex">
            <TabsTrigger value="all">All Tools</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="ads">Ads & SEO</TabsTrigger>
            <TabsTrigger value="crm">CRM</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((integration, index) => {
          const IconComponent = IconMap[integration.icon] || ExternalLink;

          return (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full flex flex-col hover:shadow-md transition-all duration-200 border-border/50 overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-secondary flex items-center justify-center text-primary">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <Badge 
                        variant="outline" 
                        className={`mt-1 font-medium capitalize ${getStatusColor(integration.status)}`}
                      >
                        {getStatusIcon(integration.status)}
                        {integration.status}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Settings className="w-4 h-4" />
                  </Button>
                </CardHeader>
                
                <CardContent className="flex-grow">
                  <CardDescription className="text-sm leading-relaxed">
                    {integration.description}
                  </CardDescription>
                  {integration.lastSync && (
                    <div className="mt-4 flex items-center text-xs text-muted-foreground">
                      <RefreshCw className="w-3 h-3 mr-1.5" />
                      Last synced: {integration.lastSync}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="bg-muted/30 border-t border-border/50 py-3 flex justify-between items-center">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {integration.category}
                  </div>
                  <Button 
                    variant={integration.status === 'connected' ? 'outline' : 'default'} 
                    size="sm"
                    className="h-8 px-4"
                  >
                    {integration.status === 'connected' ? 'Configure' : 'Connect Now'}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}

        {/* Empty State */}
        {filteredIntegrations.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-border">
            <div className="p-4 bg-muted rounded-full mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No integrations found</h3>
            <p className="text-muted-foreground text-center max-w-sm px-4">
              We couldn't find any tools matching "{searchQuery}". Try adjusting your filters or search terms.
            </p>
            <Button 
              variant="link" 
              className="mt-2 text-primary"
              onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
            >
              Clear all filters
            </Button>
          </div>
        )}
      </div>

      <section className="bg-primary/5 rounded-2xl p-8 border border-primary/10">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-bold">Custom API Integration</h2>
            <p className="text-muted-foreground">
              Need to connect a proprietary tool or a platform not listed here? 
              Our engineering team can build custom webhooks and API connections 
              tailored to your agency's specific workflow requirements.
            </p>
            <div className="flex gap-4 pt-2">
              <Button className="bg-primary hover:bg-primary/90">Read Documentation</Button>
              <Button variant="outline">Contact Support</Button>
            </div>
          </div>
          <div className="hidden lg:grid grid-cols-3 gap-3 opacity-20">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-12 h-12 bg-primary rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
