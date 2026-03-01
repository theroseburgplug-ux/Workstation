import { useMemo, useCallback, useState, useEffect } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { Client, Task, ActivityLog, Invoice, InvoiceLineItem } from "@/lib/index";
import { deleteAudioBlob as _deleteAudioBlob } from "@/lib/audioStorage";
import { mockClients, mockTasks } from "@/data/index";

export interface VoiceMemo {
  id: string;
  title: string;
  createdAt: string;
  durationSec: number;
  clientId?: string;
  clientName?: string;
  category: "client" | "prospect" | "internal" | "presentation" | "other";
  tags?: string[];

  audio: {
    storedIn: "indexeddb";
    mimeType: string;
    sizeBytes: number;
  };

  transcription: {
    status: "none" | "pending" | "done" | "error";
    text?: string;
    model?: string;
    error?: string;
    updatedAt?: string;
  };

  analysis: {
    status: "none" | "pending" | "done" | "error";
    data?: any;
    error?: string;
    updatedAt?: string;
  };

  extracted?: {
    createdTaskIds?: string[];
    createdActivityId?: string;
    draftEvents?: DraftEvent[];
    paymentTerms?: any;
    appliedAt?: string;
  };
}

export interface DraftEvent {
  id: string;
  clientId?: string;
  title: string;
  whenText?: string;
  date?: string | null;
  context: string;
  sourceMemoId: string;
  status: 'draft' | 'confirmed' | 'dismissed';
  createdAt: string;
}

export interface Event {
  id: string;
  clientId?: string;
  title: string;
  date?: string | null;
  whenText?: string;
  notes?: string;
  sourceMemoId?: string;
  createdAt: string;
  source?: 'voice_memo' | string;
  sourceMemoTitle?: string;
}

export interface TRPDataState {
  clients: Client[];
  tasks: Task[];
  activities: ActivityLog[];
  invoices: Invoice[];
  events: Event[];
  voiceMemos: VoiceMemo[];
  entities?: Entity[];
  invoiceTemplate?: string;
}

export interface EntityLink {
  targetId: string;
  relation: string;
  count?: number;
  exampleMemoIds?: string[];
}

export interface Entity {
  id: string;
  type: 'person'|'organization'|'event'|'topic';
  name: string;
  aliases?: string[];
  notes?: string;
  linkedClientId?: string;
  createdFromMemoIds?: string[];
  exampleMemoIds?: string[];
  insights?: any[];
  links?: EntityLink[];
  createdAt?: string;
}

const STORAGE_KEY = "trp-workstation-data-v1";

const todayKey = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

const pushNotificationToStore = (note: { id?: string; title: string; description?: string; createdAt?: string; read?: boolean }) => {
  try {
    if (typeof window === 'undefined') return;
    const key = 'trp-notifications';
    const raw = window.localStorage.getItem(key);
    const existing = raw ? JSON.parse(raw) : [];
    const entry = { id: note.id || makeId('note'), title: note.title, description: note.description, createdAt: note.createdAt || new Date().toISOString(), read: note.read || false };
    window.localStorage.setItem(key, JSON.stringify([entry, ...existing]));
    window.dispatchEvent(new Event('local-storage-update'));
  } catch (e) {
    console.warn('[trpData] failed to push notification', e);
  }
};

const initialState: TRPDataState = {
  clients: mockClients,
  tasks: mockTasks.map(t => ({ ...t, type: t.type ?? "admin" })),
  activities: [],
    events: [],
  invoices: [],
  voiceMemos: [],
  entities: [],
  invoiceTemplate: `
<div style="font-family: Inter, system-ui, Arial; padding:24px; max-width:800px; margin:auto;">
  <header style="display:flex; justify-content:space-between; align-items:center;">
    <div>
      <h1 style="margin:0;">Invoice</h1>
      <div>{{invoice.invoiceNumber}}</div>
    </div>
    <div style="text-align:right">
      <div>{{client.company}}</div>
      <div>{{client.email}}</div>
    </div>
  </header>
  <hr />
  <section>
    <h3>Line Items</h3>
    <table style="width:100%; border-collapse:collapse;">
      <thead><tr><th style="text-align:left">Description</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
      <tbody>{{lineItems}}</tbody>
    </table>
  </section>
  <footer style="margin-top:16px; text-align:right;"><strong>Total: \${{invoice.total}}</strong></footer>
</div>`
};

export function useTRPData() {
  const [state, setState] = useLocalStorage<TRPDataState>(STORAGE_KEY, initialState);

  // reactive current time (not persisted). Keeps the UI aware of the current time/day in real time.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // update every 30 seconds so UI stays reasonably in sync without excessive renders
    const id = window.setInterval(() => setNow(new Date()), 30 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const clientsById = useMemo(() => {
    const m = new Map<string, Client>();
    state.clients.forEach(c => m.set(c.id, c));
    return m;
  }, [state.clients]);

  const addClient = useCallback((partial: Partial<Client>) => {
    const client: Client = {
      id: makeId("client"),
      name: partial.name || "New Client",
      email: partial.email || "",
      company: partial.company || partial.name || "Client",
      phone: partial.phone || '',
      website: partial.website || '',
      socials: partial.socials || [],
      notes: partial.notes || '',
      attachments: partial.attachments || [],
      status: partial.status || "active",
      avatar: partial.avatar,
      lastContact: partial.lastContact || new Date().toISOString(),
      revenue: partial.revenue ?? 0,
      tags: partial.tags || [],
    };
    setState(s => ({ ...s, clients: [client, ...s.clients] }));
    return client;
  }, [setState]);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setState(s => ({
      ...s,
      clients: s.clients.map(c => (c.id === id ? { ...c, ...updates } : c)),
    }));
  }, [setState]);

  const setClientRetainer = useCallback((clientId: string, retainerPatch: Partial<any> | null) => {
    setState(s => {
      const clients = s.clients.map(c => {
        if (c.id !== clientId) return c;
        const next = { ...c } as any;
        if (!retainerPatch) {
          // clear: remove retainer and associated event if present
          const existing = next.billing?.retainer;
          if (existing && existing.eventId) {
            const evId = existing.eventId;
            // remove event from store
            s.events = (s.events || []).filter((e:any) => e.id !== evId);
          }
          if (next.billing) next.billing = { ...next.billing, retainer: undefined };
        } else {
          const merged = { ...(next.billing?.retainer || {}), ...(retainerPatch || {}) } as any;

          // compute a reasonable nextDueDate if not provided but dayOfMonth is set
          if (!merged.nextDueDate) {
            if (merged.startDate) {
              merged.nextDueDate = merged.startDate;
            } else if (merged.dayOfMonth && merged.dayOfMonth > 0 && (merged.cadence || 'monthly') === 'monthly') {
              try {
                const today = new Date();
                const desiredDay = Number(merged.dayOfMonth);
                let candidate = new Date(today.getFullYear(), today.getMonth(), desiredDay);
                let attempts = 0;
                while ((candidate.getTime() < today.getTime() || candidate.getDate() !== desiredDay) && attempts < 12) {
                  candidate = new Date(candidate.getFullYear(), candidate.getMonth() + 1, desiredDay);
                  attempts += 1;
                }
                merged.nextDueDate = candidate.toISOString().slice(0,10);
              } catch (e) {}
            }
          }

          // create or update a persistent calendar Event for this retainer
          try {
            const existingEventId = merged.eventId || (next.billing?.retainer && (next.billing.retainer as any).eventId);
            if (existingEventId) {
              // update event in place
              s.events = (s.events || []).map((ev:any) => ev.id === existingEventId ? { ...ev, date: merged.nextDueDate || ev.date, title: `Retainer — ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((merged.amountCents||0)/100)}`, notes: merged.sourceMemoTitle ? `Source: ${merged.sourceMemoTitle}` : merged.notes || ev.notes } : ev);
              merged.eventId = existingEventId;
            } else {
              // create a new event
              const evId = makeId('evt');
              const ev = {
                id: evId,
                clientId: clientId,
                title: `Retainer — ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((merged.amountCents||0)/100)}`,
                date: merged.nextDueDate || null,
                whenText: `${merged.cadence || 'monthly'} on day ${merged.dayOfMonth || '—'}`,
                notes: merged.sourceMemoTitle ? `Source: ${merged.sourceMemoTitle}` : merged.notes || '',
                source: 'retainer',
                sourceMemoId: merged.sourceMemoId || undefined,
                sourceMemoTitle: merged.sourceMemoTitle || undefined,
                createdAt: new Date().toISOString(),
              } as any;
              s.events = [ev, ...(s.events || [])];
              merged.eventId = evId;
            }
          } catch (e) {
            // non-fatal
          }

          next.billing = { ...(next.billing || {}), retainer: merged };
        }
        return next;
      });
      return { ...s, clients };
    });
  }, [setState]);

  const archiveClient = useCallback((id: string) => {
    updateClient(id, { status: "inactive" as any });
  }, [updateClient]);

  const deleteClient = useCallback((id: string) => {
    setState(s => ({
      ...s,
      clients: s.clients.filter(c => c.id !== id),
      tasks: s.tasks.map(t => (t.clientId === id ? { ...t, clientId: "", clientName: "" } : t)),
      activities: s.activities.filter(a => a.clientId !== id),
      invoices: s.invoices.filter(inv => inv.clientId !== id),
      events: s.events ? s.events.filter(e => e.clientId !== id) : [],
    }));
  }, [setState]);

  const addTask = useCallback((partial: Partial<Task>) => {
    const task: Task = {
      id: makeId("task"),
      title: partial.title || "New Task",
      description: partial.description || "",
      clientId: partial.clientId || "",
      clientName: partial.clientName || (partial.clientId ? (clientsById.get(partial.clientId)?.name || "") : ""),
      status: partial.status || "todo",
      priority: partial.priority || "medium",
      dueDate: partial.dueDate || "",
      assignedTo: partial.assignedTo || "Me",
      createdAt: partial.createdAt || new Date().toISOString(),
      type: partial.type || "admin",
      tags: partial.tags || [],
      checklist: partial.checklist || [],
      attachments: partial.attachments || [],
      isTopPriority: partial.isTopPriority || false,
      topPriorityRank: partial.topPriorityRank ?? null,
      topPriorityDate: partial.topPriorityDate,
      source: partial.source || undefined,
      sourceMemoId: (partial as any).sourceMemoId || undefined,
      sourceMemoTitle: (partial as any).sourceMemoTitle || undefined,
    };
    setState(s => ({ ...s, tasks: [task, ...s.tasks] }));
    try {
      pushNotificationToStore({ title: `New task: ${task.title}`, description: `${task.clientName || 'No client'}` });
    } catch (e) {
      // ignore
    }
    return task;
  }, [setState, clientsById]);

  // Entities (Strategy & Connections)
  const findEntityByName = useCallback((name: string, type?: string) => {
    if (!name) return null;
    const key = name.trim().toLowerCase();
    const ents = (state.entities || []);
    return ents.find((e:any) => e.name && e.name.trim().toLowerCase() === key && (!type || e.type === type)) || null;
  }, [state.entities]);

  const addEntity = useCallback((partial: Partial<Entity>) => {
    const ent: Entity = {
      id: makeId('ent'),
      type: (partial.type as any) || 'person',
      name: (partial.name || 'Unnamed') as string,
      aliases: partial.aliases || [],
      notes: partial.notes || undefined,
      linkedClientId: partial.linkedClientId || undefined,
      createdFromMemoIds: partial.createdFromMemoIds || [],
      links: partial.links || [],
      createdAt: new Date().toISOString(),
    };
    setState(s => ({ ...s, entities: [ent, ...(s.entities || [])] }));
    return ent;
  }, [setState]);

  const linkEntities = useCallback((sourceId: string, targetId: string, relation: string, exampleMemoId?: string) => {
    setState(s => {
      const ents = (s.entities || []).map((e:any) => ({ ...e }));
      const src = ents.find((x:any) => x.id === sourceId);
      if (src) {
        const existing = (src.links || []).find((l:any) => l.targetId === targetId && l.relation === relation);
        if (existing) {
          existing.count = (existing.count || 0) + 1;
          existing.exampleMemoIds = Array.from(new Set([...(existing.exampleMemoIds || []), ...(exampleMemoId ? [exampleMemoId] : [])]));
        } else {
          src.links = [...(src.links || []), { targetId, relation, count: 1, exampleMemoIds: exampleMemoId ? [exampleMemoId] : [] }];
        }
      }
      return { ...s, entities: ents };
    });
  }, [setState]);

  const updateEntity = useCallback((id: string, patch: Partial<Entity>) => {
    setState(s => ({
      ...s,
      entities: (s.entities || []).map((e:any) => e.id === id ? { ...e, ...patch } : e)
    }));
  }, [setState]);

  const createClientFromEntity = useCallback((entityId: string) => {
    const ent = (state.entities || []).find((e:any) => e.id === entityId);
    if (!ent) return null;
    const client = addClient({
      name: ent.name,
      company: ent.type === 'organization' ? ent.name : undefined,
      notes: ent.notes,
      status: 'prospect'
    });
    // link entity to created client
    updateEntity(ent.id, { linkedClientId: client.id });
    try { pushNotificationToStore({ title: `Created client from entity: ${ent.name}`, description: client.id }); } catch (e) {}
    return client;
  }, [addClient, updateEntity, state.entities]);

  const mergeEntities = useCallback((ids: string[], opts?: { name?: string; type?: Entity['type']; linkedClientId?: string }) => {
    if (!ids || ids.length === 0) return null;
    let merged: Entity | null = null;
    setState(s => {
      const ents = (s.entities || []).slice();
      const toMerge = ents.filter(e => ids.includes(e.id));
      if (toMerge.length === 0) return s;
      const name = opts?.name || toMerge.map(t => t.name).filter(Boolean)[0] || toMerge[0].name;
      const type = opts?.type || toMerge[0].type || 'person';
      const linkedClientId = opts?.linkedClientId || toMerge.map(t => t.linkedClientId).find(Boolean) || undefined;
      const aliases = Array.from(new Set(toMerge.flatMap(t => t.aliases || []).map((a:any)=> (a||'').trim()).filter(Boolean)));
      const notes = toMerge.map(t => t.notes || '').filter(Boolean).join('\n');
      const createdFromMemoIds = Array.from(new Set(toMerge.flatMap(t => t.createdFromMemoIds || [])));
      const links = Array.from(new Map(toMerge.flatMap(t => (t.links || []).map((l:any)=> [l.targetId+':'+l.relation, l]))).values());

      const newEnt: Entity = {
        id: makeId('ent'),
        type: type as any,
        name,
        aliases,
        notes,
        linkedClientId,
        createdFromMemoIds,
        links,
        createdAt: new Date().toISOString(),
      };

      // remove old entities
      const remaining = ents.filter(e => !ids.includes(e.id));
      // add merged entity at front
      // Update links in remaining entities to point to the new merged id
      const updatedRemaining = remaining.map((r:any) => {
        const newLinks: EntityLink[] = [];
        const seen = new Set<string>();
        (r.links || []).forEach((lk:any) => {
          const target = ids.includes(lk.targetId) ? newEnt.id : lk.targetId;
          const key = `${target}:${lk.relation}`;
          if (!seen.has(key)) {
            seen.add(key);
            newLinks.push({ ...lk, targetId: target });
          }
        });
        return { ...r, links: newLinks };
      });

      const next = [newEnt, ...updatedRemaining];
      merged = newEnt;
      return { ...s, entities: next };
    });
    return merged;
  }, [setState]);

  const createClientsFromEntities = useCallback((entityIds: string[]) => {
    const created: any[] = [];
    entityIds.forEach(id => {
      try {
        const c = createClientFromEntity(id as string);
        if (c) created.push(c);
      } catch (e) {}
    });
    return created;
  }, [createClientFromEntity]);

  const importEntitiesFromMemo = useCallback((memoId: string) => {
    setState(s => {
      const memo = (s.voiceMemos || []).find((m:any) => m.id === memoId);
      if (!memo) return s;
      const found = memo.extracted?.entities || [];
      if (!found || found.length === 0) return s;
      let ents = (s.entities || []).slice();
      const memoExcerpt = (memo.extracted?.strategy && String(memo.extracted.strategy).trim()) || (memo.transcription?.text && String(memo.transcription.text).slice(0,400)) || '';
      found.forEach((e:any) => {
        const rawName = (e.name || '').trim();
        if (!rawName) return;
        const nameKey = rawName.toLowerCase();
        const existing = ents.find((en:any) => (en.name||'').trim().toLowerCase() === nameKey && en.type === (e.type || 'person'));
        if (existing) {
          // merge createdFromMemoIds, aliases, notes and prefer linked client
          existing.createdFromMemoIds = Array.from(new Set([...(existing.createdFromMemoIds || []), memoId]));
          existing.exampleMemoIds = Array.from(new Set([...(existing.exampleMemoIds || []), memoId]));
          existing.aliases = Array.from(new Set([...(existing.aliases || []), ...(e.aliases || [])].map((a:any)=> (a||'').trim()).filter(Boolean)));
          // append memo excerpt and any entity-specific notes provided by analysis
          const parts = [] as string[];
          if (memoExcerpt) parts.push(`From memo "${memo.title}": ${memoExcerpt}`);
          if (e.notes) parts.push(String(e.notes));
          if (parts.length) existing.notes = ((existing.notes || '') + '\n' + parts.join('\n')).trim();
          if (!existing.linkedClientId && e.linkedClientId) existing.linkedClientId = e.linkedClientId;
        } else {
          const ne: Entity = {
            id: makeId('ent'),
            type: (e.type as any) || 'person',
            name: rawName,
            aliases: (e.aliases || []).map((a:any)=> (a||'').trim()).filter(Boolean),
            notes: ((memoExcerpt ? `From memo "${memo.title}": ${memoExcerpt}\n` : '') + (e.notes || '')).trim(),
            linkedClientId: e.linkedClientId || undefined,
            createdFromMemoIds: [memoId],
            exampleMemoIds: [memoId],
            links: [],
            createdAt: new Date().toISOString(),
          };
          ents = [ne, ...ents];
        }
      });
      return { ...s, entities: ents };
    });
  }, [setState]);

  const importAllMemoEntities = useCallback(() => {
    setState(s => {
      const memos = s.voiceMemos || [];
      let next = (s.entities || []).slice();
      memos.forEach((m:any) => {
        const found = m.extracted?.entities || [];
        const memoExcerpt = (m.extracted?.strategy && String(m.extracted.strategy).trim()) || (m.transcription?.text && String(m.transcription.text).slice(0,400)) || '';
        found.forEach((e:any) => {
          const rawName = (e.name || '').trim();
          if (!rawName) return;
          const nameKey = rawName.toLowerCase();
          const existing = next.find((en:any) => (en.name||'').trim().toLowerCase() === nameKey && en.type === ((e.type as any) || 'person'));
          if (existing) {
            existing.createdFromMemoIds = Array.from(new Set([...(existing.createdFromMemoIds || []), m.id]));
            existing.exampleMemoIds = Array.from(new Set([...(existing.exampleMemoIds || []), m.id]));
            existing.aliases = Array.from(new Set([...(existing.aliases || []), ...(e.aliases || [])].map((a:any)=> (a||'').trim()).filter(Boolean)));
            const parts = [] as string[];
            if (memoExcerpt) parts.push(`From memo "${m.title}": ${memoExcerpt}`);
            if (e.notes) parts.push(String(e.notes));
            if (parts.length) existing.notes = ((existing.notes || '') + '\n' + parts.join('\n')).trim();
            if (!existing.linkedClientId && e.linkedClientId) existing.linkedClientId = e.linkedClientId;
          } else {
            next = [{ id: makeId('ent'), type: (e.type as any) || 'person', name: rawName, aliases: (e.aliases || []).map((a:any)=> (a||'').trim()).filter(Boolean), notes: ((memoExcerpt ? `From memo "${m.title}": ${memoExcerpt}\n` : '') + (e.notes || '')).trim(), linkedClientId: e.linkedClientId || undefined, createdFromMemoIds: [m.id], exampleMemoIds: [m.id], links: [], createdAt: new Date().toISOString() }, ...next];
          }
        });
      });
      return { ...s, entities: next };
    });
  }, [setState]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setState(s => {
      const prev = s.tasks.find(t => t.id === id);
      const tasks = s.tasks.map(t => {
        if (t.id !== id) return t;
        const merged = { ...t, ...updates } as Task;
        // If clientId changed but clientName not provided, resolve it
        if (updates.clientId && (!updates.clientName || updates.clientName === '')) {
          const resolved = clientsById.get(updates.clientId);
          if (resolved) merged.clientName = resolved.name;
        }
        return merged;
      });

      // If task just transitioned to completed, stamp completedAt and compute duration
      const updated = tasks.find(t => t.id === id);
      if (prev && updated) {
        if (prev.status !== 'completed' && updated.status === 'completed') {
          const completedAt = new Date().toISOString();
          const createdAt = new Date(updated.createdAt || new Date().toISOString()).getTime();
          const durationMs = Math.max(0, new Date(completedAt).getTime() - createdAt);
          updated.completedAt = completedAt;
          updated.durationMs = durationMs;
        }
      }

      const next = { ...s, tasks };
      try {
        if (prev && updated && prev.status !== updated.status) {
          if (updated.status === 'completed') {
            pushNotificationToStore({ title: `Task completed: ${updated.title}`, description: `${updated.clientName || ''}` });
          } else {
            pushNotificationToStore({ title: `Task updated: ${updated.title}`, description: `${updated.clientName || ''}` });
          }
        }
      } catch (e) {}
      return next;
    });
  }, [setState]);


  const deleteTask = useCallback((id: string) => {
    setState(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) }));
  }, [setState]);

  const setTopPriority = useCallback((taskId: string, rank: 1|2|3|null) => {
    const day = todayKey();
    setState(s => {
      const todays = s.tasks.filter(t => t.isTopPriority && t.topPriorityDate === day);
      const maxed = todays.length >= 3 && (!todays.find(t => t.id === taskId));
      if (maxed) return s;

      return {
        ...s,
        tasks: s.tasks.map(t => {
          if (t.id !== taskId) {
            // If setting another to same rank, clear it
            if (rank && t.isTopPriority && t.topPriorityDate === day && t.topPriorityRank === rank) {
              return { ...t, topPriorityRank: null, isTopPriority: false, topPriorityDate: undefined };
            }
            return t;
          }
          if (rank === null) {
            return { ...t, isTopPriority: false, topPriorityRank: null, topPriorityDate: undefined };
          }
          return { ...t, isTopPriority: true, topPriorityRank: rank, topPriorityDate: day };
        }),
      };
    });
  }, [setState]);

  const reorderTopPriorities = useCallback((orderedTaskIds: string[]) => {
    const day = todayKey();
    setState(s => ({
      ...s,
      tasks: s.tasks.map(t => {
        const idx = orderedTaskIds.indexOf(t.id);
        if (idx === -1) return t;
        const rank = (idx + 1) as 1|2|3;
        return { ...t, isTopPriority: true, topPriorityRank: rank, topPriorityDate: day };
      }),
    }));
  }, [setState]);

  const addActivity = useCallback((partial: Partial<ActivityLog>) => {
    const entry: ActivityLog = {
      id: makeId("act"),
      clientId: partial.clientId,
      clientName: partial.clientName || (partial.clientId ? (clientsById.get(partial.clientId)?.name || "") : undefined),
      type: partial.type || "misc",
      platform: partial.platform,
      notes: partial.notes || "",
      link: partial.link,
      timestamp: partial.timestamp || new Date().toISOString(),
      source: partial.source || undefined,
      sourceMemoId: (partial as any).sourceMemoId || undefined,
      sourceMemoTitle: (partial as any).sourceMemoTitle || undefined,
    };
    setState(s => ({ ...s, activities: [entry, ...s.activities] }));
    try {
      pushNotificationToStore({ title: `${entry.type === 'nudge' ? 'Nudge' : 'Activity'}${entry.clientName ? `: ${entry.clientName}` : ''}`, description: entry.notes });
    } catch (e) {
      // ignore notification errors
    }
    return entry;
  }, [setState, clientsById]);

  const deleteActivity = useCallback((id: string) => {
    setState(s => ({ ...s, activities: s.activities.filter(a => a.id !== id) }));
  }, [setState]);

  const setClientTasksWaiting = useCallback((clientId: string, reason?: string, markAll: boolean = true) => {
    if (!markAll) return;
    setState(s => {
      const tasks = s.tasks.map(t => {
        if (t.clientId !== clientId) return t;
        if (t.status === 'completed') return t;
        const metadata = { ...(t.metadata || {}), waitingReason: reason || 'waiting_on_client', waitingAt: new Date().toISOString() };
        return { ...t, status: 'waiting', metadata };
      });
      try {
        pushNotificationToStore({ title: `Client tasks waiting`, description: `Marked tasks for client ${clientId} as waiting` });
      } catch (e) {}
      return { ...s, tasks };
    });
  }, [setState]);

  const clearTaskWaiting = useCallback((taskId: string) => {
    setState(s => {
      const tasks = s.tasks.map(t => {
        if (t.id !== taskId) return t;
        const next = { ...t } as any;
        if (next.status === 'waiting') next.status = 'todo';
        if (next.metadata) {
          const { waitingReason, waitingNote, waitingAt, ...rest } = next.metadata || {};
          next.metadata = Object.keys(rest).length ? rest : undefined;
        }
        return next;
      });
      try { pushNotificationToStore({ title: `Cleared waiting: ${taskId}`, description: 'Task marked not waiting' }); } catch (e) {}
      return { ...s, tasks };
    });
  }, [setState]);

  const clearClientWaiting = useCallback((clientId: string, markAllTasks: boolean = false) => {
    setState(s => {
      const clients = s.clients.map(c => (c.id === clientId ? { ...c, status: 'active' } : c));
      const tasks = markAllTasks ? s.tasks.map(t => {
        if (t.clientId !== clientId) return t;
        const next = { ...t } as any;
        if (next.status === 'waiting') next.status = 'todo';
        if (next.metadata) {
          const { waitingReason, waitingNote, waitingAt, ...rest } = next.metadata || {};
          next.metadata = Object.keys(rest).length ? rest : undefined;
        }
        return next;
      }) : s.tasks;
      try { pushNotificationToStore({ title: `Cleared waiting for client: ${clientId}`, description: 'Client set to active' }); } catch (e) {}
      return { ...s, clients, tasks };
    });
  }, [setState]);

  const addInvoice = useCallback((partial: Partial<Invoice> & { clientId: string; lineItems: InvoiceLineItem[]; dueDate: string }) => {
    const clientName = clientsById.get(partial.clientId)?.name || partial.clientName || "";
    const total = partial.total ?? partial.lineItems.reduce((sum, li) => sum + (li.qty * li.rate), 0);
    const invoice: Invoice = {
      id: makeId("inv"),
      clientId: partial.clientId,
      clientName,
      invoiceNumber: partial.invoiceNumber || `INV-${String(Date.now()).slice(-6)}`,
      status: partial.status || "draft",
      dueDate: partial.dueDate,
      createdAt: partial.createdAt || new Date().toISOString(),
      notes: partial.notes,
      lineItems: partial.lineItems,
      total,
      paidAt: partial.paidAt,
    };
    // persist invoice
    setState(s => {
      // update client's revenue when adding invoice
      const clients = s.clients.map(c => {
        if (c.id === invoice.clientId) {
          return { ...c, revenue: (c.revenue || 0) + (invoice.total || 0) };
        }
        return c;
      });
      const next = { ...s, invoices: [invoice, ...s.invoices], clients };
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          window.dispatchEvent(new Event('local-storage-update'));
        }
      } catch (e) {
        console.warn('[trpData] failed to write localStorage after addInvoice', e);
      }
      // also push a notification for the new invoice
      try {
        if (typeof window !== 'undefined') {
          const noteKey = 'trp-notifications';
          const raw = window.localStorage.getItem(noteKey);
          const existing = raw ? JSON.parse(raw) : [];
          const note = {
            id: makeId('note'),
            title: `New invoice ${invoice.invoiceNumber}`,
            description: `${clientName} — Total: ${invoice.total}`,
            createdAt: new Date().toISOString(),
            read: false,
          };
          window.localStorage.setItem(noteKey, JSON.stringify([note, ...existing]));
          window.dispatchEvent(new Event('local-storage-update'));
        }
      } catch (e) {
        console.warn('[trpData] failed to write notification', e);
      }
      return next;
    });
    return invoice;
  }, [setState, clientsById]);

  // Voice memo management
  const addVoiceMemo = useCallback((meta: any) => {
    const memo = { ...meta } as any;
    setState(s => ({ ...s, voiceMemos: [memo, ...(s.voiceMemos || [])] }));
    try { pushNotificationToStore({ title: `Saved voice memo: ${memo.title || memo.id}`, description: memo.clientId || '' }); } catch (e) {}
    return memo;
  }, [setState]);

  const updateVoiceMemo = useCallback((id: string, patch: Partial<any>) => {
    setState(s => ({ ...s, voiceMemos: (s.voiceMemos || []).map((v:any) => v.id === id ? { ...v, ...patch } : v) }));
  }, [setState]);

  const deleteVoiceMemo = useCallback(async (id: string) => {
    try {
      await _deleteAudioBlob(id).catch(()=>{});
    } catch (e) {}
    setState(s => ({ ...s, voiceMemos: (s.voiceMemos || []).filter((v:any) => v.id !== id) }));
    try { pushNotificationToStore({ title: `Deleted voice memo`, description: id }); } catch (e) {}
  }, [setState]);

  const addEvent = useCallback((partial: Partial<Event>) => {
    const ev: Event = {
      id: makeId('evt'),
      clientId: partial.clientId,
      title: partial.title || 'New Event',
      date: partial.date ?? null,
      whenText: partial.whenText || undefined,
      notes: partial.notes || '',
      sourceMemoId: partial.sourceMemoId,
      source: partial.source || undefined,
      sourceMemoTitle: (partial as any).sourceMemoTitle || undefined,
      createdAt: partial.createdAt || new Date().toISOString(),
    };
    setState(s => ({ ...s, events: [ev, ...(s.events || [])] }));
    try { pushNotificationToStore({ title: `Event added: ${ev.title}`, description: ev.clientId || '' }); } catch (e) {}
    return ev;
  }, [setState]);

  const updateEvent = useCallback((id: string, updates: Partial<Event>) => {
    setState(s => ({ ...s, events: (s.events || []).map(e => e.id === id ? { ...e, ...updates } : e) }));
  }, [setState]);

  const deleteEvent = useCallback((id: string) => {
    setState(s => ({ ...s, events: (s.events || []).filter(e => e.id !== id) }));
  }, [setState]);

  const saveDraftEvent = useCallback((memoId: string, draftId: string, patch: Partial<any>) => {
    setState(s => ({
      ...s,
      voiceMemos: (s.voiceMemos || []).map((m:any) => {
        if (m.id !== memoId) return m;
        const drafts = (m.extracted?.draftEvents || []).map((d:any) => d.id === draftId ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d);
        return { ...m, extracted: { ...(m.extracted || {}), draftEvents: drafts } };
      })
    }));
  }, [setState]);

  const confirmDraftEvent = useCallback((memoId: string, draftId: string) => {
    // find draft and create an Event, then mark draft confirmed and reference the event id
    setState(s => {
      const voiceMemos = s.voiceMemos || [];
      const m = voiceMemos.find((x:any) => x.id === memoId);
      if (!m) return s;
      const drafts = m.extracted?.draftEvents || [];
      const d = drafts.find((x:any) => x.id === draftId);
      if (!d) return s;

      const ev = {
        id: makeId('evt'),
        clientId: d.clientId || m.clientId,
        title: d.title || 'Event',
        date: d.date ?? null,
        whenText: d.whenText || undefined,
        notes: d.context || '',
        sourceMemoId: memoId,
        source: 'voice_memo',
        sourceMemoTitle: m.title || undefined,
        createdAt: new Date().toISOString(),
      };

      const nextEvents = [ev, ...(s.events || [])];

      const nextVoiceMemos = voiceMemos.map((vm:any) => {
        if (vm.id !== memoId) return vm;
        const updatedDrafts = (vm.extracted?.draftEvents || []).map((dd:any) => dd.id === draftId ? { ...dd, status: 'confirmed', createdEventId: ev.id, updatedAt: new Date().toISOString() } : dd);
        const createdEventIds = Array.from(new Set([...(vm.extracted?.createdEventIds || []), ev.id]));
        return { ...vm, extracted: { ...(vm.extracted || {}), draftEvents: updatedDrafts, createdEventIds } };
      });

      try { pushNotificationToStore({ title: `Event confirmed: ${ev.title}`, description: ev.clientId || '' }); } catch(e){}

      return { ...s, events: nextEvents, voiceMemos: nextVoiceMemos };
    });
  }, [setState]);

  const dismissDraftEvent = useCallback((memoId: string, draftId: string) => {
    setState(s => ({
      ...s,
      voiceMemos: (s.voiceMemos || []).map((m:any) => {
        if (m.id !== memoId) return m;
        const drafts = (m.extracted?.draftEvents || []).map((d:any) => d.id === draftId ? { ...d, status: 'dismissed', updatedAt: new Date().toISOString() } : d);
        return { ...m, extracted: { ...(m.extracted || {}), draftEvents: drafts } };
      })
    }));
  }, [setState]);

  const unconfirmDraftEvent = useCallback((memoId: string, draftId: string) => {
    setState(s => {
      const voiceMemos = s.voiceMemos || [];
      const m = voiceMemos.find((x:any) => x.id === memoId);
      if (!m) return s;
      const d = (m.extracted?.draftEvents || []).find((x:any) => x.id === draftId);
      if (!d) return s;
      const createdId = d.createdEventId || null;

      const next = { ...s } as any;
      if (createdId) {
        next.events = (next.events || []).filter((e:any) => e.id !== createdId);
      }

      next.voiceMemos = voiceMemos.map((vm:any) => {
        if (vm.id !== memoId) return vm;
        const updatedDrafts = (vm.extracted?.draftEvents || []).map((dd:any) => dd.id === draftId ? { ...dd, status: 'draft', createdEventId: undefined, updatedAt: new Date().toISOString() } : dd);
        const createdEventIds = (vm.extracted?.createdEventIds || []).filter((id:any) => id !== createdId);
        return { ...vm, extracted: { ...(vm.extracted || {}), draftEvents: updatedDrafts, createdEventIds } };
      });

      try { pushNotificationToStore({ title: `Event unconfirmed`, description: d.title || '' }); } catch(e){}

      return next;
    });
  }, [setState]);

  const unapplyVoiceMemo = useCallback((memoId: string) => {
    setState(s => {
      const memo = (s.voiceMemos || []).find((m:any)=>m.id === memoId);
      if (!memo) return s;
      const extracted = memo.extracted || {};
      const createdTaskIds: string[] = extracted.createdTaskIds || [];
      const createdActivityId: string | undefined = extracted.createdActivityId;
      const createdEventIds: string[] = extracted.createdEventIds || [];

      let next = { ...s } as any;

      // Delete tasks by explicit ids
      if (createdTaskIds.length) {
        next.tasks = next.tasks.filter((t:any) => !createdTaskIds.includes(t.id));
      } else {
        // fallback: remove tasks referencing this memo
        next.tasks = next.tasks.filter((t:any) => t.sourceMemoId !== memoId);
      }

      // Delete events by explicit ids
      if (createdEventIds.length) {
        next.events = next.events.filter((e:any) => !createdEventIds.includes(e.id));
      } else {
        next.events = next.events.filter((e:any) => e.sourceMemoId !== memoId);
      }

      // Delete activity
      if (createdActivityId) {
        next.activities = next.activities.filter((a:any) => a.id !== createdActivityId);
      } else {
        next.activities = next.activities.filter((a:any) => a.sourceMemoId !== memoId);
      }

      // Clear memo extracted
      next.voiceMemos = next.voiceMemos.map((m:any) => m.id === memoId ? { ...m, extracted: { ...(m.extracted || {}), createdTaskIds: [], createdActivityId: undefined, createdEventIds: [], appliedAt: null, appliedVersion: null, isOutOfDate: false } } : m);

      // Revert retainer only if it was authored by this memo
      next.clients = next.clients.map((c:any) => {
        if (!c.billing || !c.billing.retainer) return c;
        const r = c.billing.retainer as any;
        if (r && r.sourceMemoId && r.sourceMemoId === memoId) {
          const nc = { ...c } as any;
          nc.billing = { ...(nc.billing || {}), retainer: undefined };
          return nc;
        }
        return c;
      });

      return next;
    });
  }, [setState]);

    const updateInvoiceTemplate = useCallback((template: string) => {
      setState(s => ({ ...s, invoiceTemplate: template }));
    }, [setState]);

  const updateInvoice = useCallback((id: string, updates: Partial<Invoice>) => {
    setState(s => {
      const next = { ...s, invoices: s.invoices.map(inv => inv.id === id ? { ...inv, ...updates } : inv) };
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          window.dispatchEvent(new Event('local-storage-update'));
        }
      } catch (e) {
        console.warn('[trpData] failed to write localStorage after updateInvoice', e);
      }
      try {
        const prev = s.invoices.find(inv => inv.id === id);
        const updated = next.invoices.find(inv => inv.id === id);
        if (prev && updated) {
          if ((prev.status !== 'paid' && updated.status === 'paid') || (updates.paidAt && !prev.paidAt)) {
            pushNotificationToStore({ title: `Invoice paid: ${updated.invoiceNumber}`, description: `${updated.clientName} — ${updated.total}` });
          } else {
            pushNotificationToStore({ title: `Invoice updated: ${updated.invoiceNumber}`, description: `${updated.clientName}` });
          }
        }
      } catch (e) {}
      return next;
    });
  }, [setState]);

  const deleteInvoice = useCallback((id: string) => {
    setState(s => {
      const next = { ...s, invoices: s.invoices.filter(inv => inv.id !== id) };
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          window.dispatchEvent(new Event('local-storage-update'));
        }
      } catch (e) {
        console.warn('[trpData] failed to write localStorage after deleteInvoice', e);
      }
      return next;
    });
  }, [setState]);

  const clearAllData = useCallback(() => {
    setState({ clients: [], tasks: [], activities: [], invoices: [], events: [], voiceMemos: [] });
  }, [setState]);

  // compute retainer payment status for a client (uses invoices to infer payments)
  const computeRetainerStatus = (clientId: string) => {
    const client = state.clients.find(c => c.id === clientId);
    if (!client) return null;
    const r = client.billing?.retainer as any;
    if (!r) return null;
    const cadence = r.cadence || 'monthly';
    const day = r.dayOfMonth ? Number(r.dayOfMonth) : (r.startDate ? new Date(r.startDate).getDate() : (r.nextDueDate ? new Date(r.nextDueDate).getDate() : 1));

    const start = r.startDate ? new Date(r.startDate) : (r.nextDueDate ? new Date(r.nextDueDate) : new Date('1970-01-01'));
    const endExclusive = r.endDate ? new Date(r.endDate) : (r.termMonths ? new Date(start.getFullYear(), start.getMonth() + (r.termMonths || 0), start.getDate()) : null);

    const nowLocal = now || new Date();

    // determine most recent occurrence (by dayOfMonth) <= now
    const yNow = nowLocal.getFullYear();
    const mNow = nowLocal.getMonth();
    let occThisMonth = new Date(yNow, mNow, day);
    if (occThisMonth.getDate() !== day) occThisMonth = new Date(yNow, mNow, Math.min(day, 28));

    let lastOcc: Date | null = null;
    if (occThisMonth.getTime() <= nowLocal.getTime()) lastOcc = occThisMonth;
    else lastOcc = new Date(yNow, mNow - 1, day);
    if (lastOcc && lastOcc.getDate() !== day) lastOcc = new Date(lastOcc.getFullYear(), lastOcc.getMonth(), Math.min(day, 28));

    if (start.getTime() > nowLocal.getTime()) return { status: 'not_started', nextDueDate: start.toISOString().slice(0,10) } as any;
    if (lastOcc && lastOcc.getTime() < start.getTime()) return { status: 'not_started', nextDueDate: start.toISOString().slice(0,10) } as any;

    const dueIso = lastOcc ? lastOcc.toISOString().slice(0,10) : null;
    const invoices = state.invoices.filter(inv => String(inv.clientId) === String(clientId));
    const matched = dueIso ? invoices.find(inv => (inv.dueDate && inv.dueDate.slice(0,10) === dueIso) || (inv.createdAt && inv.createdAt.slice(0,10) === dueIso)) : undefined;
    if (matched && matched.status === 'paid') return { status: 'paid', paidInvoiceId: matched.id, dueDate: dueIso } as any;

    if (lastOcc) {
      const diffDays = Math.ceil((nowLocal.getTime() - lastOcc.getTime()) / (1000*60*60*24));
      const status = diffDays <= 0 ? 'unknown' : 'late';
      return { status, dueDate: dueIso, daysLate: diffDays } as any;
    }

    return { status: 'unknown' } as any;
  };

  // expose debug helper for quick console inspection in dev
  try {
    if (typeof window !== 'undefined') {
      (window as any).__TRP_DEBUG__ = { computeRetainerStatus: computeRetainerStatus, now };
    }
  } catch (e) {}

  // keep the debug helper's `now` updated so console checks reflect current time
  try {
    if (typeof window !== 'undefined') {
      // best-effort update whenever `now` or `state` changes
      const w = (window as any).__TRP_DEBUG__;
      if (w) w.now = now;
    }
  } catch (e) {}

  return {
    state,
    now,
    todayKey: now.toISOString().slice(0,10),
    addClient,
    updateClient,
    archiveClient,
    deleteClient,
    addTask,
    updateTask,
    deleteTask,
    setTopPriority,
    reorderTopPriorities,
    addActivity,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    updateInvoiceTemplate,
    clearAllData,
    setClientTasksWaiting,
    clearTaskWaiting,
    clearClientWaiting,
    addVoiceMemo,
    updateVoiceMemo,
    deleteVoiceMemo,
    // Entities
    findEntityByName,
    addEntity,
    updateEntity,
    createClientFromEntity,
    linkEntities,
    importEntitiesFromMemo,
    importAllMemoEntities,
    addEvent,
    updateEvent,
    deleteEvent,
    saveDraftEvent,
    confirmDraftEvent,
    dismissDraftEvent,
    unconfirmDraftEvent,
    setClientRetainer,
    deleteActivity,
    unapplyVoiceMemo,
    computeRetainerStatus,
  };
}

export const TRP_STORAGE_KEY = STORAGE_KEY;
