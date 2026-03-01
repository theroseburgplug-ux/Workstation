import React from 'react';
import {
  Zap,
  Mail,
  Calendar,
  Play,
  Settings,
  Bot,
  Cpu,
  Workflow,
  Plus,
  MoreVertical,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Database,
  Bell,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';

const AUTOMATION_STATS = [
  {
    label: 'Active Automations',
    value: '24',
    change: '+12%',
    icon: Workflow,
    color: 'text-primary',
  },
  {
    label: 'Successful Executions',
    value: '1,429',
    change: '99.8%',
    icon: CheckCircle2,
    color: 'text-green-600',
  },
  {
    label: 'Time Saved (Mo)',
    value: '184h',
    change: '+15h',
    icon: Clock,
    color: 'text-accent',
  },
];

const ACTIVE_WORKFLOWS = [
  {
    id: 'wf-1',
    name: 'Lead Response Bot',
    description: 'Auto-reply to website inquiries via Email and WhatsApp.',
    type: 'AI-Driven',
    status: 'active',
    lastRun: '2 mins ago',
    runs: 452,
    category: 'CRM',
  },
  {
    id: 'wf-2',
    name: 'Invoice Generator',
    description: 'Generates and sends PDF invoices when a task is completed.',
    type: 'Logic',
    status: 'active',
    lastRun: '1 hour ago',
    runs: 89,
    category: 'Finance',
  },
  {
    id: 'wf-3',
    name: 'Social Media Sync',
    description: 'Cross-posts content from Instagram to LinkedIn and Twitter.',
    type: 'Integration',
    status: 'inactive',
    lastRun: '3 days ago',
    runs: 1205,
    category: 'Marketing',
  },
  {
    id: 'wf-4',
    name: 'Review Monitor',
    description: 'Alerts team via Slack for any review below 4 stars.',
    type: 'AI-Driven',
    status: 'active',
    lastRun: '15 mins ago',
    runs: 12,
    category: 'Reputation',
  },
];

const TEMPLATES = [
  {
    title: 'Smart Email Follow-up',
    desc: 'Uses AI to tailor follow-up emails based on recipient sentiment.',
    icon: Mail,
  },
  {
    title: 'Content Scheduling',
    desc: 'Automatically posts content at high-engagement peak hours.',
    icon: Calendar,
  },
  {
    title: 'Data Enrichment',
    desc: 'Fills CRM gaps using web scraping and LinkedIn API calls.',
    icon: Database,
  },
];

export default function Automation() {
  return (
    <div className="space-y-8 p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Automation Hub</h1>
          <p className="text-muted-foreground">Manage your AI agents, workflows, and business logic.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
            <Settings className="mr-2 h-4 w-4" />
            API Settings
          </Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            Create Workflow
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {AUTOMATION_STATS.map((stat, idx) => {
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="border-border/40 shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-muted ${stat.color}`}>
                  {(() => { const Icon = stat.icon as React.ComponentType; return <Icon className="h-6 w-6" /> })()}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold">{stat.value}</h3>
                    <span className="text-xs font-semibold text-green-600">{stat.change}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Active Workflows */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-xl">Active Workflows</CardTitle>
                <CardDescription>Monitor and control your live business processes.</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                {ACTIVE_WORKFLOWS.length} Total
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {ACTIVE_WORKFLOWS.map((wf) => (
                  <div key={wf.id} className="p-6 hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-2 rounded-lg bg-background border border-border shadow-sm">
                        {wf.type === 'AI-Driven' ? (
                          <Bot className="h-5 w-5 text-accent" />
                        ) : (
                          <Zap className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{wf.name}</span>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wider py-0">
                            {wf.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{wf.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Play className="h-3 w-3" />
                            Last run: {wf.lastRun}
                          </span>
                          <span className="flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                            {wf.runs} Executions
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch checked={wf.status === 'active'} />
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 p-4 justify-center">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary font-medium">
                View Performance Logs <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-primary text-primary-foreground border-none overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Bot className="h-32 w-32 rotate-12" />
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Agent Training
                </CardTitle>
                <CardDescription className="text-primary-foreground/70">
                  Feed your agents with custom documentation and brand voice guidelines.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Training Status: GPT-5 Nano</span>
                    <span>85% Optimized</span>
                  </div>
                  <Progress value={85} className="h-2 bg-primary-foreground/20" />
                </div>
                <Button variant="secondary" className="w-full bg-white text-primary hover:bg-white/90">
                  Optimize AI Performance
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  Safety & Logs
                </CardTitle>
                <CardDescription>Security monitoring for automation scripts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/30">
                  <span className="text-sm font-medium">Sandbox Mode</span>
                  <Switch />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/30">
                  <span className="text-sm font-medium">Error Notifications</span>
                  <Badge className="bg-accent">Enabled</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Templates & Quick Start */}
        <div className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-xl">Quick Start Templates</CardTitle>
              <CardDescription>Deploy pre-built automations in seconds.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {TEMPLATES.map((tpl) => (
                <div 
                  key={tpl.title} 
                  className="group p-4 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {(() => { const Icon = tpl.icon as React.ComponentType; return <Icon className="h-5 w-5" /> })()}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">{tpl.title}</h4>
                      <p className="text-xs text-muted-foreground">{tpl.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full">
                Browse Template Store
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-accent/5">
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Runs</CardTitle>
              <CardDescription>Scheduled tasks for the next 24 hours.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-accent" />
                      <div>
                        <p className="text-sm font-medium">Monthly Report Export</p>
                        <p className="text-xs text-muted-foreground">In {i * 4} hours</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Scheduled</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 p-4 rounded-2xl bg-muted/30 border border-dashed border-border">
             <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
               <Share2 className="h-4 w-4" />
               Integrate more platforms
             </div>
             <p className="text-xs text-muted-foreground">
               Connect Shopify, HubSpot, or Salesforce to unlock deep automations.
             </p>
             <Button size="sm" variant="link" className="justify-start p-0 h-auto text-primary">
               Go to Integrations
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
