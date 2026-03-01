import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import ClientLabel from '@/components/ClientLabel';
import { useTRPData } from '@/lib/trpData';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function EntityMappingModal({ entity }: { entity?: any }) {
  const { state, addClient, updateEntity, addEntity, createClientFromEntity } = useTRPData();
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [newEntityName, setNewEntityName] = useState('');
  const [entityType, setEntityType] = useState<'person'|'organization'|'event'|'topic'>((entity?.type as any) || 'person');
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  React.useEffect(() => {
    if (entity) {
      setNewEntityName(entity.name || '');
      setEntityType((entity.type as any) || 'person');
      setClientName(entity.name || '');
      // preselect a memo if the entity was created from one
      const memId = (entity.createdFromMemoIds && entity.createdFromMemoIds.length) ? entity.createdFromMemoIds[0] : null;
      setSelectedMemoId(memId);
      setSelectedClientId(entity.linkedClientId || null);
    } else {
      setNewEntityName('');
      setClientName('');
      setSelectedMemoId(null);
      setSelectedClientId(null);
    }
  }, [entity]);

  const memos = state.voiceMemos || [];
  const clients = state.clients || [];

  const { toast } = useToast();
  const [openCreateConfirm, setOpenCreateConfirm] = useState(false);
  const [openLinkConfirm, setOpenLinkConfirm] = useState(false);
  const [openCreateFromEntityConfirm, setOpenCreateFromEntityConfirm] = useState(false);

  const handleCreateClientAndLink = () => {
    const client = addClient({ name: clientName || (entity && entity.name) || 'New Client', company: clientName || entity?.name });
    if (entity && entity.id) {
      updateEntity(entity.id, { linkedClientId: client.id });
    } else if (newEntityName) {
      const ent = addEntity({ name: newEntityName, type: 'person', linkedClientId: client.id, createdFromMemoIds: selectedMemoId ? [selectedMemoId] : [] });
    }
    toast({ title: 'Client created', description: client.name });
    setOpen(false);
    setOpenCreateConfirm(false);
  };

  const handleLinkToExistingClient = () => {
    if (!selectedClientId) return;
    if (entity && entity.id) {
      updateEntity(entity.id, { linkedClientId: selectedClientId });
    } else if (newEntityName) {
      const ent = addEntity({ name: newEntityName, type: 'person', linkedClientId: selectedClientId, createdFromMemoIds: selectedMemoId ? [selectedMemoId] : [] });
    }
    const linked = clients.find((c:any)=>c.id === selectedClientId);
    toast({ title: 'Entity linked', description: linked ? linked.name : 'Linked to client' });
    setOpen(false);
    setOpenLinkConfirm(false);
  };

  const handleCreateClientFromEntity = () => {
    if (!entity || !entity.id) return;
    const client = createClientFromEntity(entity.id);
    if (client) toast({ title: 'Client created from entity', description: client.name });
    setOpen(false);
    setOpenCreateFromEntityConfirm(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Map / Link</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Map Entity to Client</DialogTitle>
          <DialogDescription className="text-sm">Create or link a client for this entity and record the mapping.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-xs text-muted-foreground">Select memo (optional)</label>
            <Select value={selectedMemoId || ''} onChange={(e:any)=>setSelectedMemoId(e.target.value || null)}>
              <option value="">— none —</option>
              {memos.map((m:any)=> (<option key={m.id} value={m.id}>{m.title || m.id}</option>))}
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Existing entity</label>
            <div className="text-sm">{entity ? entity.name : 'No entity selected'}</div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Or create a new entity name</label>
            <div className="flex gap-2">
              <Input value={newEntityName} onChange={(e:any)=>setNewEntityName(e.target.value)} placeholder="e.g., John Doe" />
              <Select value={entityType} onChange={(v:any)=>setEntityType(v || 'person')}>
                <option value="person">Person</option>
                <option value="organization">Organization</option>
                <option value="event">Event</option>
                <option value="topic">Topic</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Client name to create</label>
            <Input value={clientName} onChange={(e:any)=>setClientName(e.target.value)} placeholder="Client name" />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Or link to an existing client</label>
            <Input placeholder="Search clients..." value={clientSearch} onChange={(e:any)=>setClientSearch(e.target.value)} className="mb-2" />
            <Select value={selectedClientId || ''} onChange={(e:any)=>setSelectedClientId(e.target.value || null)}>
              <option value="">— select client —</option>
              {(clients || []).filter((c:any)=> (c.name||'').toLowerCase().includes(clientSearch.toLowerCase())).map((c:any)=> (<option key={c.id} value={c.id}>{c.name}</option>))}
            </Select>
            {selectedClientId ? (<div className="mt-2"><ClientLabel clientId={selectedClientId} clientName={undefined} /></div>) : null}
          </div>

          {selectedMemoId ? (
            <div className="p-3 mt-2 border rounded bg-muted/5">
              <div className="text-xs text-muted-foreground">From memo</div>
              {memos.find((m:any)=>m.id===selectedMemoId) ? (
                <div className="text-sm">
                  <div className="font-medium">{memos.find((m:any)=>m.id===selectedMemoId)?.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{memos.find((m:any)=>m.id===selectedMemoId)?.extracted?.strategy || memos.find((m:any)=>m.id===selectedMemoId)?.transcription?.text?.slice(0,200)}</div>
                </div>
              ) : <div className="text-sm text-muted-foreground">Memo not found</div>}
            </div>
          ) : null}

          {entity && (
            <div className="text-sm text-muted-foreground">Quick create from entity: <strong>{entity.name}</strong></div>
          )}
        </div>

        <DialogFooter>
            <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button>

            <AlertDialog open={openCreateConfirm} onOpenChange={setOpenCreateConfirm}>
              <AlertDialogTrigger asChild>
                <Button onClick={()=>setOpenCreateConfirm(true)}>Create Client & Link</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm create client</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure you want to create a client{entity ? ` for "${entity.name}"` : ''}?</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex gap-2 justify-end">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCreateClientAndLink}>Create</AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={openLinkConfirm} onOpenChange={setOpenLinkConfirm}>
              <AlertDialogTrigger asChild>
                <Button variant="secondary" onClick={()=>setOpenLinkConfirm(true)}>Link to Existing</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm link</AlertDialogTitle>
                  <AlertDialogDescription>Link this entity to the selected client?</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex gap-2 justify-end">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLinkToExistingClient}>Link</AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={openCreateFromEntityConfirm} onOpenChange={setOpenCreateFromEntityConfirm}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" onClick={()=>setOpenCreateFromEntityConfirm(true)}>Create From Entity</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Create client from entity</AlertDialogTitle>
                  <AlertDialogDescription>Create a client from this entity?</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex gap-2 justify-end">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCreateClientFromEntity}>Create</AlertDialogAction>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
