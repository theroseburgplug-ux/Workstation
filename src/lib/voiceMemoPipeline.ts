import type { VoiceMemo, DraftEvent } from './trpData';

const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

async function buildMemoVersionSimple(memo: any): Promise<string> {
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
  } catch (e) {}
  return `${payload.length}:${payload.slice(0,16)}:${payload.slice(-16)}`;
}

function computeNextDueDateForDay(dayOfMonth: number, startDate?: string | null) {
  try {
    const now = new Date();
    const year = now.getFullYear();
    let month = now.getMonth();
    const candidate = new Date(year, month, dayOfMonth, 0,0,0);
    if (candidate.getTime() >= now.getTime()) return candidate.toISOString().slice(0,10);
    // otherwise next month
    month = month + 1;
    const next = new Date(year + Math.floor(month/12), month%12, dayOfMonth, 0,0,0);
    return next.toISOString().slice(0,10);
  } catch (e) {
    return null;
  }
}

export async function applyAnalysis(memo: any, hooks: { addActivity?: any; addTask?: any; updateVoiceMemo?: any; setClientRetainer?: any }) {
  if (!memo || !memo.analysis?.data) throw new Error('No analysis available');
  const data = memo.analysis.data as any;
  const { addActivity, addTask, updateVoiceMemo } = hooks;
  const { setClientRetainer } = hooks;

  const createdTaskIds: string[] = [];
  let activityId: string | undefined = undefined;

  // create activity
  try {
    if (addActivity) {
      const act = addActivity({ clientId: memo.clientId, clientName: memo.clientName, type: 'meeting', notes: data.summary || '', timestamp: new Date().toISOString(), link: memo.id, source: 'voice_memo', sourceMemoId: memo.id, sourceMemoTitle: memo.title });
      activityId = act?.id;
    }
  } catch (e) {
    console.error('applyAnalysis: addActivity failed', e);
  }

  // create tasks
  if (Array.isArray(data.action_items) && addTask) {
    for (const item of data.action_items) {
      try {
        const t = addTask({ title: item.task || 'Action Item', description: item.task || '', clientId: memo.clientId || '', clientName: memo.clientName || '', status: 'todo', priority: item.priority || 'medium', dueDate: item.due_date || '', assignedTo: item.owner || 'Me', createdAt: new Date().toISOString(), tags: ['from-voice-memo'], sourceMemoId: memo.id, source: 'voice_memo', sourceMemoTitle: memo.title });
        if (t) createdTaskIds.push(t.id);
      } catch (e) {
        console.error('applyAnalysis: addTask failed', e);
      }
    }
  }

  // draft events
  const draftEvents: DraftEvent[] = [];
  if (Array.isArray(data.dates_and_deadlines)) {
    for (const d of data.dates_and_deadlines) {
      const title = (d.context && d.context.toLowerCase().includes('meet')) ? 'Meeting (Draft)' : 'Reminder (Draft)';
      const ev: DraftEvent = { id: makeId('de'), clientId: memo.clientId, title, whenText: d.context || '', date: d.date || null, context: d.context || '', sourceMemoId: memo.id, status: 'draft', createdAt: new Date().toISOString() };
      draftEvents.push(ev);
    }
  }

  // billing terms (retainer) -> return as proposal, do NOT auto-write retainer here
  let paymentTerms: any = null;
  try {
    if (data.billing_terms) {
      const bt = data.billing_terms;
      const amountDollars = bt.retainer_amount || null;
      const amountCents = amountDollars != null ? Math.round(Number(amountDollars) * 100) : null;
      const cadence = bt.cadence || null;
      const dayOfMonth = bt.day_of_month || null;
      const whenText = bt.due_rule_text || null;
      const nextDueDate = (dayOfMonth && Number.isInteger(dayOfMonth)) ? computeNextDueDateForDay(Number(dayOfMonth)) : null;
      paymentTerms = {
        amountCents,
        amountDollars: amountDollars != null ? Number(amountDollars) : null,
        cadence,
        dayOfMonth: dayOfMonth ?? null,
        nextDueDate,
        notes: whenText || null,
        confidence: bt.confidence || null,
      };
      // add activity note about suggested retainer
      try { if (addActivity) addActivity({ clientId: memo.clientId, clientName: memo.clientName, type: 'misc', notes: `Suggested retainer: ${amountDollars ? '$' + amountDollars : ''} ${whenText || ''}`, timestamp: new Date().toISOString(), link: memo.id }); } catch (e) {}
      // optionally create reminder task if confidence >= medium
      try {
        if (bt.confidence && (bt.confidence === 'medium' || bt.confidence === 'high') && addTask) {
          const title = `Send invoice / collect retainer (${amountDollars ? '$' + amountDollars : 'amount unknown'})`;
          const dueDate = nextDueDate || '';
          const t = addTask({ title, description: whenText || '', clientId: memo.clientId, clientName: memo.clientName, status: 'todo', priority: 'medium', dueDate, tags: ['billing','retainer','from-voice-memo'], createdAt: new Date().toISOString(), sourceMemoId: memo.id, source: 'voice_memo', sourceMemoTitle: memo.title });
          if (t) createdTaskIds.push(t.id);
        }
      } catch (e) {}
    }
  } catch (e) {}

  // fallback: if analysis didn't include structured billing_terms, attempt to parse from transcript or summary
  try {
    if (!paymentTerms) {
      const textSource = (memo.transcription?.text || '') + '\n' + (data.summary || '');
      const txt = (textSource || '').toLowerCase();

      // Regex patterns: $250 on the 14th of every month, $250 monthly on the 14th, $250/mo
      const amountMatch = txt.match(/\$\s*([0-9]{1,3}(?:[,0-9]*)(?:\.\d{1,2})?)/);
      const monthlyMatch = /\b(monthly|per month|each month|every month|\/mo|mo)\b/.test(txt);
      const dayMatch = txt.match(/on the (\d{1,2})(?:st|nd|rd|th)?|(?:of every month)|monthly on the (\d{1,2})/);

      if (amountMatch && monthlyMatch) {
        const raw = amountMatch[1].replace(/,/g,'');
        const amountDollars = Number(raw);
        const amountCents = Math.round((amountDollars || 0) * 100);
        let dayOfMonth: number | null = null;
        if (dayMatch) {
          const dm = dayMatch[1] || dayMatch[2] || null;
          if (dm) dayOfMonth = Number(dm);
        }
        const nextDueDate = dayOfMonth ? computeNextDueDateForDay(dayOfMonth) : null;
        // attempt to parse term/duration like "for 6 months" or "for 12 months"
        const termMatch = txt.match(/for\s+(\d{1,3})\s+(months|month|years|year)/);
        let termMonths: number | null = null;
        if (termMatch) {
          const n = Number(termMatch[1]);
          const unit = termMatch[2];
          if (unit && unit.startsWith('year')) termMonths = n * 12; else termMonths = n;
        }
        paymentTerms = {
          amountCents,
          amountDollars: amountDollars || null,
          cadence: 'monthly',
          dayOfMonth: dayOfMonth ?? null,
          nextDueDate,
          termMonths: termMonths || null,
          notes: 'Parsed from transcript',
          confidence: 'medium',
        };
        try { if (addActivity) addActivity({ clientId: memo.clientId, clientName: memo.clientName, type: 'note', notes: `Parsed retainer suggestion: $${amountDollars}${dayOfMonth?(' on day '+dayOfMonth):''}`, timestamp: new Date().toISOString(), link: memo.id }); } catch(e){}
      }
    }
  } catch (e) {}

  // compute version and update memo
  const version = await buildMemoVersionSimple(memo);
  if (updateVoiceMemo) {
    updateVoiceMemo(memo.id, { extracted: { createdTaskIds, createdActivityId: activityId, draftEvents, paymentTerms, appliedAt: new Date().toISOString(), appliedVersion: version, isOutOfDate: false } });
  }

  return { activityId, createdTaskIds, draftEvents, paymentTerms, appliedVersion: version };
}

export default { applyAnalysis };
