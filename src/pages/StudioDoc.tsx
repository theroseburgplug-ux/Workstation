import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, MessageSquare, Save, Sparkles, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function StudioDoc() {
  const { id } = useParams();
  const isNew = id === 'new';

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon"><Link to="/studio"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <Badge variant="outline" className="mb-2 border-primary/20 text-primary">Plug Doc · {isNew ? 'New Document' : 'Draft'}</Badge>
            <h1 className="text-3xl font-bold tracking-tight">{isNew ? 'New Plug Doc' : 'Ridgecrest Homepage Copy Draft'}</h1>
            <p className="mt-1 text-muted-foreground">Ridgecrest Racing · Website Refresh · Copywriting Workspace</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><UploadCloud className="mr-2 h-4 w-4" />Export to Google Docs</Button>
          <Button variant="outline"><MessageSquare className="mr-2 h-4 w-4" />Request Review</Button>
          <Button><Save className="mr-2 h-4 w-4" />Save Draft</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr_340px] gap-5">
        <Card className="border-border/50 bg-card/80">
          <CardHeader><CardTitle className="text-base">Project Docs</CardTitle><CardDescription>Documents connected to this project.</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {['Homepage Copy', 'About Page Draft', 'Service Descriptions', 'Meeting Recap', 'SEO Notes'].map((doc) => <Button key={doc} variant={doc === 'Homepage Copy' ? 'secondary' : 'ghost'} className="w-full justify-start"><FileText className="mr-2 h-4 w-4" />{doc}</Button>)}
          </CardContent>
        </Card>

        <Card className="min-h-[720px] border-border/50 bg-card/95">
          <CardHeader className="border-b border-border/50"><CardTitle>Homepage Copy</CardTitle><CardDescription>Autosaved 18 seconds ago · Internal only · Draft</CardDescription></CardHeader>
          <CardContent className="p-8">
            <textarea className="min-h-[560px] w-full resize-none rounded-lg border border-border bg-background p-6 text-base leading-8 outline-none focus:border-primary/40" defaultValue={'Built for teams that show up ready to win.\n\nUse this space for homepage copy, proposals, scripts, recaps, and client-ready writing.'} />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-border/50 bg-card/80">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" />AI Writing Assistant</CardTitle><CardDescription>Context-aware tools for this client and workspace.</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {['Rewrite section', 'Generate headlines', 'Create SEO description', 'Prepare for review'].map((action) => <Button key={action} variant="ghost" className="w-full justify-start"><Sparkles className="mr-2 h-4 w-4" />{action}</Button>)}
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80"><CardHeader><CardTitle className="text-base">Context</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>Brand voice: confident, local, sponsor-aware.</p><p>Related assets: logo, sponsor list, race photos, meeting notes.</p></CardContent></Card>
        </div>
      </div>
    </div>
  );
}
