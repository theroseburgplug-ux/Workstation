import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Confirm from '@/components/Confirm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useTRPData } from '@/lib/trpData';
import { useOpenAI } from '@/hooks/useOpenAI';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { overallStrategyPrompt, entityAnalysisPrompt } from '@/lib/aiPrompts';
import ClientLabel from '@/components/ClientLabel';
import EntityMappingModal from '@/components/EntityMappingModal';
import ConnectionsGraph from '@/components/ConnectionsGraph';
import EntityMergeModal from '@/components/EntityMergeModal';
import ApplyAnalysis from '@/components/ApplyAnalysis';

export default function StrategyConnections() {
  const { state, importAllMemoEntities, importEntitiesFromMemo, findEntityByName, createClientFromEntity, createClientsFromEntities, addTask, addActivity, addEntity, updateEntity, linkEntities } = useTRPData();
  const { toast } = useToast();
  const { sendMessage, isLoading: aiLoading, isConnected: aiConnected, isToolRunning } = useOpenAI();
  const [overallAiSummary, setOverallAiSummary] = useState<string | null>(null);
  const [overallAiRunning, setOverallAiRunning] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiRunning, setAiRunning] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [editNotesOpen, setEditNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [repel, setRepel] = useState<number>(50000);
  const [spring, setSpring] = useState<number>(0.08);
  const [linkDist, setLinkDist] = useState<number>(140);
  const [dampingVal, setDampingVal] = useState<number>(0.88);
  const [stabilizeKey, setStabilizeKey] = useState<number>(0);

  const entities = useMemo(() => {
    const list = state.entities || [];
    if (!query) return list;
    const q = query.trim().toLowerCase();
    return list.filter((e:any) => (e.name || '').toLowerCase().includes(q) || (e.notes||'').toLowerCase().includes(q));
  }, [state.entities, query]);

  const insights = useMemo(() => {
    const list = state.entities || [];
    const deg: Record<string, number> = {};
    (list || []).forEach((e:any) => {
      (e.links || []).forEach((l:any) => {
        deg[e.id] = (deg[e.id] || 0) + 1;
        deg[l.targetId] = (deg[l.targetId] || 0) + 1;
      });
    });

    const topConnected = [...list].sort((a:any,b:any) => (deg[b.id]||0) - (deg[a.id]||0)).slice(0,5);

    const mentions: Record<string, number> = {};
    (state.voiceMemos || []).forEach((m:any) => {
      (m.extracted?.entities || []).forEach((en:any) => {
        if (!en) return;
        if (en.id) { mentions[en.id] = (mentions[en.id]||0) + 1; }
        else {
          const found = list.find((x:any) => (x.name||'').toLowerCase() === (en.name||'').toLowerCase());
          if (found) mentions[found.id] = (mentions[found.id]||0) + 1;
        }
      });
    });

    const topMentioned = [...list].sort((a:any,b:any) => (mentions[b.id]||0) - (mentions[a.id]||0)).slice(0,5);
    return { topConnected, topMentioned, deg, mentions };
  }, [state.entities, state.voiceMemos]);

  // Helper to build a safe memo prompt: sample recent memos and cap total characters
  const buildMemosForAI = (memosList: any[], opts?: { maxMemos?: number; maxChars?: number }) => {
    const maxMemos = opts?.maxMemos ?? 8;
    const maxChars = opts?.maxChars ?? 20000; // conservative default
    const recent = (memosList || []).slice(0, maxMemos);
    if (recent.length === 0) return '';
    const perMemo = Math.max(256, Math.floor(maxChars / recent.length));
    const parts = recent.map((m:any) => {
      const text = String(m.extracted?.strategy || m.transcription?.text || '');
      if (text.length > perMemo) return `Title: ${m.title}\nDate: ${m.createdAt}\nText: ${text.slice(0, perMemo)}...`;
      return `Title: ${m.title}\nDate: ${m.createdAt}\nText: ${text}`;
    });
    let joined = parts.join('\n\n---\n\n');
    if (joined.length > maxChars) joined = joined.slice(0, maxChars) + '\n...';
    return joined;
  };

  const relatedEvents = useMemo(() => {
    const evs = state.events || [];
    if (!selected) return [];
    const nameKey = (selected.name || '').toLowerCase();
    return evs.filter((ev:any) => (selected.exampleMemoIds || []).includes(ev.sourceMemoId) || ((ev.notes || '').toLowerCase().includes(nameKey)));
  }, [state.events, selected]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Strategy & Connections</h1>
          <p className="text-muted-foreground mt-1">Centralized view of people, organizations, events and strategic notes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => importAllMemoEntities()}>Import Entities from Memos</Button>
          <Button onClick={() => {
            const payload = { entities: state.entities || [], voiceMemos: state.voiceMemos || [] };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `trp-entities-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}>Export Graph</Button>
          <label className="btn btn-ghost">
            <input type="file" accept="application/json" style={{ display: 'none' }} onChange={async (e:any) => {
              const f = e.target.files && e.target.files[0];
              if (!f) return;
              try {
                const text = await f.text();
                const parsed = JSON.parse(text);
                const imported = parsed.entities || [];
                const idMap: Record<string,string> = {};
                let added = 0, merged = 0;

                // First pass: add/merge entities and build idMap
                imported.forEach((ie:any) => {
                  const existing = findEntityByName(ie.name, ie.type);
                  if (existing) {
                    const aliases = Array.from(new Set([...(existing.aliases||[]), ...(ie.aliases||[])]));
                    const notes = ((existing.notes||'') + '\n' + (ie.notes||'')).trim();
                    const createdFrom = Array.from(new Set([...(existing.createdFromMemoIds||[]), ...(ie.createdFromMemoIds||[])]));
                    updateEntity(existing.id, { aliases, notes, createdFromMemoIds: createdFrom });
                    idMap[ie.id] = existing.id;
                    merged++;
                  } else {
                    const ne = addEntity({ type: ie.type, name: ie.name, aliases: ie.aliases || [], notes: ie.notes || '', createdFromMemoIds: ie.createdFromMemoIds || [], links: [] });
                    idMap[ie.id] = ne.id;
                    added++;
                  }
                });

                // Second pass: recreate links using mapped ids
                try {
                  for (const ie of imported) {
                    const srcLocal = idMap[ie.id];
                    if (!srcLocal) continue;
                    const linksArr = ie.links || [];
                    for (const lk of linksArr) {
                      const targetImportedId = lk.targetId;
                      const rel = lk.relation || (lk.relation === undefined ? 'related' : lk.relation);
                      const exampleIds = lk.exampleMemoIds || [];
                      const tgtLocal = idMap[targetImportedId] || (findEntityByName(lk.targetName || lk.targetId || '', undefined)?.id);
                      if (!tgtLocal) continue;
                      if (exampleIds.length > 0) {
                        for (const ex of exampleIds) {
                          try { linkEntities(srcLocal, tgtLocal, rel, ex); } catch(e) {}
                        }
                      } else {
                        try { linkEntities(srcLocal, tgtLocal, rel); } catch(e) {}
                      }
                    }
                  }
                } catch (e) {
                  // non-fatal
                }

                try { toast({ title: 'Import complete', description: `${added} added, ${merged} merged` }); } catch(e){}
              } catch (err) {
                try { toast({ title: 'Import failed', description: String(err) }); } catch(e){}
              }
            }} />
            <Button variant="outline">Import Graph</Button>
          </label>
          <Button variant="ghost" onClick={async () => {
            setOverallAiRunning(true); setOverallAiSummary(null);
            try {
              const memos = buildMemosForAI((state.voiceMemos || []).slice().reverse(), { maxMemos: 8, maxChars: 20000 });
              const prompt = overallStrategyPrompt(memos);
              const res = await sendMessage(prompt);
              const content = res?.choices?.[0]?.message?.content ?? res?.choices?.[0]?.text ?? JSON.stringify(res);
              setOverallAiSummary(String(content));
            } catch (e:any) {
              try { toast({ title: 'AI overview failed', description: String(e) }); } catch(_){ }
            } finally { setOverallAiRunning(false); }
          }} disabled={overallAiRunning}>{overallAiRunning ? 'Analyzing…' : 'AI Overview'}</Button>
          {isToolRunning ? <Badge variant="secondary" className="ml-2">Searching…</Badge> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Insights</CardTitle>
              <CardDescription className="text-xs">Quick summaries from entities and memos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Top Connected</div>
                  <div className="mt-1">
                    {insights.topConnected.map((e:any) => (
                      <div key={e.id} className="text-sm">{e.name} <span className="text-xs text-muted-foreground">({insights.deg[e.id]||0})</span></div>
                    ))}
                    {insights.topConnected.length === 0 ? <div className="text-xs text-muted-foreground">No data</div> : null}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Top Mentioned</div>
                  <div className="mt-1">
                    {insights.topMentioned.map((e:any) => (
                      <div key={e.id} className="text-sm">{e.name} <span className="text-xs text-muted-foreground">({insights.mentions[e.id]||0})</span></div>
                    ))}
                    {insights.topMentioned.length === 0 ? <div className="text-xs text-muted-foreground">No mentions</div> : null}
                  </div>
                </div>
                {overallAiSummary ? (
                  <div className="col-span-1">
                    <div className="text-xs text-muted-foreground">AI Overview</div>
                    <div className="mt-2 p-2 bg-card rounded border text-sm whitespace-pre-wrap">{overallAiSummary}</div>
                    <div className="mt-2"><Button variant="ghost" onClick={() => setOverallAiSummary(null)}>Clear</Button></div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Entities</CardTitle>
              <CardDescription className="text-xs">People, organizations, events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <Input placeholder="Search entities..." value={query} onChange={(e:any)=>setQuery(e.target.value)} />
              </div>
              <div className="space-y-2 max-h-[600px] overflow-auto">
                {entities.map((ent:any) => (
                  <div key={ent.id} className={`p-2 rounded border cursor-pointer ${selected && selected.id === ent.id ? 'bg-accent/5' : 'bg-card'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3" onClick={()=>setSelected(ent)}>
                        <input type="checkbox" checked={selectedIds.includes(ent.id)} onChange={(e:any)=>{
                          const v = e.target.checked;
                          setSelectedIds(s => v ? Array.from(new Set([...s, ent.id])) : s.filter(id=>id !== ent.id));
                        }} />
                        <div>
                          <div className="font-medium">{ent.name}</div>
                          <div className="text-xs text-muted-foreground">{ent.type}{ent.linkedClientId ? ' • linked' : ''}</div>
                        </div>
                      </div>
                      <div className="text-sm">
                        {ent.linkedClientId ? (<ClientLabel clientId={ent.linkedClientId} clientName={undefined} />) : null}
                      </div>
                    </div>
                  </div>
                ))}
                {entities.length === 0 ? <div className="text-xs text-muted-foreground">No entities found</div> : null}
              </div>
            </CardContent>
          </Card>
          <EntityMergeModal open={mergeOpen} onOpenChange={setMergeOpen} selectedIds={selectedIds} />
        </div>

        <div className="lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>Entity Details</CardTitle>
              <CardDescription className="text-xs">Select an entity to view related memos and notes</CardDescription>
            </CardHeader>
            <CardContent>
              {!selected ? (
                <div className="text-sm text-muted-foreground">Select an entity to view details.</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{selected.name}</h3>
                      <div className="text-xs text-muted-foreground">{selected.type}{selected.linkedClientId ? (<span> • linked to <ClientLabel clientId={selected.linkedClientId} clientName={undefined} /></span>) : null}</div>
                    </div>
                      <div className="flex items-center gap-2">
                      <EntityMappingModal entity={selected} />
                      <Confirm title="Create client" description={`Create client from entity "${selected?.name}"?`} onConfirm={()=>{ if(selected && selected.id) createClientFromEntity(selected.id); }}>
                        <Button variant="outline">Create Client</Button>
                      </Confirm>
                      <Button variant="outline" onClick={() => { setNotesDraft(selected?.notes || ''); setEditNotesOpen(true); }}>Edit Notes</Button>
                      <Button variant="secondary" onClick={()=> setMergeOpen(true)} disabled={selectedIds.length < 2}>Merge Selected</Button>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={async () => {
                          if (!selected) return;
                          setAiRunning(true); setAiSummary(null);
                          const memos = (state.voiceMemos||[]).filter((m:any)=> (m.extracted?.entities||[]).some((en:any)=> (en.name||'').toLowerCase() === (selected.name||'').toLowerCase()));
                          const texts = buildMemosForAI(memos.slice().reverse(), { maxMemos: 6, maxChars: 12000 });
                          const prompt = entityAnalysisPrompt(selected.name, texts);
                          try {
                            const res = await sendMessage(prompt);
                            const content = res?.choices?.[0]?.message?.content ?? res?.output ?? JSON.stringify(res);
                            setAiSummary(String(content));
                          } catch (err:any) {
                            try { toast({ title: 'AI analysis failed', description: String(err) }); } catch(e){}
                          } finally { setAiRunning(false); }
                        }} disabled={aiRunning}>{aiRunning ? 'Analyzing…' : 'AI Analyze'}</Button>
                        {isToolRunning ? <Badge variant="secondary">Searching…</Badge> : null}
                      </div>
                      <Button onClick={()=>{
                        const toCreate = selectedIds.filter(id => {
                          const ent = (state.entities||[]).find((e:any)=>e.id===id);
                          return ent && !ent.linkedClientId;
                        });
                        if (toCreate.length === 0) { try { toast({ title: 'No clients to create', description: 'All selected entities already linked' }); } catch(e){}; return; }
                        const list = createClientsFromEntities(toCreate);
                        try { toast({ title: 'Clients created', description: `${list.length} clients created` }); } catch(e){}
                      }} disabled={selectedIds.length === 0}>Create Clients</Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium">Notes</h4>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.notes || 'No notes'}</div>
                    {aiSummary ? (
                      <div className="mt-3 p-3 border rounded bg-surface">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">AI Summary</div>
                          <div className="text-xs text-muted-foreground">generated</div>
                        </div>
                        <div className="text-sm mt-2 whitespace-pre-wrap">{aiSummary}</div>
                        <div className="mt-2">
                          <Button variant="ghost" onClick={() => setAiSummary(null)}>Clear</Button>
                        </div>
                      </div>
                    ) : null}
                  
                    {/* Render structured insights attached to the entity */}
                    {selected.insights && selected.insights.length > 0 ? (
                      <div>
                        <h4 className="font-medium mt-4">AI Insights</h4>
                        <div className="space-y-3 mt-2">
                          {selected.insights.map((ins:any, idx:number) => (
                            <div key={idx} className="p-2 rounded border bg-card">
                              {ins.title ? <div className="font-medium">{ins.title}</div> : null}
                              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{ins.text || (typeof ins === 'string' ? ins : JSON.stringify(ins))}</div>
                              {ins.sourceMemoId ? <div className="text-xs mt-1"><Button size="sm" variant="ghost" onClick={() => { try { window.location.href = `/voice/${ins.sourceMemoId}` } catch(e){} }}>Open source memo</Button></div> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Show example/source memos that mentioned this entity */}
                    {selected.exampleMemoIds && selected.exampleMemoIds.length > 0 ? (
                      <div>
                        <h4 className="font-medium mt-4">Source Memos</h4>
                        <div className="space-y-2 mt-2">
                          {selected.exampleMemoIds.map((mid:string) => {
                            const memo = (state.voiceMemos||[]).find((m:any)=>m.id===mid);
                            return (
                              <div key={mid} className="p-2 rounded border bg-card flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{memo?.title || mid}</div>
                                  <div className="text-xs text-muted-foreground">{memo ? new Date(memo.createdAt).toLocaleString() : ''}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button size="sm" variant="outline" onClick={() => { try { window.location.href = `/voice/${mid}` } catch(e){} }}>Open</Button>
                                  <Button size="sm" onClick={() => importEntitiesFromMemo && importEntitiesFromMemo(mid)}>Import</Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}
                  
                  <div className="mt-4">
                    <ApplyAnalysis
                      texts={(state.voiceMemos||[]).filter((m:any)=> (m.extracted?.entities||[]).some((en:any)=> (en.name||'').toLowerCase() === (selected.name||'').toLowerCase())).map((m:any)=> m.extracted?.strategy || m.transcription?.text || '')}
                      analyze={async (input:string) => {
                        if (!aiConnected) throw new Error('AI not connected');
                        const prompt = entityAnalysisPrompt(selected.name, input);
                        const res = await sendMessage(prompt);
                        const content = res?.choices?.[0]?.message?.content ?? res?.choices?.[0]?.text ?? JSON.stringify(res);
                        return String(content);
                      }}
                      onSave={async (summary:string) => {
                        try {
                          updateEntity(selected.id, { notes: ((selected.notes||'') + '\n\n' + summary).trim() });
                          addActivity({ clientId: selected.linkedClientId, clientName: selected.linkedClientId ? undefined : '', type: 'note', notes: `AI Summary for ${selected.name}:\n\n${summary}`, timestamp: new Date().toISOString(), source: 'ai' });
                          try { toast({ title: 'Summary saved', description: `Saved AI summary to ${selected.name}` }); } catch(e){}
                        } catch (e) {
                          try { toast({ title: 'Save failed', description: String(e) }); } catch(_){}
                        }
                      }}
                      label="Analyze mentioned memos"
                    />
                  
                  <Dialog open={editNotesOpen} onOpenChange={setEditNotesOpen}>
                    <DialogContent className="max-w-2xl bg-card border-border">
                      <DialogHeader>
                        <DialogTitle>Edit Entity Notes</DialogTitle>
                        <DialogDescription>Edit the notes for this entity. Use this to remove duplicated imports or tidy AI summaries.</DialogDescription>
                      </DialogHeader>
                      <div className="p-4">
                        <textarea className="w-full h-48 p-2 bg-transparent border rounded" value={notesDraft} onChange={(e)=>setNotesDraft(e.target.value)} />
                        <div className="mt-3 flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={()=>{ setEditNotesOpen(false); setNotesDraft(''); }}>Cancel</Button>
                          <Button size="sm" onClick={() => {
                            if (!selected) return;
                            try {
                              updateEntity && updateEntity(selected.id, { notes: notesDraft });
                              // update local selected state immediately so UI reflects change
                              const updatedLocal = { ...(selected || {}), notes: notesDraft };
                              setSelected(updatedLocal);
                              setEditNotesOpen(false);
                              setNotesDraft('');
                              try { toast({ title: 'Notes updated' }); } catch(e){}
                            } catch (e) {
                              try { toast({ title: 'Update failed', description: String(e) }); } catch(e){}
                            }
                          }}>Save</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  </div>
                  </div>

                  <div>
                    <h4 className="font-medium">Mentioned in memos</h4>
                        <div className="space-y-2">
                          {(state.voiceMemos||[]).filter((m:any)=> (m.extracted?.entities||[]).some((en:any)=> (en.name||'').toLowerCase() === (selected.name||'').toLowerCase())).map((m:any)=> (
                            <div key={m.id} className="p-2 rounded border bg-card">
                              <div className="font-medium">{m.title}</div>
                                <div className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString()} {m.analysis?.data?.confidence ? (<span className="ml-2 px-1 rounded bg-muted/20 text-[11px]">Confidence: {m.analysis.data.confidence}</span>) : null}</div>
                                <div className="text-sm mt-2 text-foreground whitespace-pre-wrap">{m.extracted?.strategy || m.analysis?.data?.summary || m.transcription?.text?.slice(0,200) || ''}</div>
                                <div className="mt-2 flex items-center gap-2">
                                  <Button size="sm" variant="outline" onClick={() => importEntitiesFromMemo && importEntitiesFromMemo(m.id)}>Import entities from this memo</Button>
                                  <Button size="sm" variant="ghost" onClick={() => { const url = `/voice/${m.id}`; try { window.location.href = url; } catch(e){} }}>Open Memo</Button>
                                </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <Button onClick={() => {
                            const t = addTask({ title: `Follow up: ${selected.name}`, clientId: selected.linkedClientId || '', clientName: selected.linkedClientId ? undefined : '', status: 'todo', priority: 'medium', dueDate: '', assignedTo: 'Me', createdAt: new Date().toISOString(), source: 'entity' });
                            toast({ title: 'Task created', description: t.title });
                          }}>Add Task</Button>

                          <Button variant="outline" onClick={() => {
                            const a = addActivity({ clientId: selected.linkedClientId, clientName: selected.linkedClientId ? undefined : '', type: 'misc', notes: `Note: ${selected.notes || ''}`, timestamp: new Date().toISOString(), source: 'entity' });
                            toast({ title: 'Note added', description: selected.name });
                          }}>Add Note</Button>
                        </div>
                  </div>
                 
                  <div className="mt-4">
                    <h4 className="font-medium">Related Events</h4>
                    <div className="space-y-2 mt-2">
                      {relatedEvents.map((ev:any) => (
                        <div key={ev.id} className="p-2 rounded border bg-card flex items-center justify-between">
                          <div>
                            <div className="font-medium">{ev.title}</div>
                            <div className="text-xs text-muted-foreground">{ev.date ? ev.date : ev.whenText} {ev.sourceMemoId ? <span className="ml-2 text-[11px] text-muted-foreground">from memo</span> : null}</div>
                            <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{ev.notes}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => { try { window.location.href = `/calendar?event=${ev.id}` } catch(e){} }}>Open</Button>
                          </div>
                        </div>
                      ))}
                      {relatedEvents.length === 0 ? <div className="text-xs text-muted-foreground">No related events</div> : null}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Connections Graph</CardTitle>
                <CardDescription className="text-xs">Visualize relationships</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Repel</label>
                    <Input type="number" value={repel} onChange={(e:any)=> setRepel(Number(e.target.value)||0)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Spring</label>
                    <Input type="number" step="0.01" value={spring} onChange={(e:any)=> setSpring(Number(e.target.value)||0)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Link Dist</label>
                    <Input type="number" value={linkDist} onChange={(e:any)=> setLinkDist(Number(e.target.value)||0)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Damping</label>
                    <Input type="number" step="0.01" value={dampingVal} onChange={(e:any)=> setDampingVal(Number(e.target.value)||0)} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <Button variant="ghost" onClick={() => { setRepel(40000); setSpring(0.1); setLinkDist(120); setDampingVal(0.85); }}>Reset Layout</Button>
                  <Button variant="outline" onClick={() => { setRepel(20000); setSpring(0.2); setLinkDist(80); setDampingVal(0.7); }}>Compact</Button>
                  <Button variant="outline" onClick={() => { setRepel(80000); setSpring(0.05); setLinkDist(160); setDampingVal(0.9); }}>Relaxed</Button>
                  <Button variant="secondary" onClick={() => setStabilizeKey(k=>k+1)}>Stabilize Layout</Button>
                </div>
                <div className="mb-4">
                  <div className="text-xs text-muted-foreground mb-2">Legend</div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2"><span style={{width:12,height:12,display:'inline-block',background:'#06b6d4',borderRadius:3}}></span><span className="text-xs">Person</span></div>
                    <div className="flex items-center gap-2"><span style={{width:12,height:12,display:'inline-block',background:'#8b5cf6',borderRadius:3}}></span><span className="text-xs">Organization</span></div>
                    <div className="flex items-center gap-2"><span style={{width:12,height:12,display:'inline-block',background:'#f97316',borderRadius:3}}></span><span className="text-xs">Event</span></div>
                    <div className="flex items-center gap-2"><span style={{width:12,height:12,display:'inline-block',background:'#10b981',borderRadius:3}}></span><span className="text-xs">Topic</span></div>
                    <div className="flex items-center gap-2"><span style={{width:12,height:12,display:'inline-block',background:'#94a3b8',borderRadius:3}}></span><span className="text-xs">Unknown</span></div>
                  </div>
                </div>
                <ConnectionsGraph entities={state.entities || []} width={900} height={360} onNodeClick={(e:any)=> setSelected(e)} repel={repel} spring={spring} linkDist={linkDist} damping={dampingVal} stabilizeKey={stabilizeKey} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
