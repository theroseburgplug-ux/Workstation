import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, CheckCircle2, FileText, MessageSquare, Play, Sparkles, UserPlus, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const actionItems = [
  { title: 'Send website access request', owner: 'Shane', due: 'Tomorrow' },
  { title: 'Draft recruiting-focused homepage copy', owner: 'Shane', due: 'Friday' },
  { title: 'Collect team photos and jobsite media', owner: 'Client', due: 'Next week' },
];

export default function MeetingHub() {
  const { id } = useParams();
  const isNew = id === 'new';

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon"><Link to="/studio"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <Badge variant="outline" className="mb-2 border-primary/20 text-primary">Meeting Hub · {isNew ? 'New Meeting' : 'AI Summary Ready'}</Badge>
            <h1 className="text-3xl font-bold tracking-tight">{isNew ? 'Schedule Meeting' : 'L&M Website Strategy Call'}</h1>
            <p className="mt-1 text-muted-foreground">L&M Custom Builders · Website + Recruiting · Planning Workspace</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground"><Link to="/studio/calls/new"><Video className="mr-2 h-4 w-4" />Start Plug Call</Link></Button>
          <Button variant="outline"><Calendar className="mr-2 h-4 w-4" />Add to Calendar</Button>
          <Button variant="outline"><UserPlus className="mr-2 h-4 w-4" />Invite</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 border border-border flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recording">Recording</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="summary">AI Summary</TabsTrigger>
          <TabsTrigger value="actions">Action Items</TabsTrigger>
          <TabsTrigger value="docs">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
            <Card className="border-border/50">
              <CardHeader><CardTitle>Meeting Overview</CardTitle><CardDescription>The meeting is connected to the client, project, workspace, files, and next steps.</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ['Purpose', 'Clarify website direction and recruiting message.'],
                  ['Attendees', 'Shane, Val, Becca'],
                  ['Date', 'Monday · 11:00 AM'],
                  ['Duration', '42 minutes'],
                  ['Visibility', 'Internal team'],
                  ['Next Meeting', 'Not scheduled'],
                ].map(([label, value]) => <div key={label} className="rounded-lg border border-border/50 bg-muted/30 p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 font-medium">{value}</p></div>)}
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/80">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" />Meeting AI</CardTitle><CardDescription>Turn conversation into actual project movement.</CardDescription></CardHeader>
              <CardContent className="space-y-2">
                {['Generate follow-up email', 'Create project tasks', 'Update client notes', 'Summarize decisions'].map((action) => <Button key={action} variant="ghost" className="w-full justify-start"><Sparkles className="mr-2 h-4 w-4" />{action}</Button>)}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recording"><Card><CardContent className="flex min-h-[420px] flex-col items-center justify-center text-center"><div className="rounded-full bg-primary/10 p-6 text-primary"><Play className="h-10 w-10" /></div><h3 className="mt-5 text-xl font-semibold">Recording Placeholder</h3><p className="mt-2 max-w-md text-muted-foreground">Plug Calls should save recordings here with timestamp links into the transcript and notes.</p></CardContent></Card></TabsContent>

        <TabsContent value="transcript"><Card><CardHeader><CardTitle>Transcript</CardTitle><CardDescription>Searchable transcript with speaker labels and timestamps.</CardDescription></CardHeader><CardContent className="space-y-4 text-sm"><p><strong>00:02 Shane:</strong> Let's talk about the kind of employee you're trying to attract.</p><p><strong>03:18 Val:</strong> We need people who can solve problems and fit the culture.</p><p><strong>11:40 Becca:</strong> We also need the website to make applying feel simple.</p></CardContent></Card></TabsContent>

        <TabsContent value="summary"><Card><CardHeader><CardTitle>AI Summary</CardTitle><CardDescription>Review before saving to client memory.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-lg border border-primary/20 bg-primary/5 p-4"><p className="font-medium">Summary</p><p className="mt-2 text-sm text-muted-foreground">The website should position L&M around culture, craftsmanship, and recruiting the right kind of team member. The next steps are access collection, homepage copy, photos, and a clearer application flow.</p></div></CardContent></Card></TabsContent>

        <TabsContent value="actions"><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{actionItems.map((item) => <Card key={item.title} className="border-border/50"><CardHeader><CardTitle className="text-base">{item.title}</CardTitle><CardDescription>{item.owner} · {item.due}</CardDescription></CardHeader><CardContent className="flex gap-2"><Button size="sm"><CheckCircle2 className="mr-2 h-4 w-4" />Create Task</Button><Button size="sm" variant="outline">Dismiss</Button></CardContent></Card>)}</div></TabsContent>

        <TabsContent value="docs"><Card><CardHeader><CardTitle>Related Documents</CardTitle></CardHeader><CardContent className="space-y-2">{['Meeting Recap', 'Website Brief', 'Homepage Copy Draft'].map((doc) => <Button key={doc} asChild variant="outline" className="w-full justify-start"><Link to="/studio/docs/new"><FileText className="mr-2 h-4 w-4" />{doc}</Link></Button>)}</CardContent></Card></TabsContent>

        <TabsContent value="activity"><Card><CardContent className="space-y-3 pt-6 text-sm text-muted-foreground"><p><MessageSquare className="mr-2 inline h-4 w-4" />AI summary generated.</p><p><CheckCircle2 className="mr-2 inline h-4 w-4" />3 action items detected.</p><p><Calendar className="mr-2 inline h-4 w-4" />Meeting attached to L&M Website + Recruiting.</p></CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
