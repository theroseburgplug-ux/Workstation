import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FilePlus,
  FileText,
  Filter,
  Link2,
  MessageSquare,
  Mic,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Table2,
  Upload,
  Users,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreativeObject, CreativeObjectStatus, CreativeObjectType, CreativeObjectVisibility } from '@/lib/index';
import { staggerContainer, staggerItem } from '@/lib/motion';

const creativeObjects: CreativeObject[] = [
  {
    id: 'studio-1',
    type: 'doc',
    title: 'Ridgecrest Homepage Copy Draft',
    description: 'Homepage headline, section copy, CTA options, and local SEO notes.',
    clientName: 'Ridgecrest Racing',
    projectName: 'Website Refresh',
    workspaceName: 'Copywriting',
    owner: 'Shane',
    status: 'draft',
    visibility: 'internal',
    updatedAt: '2 hours ago',
    commentCount: 3,
    aiSummaryReady: true,
    approvalStatus: 'draft',
    relatedCount: 6,
  },
  {
    id: 'studio-2',
    type: 'sheet',
    title: 'July Content Calendar',
    description: 'Social posts, video cutdowns, captions, approvals, and publishing dates.',
    clientName: 'The Roseburg Plug',
    projectName: 'Monthly Content',
    workspaceName: 'Social Content',
    owner: 'Shane',
    status: 'ready-for-review',
    visibility: 'project-team',
    updatedAt: 'Yesterday',
    commentCount: 8,
    aiSummaryReady: false,
    approvalStatus: 'ready-for-review',
    relatedCount: 11,
  },
  {
    id: 'studio-3',
    type: 'meeting',
    title: 'L&M Website Strategy Call',
    description: 'Discovery notes, recruitment messaging, content needs, and next actions.',
    clientName: 'L&M Custom Builders',
    projectName: 'Website + Recruiting',
    workspaceName: 'Planning',
    owner: 'Shane',
    status: 'approved',
    visibility: 'internal',
    updatedAt: 'Monday',
    commentCount: 2,
    aiSummaryReady: true,
    approvalStatus: 'approved',
    relatedCount: 9,
  },
  {
    id: 'studio-4',
    type: 'call',
    title: 'Betty Simon Plug Call',
    description: 'Video review, YouTube planning, thumbnails, and shorts workflow.',
    clientName: 'Betty Simon',
    projectName: 'YouTube Production',
    workspaceName: 'Video',
    owner: 'Shane',
    status: 'draft',
    visibility: 'client-visible',
    updatedAt: 'Today',
    commentCount: 1,
    aiSummaryReady: true,
    approvalStatus: 'draft',
    relatedCount: 4,
  },
];

const docTemplates = [
  'Proposal',
  'Homepage Copy',
  'Meeting Recap',
  'Campaign Brief',
  'Video Script',
  'Client Update',
];

const sheetTemplates = [
  'Content Calendar',
  'Shot List',
  'SEO Keyword Tracker',
  'Campaign Tracker',
  'Sponsor Tracker',
  'Budget Sheet',
];

const meetingActions = [
  { label: 'Generate agenda', icon: Sparkles },
  { label: 'Sync calendar', icon: Calendar },
  { label: 'Extract tasks', icon: CheckCircle2 },
  { label: 'Draft follow-up', icon: FileText },
];

const typeMeta: Record<CreativeObjectType, { label: string; icon: React.ElementType; className: string }> = {
  doc: { label: 'Doc', icon: FileText, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  sheet: { label: 'Sheet', icon: Table2, className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  meeting: { label: 'Meeting', icon: Calendar, className: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  call: { label: 'Plug Call', icon: Video, className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  whiteboard: { label: 'Whiteboard', icon: Eye, className: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
  form: { label: 'Form', icon: FilePlus, className: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
  transcript: { label: 'Transcript', icon: Mic, className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
};

const statusLabels: Record<CreativeObjectStatus, string> = {
  draft: 'Draft',
  'ready-for-review': 'Ready for Review',
  approved: 'Approved',
  'changes-requested': 'Changes Requested',
  archived: 'Archived',
};

const visibilityLabels: Record<CreativeObjectVisibility, string> = {
  private: 'Private',
  internal: 'Internal',
  'project-team': 'Project Team',
  'client-visible': 'Client Visible',
  'client-editable': 'Client Editable',
  'public-link': 'Public Link',
};

function objectHref(object: CreativeObject) {
  if (object.type === 'doc') return `/studio/docs/${object.id}`;
  if (object.type === 'meeting') return `/studio/meetings/${object.id}`;
  if (object.type === 'call') return `/studio/calls/${object.id}`;
  return '/studio';
}

function CreativeObjectCard({ object }: { object: CreativeObject }) {
  const meta = typeMeta[object.type];
  const Icon = meta.icon;

  return (
    <Card className="group border-border/50 bg-card/90 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <Badge className={`${meta.className} border gap-1.5`}>
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            {statusLabels[object.status]}
          </Badge>
        </div>
        <div>
          <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
            {object.title}
          </CardTitle>
          <CardDescription className="mt-1">
            {object.clientName} · {object.projectName} · {object.workspaceName}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{object.description}</p>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {object.owner}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {object.updatedAt}
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            {object.commentCount ?? 0} comments
          </div>
          <div className="flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5" />
            {object.relatedCount ?? 0} related
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
          <Badge variant="secondary" className="text-[11px]">
            <ShieldCheck className="mr-1 h-3 w-3" />
            {visibilityLabels[object.visibility]}
          </Badge>
          {object.aiSummaryReady && (
            <Badge variant="outline" className="text-[11px] border-primary/20 text-primary">
              <Sparkles className="mr-1 h-3 w-3" />
              AI Ready
            </Badge>
          )}
          <Button asChild size="sm" variant="outline" className="ml-auto">
            <Link to={objectHref(object)}>Open</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ContextPanel() {
  return (
    <Card className="border-border/50 bg-card/80 lg:sticky lg:top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Context + AI
        </CardTitle>
        <CardDescription>The studio should understand the client, project, workspace, and brand behind the work.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client Context</p>
          <p className="mt-2 text-sm">Ridgecrest Racing · Website Refresh · Copywriting</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brand Voice</p>
          <p className="mt-2 text-sm text-muted-foreground">Confident, fast-paced, sponsor-aware, community-rooted.</p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">AI Suggestions</p>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            <li>Generate homepage hero options.</li>
            <li>Turn meeting notes into project tasks.</li>
            <li>Prepare copy for client review.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Studio() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | CreativeObjectType>('all');

  const filteredObjects = useMemo(() => {
    return creativeObjects.filter((object) => {
      const matchesType = typeFilter === 'all' || object.type === typeFilter;
      const haystack = `${object.title} ${object.description} ${object.clientName} ${object.projectName} ${object.workspaceName}`.toLowerCase();
      const matchesSearch = haystack.includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [searchQuery, typeFilter]);

  const setFilter = (value: string) => setTypeFilter(value as 'all' | CreativeObjectType);

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <Badge variant="outline" className="mb-3 border-primary/20 text-primary">Phase 12 · Creative Work Layer</Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Creative Studio</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Create docs, sheets, calls, meeting notes, and client-ready deliverables without losing the project context.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="shadow-lg shadow-primary/20">
              <Link to="/studio/docs/new"><FileText className="mr-2 h-4 w-4" />New Doc</Link>
            </Button>
            <Button variant="outline">
              <Table2 className="mr-2 h-4 w-4" />
              New Sheet
            </Button>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/20">
              <Link to="/studio/calls/new"><Video className="mr-2 h-4 w-4" />Start Plug Call</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/studio/meetings/new"><Calendar className="mr-2 h-4 w-4" />Schedule Meeting</Link>
            </Button>
          </div>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Creative Objects', value: '28', icon: FileText, note: 'Docs, sheets, calls' },
            { label: 'Client Visible', value: '7', icon: Eye, note: 'Shared externally' },
            { label: 'AI Summaries', value: '13', icon: Sparkles, note: 'Ready to review' },
            { label: 'Plug Calls', value: '4', icon: Radio, note: 'This month' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div variants={staggerItem} key={stat.label}>
                <Card className="border-border/50 bg-card/80">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.note}</p>
                      </div>
                      <div className="rounded-full bg-primary/10 p-2 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <Tabs defaultValue="all" className="space-y-6" onValueChange={setFilter}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <TabsList className="bg-muted/50 p-1 border border-border flex-wrap h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="doc">Docs</TabsTrigger>
            <TabsTrigger value="sheet">Sheets</TabsTrigger>
            <TabsTrigger value="meeting">Meetings</TabsTrigger>
            <TabsTrigger value="call">Calls</TabsTrigger>
            <TabsTrigger value="whiteboard">Whiteboards</TabsTrigger>
          </TabsList>

          <div className="flex w-full lg:w-auto gap-2">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search docs, calls, meetings..."
                className="pl-9 bg-card border-border"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value={typeFilter} className="mt-0">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredObjects.length > 0 ? (
                  filteredObjects.map((object) => <CreativeObjectCard key={object.id} object={object} />)
                ) : (
                  <Card className="md:col-span-2 border-dashed border-border/70 bg-muted/20">
                    <CardContent className="flex min-h-56 flex-col items-center justify-center text-center">
                      <FilePlus className="mb-4 h-10 w-10 text-muted-foreground/40" />
                      <h3 className="text-lg font-semibold">Nothing here yet</h3>
                      <p className="mt-1 max-w-md text-sm text-muted-foreground">
                        Create a doc, sheet, Plug Call, meeting hub, or whiteboard and attach it to a client, project, or workspace.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4 text-primary" />
                      Doc Templates
                    </CardTitle>
                    <CardDescription>Start from agency-focused writing formats.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                    {docTemplates.map((template) => (
                      <Button key={template} asChild variant="outline" className="justify-start">
                        <Link to="/studio/docs/new">{template}</Link>
                      </Button>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Table2 className="h-4 w-4 text-emerald-500" />
                      Sheet Templates
                    </CardTitle>
                    <CardDescription>Useful tables without rebuilding Excel first.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                    {sheetTemplates.map((template) => (
                      <Button key={template} variant="outline" className="justify-start">
                        {template}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="space-y-5">
              <ContextPanel />

              <Card className="border-border/50 bg-card/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Video className="h-4 w-4 text-accent" />
                    Plug Call v1
                  </CardTitle>
                  <CardDescription>Make video calling visible as a first-class object.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link to="/studio/calls/new"><Video className="mr-2 h-4 w-4" />Start Instant Call</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/studio/meetings/new"><Calendar className="mr-2 h-4 w-4" />Schedule for Later</Link>
                  </Button>
                  <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm text-muted-foreground">
                    Calls should save a meeting record, transcript, AI summary, action items, and client timeline entry.
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/80">
                <CardHeader>
                  <CardTitle className="text-base">Meeting Hub Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {meetingActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button key={action.label} asChild variant="ghost" className="w-full justify-start">
                        <Link to="/studio/meetings/new"><Icon className="mr-2 h-4 w-4" />{action.label}</Link>
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    Google + Microsoft Sync
                  </CardTitle>
                  <CardDescription>Native first. Sync second.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Google Docs: not connected</p>
                  <p>Google Sheets: not connected</p>
                  <p>Microsoft 365: not connected</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
