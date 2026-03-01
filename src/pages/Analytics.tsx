import React from 'react';
import {
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar as CalendarIcon,
  Download,
  Filter,
  Zap
} from 'lucide-react';
import {
  PerformanceChart,
  RevenueChart,
  ClientGrowthChart,
  ProjectChart
} from '@/components/Charts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Analytics = () => {
  const stats = [
    {
      label: 'Total Revenue',
      value: '$124,500',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      description: 'Total revenue this quarter'
    },
    {
      label: 'Active Clients',
      value: '48',
      change: '+4.2%',
      trend: 'up',
      icon: Users,
      description: 'Net growth in active accounts'
    },
    {
      label: 'Project Completion',
      value: '94.2%',
      change: '+2.1%',
      trend: 'up',
      icon: CheckCircle,
      description: 'On-time delivery rate'
    },
    {
      label: 'Campaign ROI',
      value: '4.8x',
      change: '-0.4%',
      trend: 'down',
      icon: TrendingUp,
      description: 'Average return on ad spend'
    }
  ];

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Business Analytics</h1>
          <p className="text-muted-foreground mt-1">Comprehensive performance metrics for Roseburg Organic operations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <CalendarIcon className="h-4 w-4" />
            Last 30 Days
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button size="sm" className="h-9 gap-2 bg-primary hover:bg-primary/90">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon as React.ComponentType;
          return (
            <Card key={index} className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center mt-1">
                  {stat.trend === 'up' ? (
                    <span className="flex items-center text-xs font-medium text-emerald-600">
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      {stat.change}
                    </span>
                  ) : (
                    <span className="flex items-center text-xs font-medium text-destructive">
                      <ArrowDownRight className="h-3 w-3 mr-1" />
                      {stat.change}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-2">vs last month</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-6 bg-muted/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle>Revenue Forecast</CardTitle>
                <CardDescription>Monthly projected vs actual revenue for 2026.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 h-[350px]">
                <RevenueChart />
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle>Client Growth</CardTitle>
                <CardDescription>New client acquisitions and retention trends.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 h-[350px]">
                <ClientGrowthChart />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border/50">
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>KPI tracking across different agency departments.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 h-[300px]">
                <PerformanceChart />
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-accent" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-background border border-border/50 text-sm">
                  <p className="font-semibold text-primary mb-1">Revenue Optimization</p>
                  <p className="text-muted-foreground">Social media ad spend for Client A is yielding 20% higher ROI than the average. Recommend shifting budget from display ads.</p>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border/50 text-sm">
                  <p className="font-semibold text-primary mb-1">Capacity Alert</p>
                  <p className="text-muted-foreground">Current task completion rate indicates 85% team utilization. New client onboarding may require resource reallocation.</p>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border/50 text-sm">
                  <p className="font-semibold text-primary mb-1">Retention Opportunity</p>
                  <p className="text-muted-foreground">3 high-value clients are nearing their contract renewal date. Scheduling follow-up strategy sessions is recommended.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue">
           <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Detailed analysis of revenue streams and client profitability.</CardDescription>
              </CardHeader>
              <CardContent className="h-[500px]">
                <RevenueChart />
              </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="projects">
           <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Project Portfolio</CardTitle>
                <CardDescription>Status and distribution of current marketing campaigns.</CardDescription>
              </CardHeader>
              <CardContent className="h-[500px]">
                <ProjectChart />
              </CardContent>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;