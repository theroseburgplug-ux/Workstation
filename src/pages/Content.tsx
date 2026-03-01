import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Calendar,
  Video,
  Share2,
  Layers,
  CheckCircle2,
  Clock,
  Edit3,
  Filter,
  Search,
  MoreHorizontal,
  Instagram,
  Twitter,
  Linkedin,
  Facebook,
  Youtube,
  FileText,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentItem } from '@/lib/index';
import { ContentCreatorModal } from '@/components/Modals';
import { springPresets, fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';

const mockContent: ContentItem[] = [
  {
    id: '1',
    title: 'Autumn Campaign Teaser',
    type: 'video',
    status: 'scheduled',
    publishDate: '2026-03-15',
    platforms: ['Instagram', 'TikTok'],
    clientName: 'EcoWare Solutions',
    description: 'High-energy teaser for the upcoming sustainable line.',
    thumbnail: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=250&fit=crop'
  },
  {
    id: '2',
    title: 'Future of Digital Marketing 2026',
    type: 'blog',
    status: 'published',
    publishDate: '2026-02-10',
    platforms: ['Website', 'LinkedIn'],
    clientName: 'The Roseburg Plug',
    description: 'Deep dive into AI-driven automation trends.'
  },
  {
    id: '3',
    title: 'Weekly Roundup',
    type: 'social',
    status: 'draft',
    publishDate: '2026-02-20',
    platforms: ['Twitter', 'LinkedIn'],
    clientName: 'TechVibe Corp',
    description: 'Summary of the most important tech news this week.'
  },
  {
    id: '4',
    title: 'Product Launch Ad Set',
    type: 'ad',
    status: 'scheduled',
    publishDate: '2026-02-28',
    platforms: ['Facebook', 'Instagram'],
    clientName: 'Luxe Aesthetics',
    description: 'High-conversion carousel ads for new skincare range.'
  }
];

const platformIcons: Record<string, React.ReactNode> = {
  Instagram: <Instagram className="w-4 h-4" />,
  Twitter: <Twitter className="w-4 h-4" />,
  LinkedIn: <Linkedin className="w-4 h-4" />,
  Facebook: <Facebook className="w-4 h-4" />,
  Youtube: <Youtube className="w-4 h-4" />,
  TikTok: <Share2 className="w-4 h-4" />,
  Website: <FileText className="w-4 h-4" />
};

export default function Content() {
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'scheduled': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'draft': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Content Planner</h1>
          <p className="text-muted-foreground">Manage your agency's creative pipeline and social strategy.</p>
        </div>
        <Button 
          onClick={() => setIsCreatorOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Content
        </Button>
      </div>

      {/* Overview Stats */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden" 
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <motion.div variants={staggerItem}>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <div className="p-2 bg-blue-500/10 rounded-full">
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={staggerItem}>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Draft</p>
                  <p className="text-2xl font-bold">8</p>
                </div>
                <div className="p-2 bg-amber-500/10 rounded-full">
                  <Edit3 className="w-5 h-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={staggerItem}>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Live Assets</p>
                  <p className="text-2xl font-bold">142</p>
                </div>
                <div className="p-2 bg-emerald-500/10 rounded-full">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={staggerItem}>
          <Card className="bg-card border-border/50 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Next Shoot</p>
                  <p className="text-2xl font-bold">2 days</p>
                </div>
                <div className="p-2 bg-accent/10 rounded-full">
                  <Video className="w-5 h-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Content Area */}
      <Tabs defaultValue="pipeline" className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <TabsList className="bg-muted/50 p-1 border border-border">
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-card">Content Pipeline</TabsTrigger>
            <TabsTrigger value="social" className="data-[state=active]:bg-card">Social Calendar</TabsTrigger>
            <TabsTrigger value="production" className="data-[state=active]:bg-card">Video Production</TabsTrigger>
            <TabsTrigger value="shoot" className="data-[state=active]:bg-card">Shoot Mode</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search content..." 
                className="pl-9 bg-card border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {mockContent.map((item) => (
              <motion.div 
                key={item.id}
                variants={fadeInUp}
                initial="initial"
                animate="animate"
              >
                <Card className="group overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300">
                  {item.thumbnail ? (
                    <div className="relative h-48 overflow-hidden">
                      <img 
                        src={item.thumbnail} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute top-3 left-3">
                        <Badge className={`${getStatusColor(item.status)} border capitalize shadow-sm backdrop-blur-md`}>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 bg-muted flex items-center justify-center">
                      <Layers className="w-12 h-12 text-muted-foreground/30" />
                      <div className="absolute top-3 left-3">
                        <Badge className={`${getStatusColor(item.status)} border capitalize shadow-sm backdrop-blur-md`}>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider mb-2">
                        {item.type}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">{item.title}</CardTitle>
                    <CardDescription className="text-sm font-medium text-accent">{item.clientName}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div className="flex -space-x-2">
                        {item.platforms.map((p: string) => (
                          <div key={p} title={p} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground">
                            {platformIcons[p] || <Share2 className="w-3 h-3" />}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="w-3 h-3 mr-1" />
                        {item.publishDate}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="social">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Social Media Scheduler</CardTitle>
              <CardDescription>Drag and drop to reschedule posts across platforms.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-[400px] flex items-center justify-center text-muted-foreground bg-muted/20 rounded-lg m-6">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Social Calendar visualization will be integrated here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Video Production Tracker</CardTitle>
              <CardDescription>Monitor the status of active video projects and edits.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 border border-border/50 rounded-lg bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                          <Video className="text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">Commercial Shoot #00{i}</h4>
                          <p className="text-sm text-muted-foreground">Editing Phase • 75% complete</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">Review Edit</Button>
                        <Button size="sm">Update Status</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shoot">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-accent" />
                  Shoot Mode: Active Production
                </CardTitle>
                <CardDescription>Real-time checklist for on-set efficiency.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Gear Checklist</h4>
                  {[ 
                    { item: 'Sony A7S III (A-Cam)', status: true },
                    { item: 'DJI RS3 Pro Gimbal', status: true },
                    { item: 'Wireless Lav Mics', status: false },
                    { item: 'Aputure 300d II Light Kit', status: true }
                  ].map((gear, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                      <span className="text-sm">{gear.item}</span>
                      <Badge variant={gear.status ? 'default' : 'outline'} className={gear.status ? 'bg-emerald-500' : ''}>
                        {gear.status ? 'Ready' : 'Missing'}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Shot List</h4>
                  {[
                    'B-Roll: Product Close-ups (Macro)',
                    'Interview: CEO Soundbites',
                    'Lifestyle: User Interaction',
                    'Drone: Exterior HQ View'
                  ].map((shot, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 border-b border-border last:border-0">
                      <div className="w-5 h-5 rounded border border-border flex items-center justify-center">
                        {idx < 2 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </div>
                      <span className={idx < 2 ? 'text-muted-foreground line-through' : ''}>{shot}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">Shoot Logistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg">
                    <p className="text-xs text-accent font-bold uppercase">Location</p>
                    <p className="text-sm font-medium">Roseburg Heights Studios</p>
                  </div>
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-xs text-primary font-bold uppercase">Call Time</p>
                    <p className="text-sm font-medium">08:30 AM (PST)</p>
                  </div>
                  <div className="p-3 bg-muted/50 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground font-bold uppercase">Director</p>
                    <p className="text-sm font-medium">Jordan Smith</p>
                  </div>
                </CardContent>
              </Card>

              <Button className="w-full bg-accent hover:bg-accent/90 text-white" size="lg">
                <Video className="mr-2 h-4 w-4" />
                Start Production Timer
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Content Creator Modal */}
      <ContentCreatorModal 
        isOpen={isCreatorOpen} 
        onClose={() => setIsCreatorOpen(false)}
        onSubmit={(data: any) => {
          console.log('New Content Data:', data);
          setIsCreatorOpen(false);
        }}
      />
    </div>
  );
}
