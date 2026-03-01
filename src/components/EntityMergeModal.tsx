import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useTRPData } from '@/lib/trpData';

export default function EntityMergeModal({ open, onOpenChange, selectedIds }: { open: boolean; onOpenChange: (v:boolean)=>void; selectedIds: string[] }) {
  const { state, mergeEntities } = useTRPData();
  const [name, setName] = useState('');
  const [type, setType] = useState<'person'|'organization'|'event'|'topic'>('person');
  const [linkedClientId, setLinkedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  const clients = state.clients || [];
  const ents = (state.entities || []).filter(e => selectedIds.includes(e.id));

  useEffect(() => {
    if (ents.length) {
      setName(ents.map(e=>e.name).filter(Boolean)[0] || '');
      setType((ents[0].type as any) || 'person');
      setLinkedClientId(ents.map(e=>e.linkedClientId).find(Boolean) || null);
    } else {
      setName(''); setType('person'); setLinkedClientId(null);
    }
  }, [open, selectedIds.join(','), state.entities]);

  const doMerge = () => {
    if (!selectedIds || selectedIds.length === 0) return;
    const merged = mergeEntities(selectedIds, { name, type, linkedClientId: linkedClientId || undefined });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge Entities</DialogTitle>
          <DialogDescription>Merge {selectedIds.length} entities into one canonical entity.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <label className="text-xs text-muted-foreground">Canonical name</label>
            <Input value={name} onChange={(e:any)=>setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={type} onChange={(v:any)=>setType(v || 'person')}>
              <option value="person">Person</option>
              <option value="organization">Organization</option>
              <option value="event">Event</option>
              <option value="topic">Topic</option>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Link to client (optional)</label>
            <Input placeholder="Search clients..." value={clientSearch} onChange={(e:any)=>setClientSearch(e.target.value)} className="mb-2" />
            <Select value={linkedClientId || ''} onChange={(e:any)=>setLinkedClientId(e.target.value || null)}>
              <option value="">— none —</option>
              {clients.filter(c=> (c.name||'').toLowerCase().includes(clientSearch.toLowerCase())).map(c=> (<option key={c.id} value={c.id}>{c.name}</option>))}
            </Select>
          </div>
        </div>

        <DialogFooter>
          <div className="flex gap-2">
            <Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button>
            <Button onClick={doMerge}>Merge</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
