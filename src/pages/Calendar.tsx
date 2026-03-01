import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Video,
  Users,
  MapPin,
  MoreVertical,
  Search,
  Filter,
  Bell
} from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { useTRPData } from '@/lib/trpData';
import { getAllDraftEvents } from '@/lib/draftEvents';
import DraftEventDialog from '@/components/DraftEventDialog';
import { RetainerProposalModal } from '@/components/Modals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Confirm from '@/components/Confirm';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { springPresets, fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';

interface CalendarEvent {
  id: string;
  title: string;
  type: 'meeting' | 'deadline' | 'shoot' | 'reminder';
  startTime: string;
  endTime: string;
  client?: string;
  location?: string;
  attendees?: number;
  color: string;
}

const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Client Strategy Session: Alpine Peak',
    type: 'meeting',
    startTime: '10:00 AM',
    endTime: '11:30 AM',
    client: 'Alpine Peak Outfitters',
    location: 'Zoom Meeting',
    attendees: 4,
    color: 'bg-primary',
  },
  {
    id: '2',
    title: 'Content Shoot: Downtown Roseburg',
    type: 'shoot',
    startTime: '1:00 PM',
    endTime: '4:00 PM',
    client: 'Timberline Coffee',
    location: 'Main St. Location',
    attendees: 2,
    color: 'bg-accent',
  },
  {
    id: '3',
    title: 'Ad Campaign Launch Deadline',
    type: 'deadline',
    startTime: '5:00 PM',
    endTime: '5:00 PM',
    client: 'Douglas County Real Estate',
    color: 'bg-destructive',
  },
  {
    id: '4',
    title: 'Weekly Team Sync',
    type: 'meeting',
    startTime: '9:00 AM',
    endTime: '10:00 AM',
    location: 'Conference Room A',
    attendees: 8,
    color: 'bg-primary',
  },
];

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const { state, addEvent, updateEvent, deleteEvent, updateVoiceMemo, setClientRetainer, confirmDraftEvent } = useTRPData();
  const allEvents = state.events || [];
  // derive retainer events from clients with a scheduled retainer (nextDueDate)
  // BUT skip derived entries when a persistent `Event` for the retainer already exists in state.events
  const retainerEvents = (state.clients || []).map((c:any) => {
    const r = c.billing?.retainer;
    if (!r || !r.nextDueDate) return null;
    const hasPersisted = (state.events || []).some((ev:any) => ev.source === 'retainer' && ev.clientId === c.id) || Boolean(r.eventId);
    if (hasPersisted) return null;
    return {
      id: `retainer_${c.id}`,
      clientId: c.id,
      title: `Retainer — ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((r.amountCents||0)/100)}`,
      date: r.nextDueDate,
      whenText: `${r.cadence || 'monthly'} on day ${r.dayOfMonth || '—'}`,
      notes: r.sourceMemoTitle ? `Source: ${r.sourceMemoTitle}` : undefined,
      source: 'retainer',
    } as any;
  }).filter(Boolean) as any[];

  const mergedEvents = [...allEvents, ...retainerEvents];
  const selectedISO = date ? (date.toISOString().slice(0,10)) : null;
  const events = selectedISO ? mergedEvents.filter((ev:any) => (ev.date || '').slice(0,10) === selectedISO) : mergedEvents;
  const allDrafts = getAllDraftEvents(state.voiceMemos);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [proposalTerms, setProposalTerms] = useState<any>(null);
  const [proposalMemoId, setProposalMemoId] = useState<string | null>(null);
  const [proposalDraftId, setProposalDraftId] = useState<string | null>(null);
  const [showTasks, setShowTasks] = useState(false);

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={springPresets.gentle}
        >
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Calendar & Scheduling</h1>
          <p className="text-muted-foreground">Manage your appointments, shoots, and campaign deadlines.</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }}
          transition={springPresets.gentle}
          className="flex items-center gap-3"
        >
          <Button variant="outline" className="hidden sm:flex">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                New Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Schedule New Event</DialogTitle>
                <DialogDescription>
                  Add a new meeting, content shoot, or deadline to your agency calendar.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">Title</Label>
                  <Input id="title" className="col-span-3" placeholder="Event title..." />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">Type</Label>
                  <Select defaultValue="meeting">
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="shoot">Content Shoot</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="client" className="text-right">Client</Label>
                  <Select>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select client (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alpine">Alpine Peak Outfitters</SelectItem>
                      <SelectItem value="timberline">Timberline Coffee</SelectItem>
                      <SelectItem value="douglas">Douglas County RE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="time" className="text-right">Time</Label>
                  <Input id="time" type="time" className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddEventOpen(false)}>Cancel</Button>
                <Button type="submit" onClick={() => setIsAddEventOpen(false)}>Save Event</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Date Picker and Filters */}
        <motion.div 
          variants={fadeInUp} 
          initial="initial" 
          animate="animate"
          className="lg:col-span-4 space-y-6"
        >
          <Card className="border-border/50 bg-card shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md border-0 w-full"
              />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Event Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-sm">Client Meetings</span>
                </div>
                <Badge variant="secondary">12</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-accent" />
                  <span className="text-sm">Content Shoots</span>
                </div>
                <Badge variant="secondary">5</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-destructive" />
                  <span className="text-sm">Deadlines</span>
                </div>
                <Badge variant="secondary">3</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Internal Reminders</span>
                </div>
                <Badge variant="secondary">8</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">Draft Events</CardTitle>
              <CardDescription className="text-xs">Draft events extracted from voice memos</CardDescription>
            </CardHeader>
            <CardContent>
              {allDrafts.length === 0 ? (
                <div className="text-xs text-muted-foreground">No draft events.</div>
              ) : (
                <ul className="space-y-2">
                  {allDrafts.map(item => (
                    <li key={item.draft.id} className="flex items-start justify-between p-2 border rounded">
                      <div>
                        <div className="font-medium">{item.draft.title}</div>
                        <div className="text-xs text-muted-foreground">{item.draft.whenText || item.draft.context}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.draft.status !== 'confirmed' ? (
                          <Button size="sm" onClick={() => { setSelectedDraft({ ...item.draft, sourceMemoId: item.sourceMemoId }); setDraftDialogOpen(true); }}>Review</Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedDraft({ ...item.draft, sourceMemoId: item.sourceMemoId }); setDraftDialogOpen(true); }}>View</Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Daily Schedule and Events */}
        <motion.div 
          variants={staggerContainer} 
          initial="hidden" 
          animate="visible"
          className="lg:col-span-8 space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold">
                {date?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) || 'Schedule'}
              </h2>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center bg-muted/50 rounded-lg p-1">
              <Button variant="ghost" size="sm" className="h-8 text-xs">Day</Button>
              <Button variant="secondary" size="sm" className="h-8 text-xs bg-card shadow-sm">Week</Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs">Month</Button>
            </div>
          </div>

          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="text-xs text-muted-foreground">No events on the calendar.</div>
            ) : (
              events.map(ev => (
                <motion.div key={ev.id} variants={staggerItem}>
                  <Card className="border-border/50 hover:border-primary/30 transition-colors shadow-sm overflow-hidden group">
                    <div className="flex">
                      <div className={`w-1.5 bg-primary`} />
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground">{ev.date || ''}</span>
                              <Badge variant="outline" className="capitalize text-[10px] h-5">{ev.title}</Badge>
                              {(ev.source === 'voice_memo' || ev.sourceMemoId) ? <Badge variant="secondary" className="text-[10px]">From Voice Memo</Badge> : null}
                            </div>
                            <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">{ev.title}</h3>
                            {ev.clientId && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="h-3.5 w-3.5" />
                                <span>{(state.clients.find(c=>c.id===ev.clientId)||{} as any).name || ''}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {ev.source === 'retainer' ? (
                              <>
                                <Button size="sm" onClick={() => { window.location.href = `/clients/${ev.clientId}`; }}>Open Client</Button>
                                <Confirm title="Clear retainer" description="Clear retainer for this client?" onConfirm={() => { if (ev.clientId && setClientRetainer) setClientRetainer(ev.clientId, null); }}>
                                  <Button size="sm" variant="destructive">Clear Retainer</Button>
                                </Confirm>
                              </>
                            ) : (
                              <>
                                <Button size="sm" variant="outline" onClick={() => setSelectedEvent(ev)}>Edit</Button>
                                <Button size="sm" variant="ghost" onClick={() => { if (ev.id && deleteEvent) { deleteEvent(ev.id); } }}>Delete</Button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-4">
                          <div className="text-xs text-muted-foreground">{ev.notes || ''}</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>

          {selectedDraft ? (
            <DraftEventDialog
              open={draftDialogOpen}
              draft={selectedDraft}
              mode={selectedDraft?.status === 'confirmed' ? 'view' : 'edit'}
              onOpenChange={(v)=>setDraftDialogOpen(v)}
              onSave={(upd)=>{
                // persist back to memo
                const memoId = upd.sourceMemoId;
                const memo = state.voiceMemos.find((m:any)=>m.id === memoId);
                if (memo) {
                  const existing = memo.extracted?.draftEvents || [];
                  const updated = existing.map((d:any)=> d.id === upd.id ? upd : d);
                  updateVoiceMemo && updateVoiceMemo(memoId, { extracted: { ...(memo.extracted||{}), draftEvents: updated } });
                }
                setDraftDialogOpen(false);
              }}
              onConfirm={(upd)=>{
                const memoId = upd.sourceMemoId;
                const memo = state.voiceMemos.find((m:any)=>m.id === memoId);
                if (memo) {
                  const existing = memo.extracted?.draftEvents || [];
                  const updated = existing.map((d:any)=> d.id === upd.id ? { ...d, title: upd.title, whenText: upd.whenText, date: upd.date, context: upd.context, updatedAt: new Date().toISOString() } : d);
                  updateVoiceMemo && updateVoiceMemo(memoId, { extracted: { ...(memo.extracted||{}), draftEvents: updated } });
                }
                const terms = memo?.extracted?.paymentTerms;
                const confidence = terms?.confidence || (terms && 'medium');
                if (terms && confidence !== 'high') {
                  setProposalTerms(terms);
                  setProposalMemoId(memoId);
                  setProposalDraftId(upd.id);
                  setIsProposalOpen(true);
                  setDraftDialogOpen(false);
                  return;
                }
                // otherwise create event
                const ev = addEvent ? addEvent({ clientId: upd.clientId, title: upd.title, date: upd.date ?? null, whenText: upd.whenText, notes: upd.context, sourceMemoId: upd.sourceMemoId, source: 'voice_memo', sourceMemoTitle: upd.sourceMemoTitle || undefined }) : null;
                if (memo) {
                  const existing = memo.extracted?.draftEvents || [];
                  const updated = existing.map((d:any)=> d.id === upd.id ? { ...d, status: 'confirmed', confirmedEventId: ev?.id, updatedAt: new Date().toISOString() } : d);
                  const prevIds = (memo.extracted?.createdEventIds || []);
                  const nextIds = ev ? [...prevIds, ev.id] : prevIds;
                  updateVoiceMemo && updateVoiceMemo(memoId, { extracted: { ...(memo.extracted||{}), draftEvents: updated, createdEventIds: nextIds } });
                }
                setDraftDialogOpen(false);
              }}
              onDismiss={()=>{
                const memoId = selectedDraft?.sourceMemoId;
                const memo = state.voiceMemos.find((m:any)=>m.id === memoId);
                if (memo) {
                  const existing = memo.extracted?.draftEvents || [];
                  const updated = existing.map((d:any)=> d.id === selectedDraft.id ? { ...d, status: 'dismissed', updatedAt: new Date().toISOString() } : d);
                  updateVoiceMemo && updateVoiceMemo(memoId, { extracted: { ...(memo.extracted||{}), draftEvents: updated } });
                }
                setDraftDialogOpen(false);
              }}
            />
          ) : null}

          <motion.div variants={staggerItem} className="pt-4">
            <Button variant="outline" className="w-full border-dashed border-2 py-8 flex flex-col gap-2 h-auto text-muted-foreground hover:text-primary hover:border-primary/50 transition-all">
              <Plus className="h-6 w-6" />
              <span>Click to add an event at a specific time</span>
            </Button>
          </motion.div>
        </motion.div>
        <RetainerProposalModal open={isProposalOpen} onOpenChange={(v)=>{ setIsProposalOpen(v); if (!v) { setProposalTerms(null); setProposalMemoId(null); setProposalDraftId(null); } }} terms={proposalTerms} confidence={proposalTerms?.confidence}
          onApply={() => {
            if (!proposalMemoId || !proposalDraftId || !proposalTerms) return;
            const memo = state.voiceMemos.find((m:any)=>m.id === proposalMemoId);
            const ret = { ...(proposalTerms || {}), sourceMemoId: proposalMemoId, sourceMemoTitle: memo?.title || undefined, updatedAt: new Date().toISOString() };
            const clientId = memo?.clientId;
            if (clientId && setClientRetainer) setClientRetainer(clientId, ret);
            if (memo) { updateVoiceMemo && updateVoiceMemo(proposalMemoId, { extracted: { ...(memo.extracted||{}), paymentTerms: proposalTerms, appliedAt: new Date().toISOString() } }); }
            if (proposalMemoId && proposalDraftId) {
              if (confirmDraftEvent) confirmDraftEvent(proposalMemoId, proposalDraftId);
            }
            setIsProposalOpen(false);
          }}
          onEdit={() => { setIsProposalOpen(false); }}
          onKeepNote={() => { if (proposalMemoId && proposalDraftId) { const memo = state.voiceMemos.find((m:any)=>m.id === proposalMemoId); if (memo) { const existing = memo.extracted?.draftEvents || []; const updated = existing.map((d:any)=> d.id === proposalDraftId ? { ...d, status: 'confirmed', updatedAt: new Date().toISOString() } : d); updateVoiceMemo && updateVoiceMemo(proposalMemoId, { extracted: { ...(memo.extracted||{}), draftEvents: updated } }); } } setIsProposalOpen(false); }}
        />
      </div>
    </div>
  );
}
