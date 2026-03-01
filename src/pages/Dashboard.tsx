import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Users, CheckCircle2, DollarSign, Zap, Plus, ArrowRight, Calendar as CalendarIcon, FileText, TrendingUp, Clock, Lock, MoreVertical } from 'lucide-react';
import { ROUTE_PATHS } from '@/lib/index';
import { AddTaskModal, LogActivityModal, ScheduleShootModal, CreateInvoiceModal } from '@/components/Modals';
// Tasks overview replaces the previous performance widget
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { useTRPData } from '@/lib/trpData';
import { useOpenAI } from '@/hooks/useOpenAI';
import { getAllDraftEvents } from '@/lib/draftEvents';
import DraftEventDialog from '@/components/DraftEventDialog';
import { RetainerProposalModal } from '@/components/Modals';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { buildAIRequestPayload, buildDeterministicSchedule } from '@/lib/scheduler';
import { Badge } from '@/components/ui/badge';
import { deprioritizeWaiting } from '@/lib/utils';
import ClientLabel from '@/components/ClientLabel';

export default function Dashboard() {
  const { state, now, addTask, updateTask, updateClient, addActivity, addInvoice, setTopPriority, reorderTopPriorities, setClientTasksWaiting, clearTaskWaiting, clearClientWaiting, addEvent, updateEvent, deleteEvent, updateVoiceMemo, setClientRetainer, confirmDraftEvent, computeRetainerStatus } = useTRPData();
  const { sendMessage, isLoading: aiLoading } = useOpenAI();

  const [dailyState, setDailyState] = useLocalStorage<any>('trp-dashboard-daily-v1', { lastStartDate: '', activationTime: '', lockedTopIds: [], daySchedule: [], scheduleRationale: '' });
  const [settings] = useLocalStorage<any>('trp-user-settings', { apiKey: '', aiModel: 'gpt-5-nano', workStart: '09:00' });

  const clients = state?.clients || [];
  const tasks = state?.tasks || [];

  const [pinnedSchedule, setPinnedSchedule] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskClient, setQuickTaskClient] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<any | null>(null);
  const [lastAIResponse, setLastAIResponse] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [afJustRan, setAfJustRan] = useState(false);
  const [scheduleStart, setScheduleStart] = useState<'now' | string>('now');
  const [scheduleEnd, setScheduleEnd] = useState('17:00');
  const [focusLength, setFocusLength] = useState<number>(45);
  const [breakLength, setBreakLength] = useState<number>(10);
  const [breakPattern, setBreakPattern] = useState<'every'|'single'|'none'>('every');
  const [singleBreakAt, setSingleBreakAt] = useState('12:00');
  const [singleBreakLength, setSingleBreakLength] = useState<number>(30);
  const [energyHigh, setEnergyHigh] = useState(true);
  const [includeDueTasks, setIncludeDueTasks] = useState(true);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isLogActivityOpen, setIsLogActivityOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [isScheduleShootOpen, setIsScheduleShootOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingInitial, setEditingInitial] = useState<any | null>(null);
  const [nudgeConfirm, setNudgeConfirm] = useState<{ open: boolean; payload?: any }>({ open: false });
  const [statusModal, setStatusModal] = useState<{ open: boolean; payload?: any; reason?: string; note?: string; markAll?: boolean }>({ open: false, payload: undefined, reason: 'waiting_on_client', note: '', markAll: false });

  // simple natural-language quick parser (falls back to AI)
  const parseQuickTask = (text: string) => {
    let title = text.trim();
    let clientId: string | null = null;
    let clientName = '';
    let dueDate = '';
    let priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium';
    let type: string | undefined = undefined;
    let toolLink: string | undefined = undefined;

    // client mention with @Name
    const clientMatch = title.match(/@([\w \-&']{2,40})/i);
    if (clientMatch) {
      const name = clientMatch[1].trim();
      const found = clients.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
      if (found) {
        clientId = found.id;
        clientName = found.name;
      }
      title = title.replace(clientMatch[0], '').trim();
    }

    // due keywords
    if (/due tomorrow/i.test(title)) {
      const d = new Date(); d.setDate(d.getDate() + 1);
      dueDate = d.toISOString().slice(0,10);
      title = title.replace(/due tomorrow/i, '').trim();
    } else if (/due today/i.test(title)) {
      dueDate = new Date().toISOString().slice(0,10);
      title = title.replace(/due today/i, '').trim();
    } else {
      const m = title.match(/due (\d{4}-\d{2}-\d{2})/i);
      if (m) {
        dueDate = m[1];
        title = title.replace(m[0], '').trim();
      }
    }

    if (/\burgent\b/i.test(text)) priority = 'urgent';
    else if (/\bhigh\b/i.test(text)) priority = 'high';
    else if (/\blow\b/i.test(text)) priority = 'low';

    // detect category keywords
    if (/\bphoto\b|\bcanva\b|\bdesign\b/i.test(text)) {
      type = 'photo';
      if (/canva\.com|canva/i.test(text)) toolLink = 'https://www.canva.com';
    } else if (/\bvideo\b|\bcapcut\b|\bedit\b/i.test(text)) {
      type = 'video';
      if (/capcut/i.test(text)) toolLink = 'https://www.capcut.com';
    } else if (/\bweb\b|\bwix\b|\bsite\b|\bwebsite\b/i.test(text)) {
      type = 'web';
      if (/wix/i.test(text)) toolLink = 'https://www.wix.com';
    } else if (/\bsocials\b|\bsocial\b|facebook|instagram|tiktok/i.test(text)) {
      type = 'socials';
      const m = text.match(/facebook|instagram|tiktok/i);
      if (m) toolLink = `https://${m[0].toLowerCase()}.com`;
    } else if (/\bshoot\b|\bphoto shoot\b/i.test(text)) {
      type = 'shoot';
    }

    return { title: title || text, clientId, clientName, dueDate, priority, type, toolLink };
  };

  // Helpers: parse AI response with fallbacks
  const extractAndParseAIResponse = (content: string | null): any | null => {
    if (!content) return null;
    const fenceMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/i);
    let candidate: string | null = fenceMatch ? fenceMatch[1] : null;
    if (!candidate) {
      const jsonMatch = content.match(/\{[\s\S]*\}/m);
      if (jsonMatch) candidate = jsonMatch[0];
    }
    if (!candidate) {
      const first = content.indexOf('{');
      const last = content.lastIndexOf('}');
      if (first !== -1 && last !== -1 && last > first) candidate = content.slice(first, last + 1);
    }
    if (!candidate) return null;
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && parsed.daySchedule) return parsed;
    } catch (e) {
      try {
        const cleaned = candidate.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        const parsed2 = JSON.parse(cleaned);
        if (parsed2 && parsed2.daySchedule) return parsed2;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const applyDeterministicSchedule = (opts: any) => {
    try {
      const sched = buildDeterministicSchedule(opts);
      setDailyState((s:any) => ({ ...(s||{}), daySchedule: sched.daySchedule || [], scheduleRationale: sched.rationale || '' }));
      try { toast({ title: 'Deterministic schedule applied' }); } catch (e) {}
    } catch (e) {
      try { toast({ title: 'Schedule error', description: 'Could not build deterministic schedule.' }); } catch (e) {}
    }
  };

  const generateSchedule = async () => {
    if (!dailyState) return;
    if (!dailyState?.lastStartDate) return; // require activated day
    setIsGenerating(true);
    try {
      const snapshot = {
        date: today,
        now: new Date().toISOString(),
        top3: (dailyState?.lockedTopIds || []).map((id:string) => tasks.find((t:any)=>t.id===id)).filter(Boolean),
        dueToday: tasks.filter((t:any)=>t.dueDate === today && t.status !== 'completed'),
        overdue: tasks.filter((t:any)=>t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'),
        meetings: [],
        settings: { focusLength, breakLength, workEnd: scheduleEnd }
      };

      if (settings?.apiKey) {
        try {
          const prompt = buildAIRequestPayload(snapshot);
          const res = await sendMessage(prompt as any);
          const content = res?.choices?.[0]?.message?.content || res?.message || '';
          setLastAIResponse(content || null);
          const parsed = extractAndParseAIResponse(content);
          if (parsed) {
            setAiPreview(parsed);
            setIsGenerating(false);
            return;
          }
        } catch (e) {
          // ignore AI errors
        }
      }

      // fallback
      applyDeterministicSchedule({ date: today, nowISO: new Date().toISOString(), top3: (dailyState?.lockedTopIds||[]).map((id:string)=>tasks.find((t:any)=>t.id===id)).filter(Boolean), dueToday: tasks.filter((t:any)=>t.dueDate===today && t.status !== 'completed'), includeDueTasks, workStart: settings?.workStart || '09:00', workEnd: scheduleEnd, focusLength, breakLength, breakPattern, singleBreakAt, singleBreakLength });
    } finally {
      setIsGenerating(false);
    }
  };

  // timeline helpers
  const hhmmToMinutes = (hhmm: string) => {
    const [h, m] = (hhmm || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const blockDuration = (b: any) => {
    try {
      if (!b || !b.start || !b.end) return 0;
      return Math.max(0, hhmmToMinutes(b.end) - hhmmToMinutes(b.start));
    } catch (e) { return 0; }
  };

  // Calendar helpers (stubs)
  const applyToCalendar = (block: any) => {
    try {
      // mark block as added to calendar in persisted state
      setDailyState((s:any) => {
        const ds = { ...(s||{}) };
        ds.daySchedule = (ds.daySchedule || []).map((b:any) => b === block ? { ...b, pinnedToCalendar: true } : b);
        return ds;
      });
      try { toast({ title: 'Added to calendar' }); } catch (e) {}
    } catch (e) {}
  };

  const exportICS = (block: any) => {
    try {
      const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${block.title}\nDTSTART:${today.replace(/-/g,'') }T${(block.start||'00:00').replace(':','') }00\nDTEND:${today.replace(/-/g,'') }T${(block.end||'00:00').replace(':','') }00\nEND:VEVENT\nEND:VCALENDAR`;
      const blob = new Blob([ics], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${block.title || 'event'}.ics`; a.click(); URL.revokeObjectURL(url);
      try { toast({ title: 'ICS exported' }); } catch (e) {}
    } catch (e) {}
  };

  const openGoogleCalendar = (block: any) => {
    const start = `${today}T${(block.start||'00:00')}`;
    const end = `${today}T${(block.end||'00:00')}`;
    const url = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(block.title || '')}&dates=${start.replace(/-|:/g,'')}/${end.replace(/-|:/g,'')}`;
    window.open(url, '_blank');
  };

  // FB insights and performance chart removed from Dashboard; kept for future work in Settings/Analytics

  const today = format(now || new Date(), 'yyyy-MM-dd');

  // Reset daily activation when date changes
  useEffect(() => {
    if (!dailyState?.lastStartDate) return;
    if (dailyState.lastStartDate !== today) {
      if (dailyState?.pinned) {
        // preserve pinned schedule across days but clear activation
        setDailyState((s:any) => ({ ...(s||{}), lastStartDate: '', activationTime: '' }));
      } else {
        setDailyState({ lastStartDate: '', activationTime: '', lockedTopIds: [] });
      }
      try { toast({ title: 'Daily reset', description: 'Start My Day is ready for today.' }); } catch (e) {}
    }
  }, [today]);

  const topPriorities = tasks.filter(t => t.isTopPriority && t.topPriorityDate === today).sort((a,b) => (a.topPriorityRank || 99) - (b.topPriorityRank || 99)).slice(0,3);

  // When Auto-Fill runs we set `afJustRan` to true; this effect fires after `tasks` update
  React.useEffect(() => {
    if (!afJustRan) return;
    try {
      const nowTop = tasks.filter((t:any) => t.isTopPriority && t.topPriorityDate === today).sort((a:any,b:any) => (a.topPriorityRank||99)-(b.topPriorityRank||99));
      if (!nowTop || nowTop.length === 0) {
        try { toast({ title: 'Debug: No top priorities set after Auto-Fill' }); } catch(e){}
      } else {
        try { toast({ title: `Debug: Now top: ${nowTop.map((t:any)=>t.title).slice(0,3).join(', ')}` }); } catch(e){}
      }
    } catch (e) {}
    setAfJustRan(false);
  }, [tasks, afJustRan]);

  const counts = useMemo(() => {
    const overdue = state.tasks.filter((t:any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
    const dueToday = state.tasks.filter((t:any) => t.dueDate === today && t.status !== 'completed').length;
    const waiting = state.tasks.filter((t:any) => t.status === 'review' || t.status === 'waiting').length;
    const upcomingShoots = state.tasks.filter((t:any) => t.type === 'shoot' && t.dueDate && (new Date(t.dueDate).getTime() - Date.now()) <= 48*3600*1000).length;
    const invoicesDue = state.invoices.filter((inv:any) => {
      if (!inv.dueDate) return false;
      const d = new Date(inv.dueDate + 'T00:00:00');
      const diff = (d.getTime() - Date.now())/(1000*60*60*24);
      return diff <= 7 && diff >= 0;
    }).length;
    // Retainer computations
    const retainerClients: Array<{clientId:string; name:string; nextDate?: string}> = [];
    const computeNextForDay = (day:number) => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const candidate = new Date(year, month, day);
      if (now.getDate() <= day) return candidate;
      return new Date(year, month + 1, day);
    };
    state.clients.forEach((c:any) => {
      const r = c.billing?.retainer;
      if (!r) return;
      if (!((r.amountCents || r.amount) > 0)) return;
      let next: string | undefined = undefined;
      if (r.nextDueDate) next = String(r.nextDueDate);
      else if ((r.cadence === 'monthly' || r.period === 'monthly') && r.dayOfMonth) {
        const d = Number(r.dayOfMonth);
        if (!isNaN(d) && d >= 1 && d <= 31) next = computeNextForDay(d).toISOString().slice(0,10);
      }
      if (next) retainerClients.push({ clientId: c.id, name: c.name, nextDate: next });
    });
    // count late retainers using computeRetainerStatus when available
    let retainerLate = 0;
    try {
      state.clients.forEach((c:any) => {
        try {
          const st = computeRetainerStatus ? computeRetainerStatus(c.id) : null;
          if (st && st.status === 'late') retainerLate += 1;
        } catch (e) { /* ignore per-client errors */ }
      });
    } catch (e) {}
    let retainerDue = 0;
    let soonest: string | null = null;
    const nowTs = new Date().getTime();
    const threeDays = 3 * 24 * 3600 * 1000;
    retainerClients.forEach(r => {
      const d = new Date(r.nextDate!).getTime();
      if (d <= nowTs + threeDays) retainerDue += 1;
      if (!soonest || new Date(r.nextDate!).getTime() < new Date(soonest).getTime()) soonest = r.nextDate!;
    });
    return { overdue, dueToday, waiting, upcomingShoots, invoicesDue, retainerDue, retainerLate, nextRetainerDate: soonest };
  }, [state.tasks, state.invoices, today]);

  const top3CompletedCount = useMemo(() => {
    const locked = dailyState?.lockedTopIds || [];
    return locked.filter((id: string) => {
      const t = state.tasks.find((x:any) => x.id === id);
      if (!t) return false;
      if (t.status !== 'completed') return false;
      if (!t.completedAt) return false;
      return new Date(t.completedAt).toISOString().slice(0,10) === today;
    }).length;
  }, [dailyState, state.tasks, today]);

  const totalCompletedToday = useMemo(() => {
    return state.tasks.filter((t:any) => t.status === 'completed' && t.completedAt && new Date(t.completedAt).toISOString().slice(0,10) === today).length;
  }, [state.tasks, today]);

  const top3Progress = useMemo(() => {
    const denom = Math.max(1, topPriorities.length);
    return Math.round((top3CompletedCount / denom) * 100);
  }, [top3CompletedCount, topPriorities.length]);

  const overdueList = useMemo(() => deprioritizeWaiting(state.tasks.filter((t:any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed')).slice(0,6), [state.tasks]);
  const dueTodayList = useMemo(() => deprioritizeWaiting(state.tasks.filter((t:any) => t.dueDate === today && t.status !== 'completed')).slice(0,6), [state.tasks, today]);
  const dueWeekList = useMemo(() => {
    const end = new Date(); end.setDate(end.getDate() + 7);
    return deprioritizeWaiting(state.tasks.filter((t:any) => t.dueDate && new Date(t.dueDate) > new Date() && new Date(t.dueDate) <= end && t.status !== 'completed')).slice(0,6);
  }, [state.tasks]);

  // At-Risk calculations
  const atRiskOverdue = useMemo(() => {
    const twoDays = 2 * 24 * 3600 * 1000;
    return state.tasks.filter((t:any) => t.dueDate && new Date().getTime() - new Date(t.dueDate).getTime() >= twoDays && t.status !== 'completed').slice(0,8);
  }, [state.tasks]);

  const unpaidInvoices = useMemo(() => state.invoices.filter((inv:any) => !inv.paidAt).slice(0,8), [state.invoices]);

  const silenceDays = 14;
  const silentClients = useMemo(() => {
    const cutoff = Date.now() - silenceDays * 24 * 3600 * 1000;
    const operatorOnlyTypes = new Set(['nudge','prep_nudge','invoice_reminder']);
    const activeClientIds = new Set(
      state.activities
        .filter((a:any) => new Date(a.timestamp).getTime() >= cutoff && a.clientId && !operatorOnlyTypes.has(a.type))
        .map((a:any) => a.clientId)
    );
    return state.clients.filter((c:any) => !activeClientIds.has(c.id)).slice(0,8);
  }, [state.clients, state.activities]);

  const shootsPrepWarnings = useMemo(() => {
    return state.tasks.filter((t:any) => t.type === 'shoot' && t.dueDate && (new Date(t.dueDate).getTime() - Date.now()) <= 48*3600*1000 && t.status !== 'completed' && !(t.prepDone || t.prepared || (t.metadata && t.metadata.prepDone))).slice(0,8);
  }, [state.tasks]);

  const waitingOnList = useMemo(() => state.tasks.filter((t:any) => t.status === 'waiting' || t.status === 'review').slice(0,8), [state.tasks]);

  // Draft events list
  const allDrafts = useMemo(() => getAllDraftEvents(state.voiceMemos), [state.voiceMemos]);
  const [showConfirmedDrafts, setShowConfirmedDrafts] = React.useState(false);
  const draftCount = allDrafts.filter(d => d.draft.status === 'draft').length;
  const draftList = allDrafts.filter(d => showConfirmedDrafts ? (d.draft.status === 'draft' || d.draft.status === 'confirmed') : d.draft.status === 'draft').slice(0,5);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<'view'|'edit'|'confirm'>('edit');
  const [selectedDraft, setSelectedDraft] = React.useState<any>(null);
  const [isProposalOpen, setIsProposalOpen] = React.useState(false);
  const [proposalTerms, setProposalTerms] = React.useState<any>(null);
  const [proposalMemoId, setProposalMemoId] = React.useState<string | null>(null);
  const [proposalDraftId, setProposalDraftId] = React.useState<string | null>(null);

  const openDraftDialog = (memoId: string, draft: any, mode: 'view'|'edit'|'confirm' = 'edit') => {
    setSelectedDraft({ ...draft, sourceMemoId: memoId });
    setDialogMode(mode);
    setDialogOpen(true);
  };

  const updateDraftInMemo = (memoId: string, draftId: string, updater: (d:any)=>any) => {
    const memo = state.voiceMemos.find((m:any)=>m.id === memoId);
    if (!memo) return;
    const existing = memo.extracted?.draftEvents || [];
    const updated = existing.map((de:any) => de.id === draftId ? updater(de) : de);
    const nextExtracted = { ...(memo.extracted || {}), draftEvents: updated };
    updateVoiceMemo && updateVoiceMemo(memoId, { extracted: nextExtracted });
  };

  const handleSaveDraft = (payload: any) => {
    const { sourceMemoId, id } = payload;
    updateDraftInMemo(sourceMemoId, id, () => ({ ...payload }));
    setDialogOpen(false);
    try { toast({ title: 'Draft updated' }); } catch(e){}
  };

  const handleConfirmDraft = (payload: any) => {
    const { sourceMemoId, id, clientId, title, date, whenText, context } = payload;
    const memo = state.voiceMemos.find((m:any)=>m.id === sourceMemoId);
    const terms = memo?.extracted?.paymentTerms;
    const confidence = terms?.confidence || (terms && 'medium');
    if (terms && confidence !== 'high') {
      setProposalTerms(terms);
      setProposalMemoId(sourceMemoId);
      setProposalDraftId(id);
      setIsProposalOpen(true);
      setDialogOpen(false);
      return;
    }
    // create event
    const ev = addEvent ? addEvent({ clientId, title, date: date ?? null, whenText, notes: context, sourceMemoId }) : null;
    // mark draft confirmed
    updateDraftInMemo(sourceMemoId, id, (d:any) => ({ ...d, status: 'confirmed', confirmedEventId: ev?.id, updatedAt: new Date().toISOString() }));
    setDialogOpen(false);
    try { toast({ title: 'Event confirmed' }); } catch(e){}
  };

  const handleDismissDraft = (memoId: string, draftId: string) => {
    updateDraftInMemo(memoId, draftId, (d:any) => ({ ...d, status: 'dismissed', updatedAt: new Date().toISOString() }));
    try { toast({ title: 'Draft dismissed' }); } catch(e){}
  };

  const handleQuickConfirm = (memoId: string, draft: any) => {
    // If missing title, open dialog
    if (!draft.title || draft.title.trim() === '') {
      openDraftDialog(memoId, draft, 'confirm');
      return;
    }
    handleConfirmDraft({ ...draft, sourceMemoId: memoId });
  };

  const handleUnconfirm = (memoId: string, draft: any) => {
    if (!draft.confirmedEventId) return;
    try {
      if (deleteEvent) deleteEvent(draft.confirmedEventId);
    } catch (e) {}
    updateDraftInMemo(memoId, draft.id, (d:any) => ({ ...d, status: 'draft', confirmedEventId: undefined, updatedAt: new Date().toISOString() }));
    try { toast({ title: 'Event unconfirmed' }); } catch(e){}
  };

  // Helper: send a nudge (records activity, creates notification, toasts, marks task nudged)
  const sendNudge = (opts: { taskId?: string; clientId?: string; clientName?: string; notes?: string; type?: string }) => {
    const { taskId, clientId, clientName, notes, type } = opts;
    try {
      addActivity({ clientId: clientId || (taskId ? (state.tasks.find((t:any)=>t.id===taskId)?.clientId) : undefined), clientName: clientName || (taskId ? (state.tasks.find((t:any)=>t.id===taskId)?.clientName) : undefined), type: type || 'nudge', notes: notes || 'Nudge sent from dashboard', timestamp: new Date().toISOString() });
      try { toast({ title: 'Nudge recorded', description: clientName || (taskId ? (state.tasks.find((t:any)=>t.id===taskId)?.clientName) : '') || 'Activity logged' }); } catch (e) {}
      if (taskId) {
        const existing = state.tasks.find((t:any)=>t.id === taskId) || {};
        updateTask(taskId, { metadata: { ...(existing.metadata || {}), lastNudgedAt: new Date().toISOString() } });
      }
    } catch (e) {
      try { toast({ title: 'Nudge failed' }); } catch (e) {}
    }
  };

  const openNudgeConfirm = (payload: any) => {
    setNudgeConfirm({ open: true, payload });
  };

  const confirmNudge = () => {
    if (!nudgeConfirm.payload) return setNudgeConfirm({ open: false });
    sendNudge(nudgeConfirm.payload);
    setNudgeConfirm({ open: false });
  };

  const openSetStatus = (payload: any) => {
    setStatusModal({ open: true, payload, reason: 'waiting_on_client', note: '', markAll: false });
  };

  const confirmSetStatus = () => {
    const payload = statusModal.payload;
    if (!payload) return setStatusModal({ open: false, payload: undefined, reason: 'waiting_on_client', note: '', markAll: false });
    const reason = statusModal.reason || 'waiting_on_client';
    const note = statusModal.note || '';
    try {
      const taskId = payload.taskId;
      const clientId = payload.clientId || (taskId ? (state.tasks.find((t:any)=>t.id===taskId)?.clientId) : undefined);
      const clientName = payload.clientName || (taskId ? (state.tasks.find((t:any)=>t.id===taskId)?.clientName) : undefined);

      if (taskId) {
        const existing = state.tasks.find((t:any)=>t.id === taskId) || {};
        updateTask(taskId, { status: 'waiting', metadata: { ...(existing.metadata || {}), waitingReason: reason, waitingNote: note, waitingAt: new Date().toISOString() } });
      }
      if (clientId && !taskId) {
        try { updateClient(clientId, { status: 'waiting' }); } catch (e) {}
        try {
          if (statusModal.markAll && typeof setClientTasksWaiting === 'function') {
            setClientTasksWaiting(clientId, reason, true);
          }
        } catch (e) {}
      }

      addActivity({ clientId, clientName, type: 'status_change', notes: `${reason}${note ? ' — ' + note : ''}`, timestamp: new Date().toISOString() });
      try { toast({ title: 'Status set', description: note || reason }); } catch (e) {}
    } catch (e) {
      try { toast({ title: 'Failed to set status' }); } catch (e) {}
    }
    setStatusModal({ open: false, payload: undefined, reason: 'waiting_on_client', note: '', markAll: false });
  };

  const navigate = useNavigate();

  // Weekly Momentum metrics
  const weeklyActivityCount = useMemo(() => {
    const cutoff = Date.now() - 7*24*3600*1000;
    return state.activities.filter((a:any) => new Date(a.timestamp).getTime() >= cutoff).length;
  }, [state.activities]);

  const revenueThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7*24*3600*1000;
    return state.invoices.filter((inv:any) => inv.paidAt && new Date(inv.paidAt).getTime() >= cutoff).reduce((sum:any, inv:any) => sum + (inv.total || 0), 0);
  }, [state.invoices]);

  const overdueTasks = useMemo(() => {
    return state.tasks.filter((t:any) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').sort((a:any,b:any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0,5);
  }, [state.tasks]);

  const weeklyCompleted = useMemo(() => {
    const cutoff = Date.now() - 7*24*3600*1000;
    return state.tasks.filter((t:any) => t.status === 'completed' && t.completedAt && new Date(t.completedAt).getTime() >= cutoff).sort((a:any,b:any) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()).slice(0,6);
  }, [state.tasks]);

  // Suggest top tasks when none explicitly set: highest priority, then soonest due
  

  const suggestedTop = useMemo(() => {
    const slots = Math.max(0, 3 - topPriorities.length);
    if (slots === 0) return [] as typeof tasks;
    const priorityRank: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4 } as any;
    return [...tasks]
      .filter(t => t.status !== 'completed' && !t.isTopPriority)
      .sort((a,b) => {
        const pa = priorityRank[(a.priority as string) || 'medium'] || 3;
        const pb = priorityRank[(b.priority as string) || 'medium'] || 3;
        if (pa !== pb) return pa - pb;
        // dueDate earlier first
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return da - db;
      })
      .slice(0, slots);
  }, [tasks, topPriorities.length]);

  const autoFillCandidates = useMemo(() => {
    const priorityRank: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4 } as any;
    return [...tasks]
      .filter(t => t.status !== 'completed')
      .sort((a:any,b:any) => {
        const pa = priorityRank[(a.priority as string) || 'medium'] || 3;
        const pb = priorityRank[(b.priority as string) || 'medium'] || 3;
        if (pa !== pb) return pa - pb;
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return da - db;
      })
      .slice(0,3)
      .map(t => t.id);
  }, [tasks]);

  const compactTasks = useMemo(() => {
    const seen = new Set<string>();
    const combined = [
      ...topPriorities,
      ...overdueList,
      ...dueTodayList,
      ...dueWeekList,
      ...suggestedTop,
    ].filter(Boolean) as any[];
    const unique: any[] = [];
    for (const t of combined) {
      if (!t || seen.has(t.id)) continue;
      seen.add(t.id);
      unique.push(t);
      if (unique.length >= 4) break;
    }
    return deprioritizeWaiting(unique).slice(0,4);
  }, [topPriorities, overdueList, dueTodayList, dueWeekList, suggestedTop]);

  

  const handleQuickAdd = () => {
    if (!quickTaskTitle.trim()) return;
    const clientId = quickTaskClient || '';
    const clientName = clientId ? (clients.find(c => c.id === clientId)?.name || '') : '';
    const parsed = parseQuickTask(quickTaskTitle);
    addTask({ title: parsed.title, clientId, clientName, dueDate: parsed.dueDate || '', priority: parsed.priority || 'medium', type: parsed.type || 'admin', toolLink: parsed.toolLink || '', createdAt: new Date().toISOString(), status: 'todo' });
    setQuickTaskTitle('');
  };

  // Start My Day logic
  const isDayActivated = dailyState?.lastStartDate === today && !!dailyState.activationTime;
  const activationTime = dailyState?.activationTime;

  const startMyDay = async () => {
    // lock top 3 (use existing topPriorities or suggestedTop)
    let lockIds = topPriorities.map(t => t.id);
    if (lockIds.length < 3) {
      const need = 3 - lockIds.length;
      const picks = suggestedTop.slice(0, need).map(t => t.id);
      lockIds = [...lockIds, ...picks];
    }
    // ensure length <=3
    lockIds = lockIds.slice(0,3);
    if (lockIds.length > 0) reorderTopPriorities(lockIds);
    const now = new Date().toISOString();
    setDailyState({ lastStartDate: today, activationTime: now, lockedTopIds: lockIds });

    // generate operator brief via AI if available
    if (settings?.apiKey) {
      try {
        const snapshot = {
          top3: lockIds.map(id => state.tasks.find(t => t.id === id)),
          overdue: state.tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed'),
          dueToday: state.tasks.filter(t => t.dueDate === today && t.status !== 'completed'),
          waiting: state.tasks.filter(t => t.status === 'review'),
          upcomingShoots: state.tasks.filter(t => t.type === 'shoot' && t.dueDate && (new Date(t.dueDate).getTime() - Date.now()) <= 48*3600*1000),
          invoicesDue: state.invoices.filter(inv => {
            if (!inv.dueDate) return false;
            const d = new Date(inv.dueDate + 'T00:00:00');
            const diff = (d.getTime() - Date.now())/(1000*60*60*24);
            return diff <= 7 && diff >= 0;
          }),
        };
        const briefPrompt = `You are an operator assistant. Given this dashboard snapshot: ${JSON.stringify(snapshot)}\nReturn a short operator brief: 1) What makes today a win 2) What's at risk 3) What to do first 4) One high-leverage move.`;
        const res = await sendMessage(briefPrompt as any);
        const aiContent = res?.choices?.[0]?.message?.content || res?.message || '';
        setDailyState((s:any) => ({ ...s, operatorBrief: aiContent }));
      } catch (e) {
        // ignore AI errors; deterministic summary will be shown
      }
    } else {
      // deterministic brief
      const wins = lockIds.map(id => state.tasks.find(t => t.id === id)?.title).filter(Boolean);
      const riskCount = state.tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed').length;
      const brief = `Win: Focus on ${wins.join(', ')}. Risk: ${riskCount} overdue tasks. Start with highest urgency. One high-leverage move: follow up unpaid invoices.`;
      setDailyState((s:any) => ({ ...s, operatorBrief: brief }));
    }
    try { toast({ title: 'Started your day', description: `Locked Top ${lockIds.length} priorities` }); } catch (e) {}
  };
    const resetStartMyDay = () => {
      try {
        setDailyState({ lastStartDate: '', activationTime: '', lockedTopIds: [] });
        try { toast({ title: 'Start My Day reset', description: 'You can start your day again.' }); } catch (e) {}
      } catch (e) {}
    };

    const handleAISuggest = async () => {
      if (!quickTaskTitle.trim()) return;
    // Ask AI to extract simple JSON: {title, clientName, dueDate, priority}
    const prompt = `Extract a JSON object with keys title, clientName (optional), dueDate (YYYY-MM-DD optional), priority (urgent|high|medium|low), type (photo|video|web|socials|shoot|admin|meeting|email optional), and toolLink (optional) from this text:\n"""${quickTaskTitle}"""`;
    try {
      const res = await sendMessage(prompt as any);
      // try to extract JSON from assistant content
      const content = res?.choices?.[0]?.message?.content || res?.message || '';
      const jsonMatch = content && content.match(/\{[\s\S]*\}/m);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const parsedClient = parsed.clientName ? (clients.find(c => c.name.toLowerCase().includes(String(parsed.clientName).toLowerCase()))?.id || null) : null;
          addTask({ title: parsed.title || quickTaskTitle.trim(), clientId: parsedClient || parsed.clientId || '', clientName: parsed.clientName || '', dueDate: parsed.dueDate || '', priority: parsed.priority || 'medium', type: parsed.type || undefined, toolLink: parsed.toolLink || '', createdAt: new Date().toISOString(), status: 'todo' });
          setQuickTaskTitle('');
          return;
        } catch (e) {
          // fallthrough to local parse
        }
      }
    } catch (e) {
      // ignore AI failures; fallback
    }
    // fallback local parse
    const p = parseQuickTask(quickTaskTitle);
    addTask({ title: p.title, clientId: p.clientId || '', clientName: p.clientName || '', dueDate: p.dueDate || '', priority: p.priority, createdAt: new Date().toISOString(), status: 'todo' });
    setQuickTaskTitle('');
  };

  return (
    <motion.div className="space-y-6 p-4 lg:p-8" initial="hidden" animate="visible" variants={staggerContainer}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <motion.h1 variants={fadeInUp} className="text-4xl font-bold tracking-tight text-foreground">Command Center</motion.h1>
          <motion.p variants={fadeInUp} className="text-muted-foreground mt-2">Welcome back. Here's what's happening today.</motion.p>
        </div>
        <motion.div variants={fadeInUp} className="flex items-center gap-3">

              
          <div className="text-sm text-muted-foreground font-mono">{format(now || new Date(), 'MMM d, yyyy')} • {format(now || new Date(), 'h:mm:ss a')}</div>
        </motion.div>
      </div>

      {/* Consolidated Status + Start My Day control */}
      <div className="w-full my-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-full flex items-center justify-between">
            <div className="text-sm font-semibold">{format(now || new Date(), 'EEE, MMM d')}</div>
            <div className="text-xs text-muted-foreground">{isDayActivated ? `Day started ${format(new Date(dailyState.activationTime), 'h:mm a')}` : 'Day not started'}</div>
          </div>

          <div className="w-full flex items-center justify-center">
            {!isDayActivated ? (
              <Button onClick={startMyDay} aria-label="Start My Day" title="Start My Day" className="px-10 py-4 text-lg rounded-full shadow-lg">▶ Start My Day</Button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="text-lg font-semibold">Day Activated ✔ {format(new Date(activationTime), 'h:mm a')}</div>
                <Button size="sm" variant="ghost" onClick={resetStartMyDay}>Reset SMD</Button>
              </div>
            )}
          </div>

          <div className="w-full mt-2 flex items-center justify-center gap-6">
            <div className="flex flex-col items-center">
              <div className="text-lg font-bold">{counts.overdue}</div>
              <div className="text-xs text-muted-foreground">Overdue</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-lg font-bold">{counts.dueToday}</div>
              <div className="text-xs text-muted-foreground">Due today</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-lg font-bold">{counts.waiting}</div>
              <div className="text-xs text-muted-foreground">Waiting</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-lg font-bold">{counts.upcomingShoots}</div>
              <div className="text-xs text-muted-foreground">Shoots 48h</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-lg font-bold">{counts.invoicesDue}</div>
              <div className="text-xs text-muted-foreground">Invoices due</div>
            </div>
            <div className="flex flex-col items-center cursor-pointer" onClick={() => navigate(ROUTE_PATHS.FINANCES || '/finances')}>
              <div className="text-lg font-bold">{counts.retainerDue || 0}</div>
              <div className="text-xs text-muted-foreground">Retainer due{counts.nextRetainerDate ? ` • ${counts.nextRetainerDate}` : ''}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm">Add a task (quick)</CardTitle>
            <CardDescription className="text-xs">Quickly capture a task — the input is full-width for easier typing.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input placeholder="Add a task, e.g. Make EBRC Raceway business card on Canva" value={quickTaskTitle} onChange={(e) => setQuickTaskTitle(e.target.value)} />
              <select value={quickTaskClient || ''} onChange={(e) => setQuickTaskClient(e.target.value || null)} className="px-2 rounded border">
                <option value="">No client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <Button onClick={handleQuickAdd}>Add</Button>
                <Button variant="outline" onClick={handleAISuggest} disabled={aiLoading}>{aiLoading ? 'Parsing…' : 'AI Suggest'}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <motion.div variants={staggerItem} className="lg:col-span-8">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-xl">Tasks Overview</CardTitle>
                <CardDescription>Recent tasks and quick management actions</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to={ROUTE_PATHS.TASKS || '/tasks'}>Full Tasks <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="max-h-[350px] w-full overflow-auto">
              <div>
                <div className="text-sm font-semibold">Today’s Top Actions</div>
                {compactTasks.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No tasks to show</div>
                ) : (
                  <ul className="space-y-2 mt-2">
                    {compactTasks.map((t:any) => (
                      <li key={t.id} className="p-2 border rounded flex items-center justify-between cursor-pointer" onClick={() => navigate(`${ROUTE_PATHS.TASKS || '/tasks'}?focus=${t.id}`)}>
                        <div>
                          <div className={`font-medium ${t.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{t.title}</div>
                          <div className="text-xs text-muted-foreground"><ClientLabel clientId={t.clientId} clientName={t.clientName} />{t.dueDate ? <span className="mx-2">•</span> : null}{t.dueDate ? <span>due {t.dueDate}</span> : null}{t.metadata?.lastNudgedAt ? <span className="ml-2">• nudged {format(new Date(t.metadata.lastNudgedAt), 'MMM d')}</span> : null}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); updateTask(t.id, { status: t.status === 'completed' ? 'todo' : 'completed' }); }}>{t.status === 'completed' ? 'Reopen' : 'Complete'}</Button>
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setTopPriority(t.id, 1); }} disabled={isDayActivated}>Promote</Button>
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditingTaskId(t.id); setEditingInitial(t); setIsAddTaskOpen(true); }}>Edit</Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="pt-3"><Button asChild variant="outline" className="w-full"><Link to={ROUTE_PATHS.TASKS || '/tasks'}>Show More →</Link></Button></div>

                
              </div>
            </CardContent>
          </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Draft Events</CardTitle>
                <CardDescription className="text-xs">{draftCount} drafts need review</CardDescription>
              </CardHeader>
              <CardContent>
                {draftCount === 0 ? (
                  <div className="text-sm text-muted-foreground">Draft Events: 0</div>
                ) : (
                  <ul className="space-y-2">
                    {draftList.map(item => (
                      <li key={item.draft.id} className="p-2 border rounded flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{item.draft.title || '(no title)'} <span className="ml-2 text-xs text-muted-foreground">{item.clientName || ''}</span></div>
                          <div className="text-xs text-muted-foreground">{item.draft.whenText || item.draft.context || ''}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.draft.status === 'confirmed' ? (
                            <div className="text-xs px-2 py-0.5 rounded bg-green-50 text-green-700">Confirmed</div>
                          ) : (
                            <div className="text-xs px-2 py-0.5 rounded bg-slate-50 text-slate-700">Draft</div>
                          )}
                          {item.draft.status !== 'confirmed' ? (
                            <Button size="sm" onClick={() => handleQuickConfirm(item.sourceMemoId, item.draft)}>Confirm</Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => handleUnconfirm(item.sourceMemoId, item.draft)}>Unconfirm</Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => openDraftDialog(item.sourceMemoId, item.draft, 'edit')}>Edit</Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          {/* Current running block (Focus) */}
          {dailyState?.currentBlock ? (
            <Card className="mt-4 border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">Now: {dailyState.currentBlock?.title}</CardTitle>
                <CardDescription className="text-xs">In-progress block — running timer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{dailyState.currentBlock?.title}</div>
                    <div className="text-xs text-muted-foreground">Started {dailyState.currentBlockStartedAt ? format(new Date(dailyState.currentBlockStartedAt), 'h:mm:ss a') : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-sm">{Math.floor(elapsedSeconds/3600).toString().padStart(2,'0')}:{Math.floor((elapsedSeconds%3600)/60).toString().padStart(2,'0')}:{(elapsedSeconds%60).toString().padStart(2,'0')}</div>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setDailyState((s:any) => ({ ...(s||{}), currentBlock: undefined, currentBlockStartedAt: undefined, currentBlockPaused: false, currentBlockPausedAccum: 0 }));
                      setIsFocusModeOpen(false);
                      try { toast({ title: 'Stopped', description: 'Current block stopped.' }); } catch (e) {}
                    }}>Stop</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      // Complete: mark linked task completed or create+complete
                      const cb = dailyState.currentBlock;
                      if (!cb) return;
                      setDailyState((s:any) => ({ ...(s||{}), currentBlock: undefined, currentBlockStartedAt: undefined }));
                      if (cb.linkedTaskId) {
                        try { updateTask(cb.linkedTaskId, { status: 'completed' }); } catch (e) {}
                      } else {
                        addTask({ title: cb.title, clientId: '', clientName: '', dueDate: today, priority: 'medium', type: 'admin', createdAt: new Date().toISOString(), status: 'completed' });
                      }
                      try { toast({ title: 'Block completed', description: cb.title }); } catch (e) {}
                    }}>Complete</Button>
                    <Button size="sm" onClick={() => {
                      const cb = dailyState.currentBlock;
                      if (!cb) return;
                      addTask({ title: cb.title, clientId: '', clientName: '', dueDate: today, priority: 'medium', type: 'admin', createdAt: new Date().toISOString(), status: 'todo' });
                      try { toast({ title: 'Converted to task', description: cb.title }); } catch (e) {}
                    }}>To Task</Button>
                    <Button size="sm" onClick={() => setIsFocusModeOpen(true)}>Focus Mode</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Today's Schedule placed directly under Tasks Overview */}
          <Card className="mt-4 border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">🗓️ Today’s Schedule</CardTitle>
              <CardDescription className="text-xs">Generate a time-blocked plan for the rest of your day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs">Start</label>
                  <Input type="time" value={scheduleStart === 'now' ? format(new Date(), 'HH:mm') : scheduleStart} onChange={(e)=>setScheduleStart(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs">End</label>
                  <Input type="time" value={scheduleEnd} onChange={(e)=>setScheduleEnd(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs">Focus length</label>
                  <select value={String(focusLength)} onChange={(e)=>setFocusLength(Number(e.target.value))} className="px-2 rounded border">
                    <option value="25">25</option>
                    <option value="45">45</option>
                    <option value="60">60</option>
                    <option value="90">90</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs">Break (min)</label>
                  <select value={String(breakLength)} onChange={(e)=>setBreakLength(Number(e.target.value))} className="px-2 rounded border">
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="15">15</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs">Break pattern</label>
                  <select value={breakPattern} onChange={(e)=>setBreakPattern(e.target.value as any)} className="px-2 rounded border">
                    <option value="every">Regular short breaks</option>
                    <option value="single">One long break (lunch)</option>
                    <option value="none">No breaks</option>
                  </select>
                </div>
                {breakPattern === 'single' && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-xs">Break time</label>
                      <Input type="time" value={singleBreakAt} onChange={(e)=>setSingleBreakAt(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs">Break length</label>
                      <select value={String(singleBreakLength)} onChange={(e)=>setSingleBreakLength(Number(e.target.value))} className="px-2 rounded border">
                        <option value="20">20</option>
                        <option value="30">30</option>
                        <option value="45">45</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <label className="text-xs">Energy</label>
                  <select value={energyHigh ? 'high' : 'low'} onChange={(e)=>setEnergyHigh(e.target.value === 'high')} className="px-2 rounded border">
                    <option value="high">High energy</option>
                    <option value="low">Low energy</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs">Include due/overdue</label>
                  <input type="checkbox" checked={includeDueTasks} onChange={(e)=>setIncludeDueTasks(e.target.checked)} />
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Button onClick={generateSchedule} disabled={isGenerating || !isDayActivated}>{isGenerating ? 'Generating…' : 'Generate Day Schedule (AI)'}</Button>
                <Button variant="outline" onClick={() => applyDeterministicSchedule({ date: today, nowISO: new Date().toISOString(), top3: (dailyState?.lockedTopIds||[]).map((id:string)=>state.tasks.find((t:any)=>t.id===id)).filter(Boolean), dueToday: state.tasks.filter((t:any)=>t.dueDate===today && t.status !== 'completed'), includeDueTasks, workStart: settings?.workStart || '09:00', workEnd: scheduleEnd, focusLength, breakLength, breakPattern, singleBreakAt, singleBreakLength })}>Deterministic</Button>
                <Button variant="ghost" onClick={() => { setDailyState((s:any) => ({ ...(s||{}), daySchedule: [], scheduleRationale: '', pinned: false })); setPinnedSchedule(false); }}>Clear</Button>
              </div>

              {lastAIResponse && (
                <div className="mt-3 p-2 border rounded bg-muted/5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">AI response</div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => {
                        try { navigator.clipboard.writeText(lastAIResponse || ''); toast({ title: 'Copied', description: 'AI response copied to clipboard.' }); } catch (e) { }
                      }}>Copy</Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        const parsed = extractAndParseAIResponse(lastAIResponse);
                        if (parsed) {
                          setAiPreview(parsed);
                        } else {
                          // fallback deterministic
                          applyDeterministicSchedule({ date: today, nowISO: new Date().toISOString(), top3: (dailyState?.lockedTopIds||[]).map((id:string)=>state.tasks.find((t:any)=>t.id===id)).filter(Boolean), dueToday: state.tasks.filter((t:any)=>t.dueDate===today && t.status !== 'completed'), includeDueTasks, workStart: settings?.workStart || '09:00', workEnd: scheduleEnd, focusLength, breakLength, breakPattern, singleBreakAt, singleBreakLength });
                        }
                      }}>Retry Parse</Button>
                    </div>
                  </div>
                  <pre className="text-xs mt-2 max-h-40 overflow-auto whitespace-pre-wrap">{lastAIResponse}</pre>
                </div>
              )}

              <div className="mt-4">
                {dailyState?.daySchedule && dailyState.daySchedule.length > 0 ? (
                  <div className="space-y-2">
                    {dailyState.daySchedule.map((b:any, idx:number) => {
                      const isCurrent = dailyState?.currentBlock && dailyState.currentBlock.start === b.start && dailyState.currentBlock.title === b.title;
                      return (
                      <div key={idx} className={`flex items-start gap-3 p-2 border rounded ${isCurrent ? 'bg-primary/5 border-primary' : ''}`}>
                        <div className="w-16 text-xs text-right text-muted-foreground">{b.start}</div>
                        <div className="flex flex-col items-center">
                          <span className={`h-3 w-3 rounded-full mt-1 ${b.type === 'meeting' ? 'bg-accent' : b.type === 'break' ? 'bg-muted' : 'bg-primary'}`} />
                          {idx !== (dailyState.daySchedule.length - 1) && <div className="w-px flex-1 bg-muted mx-auto" />}
                        </div>
                        <div className="flex-1 pl-3">
                          <div className="font-medium">{b.title} <span className="text-xs text-muted-foreground">• {blockDuration(b)}m</span></div>
                          <div className="text-xs text-muted-foreground">{b.start} — {b.end} • {b.type}{b.linkedTaskId ? ` • task ${b.linkedTaskId}` : ''}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(b.type === 'focus' || b.type === 'admin') && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => {
                                setDailyState((s:any)=> ({ ...(s||{}), currentBlock: b, currentBlockStartedAt: new Date().toISOString() }));
                                try { toast({ title: 'Started block', description: `${b.title} — ${b.start}` }); } catch (e) {}
                              }}>Start</Button>
                              <Button size="sm" variant="outline" onClick={() => {
                                addTask({ title: b.title, clientId: '', clientName: '', dueDate: today, priority: 'medium', type: 'admin', createdAt: new Date().toISOString(), status: 'todo' });
                              }}>To Task</Button>
                            </>
                          )}

                          {b.type === 'meeting' && (
                            <Button size="sm" variant="outline" onClick={() => applyToCalendar(b)}>{b.pinnedToCalendar ? 'Added' : 'Add to Calendar'}</Button>
                          )}

                          <details className="relative">
                            <summary className="text-xs px-2 py-1 rounded hover:bg-muted cursor-pointer">More</summary>
                            <div className="absolute right-0 mt-1 w-44 bg-card border rounded shadow p-2 z-10">
                              <div className="flex flex-col">
                                <button className="text-left text-xs p-1 hover:bg-muted rounded" onClick={() => applyToCalendar(b)}>{b.pinnedToCalendar ? 'Added to Calendar' : 'Add to Calendar'}</button>
                                <button className="text-left text-xs p-1 hover:bg-muted rounded" onClick={() => exportICS(b)}>Export .ics</button>
                                <button className="text-left text-xs p-1 hover:bg-muted rounded" onClick={() => openGoogleCalendar(b)}>Add to Google Calendar</button>
                              </div>
                            </div>
                          </details>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No schedule generated yet</div>
                )}
              </div>

              {dailyState?.scheduleRationale && <div className="mt-3 text-xs text-muted-foreground">Rationale: {dailyState.scheduleRationale}</div>}
            </CardContent>
          </Card>
        </motion.div>

          <motion.div variants={staggerItem} className="lg:col-span-4 space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">⚡ Execution</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button className="justify-start gap-2 bg-primary text-primary-foreground" onClick={() => setIsAddTaskOpen(true)}><Plus className="h-4 w-4" /> Add Task</Button>
                <Button className="justify-start gap-2" onClick={() => setIsLogActivityOpen(true)}><CheckCircle2 className="h-4 w-4" /> Log Activity</Button>
                <Button className="justify-start gap-2" onClick={() => setIsScheduleShootOpen(true)}><CalendarIcon className="h-4 w-4" /> Schedule Shoot</Button>
                <Button className="justify-start gap-2" onClick={() => setIsCreateInvoiceOpen(true)}><FileText className="h-4 w-4" /> Create Invoice</Button>
                <Button className="justify-start gap-2" onClick={() => setIsActivityLogOpen(true)}><TrendingUp className="h-4 w-4" /> Activity Log</Button>
              </CardContent>
            </Card>

                <Card className="border-border/50 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">🚨 At Risk</CardTitle>
                    <CardDescription className="text-xs">Quick view of items requiring attention</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium">Overdue &gt; 2 days</div>
                        {atRiskOverdue.length === 0 ? <div className="text-xs text-muted-foreground">None</div> : (
                          <ul className="mt-2 space-y-2">
                            {atRiskOverdue.map((t:any) => (
                              <li key={t.id} className="p-2 border rounded">
                                <div className="flex items-start justify-between">
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">{t.title}</div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="ghost" className="p-2"><MoreVertical className="h-4 w-4" /></Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => openSetStatus({ taskId: t.id, clientId: t.clientId, clientName: t.clientName })} onClick={() => openSetStatus({ taskId: t.id, clientId: t.clientId, clientName: t.clientName })}>Set Status</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => navigate(`${ROUTE_PATHS.TASKS || '/tasks'}?focus=${t.id}`)} onClick={() => navigate(`${ROUTE_PATHS.TASKS || '/tasks'}?focus=${t.id}`)}>Open</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground"><ClientLabel clientId={t.clientId} clientName={t.clientName} /> <span className="ml-2">• due {t.dueDate}</span></div>
                                <div className="mt-2 flex items-center gap-2">
                                  <Button size="sm" variant="ghost" className="text-emerald-300" onClick={() => navigate(`${ROUTE_PATHS.TASKS || '/tasks'}?focus=${t.id}`)}>Open</Button>
                                  {t.status === 'waiting' ? (
                                    <Button size="sm" variant="ghost" className="text-sky-300" onClick={() => { try { clearTaskWaiting(t.id); addActivity({ clientId: t.clientId, clientName: t.clientName, type: 'status_change', notes: 'Cleared waiting on task', timestamp: new Date().toISOString() }); try { toast({ title: 'Task marked not waiting' }); } catch (e) {} } catch (e) {} }}>
                                      Mark Not Waiting
                                    </Button>
                                  ) : null}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-medium">Unpaid invoices</div>
                        {unpaidInvoices.length === 0 ? <div className="text-xs text-muted-foreground">None</div> : (
                          <ul className="mt-2 space-y-2">
                            {unpaidInvoices.map((inv:any) => (
                              <li key={inv.id} className="p-2 border rounded">
                                <div className="flex items-start justify-between">
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">{inv.invoiceNumber} — {new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(((inv.total||0)/100))}</div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="ghost" className="p-2"><MoreVertical className="h-4 w-4" /></Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => openSetStatus({ clientId: inv.clientId, clientName: inv.clientName })} onClick={() => openSetStatus({ clientId: inv.clientId, clientName: inv.clientName })}>Set Status</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => navigate(`${ROUTE_PATHS.CLIENTS || '/clients'}?focus=${inv.clientId}`)} onClick={() => navigate(`${ROUTE_PATHS.CLIENTS || '/clients'}?focus=${inv.clientId}`)}>Open Client</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground/90"><ClientLabel clientId={inv.clientId} clientName={inv.clientName} /> <span className="ml-2">• due {inv.dueDate}</span></div>
                                <div className="mt-2 flex items-center gap-2">
                                  {clients.find(c => c.id === inv.clientId)?.status === 'waiting' ? (
                                    <Button size="sm" variant="ghost" className="text-sky-300" onClick={() => { try { clearClientWaiting(inv.clientId, true); addActivity({ clientId: inv.clientId, clientName: inv.clientName, type: 'status_change', notes: 'Cleared waiting on client (invoices list)', timestamp: new Date().toISOString() }); try { toast({ title: 'Client marked active' }); } catch (e) {} } catch (e) {} }}>
                                      Mark Not Waiting
                                    </Button>
                                  ) : null}
                                  <Button size="sm" variant="ghost" className="text-emerald-300" onClick={() => navigate(`${ROUTE_PATHS.CLIENTS || '/clients'}?focus=${inv.clientId}`)}>Open</Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-medium">Silent clients (&gt; {silenceDays} days)</div>
                        {silentClients.length === 0 ? <div className="text-xs text-muted-foreground">None</div> : (
                          <ul className="mt-2 space-y-2">
                            {silentClients.map((c:any) => (
                              <li key={c.id} className="p-2 border rounded">
                                <div className="flex items-start justify-between">
                                  <div className="min-w-0">
                                    <div className="font-medium truncate"><ClientLabel clientId={c.id} clientName={c.name} /></div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="ghost" className="p-2"><MoreVertical className="h-4 w-4" /></Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => openSetStatus({ clientId: c.id, clientName: c.name })} onClick={() => openSetStatus({ clientId: c.id, clientName: c.name })}>Set Status</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => navigate(`${ROUTE_PATHS.CLIENTS || '/clients'}?focus=${c.id}`)} onClick={() => navigate(`${ROUTE_PATHS.CLIENTS || '/clients'}?focus=${c.id}`)}>Open Client</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">Last contact: {c.lastContact ? c.lastContact.slice(0,10) : 'never'}</div>
                                <div className="mt-2 flex items-center gap-2">
                                  {c.status === 'waiting' ? (
                                    <Button size="sm" variant="ghost" className="text-sky-300" onClick={() => { try { clearClientWaiting(c.id, true); addActivity({ clientId: c.id, clientName: c.name, type: 'status_change', notes: 'Cleared waiting on client (silent clients)', timestamp: new Date().toISOString() }); try { toast({ title: 'Client marked active' }); } catch (e) {} } catch (e) {} }}>
                                      Mark Not Waiting
                                    </Button>
                                  ) : null}
                                  <Button size="sm" variant="ghost" className="text-emerald-300" onClick={() => navigate(`${ROUTE_PATHS.CLIENTS || '/clients'}?focus=${c.id}`)}>Open</Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-medium">Shoots needing prep (48h)</div>
                        {shootsPrepWarnings.length === 0 ? <div className="text-xs text-muted-foreground">None</div> : (
                          <ul className="mt-2 space-y-2">
                            {shootsPrepWarnings.map((s:any) => (
                              <li key={s.id} className="p-2 border rounded">
                                <div className="flex items-start justify-between">
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">{s.title}</div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="ghost" className="p-2"><MoreVertical className="h-4 w-4" /></Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => openSetStatus({ taskId: s.id, clientId: s.clientId, clientName: s.clientName })} onClick={() => openSetStatus({ taskId: s.id, clientId: s.clientId, clientName: s.clientName })}>Set Status</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => navigate(`${ROUTE_PATHS.TASKS || '/tasks'}?focus=${s.id}`)} onClick={() => navigate(`${ROUTE_PATHS.TASKS || '/tasks'}?focus=${s.id}`)}>Open</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground"><ClientLabel clientId={s.clientId} clientName={s.clientName} /> <span className="ml-2">• {s.dueDate}</span></div>
                                <div className="mt-2 flex items-center gap-2">
                                  <Button size="sm" variant="ghost" className="text-emerald-300" onClick={() => navigate(`${ROUTE_PATHS.TASKS || '/tasks'}?focus=${s.id}`)}>Open</Button>
                                  {s.status === 'waiting' ? (
                                    <Button size="sm" variant="ghost" className="text-sky-300" onClick={() => { try { clearTaskWaiting(s.id); addActivity({ clientId: s.clientId, clientName: s.clientName, type: 'status_change', notes: 'Cleared waiting on task (shoot prep)', timestamp: new Date().toISOString() }); try { toast({ title: 'Task marked not waiting' }); } catch (e) {} } catch (e) {} }}>
                                      Mark Not Waiting
                                    </Button>
                                  ) : null}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-medium">Waiting On</div>
                        {waitingOnList.length === 0 ? <div className="text-xs text-muted-foreground">None</div> : (
                          <ul className="mt-2 space-y-2">
                            {waitingOnList.map((w:any) => (
                              <li key={w.id} className="p-2 border rounded">
                                <div className="flex items-start justify-between">
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">{w.title}</div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button size="sm" variant="ghost" className="p-2"><MoreVertical className="h-4 w-4" /></Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => openSetStatus({ taskId: w.id, clientId: w.clientId, clientName: w.clientName })} onClick={() => openSetStatus({ taskId: w.id, clientId: w.clientId, clientName: w.clientName })}>Set Status</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => navigate(`${ROUTE_PATHS.TASKS || '/tasks'}?focus=${w.id}`)} onClick={() => navigate(`${ROUTE_PATHS.TASKS || '/tasks'}?focus=${w.id}`)}>Open</DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground"><ClientLabel clientId={w.clientId} clientName={w.clientName} /> <span className="ml-2">• status {w.status}</span></div>
                                <div className="mt-2 flex items-center gap-2">
                                  <Button size="sm" variant="ghost" className="text-emerald-300" onClick={() => navigate(`${ROUTE_PATHS.TASKS || '/tasks'}?focus=${w.id}`)}>Open</Button>
                                  {w.status === 'waiting' ? (
                                    <Button size="sm" variant="ghost" className="text-sky-300" onClick={() => { try { clearTaskWaiting(w.id); addActivity({ clientId: w.clientId, clientName: w.clientName, type: 'status_change', notes: 'Cleared waiting on task (waiting list)', timestamp: new Date().toISOString() }); try { toast({ title: 'Task marked not waiting' }); } catch (e) {} } catch (e) {} }}>
                                      Mark Not Waiting
                                    </Button>
                                  ) : null}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

            

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3 flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-3"><Zap className="h-5 w-5 text-accent" />Top 3 Priorities (Today)</CardTitle>
              <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground mr-2">{top3CompletedCount} / {topPriorities.length} Complete • Today {totalCompletedToday} total</div>
                  <Button size="sm" variant="outline" onClick={() => {
                  // Auto-fill: pick the top 3 most urgent/high tasks and apply as today's Top 3
                  try { toast({ title: `Debug: tasks=${tasks.length} topPriorities=${topPriorities.length} suggestedTop=${suggestedTop.length} autoFillCandidates=${autoFillCandidates.length}` }); } catch(e){}
                  const ordered = (autoFillCandidates && autoFillCandidates.length > 0) ? autoFillCandidates : (suggestedTop || []).map((t:any) => t.id);
                  if (!ordered || ordered.length === 0) {
                    try { toast({ title: 'Auto-Fill: no candidates available' }); } catch(e){}
                    return;
                  }
                  try { toast({ title: `Debug: Auto-Fill candidates: ${ordered.join(', ')}` }); } catch(e){}
                  try {
                    // ensure tasks are explicitly updated for today's date (force rerender)
                    ordered.forEach((id, idx) => {
                      try { updateTask(id, { isTopPriority: true, topPriorityRank: (idx + 1) as 1|2|3, topPriorityDate: today }); } catch(e){}
                    });
                    // then enforce ordering in central store
                    ordered.forEach((id, idx) => setTopPriority(id, (idx + 1) as 1|2|3));
                    reorderTopPriorities(ordered);
                    try { toast({ title: `Auto-filled Top ${ordered.length} priorities` }); } catch(e){}
                  } catch (e) {
                    try { toast({ title: 'Auto-Fill failed' }); } catch(e){}
                  }
                  // mark that auto-fill just ran; an effect will inspect `tasks` after state updates
                  setAfJustRan(true);
                }} disabled={autoFillCandidates.length === 0}>Auto-Fill</Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {topPriorities.length === 0 ? (
                <div>
                  <p className="text-sm text-muted-foreground">No priorities set yet. Suggested:</p>
                  <ul className="space-y-2 mt-2">
                    {suggestedTop.map((t, idx) => (
                      <li key={t.id} className="p-2 border rounded flex justify-between items-center">
                        <div>
                          <div className="font-medium">{t.title}</div>
                          <div className="text-xs text-muted-foreground"><ClientLabel clientId={t.clientId} clientName={t.clientName} /></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-muted-foreground">Rank {idx + 1}</div>
                          <Button size="sm" variant="ghost" onClick={() => {
                            // Promote: pick lowest available rank (1..3) or replace existing
                            const used = topPriorities.map(tp => tp.topPriorityRank).filter(Boolean) as number[];
                            const available = [1,2,3].find(r => !used.includes(r)) || 1;
                            setTopPriority(t.id, available as 1|2|3);
                          }} disabled={isDayActivated}>Promote</Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <ul className="space-y-2">
                  {topPriorities.map(t => (
                        <li key={t.id} className="p-3 border rounded flex justify-between items-center bg-gradient-to-r from-white/0 to-primary/2">
                          <div>
                            <div className="font-semibold text-base">{t.title}</div>
                            <div className="text-xs text-muted-foreground"><ClientLabel clientId={t.clientId} clientName={t.clientName} /> <span className="ml-2">• {t.dueDate || 'No due date'}</span></div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm font-mono text-muted-foreground">{t.topPriorityRank}</div>
                            {dailyState?.lockedTopIds?.includes(t.id) ? <Badge className="flex items-center gap-1"><Lock className="h-3 w-3" />Locked</Badge> : <Button size="sm" variant="ghost" onClick={() => setTopPriority(t.id, (t.topPriorityRank && t.topPriorityRank < 3) ? (t.topPriorityRank + 1) as 1|2|3 : 1)}>Reorder</Button>}
                            <Button size="sm" variant="ghost" onClick={() => updateTask(t.id, { status: t.status === 'completed' ? 'todo' : 'completed' })}>{t.status === 'completed' ? 'Reopen' : 'Complete'}</Button>
                          </div>
                        </li>
                      ))}
                </ul>
              )}
              <div className="pt-2"><Button asChild variant="outline" className="w-full"><Link to={ROUTE_PATHS.TASKS || '/tasks'}>Go to Tasks → Manage</Link></Button></div>
              {isDayActivated && (
                <div className="mt-3 p-3 border rounded bg-muted/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">🎯 Today's Mission</div>
                      <div className="text-xs text-muted-foreground">Top priorities and brief</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{top3CompletedCount} / {topPriorities.length} Complete</div>
                  </div>
                  <div className="mt-2">
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div className="h-2 bg-primary" style={{ width: `${top3Progress}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{top3CompletedCount} / {topPriorities.length} • {top3Progress}%</div>
                  </div>
                  <div className="mt-2 text-sm whitespace-pre-wrap">{dailyState?.operatorBrief || 'Operator brief not available.'}</div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={startMyDay} disabled={!settings?.apiKey}>Regenerate</Button>
                    <Button size="sm" onClick={() => setPinnedSchedule((p)=>!p)} variant={pinnedSchedule ? 'secondary' : 'outline'}>{pinnedSchedule ? 'Pinned' : 'Pin Schedule'}</Button>
                  </div>

                  {/* Today's Schedule Card removed from Top-3 — moved to right column for breathing room */}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm p-4">
            <CardHeader>
              <CardTitle className="text-sm">📈 Weekly Momentum</CardTitle>
              <CardDescription className="text-xs">Activity and revenue this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Revenue collected</div>
                  <div className="text-xl font-bold">${(revenueThisWeek || 0).toFixed(0)}</div>
                </div>
                <div>
                  <div className="text-sm font-semibold">Activities</div>
                  <div className="text-xl font-bold">{weeklyActivityCount}</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xs text-muted-foreground">Top-3 completion rate</div>
                <div className="h-2 bg-muted rounded overflow-hidden mt-1">
                  <div className="h-2 bg-accent" style={{ width: `${top3Progress}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

  {/* Focus Mode Overlay */}
  {isFocusModeOpen && dailyState?.currentBlock ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-white dark:bg-black dark:text-white rounded-lg w-[90%] max-w-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xl font-bold">Focus: {dailyState.currentBlock.title}</div>
            <div className="text-xs text-muted-foreground">{dailyState.currentBlock.start} — {dailyState.currentBlock.end}</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg">{Math.floor(elapsedSeconds/3600).toString().padStart(2,'0')}:{Math.floor((elapsedSeconds%3600)/60).toString().padStart(2,'0')}:{(elapsedSeconds%60).toString().padStart(2,'0')}</div>
            <div className="text-xs text-muted-foreground">Elapsed</div>
          </div>
        </div>
        <div className="mt-4 flex gap-2 justify-end">
          {!dailyState?.currentBlockPaused ? (
            <Button onClick={() => {
              // pause: store accumulated seconds
              setDailyState((s:any) => ({ ...(s||{}), currentBlockPaused: true, currentBlockPausedAccum: elapsedSeconds }));
            }}>Pause</Button>
          ) : (
            <Button onClick={() => {
              // resume: compute new startedAt so elapsed continues
              const acc = dailyState?.currentBlockPausedAccum || elapsedSeconds;
              const startedISO = new Date(Date.now() - (acc * 1000)).toISOString();
              setDailyState((s:any) => ({ ...(s||{}), currentBlockStartedAt: startedISO, currentBlockPaused: false, currentBlockPausedAccum: 0 }));
            }}>Resume</Button>
          )}
          <Button variant="outline" onClick={() => {
            const cb = dailyState.currentBlock;
            if (!cb) return;
            setDailyState((s:any) => ({ ...(s||{}), currentBlock: undefined, currentBlockStartedAt: undefined, currentBlockPaused: false, currentBlockPausedAccum: 0 }));
            if (cb.linkedTaskId) {
              try { updateTask(cb.linkedTaskId, { status: 'completed' }); } catch (e) {}
            } else {
              addTask({ title: cb.title, clientId: '', clientName: '', dueDate: today, priority: 'medium', type: 'admin', createdAt: new Date().toISOString(), status: 'completed' });
            }
            setIsFocusModeOpen(false);
            try { toast({ title: 'Block completed', description: cb.title }); } catch (e) {}
          }}>Finish</Button>
          <Button variant="ghost" onClick={() => setIsFocusModeOpen(false)}>Close</Button>
        </div>
      </div>
    </div>
  ) : null}

  {/* AI Schedule Preview Modal */}
  {aiPreview ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-black dark:text-white rounded-lg w-[90%] max-w-3xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">AI Schedule Preview</div>
            <div className="text-xs text-muted-foreground">Review the AI-generated schedule before applying.</div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setAiPreview(null); }}>Close</Button>
          </div>
        </div>
        <div className="mt-4 max-h-[60vh] overflow-auto">
          <ol className="space-y-2">
            {aiPreview.daySchedule.map((b:any, i:number) => (
              <li key={i} className="p-2 border rounded flex items-center justify-between">
                <div>
                  <div className="font-medium">{b.start} — {b.end} • {b.title}</div>
                  <div className="text-xs text-muted-foreground">{b.type}{b.linkedTaskId ? ` • task ${b.linkedTaskId}` : ''}</div>
                </div>
                <div className="text-xs text-muted-foreground">{b.notes || ''}</div>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => { setAiPreview(null); applyDeterministicSchedule({ date: today, nowISO: new Date().toISOString(), top3: (dailyState?.lockedTopIds||[]).map((id:string)=>state.tasks.find((t:any)=>t.id===id)).filter(Boolean), dueToday: state.tasks.filter((t:any)=>t.dueDate===today && t.status !== 'completed'), includeDueTasks, workStart: settings?.workStart || '09:00', workEnd: scheduleEnd, focusLength, breakLength, breakPattern, singleBreakAt, singleBreakLength }); }}>Use Deterministic</Button>
          <Button onClick={() => {
            // apply AI preview to persisted daily state
            setDailyState((s:any) => ({ ...(s||{}), daySchedule: aiPreview.daySchedule || [], scheduleRationale: aiPreview.rationale || '', pinned: pinnedSchedule, pinnedDate: pinnedSchedule ? today : undefined }));
            setAiPreview(null); setLastAIResponse(null);
            try { toast({ title: 'AI schedule applied', description: 'Schedule saved to dashboard.' }); } catch (e) {}
          }}>Apply AI Schedule</Button>
        </div>
      </div>
    </div>
  ) : null}

  {/* Nudge Confirmation Modal */}
  {nudgeConfirm.open ? (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-black dark:text-white rounded-lg w-[90%] max-w-md p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-lg font-semibold">Record Nudge</div>
            <div className="text-xs text-muted-foreground">This will log an internal nudge for you to follow up later (no client notification).</div>
          </div>
        </div>
        <div className="mt-3 text-sm">
          {nudgeConfirm.payload?.clientName ? <div><strong>Client:</strong> <ClientLabel clientId={nudgeConfirm.payload.clientId} clientName={nudgeConfirm.payload.clientName} /></div> : null}
          {nudgeConfirm.payload?.notes ? <div className="mt-2 text-xs text-muted-foreground">{nudgeConfirm.payload?.notes}</div> : null}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setNudgeConfirm({ open: false })}>Cancel</Button>
          <Button onClick={() => confirmNudge()}>Record Nudge</Button>
        </div>
      </div>
    </div>
  ) : null}

  {/* Set Status Modal */}
  {statusModal.open ? (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-black dark:text-white rounded-lg w-[90%] max-w-md p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-lg font-semibold">Set Status</div>
            <div className="text-xs text-muted-foreground">Set an internal status and reason for tracking accountability.</div>
          </div>
        </div>
        <div className="mt-3 text-sm">
          <div className="text-xs font-medium">Reason</div>
          <select value={statusModal.reason} onChange={(e)=>setStatusModal((s)=>({ ...(s||{}), reason: e.target.value }))} className="w-full p-2 rounded border mt-2">
            <option value="waiting_on_client">Waiting on client</option>
            <option value="blocked">Blocked (third-party)</option>
            <option value="delayed_by_us">Delayed by us</option>
            <option value="long_task">Long task / requires time</option>
            <option value="other">Other</option>
          </select>

          <div className="text-xs font-medium mt-3">Notes (optional)</div>
          <textarea value={statusModal.note} onChange={(e)=>setStatusModal((s)=>({ ...(s||{}), note: e.target.value }))} className="w-full p-2 rounded border mt-2" rows={4} />

          <div className="flex items-center gap-2 mt-3">
            <input type="checkbox" id="markAllTasks" checked={!!statusModal.markAll} onChange={(e)=>setStatusModal((s)=>({ ...(s||{}), markAll: e.target.checked }))} />
            <label htmlFor="markAllTasks" className="text-sm">Also mark all this client's open tasks as <strong>Waiting</strong></label>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setStatusModal({ open: false, payload: undefined, reason: 'waiting_on_client', note: '', markAll: false })}>Cancel</Button>
          <Button onClick={() => confirmSetStatus()}>Apply Status</Button>
        </div>
      </div>
    </div>
  ) : null}

  {selectedDraft ? (
    <DraftEventDialog
      open={dialogOpen}
      mode={dialogMode}
      draft={selectedDraft}
      onOpenChange={(v) => setDialogOpen(v)}
      onSave={(upd) => handleSaveDraft(upd)}
      onConfirm={(upd) => handleConfirmDraft(upd)}
      onCancel={() => setDialogOpen(false)}
      onDismiss={() => { handleDismissDraft(selectedDraft.sourceMemoId, selectedDraft.id); setDialogOpen(false); }}
    />
  ) : null}

  <RetainerProposalModal open={isProposalOpen} onOpenChange={(v)=>{ setIsProposalOpen(v); if (!v) { setProposalTerms(null); setProposalMemoId(null); setProposalDraftId(null); } }} terms={proposalTerms} confidence={proposalTerms?.confidence}
    onApply={() => {
      if (!proposalMemoId || !proposalDraftId || !proposalTerms) return;
      const memo = state.voiceMemos.find((m:any)=>m.id === proposalMemoId);
      const ret = { ...(proposalTerms || {}), sourceMemoId: proposalMemoId, sourceMemoTitle: memo?.title || undefined, updatedAt: new Date().toISOString() };
      const clientId = memo?.clientId;
      if (clientId && setClientRetainer) {
        setClientRetainer(clientId, ret);
      }
      if (memo) { updateVoiceMemo && updateVoiceMemo(proposalMemoId, { extracted: { ...(memo.extracted||{}), paymentTerms: proposalTerms, appliedAt: new Date().toISOString() } }); }
      // confirm draft (use the data-layer helper to avoid re-opening proposal)
      if (confirmDraftEvent) confirmDraftEvent(proposalMemoId, proposalDraftId);
      setIsProposalOpen(false);
    }}
    onEdit={() => { setIsProposalOpen(false); }}
    onKeepNote={() => { if (proposalMemoId && proposalDraftId) { const memo = state.voiceMemos.find((m:any)=>m.id === proposalMemoId); if (memo) { updateVoiceMemo && updateVoiceMemo(proposalMemoId, { extracted: { ...(memo.extracted||{}), draftEvents: (memo.extracted?.draftEvents || []).map((d:any)=> d.id === proposalDraftId ? { ...d, status: 'confirmed', updatedAt: new Date().toISOString() } : d) } }); } } setIsProposalOpen(false); }}
  />

          

        </motion.div>

        {/* Revenue moved to Finances page */}
      </div>

      {/* Modals (kept here inside Dashboard) */}
      <AddTaskModal isOpen={isAddTaskOpen} onClose={() => { setIsAddTaskOpen(false); setEditingTaskId(null); setEditingInitial(null); }} onSubmit={(data: any) => {
        if (editingTaskId) {
          updateTask(editingTaskId, data as any);
          setEditingTaskId(null);
          setEditingInitial(null);
        } else {
          addTask(data as any);
        }
      }} initialValues={editingInitial || undefined} />
      <LogActivityModal isOpen={isLogActivityOpen} onClose={() => setIsLogActivityOpen(false)} onSubmit={(data: any) => addActivity(data)} />
      <ScheduleShootModal isOpen={isScheduleShootOpen} onClose={() => setIsScheduleShootOpen(false)} onSubmit={(data: any) => addTask(data)} />
      <CreateInvoiceModal isOpen={isCreateInvoiceOpen} onClose={() => setIsCreateInvoiceOpen(false)} onSubmit={(data: any) => addInvoice(data)} />
      {/* Activity Log Modal */}
      {isActivityLogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-black dark:text-white rounded-lg w-[90%] max-w-3xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Activity Log</div>
                <div className="text-xs text-muted-foreground">All operator actions: nudges, created tasks, activities, invoices, etc.</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setIsActivityLogOpen(false)}>Close</Button>
              </div>
            </div>
            <div className="mt-4 max-h-[60vh] overflow-auto">
              <ul className="space-y-2">
                {state.activities.map((a:any) => (
                  <li key={a.id} className="p-3 border rounded flex items-start justify-between">
                    <div>
                      <div className="font-medium">{a.type} {a.clientName ? <><span className="mx-2">•</span><ClientLabel clientId={a.clientId} clientName={a.clientName} /></> : ''}</div>
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">{a.notes}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">{a.timestamp ? format(new Date(a.timestamp), 'MMM d, h:mm a') : ''}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}

export function StatCard({ title, value, description, icon: Icon, trend, variant = 'default' }: { title: string; value: string; description: string; icon: React.ElementType; trend?: string; variant?: 'default' | 'accent' }) {
  return (
    <motion.div variants={staggerItem}>
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow group">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{title}</CardTitle>
          <div className={`p-2 rounded-lg transition-colors ${variant === 'accent' ? 'bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'}`}><Icon className="h-4 w-4" /></div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <div className="flex items-center justify-between mt-1"><p className="text-xs text-muted-foreground">{description}</p>{trend && <span className="text-[10px] font-mono font-medium text-primary bg-primary/5 px-1.5 py-0.5 rounded">{trend}</span>}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

