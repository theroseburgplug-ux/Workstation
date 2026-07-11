import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, CameraOff, CheckCircle2, Copy, FileText, MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, Sparkles, Users, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const participants = ['Shane', 'Client Guest', 'AI Note Taker'];
const liveNotes = ['Client wants the homepage to feel more direct.', 'Collect logo files before design starts.', 'Follow-up email should include next three steps.'];
const chat = [
  { from: 'Shane', text: 'I added the website brief to this meeting.' },
  { from: 'Client Guest', text: 'Perfect, I can upload the logo after this.' },
];

export default function PlugCall() {
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [recording, setRecording] = useState(true);

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon"><Link to="/studio"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <Badge variant="outline" className="mb-2 border-accent/30 text-accent">Plug Call · Live Room</Badge>
            <h1 className="text-3xl font-bold tracking-tight">Betty Simon Plug Call</h1>
            <p className="mt-1 text-muted-foreground">Betty Simon · YouTube Production · Video Workspace</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><Copy className="mr-2 h-4 w-4" />Copy Invite Link</Button>
          <Button variant="outline"><FileText className="mr-2 h-4 w-4" />Open Meeting Hub</Button>
          <Button variant="destructive"><PhoneOff className="mr-2 h-4 w-4" />End Call</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        <Card className="overflow-hidden border-border/50 bg-card/95">
          <div className="grid min-h-[560px] grid-cols-1 md:grid-cols-2 gap-3 bg-black/95 p-3">
            <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/30 to-accent/20">
              <div className="text-center text-white"><div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-2xl font-bold">S</div><p className="font-medium">Shane</p></div>
              <Badge className="absolute left-3 top-3 bg-black/50 text-white">Host</Badge>
            </div>
            <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-muted/20 to-primary/20">
              <div className="text-center text-white"><div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-2xl font-bold">B</div><p className="font-medium">Client Guest</p></div>
              <Badge className="absolute left-3 top-3 bg-black/50 text-white">Client</Badge>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border/50 bg-card p-4">
            <Button variant={muted ? 'destructive' : 'outline'} size="icon" onClick={() => setMuted(!muted)}>{muted ? <MicOff /> : <Mic />}</Button>
            <Button variant={cameraOff ? 'destructive' : 'outline'} size="icon" onClick={() => setCameraOff(!cameraOff)}>{cameraOff ? <CameraOff /> : <Camera />}</Button>
            <Button variant="outline" size="icon"><MonitorUp /></Button>
            <Button variant={recording ? 'default' : 'outline'} onClick={() => setRecording(!recording)}><Video className="mr-2 h-4 w-4" />{recording ? 'Recording' : 'Record'}</Button>
            <Button variant="destructive"><PhoneOff className="mr-2 h-4 w-4" />Leave</Button>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="border-border/50 bg-card/80">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-primary" />Participants</CardTitle><CardDescription>Connected to this client and workspace.</CardDescription></CardHeader>
            <CardContent className="space-y-2">{participants.map((person) => <div key={person} className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-sm"><span>{person}</span><Badge variant="outline">Online</Badge></div>)}</CardContent>
          </Card>

          <Tabs defaultValue="ai" className="space-y-3">
            <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="ai">AI Notes</TabsTrigger><TabsTrigger value="chat">Chat</TabsTrigger><TabsTrigger value="tasks">Tasks</TabsTrigger></TabsList>
            <TabsContent value="ai"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" />Live AI Notes</CardTitle></CardHeader><CardContent className="space-y-3">{liveNotes.map((note) => <div key={note} className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">{note}</div>)}<Button className="w-full"><Sparkles className="mr-2 h-4 w-4" />Generate Summary</Button></CardContent></Card></TabsContent>
            <TabsContent value="chat"><Card><CardContent className="space-y-3 pt-6">{chat.map((item) => <div key={item.text} className="text-sm"><strong>{item.from}:</strong> <span className="text-muted-foreground">{item.text}</span></div>)}<Input placeholder="Message the call..." /></CardContent></Card></TabsContent>
            <TabsContent value="tasks"><Card><CardContent className="space-y-3 pt-6">{['Create thumbnail concepts', 'Send upload request', 'Schedule next recording'].map((task) => <div key={task} className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-sm"><span>{task}</span><Button size="sm" variant="outline"><CheckCircle2 className="mr-2 h-4 w-4" />Create</Button></div>)}</CardContent></Card></TabsContent>
          </Tabs>

          <Card className="border-border/50 bg-card/80">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4 text-muted-foreground" />After Call</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground"><p>When the call ends, create a meeting record, transcript, AI summary, task review list, and client timeline entry.</p></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
