import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  FileText, 
  Clock, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockClients } from '@/data/index';
import { useTRPData } from '@/lib/trpData';
import { saveAudioBlob, getAudioBlob, deleteAudioBlob } from '@/lib/audioStorage';
import { getVoiceWorkerBase } from '@/lib/config';
import { toast } from '@/hooks/use-toast';
import { applyAnalysis } from '@/lib/voiceMemoPipeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
  import Confirm from '@/components/Confirm';

export function VoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [lastRecordingUrl, setLastRecordingUrl] = useState<string | null>(null);
  const [lastRecordingBlob, setLastRecordingBlob] = useState<Blob | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedBlob, setUploadedBlob] = useState<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { state, addVoiceMemo } = useTRPData();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' });
        // revoke previous preview URL
        try { if (lastRecordingUrl) URL.revokeObjectURL(lastRecordingUrl); } catch(e){}
        const url = URL.createObjectURL(audioBlob);
        setLastRecordingUrl(url);
        setLastRecordingBlob(audioBlob);
        chunksRef.current = [];
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      try { recorder.stream.getTracks().forEach((track:any) => track.stop()); } catch(e){}
      mediaRecorderRef.current = null;
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const togglePause = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      if (isPaused) recorder.resume(); else recorder.pause();
      setIsPaused(!isPaused);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full overflow-visible border-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold text-foreground">Voice Command Center</CardTitle>
            <CardDescription>Capture meeting notes and instant memos</CardDescription>
          </div>
          <Badge variant={isRecording ? "destructive" : "outline"} className="animate-pulse">
            {isRecording ? "Live Recording" : "Ready to Record"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-8 space-y-6">
        <div className="relative">
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.2, 1], opacity: 1 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 rounded-full bg-destructive/20 -z-10"
              />
            )}
          </AnimatePresence>
          <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
            isRecording ? 'bg-destructive shadow-[0_0_30px_rgba(var(--destructive),0.4)]' : 'bg-primary shadow-lg'
          }`}>
            {isRecording ? (
              <span className="text-2xl font-mono text-white font-bold">{formatTime(recordingTime)}</span>
            ) : (
              <Mic className="w-12 h-12 text-white" />
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
          {!isRecording ? (
            <Button 
              onClick={startRecording} 
              size="lg" 
              className="rounded-full px-6 py-3 bg-primary hover:bg-primary/90 text-white w-full"
            >
              <Mic className="mr-2 h-5 w-5" /> Start Recording
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={togglePause} 
                className="rounded-full h-14 w-14 border-primary/20"
              >
                {isPaused ? <Play className="h-6 w-6 text-primary" /> : <Pause className="h-6 w-6 text-primary" />}
              </Button>
              <Button 
                variant="destructive" 
                size="icon" 
                onClick={stopRecording} 
                className="rounded-full h-14 w-14"
              >
                <Square className="h-6 w-6" />
              </Button>
            </div>
          )}

          <div className="w-full">
            <input ref={fileInputRef} type="file" accept="audio/*,.m4a,.mp3,.wav,.webm,.mp4,.mpeg,.mpga,.flac,.ogg" style={{ display: 'none' }} onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (!f.type?.startsWith('audio') && !/\.m4a$|\.mp3$|\.wav$|\.webm$|\.mp4$|\.mpeg$|\.mpga$|\.flac$|\.ogg$/i.test(f.name)) {
                try { toast({ title: 'Not an audio file' }); } catch(e){}
                e.currentTarget.value = '';
                return;
              }
              if (f.size === 0) {
                try { toast({ title: 'Empty file' }); } catch(e){}
                e.currentTarget.value = '';
                return;
              }
              try { if (uploadedUrl) URL.revokeObjectURL(uploadedUrl); } catch(e){}
              const url = URL.createObjectURL(f);
              setUploadedUrl(url);
              setUploadedBlob(f);
            }} />
            <Button size="lg" variant="outline" onClick={() => { try { fileInputRef.current?.click(); } catch(e){} }} className="w-full">Upload Voice Memo</Button>
          </div>
        </div>

        {(lastRecordingUrl || uploadedUrl) && !isRecording && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full pt-4 flex items-center justify-center gap-4"
          >
            <audio src={lastRecordingUrl || uploadedUrl || ''} controls className="h-10 max-w-full" />
            <Button variant="outline" size="sm" onClick={() => {
              try { if (lastRecordingUrl) URL.revokeObjectURL(lastRecordingUrl); } catch(e){}
              try { if (uploadedUrl) URL.revokeObjectURL(uploadedUrl); } catch(e){}
              setLastRecordingUrl(null); setLastRecordingBlob(null); setUploadedUrl(null); setUploadedBlob(null);
              try { if (fileInputRef.current) fileInputRef.current.value = ''; } catch(e){}
            }}>
              Discard
            </Button>
            <SaveMemoButton
              blob={uploadedBlob || lastRecordingBlob}
              initialTitle={uploadedBlob && (uploadedBlob as File).name ? ((uploadedBlob as File).name.replace(/\.[^/.]+$/, '')) : undefined}
              onSaved={() => { setLastRecordingUrl(null); setLastRecordingBlob(null); setUploadedUrl(null); setUploadedBlob(null); try { if (fileInputRef.current) fileInputRef.current.value = ''; } catch(e){} }}
            />
          </motion.div>
        )}
      </CardContent>
      <CardFooter className="bg-muted/30 border-t border-border py-4">
        <p className="text-xs text-muted-foreground flex items-center">
          <Clock className="h-3 w-3 mr-1" /> 
          Audio quality: 48kHz Stereo | Auto-transcription enabled
        </p>
      </CardFooter>
    </Card>
  );
}

function SaveMemoButton({ blob, onSaved, initialTitle, initialClientId, initialCategory }:{ blob: Blob | null; onSaved?: ()=>void; initialTitle?: string; initialClientId?: string; initialCategory?: 'client'|'prospect'|'internal'|'presentation'|'other' }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle || 'New Voice Memo');
  const [clientId, setClientId] = useState<string | undefined>(initialClientId);
  const [category, setCategory] = useState<'client'|'prospect'|'internal'|'presentation'|'other'>(initialCategory || 'internal');
  const [organization, setOrganization] = useState('');
  const [eventName, setEventName] = useState('');
  const [peopleText, setPeopleText] = useState('');
  const [strategyNotes, setStrategyNotes] = useState('');
  const [createPlaceholder, setCreatePlaceholder] = useState(false);
  const { state, addVoiceMemo, addClient, updateVoiceMemo, findEntityByName, addEntity, updateEntity, linkEntities, addEvent, updateEvent } = useTRPData();

  React.useEffect(() => {
    if (initialTitle) setTitle(initialTitle);
  }, [initialTitle]);

  const getDurationSec = (b: Blob) => new Promise<number>((resolve) => {
    const url = URL.createObjectURL(b);
    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      const d = Math.round(audio.duration || 0);
      URL.revokeObjectURL(url);
      resolve(d);
    });
    audio.addEventListener('error', () => { URL.revokeObjectURL(url); resolve(0); });
  });

  const handleSave = async () => {
    if (!blob) return;
    const id = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `vm_${Math.random().toString(36).slice(2,8)}_${Date.now()}`;
    const durationSec = await getDurationSec(blob);
    try {
      await saveAudioBlob(id, blob);

      let memoClientId = clientId || undefined;
      if (createPlaceholder && !memoClientId) {
        const placeholderName = (organization && organization.trim()) || (peopleText ? peopleText.split(',')[0].trim() : '') || title || `Prospect ${Date.now()}`;
        try {
          const newClient = addClient ? addClient({ name: placeholderName, company: organization || placeholderName, status: 'prospect' }) : null;
          if (newClient) memoClientId = newClient.id;
        } catch (e) {
          console.error('Failed to create placeholder client', e);
        }
      }

      const entities: any[] = [];
      if (peopleText && peopleText.trim()) {
        const parts = peopleText.split(',').map(p => p.trim()).filter(Boolean);
        parts.forEach(name => entities.push({ type: 'person', name }));
      }
      if (organization && organization.trim()) entities.push({ type: 'organization', name: organization.trim() });
      if (eventName && eventName.trim()) entities.push({ type: 'event', name: eventName.trim() });

      const meta: any = {
        id,
        title: title || `Memo ${new Date().toISOString()}`,
        createdAt: new Date().toISOString(),
        durationSec,
        clientId: memoClientId,
        category,
        tags: [],
        audio: { storedIn: 'indexeddb', mimeType: (blob as any).type || 'audio/webm', sizeBytes: (blob as any).size || 0 },
        transcription: { status: 'none' },
        analysis: { status: 'none' },
        extracted: {
          entities: entities.length ? entities : undefined,
          strategy: strategyNotes || undefined,
        }
      };

      addVoiceMemo(meta as any);
      setOpen(false);
      onSaved && onSaved();

      // Kick off transcription + analysis automatically and persist extracted entities
      (async () => {
        const workerBase = getVoiceWorkerBase();
        // update transcription status -> pending
        try { updateVoiceMemo && updateVoiceMemo(id, { transcription: { status: 'pending', updatedAt: new Date().toISOString() } }); } catch(e){}
        try {
          const blobToSend = blob;
          const safeTitle = title || 'voice-memo';
          const fd = new FormData();
          const file = new File([blobToSend], `${safeTitle.replace(/[^a-z0-9]/gi,'_')}.m4a`, { type: (blobToSend as any).type || 'audio/m4a' });
          fd.append('file', file);
          const tRes = await fetch(`${workerBase.replace(/\/$/, '')}/transcribe`, { method: 'POST', body: fd });
          if (tRes.ok) {
            const tjson = await tRes.json();
            const text = tjson.text || '';
            try { updateVoiceMemo && updateVoiceMemo(id, { transcription: { status: 'done', text, model: tjson.model || undefined, updatedAt: new Date().toISOString() } }); } catch(e){}
            try { toast({ title: 'Transcription complete' }); } catch(e){}

            // analysis
            try { updateVoiceMemo && updateVoiceMemo(id, { analysis: { status: 'pending', updatedAt: new Date().toISOString() } }); } catch(e){}
            const payload = { transcriptText: text, title, category, clientName: memoClientId ? (state.clients||[]).find((c:any)=>c.id===memoClientId)?.company || '' : '', clientId: memoClientId || '' };
            const aRes = await fetch(`${workerBase.replace(/\/$/, '')}/analyze`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
            if (aRes.ok) {
              const ajson = await aRes.json();
              try { updateVoiceMemo && updateVoiceMemo(id, { analysis: { status: 'done', data: ajson, updatedAt: new Date().toISOString() } }); } catch(e){}
              try { toast({ title: 'Analysis complete' }); } catch(e){}

              // Map analysis entities to extracted.entities if present and attach per-entity insights to global entity store
              try {
                const mappedEntities: any[] = [];
                const src = ajson.entities || ajson.named_entities || ajson.people || ajson.organizations || [];
                if (Array.isArray(src) && src.length > 0) {
                  for (const it of src) {
                    if (!it) continue;
                    let name = '';
                    let type = 'person';
                    let aliases = [] as string[];
                    let confidence = undefined as any;
                    let entityNotes = '';
                    if (typeof it === 'string') {
                      name = it;
                    } else {
                      name = it.name || it.person || '';
                      type = (it.type || it.entity_type || 'person').toLowerCase();
                      aliases = it.aliases || [];
                      confidence = it.confidence || undefined;
                      // collect any entity-specific insights returned by the analyzer
                      if (it.insights) entityNotes = typeof it.insights === 'string' ? it.insights : JSON.stringify(it.insights);
                      if (it.logistics) entityNotes = (entityNotes ? entityNotes + '\n' : '') + (typeof it.logistics === 'string' ? it.logistics : JSON.stringify(it.logistics));
                      if (it.recommendations) entityNotes = (entityNotes ? entityNotes + '\n' : '') + (typeof it.recommendations === 'string' ? it.recommendations : JSON.stringify(it.recommendations));
                    }

                    if (!name) continue;
                    mappedEntities.push({ type, name, aliases, confidence, createdFromMemoIds: [id] });

                    // Persist or merge into global entity index so Strategy page has per-entity insights
                    try {
                      const existing = findEntityByName ? findEntityByName(name, type) : null;
                      if (existing) {
                        // append memo id to provenance
                        const updatedExampleMemoIds = Array.from(new Set([...(existing.exampleMemoIds || []), id]));
                        // append insights / notes
                        const parts: string[] = [];
                        if (entityNotes) parts.push(`AI insights: ${entityNotes}`);
                        const memoExcerpt = ajson.summary || ajson.overview || ajson.strategy || strategyNotes || '';
                        if (memoExcerpt) parts.push(`From memo "${title || id}": ${memoExcerpt}`);
                        const newNotes = ((existing.notes || '') + '\n' + parts.join('\n')).trim();
                        updateEntity && updateEntity(existing.id, { notes: newNotes, exampleMemoIds: updatedExampleMemoIds, createdFromMemoIds: Array.from(new Set([...(existing.createdFromMemoIds||[]), id])) });
                        // add structured insight object
                        try {
                          const insightObj = { title: 'AI insights', text: entityNotes || memoExcerpt || '', sourceMemoId: id, type: 'logistics' };
                          updateEntity && updateEntity(existing.id, { insights: Array.from(new Set([...(existing.insights || []), insightObj])) });
                        } catch (e) {}
                      } else {
                        // create new entity with provenance and insights
                        const ne = addEntity ? addEntity({ type, name, aliases, notes: (entityNotes ? `AI insights: ${entityNotes}\n` : '') + (ajson.summary || ajson.overview || ajson.strategy || '') , createdFromMemoIds: [id], links: [] }) : null;
                        if (ne && ne.id) {
                          const insightObj = { title: 'AI insights', text: entityNotes || (ajson.summary || ajson.overview || ajson.strategy || ''), sourceMemoId: id, type: 'logistics' };
                          try { updateEntity && updateEntity(ne.id, { insights: [insightObj], exampleMemoIds: [id] }); } catch(e){}
                        }
                      }
                      } catch (e) {
                      console.error('Failed to persist analyzed entity insights', e);
                    }

                    // If entity is an event and AI returned logistics/dates, create or update an Event record
                    try {
                      const logistics = (typeof it.logistics !== 'undefined') ? it.logistics : (ajson.logistics || ajson.event_logistics || undefined);
                      const dates = (typeof it.dates !== 'undefined') ? it.dates : (ajson.dates_and_deadlines || undefined);
                      if ((type === 'event' ||/event/i.test(name)) && (logistics || dates)) {
                        // build notes combining AI logistics and memo excerpt
                        const memoExcerpt = ajson.summary || ajson.overview || ajson.strategy || strategyNotes || (tjson?.text ? (String(tjson.text).slice(0,400)) : '');
                        const evNotesParts: string[] = [];
                        if (logistics) evNotesParts.push(typeof logistics === 'string' ? logistics : JSON.stringify(logistics));
                        if (dates) evNotesParts.push(typeof dates === 'string' ? dates : JSON.stringify(dates));
                        if (memoExcerpt) evNotesParts.push(`From memo "${title || id}": ${memoExcerpt}`);
                        const evTitle = name || (ajson.event_title || ajson.event_name) || (`Event ${new Date().toISOString().slice(0,10)}`);
                        // attempt to find existing event by title
                        const existingEvent = (state.events||[]).find((ev:any) => (ev.title||'').trim().toLowerCase() === (evTitle||'').trim().toLowerCase());
                        if (existingEvent) {
                          updateEvent && updateEvent(existingEvent.id, { notes: ((existingEvent.notes||'') + '\n' + evNotesParts.join('\n')).trim(), sourceMemoId: id });
                        } else {
                          addEvent && addEvent({ clientId: memoClientId, title: evTitle, date: (Array.isArray(dates) && dates[0]) ? dates[0].date || dates[0] : (typeof dates === 'string' ? dates : undefined), whenText: undefined, notes: evNotesParts.join('\n'), sourceMemoId: id, source: 'voice_memo', sourceMemoTitle: title || undefined });
                        }
                      }
                    } catch (e) {
                      console.error('Failed to create/update event from AI insights', e);
                    }
                  }
                }

                const strategyFromAi = ajson.summary || ajson.overview || ajson.strategy || strategyNotes || '';
                const update: any = { extracted: { ...(meta.extracted||{}), entities: mappedEntities.length ? mappedEntities : meta.extracted?.entities, strategy: strategyFromAi || meta.extracted?.strategy } };
                try { updateVoiceMemo && updateVoiceMemo(id, update); } catch(e){}
              } catch (e) {
                console.error('Failed mapping AI entities', e);
              }
            } else {
              try { updateVoiceMemo && updateVoiceMemo(id, { analysis: { status: 'error', error: `Analysis failed: ${aRes.status}`, updatedAt: new Date().toISOString() } }); } catch(e){}
            }
          } else {
            try { updateVoiceMemo && updateVoiceMemo(id, { transcription: { status: 'error', error: `Transcription failed: ${tRes.status}`, updatedAt: new Date().toISOString() } }); } catch(e){}
          }
        } catch (e:any) {
          console.error('Auto transcription/analysis error', e);
          try { updateVoiceMemo && updateVoiceMemo(id, { transcription: { status: 'error', error: String(e?.message||e), updatedAt: new Date().toISOString() } }); } catch(e){}
        }
      })();
    } catch (e) {
      console.error('Failed to save memo', e);
    }
  };

  return (
    <>
      <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setOpen(true)}>Save Memo</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <div className="p-4">
            <h3 className="text-lg font-semibold">Save Voice Memo</h3>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground">Title</label>
                <input className="w-full px-2 py-1 rounded border bg-transparent" value={title} onChange={(e)=>setTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">Client (optional)</label>
                <select className="w-full px-2 py-1 rounded border bg-transparent" value={clientId || ''} onChange={(e)=>setClientId(e.target.value || undefined)}>
                  <option value="">— None —</option>
                  {(state.clients||[]).map(c => (<option key={c.id} value={c.id}>{c.company || c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">Category</label>
                <select className="w-full px-2 py-1 rounded border bg-transparent" value={category} onChange={(e)=>setCategory(e.target.value as any)}>
                  <option value="client">Client</option>
                  <option value="prospect">Prospect</option>
                  <option value="internal">Internal</option>
                  <option value="presentation">Presentation</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">Organization</label>
                <input className="w-full px-2 py-1 rounded border bg-transparent" value={organization} onChange={(e)=>setOrganization(e.target.value)} placeholder="e.g. Made For Trades" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">Event / Topic</label>
                <input className="w-full px-2 py-1 rounded border bg-transparent" value={eventName} onChange={(e)=>setEventName(e.target.value)} placeholder="e.g. Sutherlin Throwdown" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">People Mentioned (comma-separated)</label>
                <input className="w-full px-2 py-1 rounded border bg-transparent" value={peopleText} onChange={(e)=>setPeopleText(e.target.value)} placeholder="e.g. Terry Brock, Jane Doe" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">Strategy Notes</label>
                <textarea className="w-full px-2 py-1 rounded border bg-transparent" value={strategyNotes} onChange={(e)=>setStrategyNotes(e.target.value)} placeholder="Key insights, opportunities, follow-ups..." />
              </div>
              <div className="flex items-center gap-2">
                <input id="createPlaceholder" type="checkbox" checked={createPlaceholder} onChange={(e)=>setCreatePlaceholder(e.target.checked)} />
                <label htmlFor="createPlaceholder" className="text-xs text-muted-foreground">Create placeholder client from Organization/Person</label>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function VoiceRecordingsList() {
  const { state, deleteVoiceMemo, updateVoiceMemo, addTask, addActivity, setClientRetainer, unapplyVoiceMemo } = useTRPData();
  const recordings = state.voiceMemos || [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  const getClientName = (clientId?: string) => {
    if (!clientId) return 'Internal';
    return (state.clients || []).find(c => c.id === clientId)?.company || 'Unknown Client';
  };

  const handlePlay = async (id: string) => {
    try {
      const blob = await getAudioBlob(id);
      if (!blob) { console.warn('Audio blob not found', id); return; }
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      audio.addEventListener('ended', () => { try { URL.revokeObjectURL(url); } catch(e){} });
    } catch (e) { console.error(e); }
  };

  // Edit / Re-analyze UI state
  const [editTranscriptOpen, setEditTranscriptOpen] = useState(false);
  const [editAnalysisOpen, setEditAnalysisOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [analysisDraft, setAnalysisDraft] = useState('');

  const openEditTranscript = (memo: any) => {
    setEditingId(memo.id);
    setTranscriptDraft(memo.transcription?.text || '');
    setEditTranscriptOpen(true);
  };

  const saveEditedTranscript = async () => {
    if (!editingId) return;
    const text = transcriptDraft;
    const now = new Date().toISOString();
    // update memo: set transcription text & updatedAt; clear analysis; mark out-of-date if applied
    const memo = (state.voiceMemos || []).find((m:any)=>m.id===editingId);
    updateVoiceMemo && updateVoiceMemo(editingId, { transcription: { status: text ? 'done' : 'none', text, updatedAt: now } });
    updateVoiceMemo && updateVoiceMemo(editingId, { analysis: { status: 'none', data: undefined, updatedAt: undefined } });
    if (memo?.extracted?.appliedAt) {
      updateVoiceMemo && updateVoiceMemo(editingId, { extracted: { ...(memo.extracted||{}), isOutOfDate: true } });
    }
    try { toast({ title: 'Transcript updated. Analysis cleared. Re-analyze to update notes.' }); } catch(e){}
    setEditTranscriptOpen(false);
    setEditingId(null);
  };

  const saveEditedTranscriptProceed = saveEditedTranscript;

  const openEditAnalysis = (memo: any) => {
    setEditingId(memo.id);
    setAnalysisDraft(JSON.stringify(memo.analysis?.data || {}, null, 2));
    setEditAnalysisOpen(true);
  };

  const saveEditedAnalysis = async () => {
    if (!editingId) return;
    try {
      const parsed = JSON.parse(analysisDraft);
      const now = new Date().toISOString();
      const memo = (state.voiceMemos || []).find((m:any)=>m.id===editingId);
      updateVoiceMemo && updateVoiceMemo(editingId, { analysis: { status: 'done', data: parsed, updatedAt: now } });
      if (memo?.extracted?.appliedAt) {
        updateVoiceMemo && updateVoiceMemo(editingId, { extracted: { ...(memo.extracted||{}), isOutOfDate: true } });
      }
      try { toast({ title: 'Analysis updated. Re-apply to refresh tasks/notes.' }); } catch(e){}
      setEditAnalysisOpen(false);
      setEditingId(null);
    } catch (e:any) {
      try { toast({ title: 'Invalid JSON', description: String(e?.message||e) }); } catch(e){}
    }
  };

  const handleDownload = async (id: string, title?: string) => {
    try {
      const blob = await getAudioBlob(id);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title||id).replace(/[^a-z0-9_-]/gi,'_')}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch(e){} }, 1000);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVoiceMemo(id);
      try { toast({ title: 'Voice memo deleted' }); } catch (e) {}
    } catch (e) { console.error(e); }
  };

  // Build a deterministic version string for a memo (transcript + analysis)
  const buildMemoVersion = async (memo: any): Promise<string> => {
    const payload = JSON.stringify({ t: memo.transcription?.text || '', a: memo.analysis?.data || null });
    try {
      if (typeof crypto !== 'undefined' && (crypto as any).subtle && (crypto as any).subtle.digest) {
        const enc = new TextEncoder();
        const buf = enc.encode(payload);
        // @ts-ignore
        const hashBuf = await crypto.subtle.digest('SHA-256', buf);
        const hashArray = Array.from(new Uint8Array(hashBuf));
        return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
      }
    } catch (e) {
      // fallthrough
    }
    // fallback simple checksum
    return `${payload.length}:${payload.slice(0,16)}:${payload.slice(-16)}`;
  };

  const sendToTranscriptionWorker = async (memoId: string) => {
    const workerBase = getVoiceWorkerBase();
    const safeTitle = (state.voiceMemos || []).find((m:any)=>m.id===memoId)?.title || 'voice-memo';
    try {
      const blob = await getAudioBlob(memoId);
      if (!blob) {
        updateVoiceMemo && updateVoiceMemo(memoId, { transcription: { status: 'error', error: 'Audio missing', updatedAt: new Date().toISOString() } });
        return;
      }
      updateVoiceMemo && updateVoiceMemo(memoId, { transcription: { status: 'pending', updatedAt: new Date().toISOString() } });
      const fd = new FormData();
      const file = new File([blob], `${safeTitle.replace(/[^a-z0-9]/gi,'_')}.m4a`, { type: blob.type || 'audio/m4a' });
      fd.append('file', file);

      const res = await fetch(`${workerBase.replace(/\/$/, '')}/transcribe`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`Transcription failed: ${res.status}`);
      const json = await res.json();
      const text = json.text || '';
      const model = json.model || undefined;
      updateVoiceMemo && updateVoiceMemo(memoId, { transcription: { status: 'done', text, model, updatedAt: new Date().toISOString() } });
      try { toast({ title: 'Transcription complete' }); } catch(e){}
      return json;
    } catch (e:any) {
      console.error('Transcription error', e);
      updateVoiceMemo && updateVoiceMemo(memoId, { transcription: { status: 'error', error: String(e?.message||e), updatedAt: new Date().toISOString() } });
      try { toast({ title: 'Transcription failed', description: String(e?.message||e) }); } catch(e){}
    }
  };

  const analyzeMemo = async (memoId: string) => {
    const workerBase = getVoiceWorkerBase();
    const memo = (state.voiceMemos || []).find((m:any)=>m.id===memoId);
    if (!memo || !memo.transcription?.text) {
      try { toast({ title: 'No transcript available' }); } catch(e){}
      return;
    }
    try {
      updateVoiceMemo && updateVoiceMemo(memoId, { analysis: { status: 'pending', updatedAt: new Date().toISOString() } });
      const payload = {
        transcriptText: memo.transcription.text,
        title: memo.title,
        category: memo.category,
        clientName: memo.clientName || '',
        clientId: memo.clientId || '',
      };
      const res = await fetch(`${workerBase.replace(/\/$/, '')}/analyze`, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
      const json = await res.json();
      updateVoiceMemo && updateVoiceMemo(memoId, { analysis: { status: 'done', data: json, updatedAt: new Date().toISOString() } });
      try { toast({ title: 'Analysis complete' }); } catch(e){}
      return json;
    } catch (e:any) {
      console.error('Analysis error', e);
      updateVoiceMemo && updateVoiceMemo(memoId, { analysis: { status: 'error', error: String(e?.message||e), updatedAt: new Date().toISOString() } });
      try { toast({ title: 'Analysis failed', description: String(e?.message||e) }); } catch(e){}
    }
  };

  const applyAnalysisToWorkstation = async (memoId: string) => {
    const memo = (state.voiceMemos || []).find((m:any)=>m.id===memoId);
    if (!memo) return;
    if (!memo.analysis?.data) { try { toast({ title: 'No analysis to apply' }); } catch(e){}; return; }
    if (memo.extracted?.appliedAt && !memo.extracted?.isOutOfDate) { try { toast({ title: 'Already applied' }); } catch(e){}; return; }
    if (memo.extracted?.appliedAt && memo.extracted?.isOutOfDate) {
      // open unapply dialog to let user remove previous application first
      setUnapplyTarget(memo.id);
      setUnapplyDialogOpen(true);
      return;
    }
    try {
      const res = await applyAnalysis(memo, { addActivity, addTask, updateVoiceMemo });
      try { toast({ title: `Applied: 1 activity, ${res.createdTaskIds.length} tasks, ${res.draftEvents.length} draft events` }); } catch(e){}

      // handle suggested payment terms (retainer)
      if (res.paymentTerms && memo.clientId) {
        const pt = res.paymentTerms;
        const client = (state.clients || []).find((c:any)=>c.id === memo.clientId);
        const retainerPatch = {
          amountCents: pt.amountCents,
          cadence: pt.cadence,
          dayOfMonth: pt.dayOfMonth,
          nextDueDate: pt.nextDueDate,
          dueText: pt.notes || null,
          source: 'voice_memo',
          sourceMemoId: memo.id,
          sourceMemoTitle: memo.title,
          updatedAt: new Date().toISOString(),
        };
        // If client already has a retainer, always prompt to avoid accidental overwrite
        if (client?.billing?.retainer) {
          setRetainerProposal({ memo, retainerPatch, client, paymentTerms: pt });
          setRetainerDialogOpen(true);
        } else {
          // If confidence is high, auto-apply. Otherwise present as a suggestion for manual apply.
          const confidence = pt.confidence || null;
          if (confidence === 'high') {
            try {
              setClientRetainer && setClientRetainer(memo.clientId, retainerPatch as any);
              try { toast({ title: 'Retainer saved from memo' }); } catch(e){}
            } catch (e) { console.error('Failed to set retainer', e); }
          } else {
            // create a billing suggestion panel (reuse retainerProposal dialog for review)
            setRetainerProposal({ memo, retainerPatch, client, paymentTerms: pt });
            setRetainerDialogOpen(true);
          }
        }
      }
    } catch (e) { console.error(e); try { toast({ title: 'Apply failed' }); } catch(e){} }
  };

  const [unapplyDialogOpen, setUnapplyDialogOpen] = useState(false);
  const [unapplyTarget, setUnapplyTarget] = useState<string | null>(null);

  // Retainer proposal UI state & handlers
  const [retainerDialogOpen, setRetainerDialogOpen] = useState(false);
  const [retainerProposal, setRetainerProposal] = useState<any>(null);

  const handleRetainerUpdate = () => {
    if (!retainerProposal) return;
    const { memo, retainerPatch } = retainerProposal;
    try {
      setClientRetainer && setClientRetainer(memo.clientId, retainerPatch as any);
      addActivity && addActivity({ clientId: memo.clientId, clientName: memo.clientName, type: 'misc', notes: `Retainer set from memo: ${memo.title}`, timestamp: new Date().toISOString(), link: memo.id });
      try { toast({ title: 'Retainer updated from memo' }); } catch(e){}
    } catch (e) { console.error(e); }
    setRetainerDialogOpen(false);
    setRetainerProposal(null);
  };

  const handleRetainerKeep = () => {
    setRetainerDialogOpen(false);
    setRetainerProposal(null);
  };

  const handleRetainerSaveAsNote = () => {
    if (!retainerProposal) return;
    const { memo, paymentTerms } = retainerProposal;
    addActivity && addActivity({ clientId: memo.clientId, clientName: memo.clientName, type: 'note', notes: `Suggested retainer (saved as note): ${paymentTerms.amountDollars ? '$'+paymentTerms.amountDollars : ''} ${paymentTerms.notes || ''}`, timestamp: new Date().toISOString(), link: memo.id });
    try { toast({ title: 'Retainer suggestion saved as note' }); } catch(e){}
    setRetainerDialogOpen(false);
    setRetainerProposal(null);
  };

  const handleUnapply = (memoId: string) => {
    setUnapplyTarget(memoId);
    setUnapplyDialogOpen(true);
  };

  const confirmUnapply = () => {
    if (!unapplyTarget) return;
    try {
      unapplyVoiceMemo && unapplyVoiceMemo(unapplyTarget);
      try { toast({ title: 'Memo unapplied — you can edit transcript and re-apply.' }); } catch (e) {}
    } catch (e) {
      try { toast({ title: 'Failed to unapply memo' }); } catch (e) {}
    }
    setUnapplyDialogOpen(false);
    setUnapplyTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Recent Recordings</h3>
        <Badge variant="secondary">{recordings.length} Total</Badge>
      </div>

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3">
          {recordings.map((rec: any) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="group relative flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-accent/5 transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mic className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground text-sm line-clamp-1">{rec.title}</h4>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-muted/50 text-muted-foreground">T:{rec.transcription?.status||'none'}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-muted/50 text-muted-foreground">A:{rec.analysis?.status||'none'}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center">
                      <CalendarIcon className="h-3 w-3 mr-1" /> {new Date(rec.createdAt).toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" /> {rec.durationSec || 0}s
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 h-4">
                      {getClientName(rec.clientId)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => { setSelectedId(rec.id); setIsTranscriptOpen(true); }}
                >
                  <FileText className="h-4 w-4 text-muted-foreground hover:text-primary" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handlePlay(rec.id)}>
                      <Play className="mr-2 h-4 w-4" /> Play
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => handleDownload(rec.id, rec.title)}>
                      <Download className="mr-2 h-4 w-4" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={async ()=>{
                      updateVoiceMemo && updateVoiceMemo(rec.id, { transcription: { status: 'pending' } });
                      await sendToTranscriptionWorker(rec.id);
                    }}>
                      <FileText className="mr-2 h-4 w-4" /> Transcribe
                    </DropdownMenuItem>
                    <DropdownMenuItem className={`cursor-pointer ${!(rec.transcription?.status==='done') ? 'opacity-50 pointer-events-none' : ''}`} onClick={async ()=>{ await analyzeMemo(rec.id); }}>
                      <FileText className="mr-2 h-4 w-4" /> Analyze
                    </DropdownMenuItem>
                    <DropdownMenuItem className={`cursor-pointer ${!(rec.analysis?.status==='done') ? 'opacity-50 pointer-events-none' : ''}`} onClick={async ()=>{ await applyAnalysisToWorkstation(rec.id); }}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> {rec.extracted?.appliedAt ? (rec.extracted?.isOutOfDate ? 'Re-Apply to Workstation' : 'Applied') : 'Apply to Workstation'}
                    </DropdownMenuItem>
                    <DropdownMenuItem className={`cursor-pointer ${!(rec.transcription?.status==='done') ? 'opacity-50 pointer-events-none' : ''}`} onClick={() => openEditTranscript(rec)}>
                      <FileText className="mr-2 h-4 w-4" /> Edit Transcript
                    </DropdownMenuItem>
                    <DropdownMenuItem className={`cursor-pointer ${!(rec.analysis?.status==='done') ? 'opacity-50 pointer-events-none' : ''}`} onClick={() => openEditAnalysis(rec)}>
                      <FileText className="mr-2 h-4 w-4" /> Edit Analysis JSON
                    </DropdownMenuItem>
                    {rec.extracted?.appliedAt ? (
                      <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => { setUnapplyTarget(rec.id); setUnapplyDialogOpen(true); }}>
                        <Trash2 className="mr-2 h-4 w-4" /> Unapply
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem 
                      className="cursor-pointer text-destructive focus:text-destructive" 
                      onClick={() => handleDelete(rec.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          ))}
        </div>
      </ScrollArea>

      <Dialog open={isTranscriptOpen} onOpenChange={setIsTranscriptOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {recordings.find(r => r.id === selectedId)?.title}
            </DialogTitle>
            <DialogDescription>
              AI-generated transcript • {recordings.find(r => r.id === selectedId)?.createdAt}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 p-6 rounded-lg border border-border min-h-[200px]">
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {recordings.find(r => r.id === selectedId)?.transcription?.text || "No transcript available for this recording."}
            </p>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                {recordings.find(r => r.id === selectedId)?.transcription?.status || 'none'}
              </Badge>
              <Badge variant="outline">Voice Memo</Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(recordings.find(r => r.id === selectedId)?.transcription?.text || ''); }}>Copy Text</Button>
              <Button variant="outline" size="sm" onClick={() => { const memo = recordings.find(r => r.id === selectedId); if(memo) openEditTranscript(memo); }}>Edit Transcript</Button>
              <Button size="sm" className="bg-primary text-white">Export to PDF</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={retainerDialogOpen} onOpenChange={setRetainerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Voice memo suggests a retainer</DialogTitle>
            <DialogDescription>This memo suggests updating the client's retainer. Choose how to proceed.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {retainerProposal ? (
              <div>
                <div className="font-medium">Suggested: {(retainerProposal.paymentTerms?.amountDollars != null) ? `$${retainerProposal.paymentTerms.amountDollars} ` : ''}{retainerProposal.paymentTerms?.cadence ? ` ${retainerProposal.paymentTerms.cadence}` : ''} — {retainerProposal.paymentTerms?.dayOfMonth ? `on the ${retainerProposal.paymentTerms.dayOfMonth}` : ''}</div>
                <div className="text-sm text-muted-foreground mt-2">{retainerProposal.paymentTerms?.notes}</div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleRetainerKeep()}>Keep Current</Button>
            <Button variant="ghost" onClick={() => handleRetainerSaveAsNote()}>Save as Note</Button>
            <Button onClick={() => handleRetainerUpdate()}>Update Retainer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unapplyDialogOpen} onOpenChange={setUnapplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unapply Voice Memo</DialogTitle>
            <DialogDescription>This will remove items created by this memo (tasks, activities, events). You can re-apply after editing.</DialogDescription>
          </DialogHeader>
          <div className="py-2">Are you sure you want to remove items created from this memo?</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUnapplyDialogOpen(false); setUnapplyTarget(null); }}>Cancel</Button>
            <Button className="text-destructive" onClick={() => { if (unapplyTarget) { unapplyVoiceMemo && unapplyVoiceMemo(unapplyTarget); try { toast({ title: 'Memo unapplied — you can edit transcript and re-apply.' }); } catch(e){} } setUnapplyDialogOpen(false); setUnapplyTarget(null); }}>Unapply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Transcript Dialog */}
      <Dialog open={editTranscriptOpen} onOpenChange={setEditTranscriptOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Transcript</DialogTitle>
            <DialogDescription>Edit the transcript text for accuracy.</DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <textarea className="w-full h-56 p-2 bg-transparent border rounded" value={transcriptDraft} onChange={(e)=>setTranscriptDraft(e.target.value)} />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={()=>{ setEditTranscriptOpen(false); setEditingId(null); }}>Cancel</Button>
              {(!transcriptDraft || transcriptDraft.trim() === '') ? (
                <Confirm title="Save empty transcript" description="Save empty transcript? This will clear the transcript." onConfirm={saveEditedTranscriptProceed}>
                  <Button size="sm">Save</Button>
                </Confirm>
              ) : (
                <Button size="sm" onClick={saveEditedTranscriptProceed}>Save</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Analysis JSON Dialog */}
      <Dialog open={editAnalysisOpen} onOpenChange={setEditAnalysisOpen}>
        <DialogContent className="max-w-3xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Analysis JSON</DialogTitle>
            <DialogDescription>Advanced: edit structured analysis output.</DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <textarea className="w-full h-80 p-2 bg-transparent border rounded font-mono text-sm" value={analysisDraft} onChange={(e)=>setAnalysisDraft(e.target.value)} />
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={()=>{ setEditAnalysisOpen(false); setEditingId(null); }}>Cancel</Button>
              <Button size="sm" onClick={saveEditedAnalysis}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
