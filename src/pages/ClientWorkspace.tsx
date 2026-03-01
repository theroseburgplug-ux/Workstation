import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTRPData } from '@/lib/trpData';
import { useOpenAI } from '@/hooks/useOpenAI';
import { InvoiceTemplateModal, EmailDraftModal, AddTaskModal, CreateInvoiceModal, RetainerModal } from '@/components/Modals';
import { renderInvoiceHTML } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Confirm from '@/components/Confirm';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { getDraftEventsForClient } from '@/lib/draftEvents';
import DraftEventDialog from '@/components/DraftEventDialog';
import { RetainerProposalModal } from '@/components/Modals';
import ClientLabel from '@/components/ClientLabel';

export default function ClientWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, updateClient, addTask, updateTask, deleteTask, addInvoice, updateInvoice, deleteInvoice, setClientRetainer, saveDraftEvent, confirmDraftEvent, dismissDraftEvent, unconfirmDraftEvent, unapplyVoiceMemo, updateVoiceMemo, computeRetainerStatus } = useTRPData();
  const [debugClickCount, setDebugClickCount] = useState(0);
  const client = state.clients.find(c => c.id === id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => ({
    name: client?.name || '',
    email: client?.email || '',
    company: client?.company || '',
    phone: client?.phone || '',
    website: client?.website || '',
    notes: client?.notes || '',
    avatar: client?.avatar || '',
    socials: client?.socials ? client.socials.join('\n') : '',
    attachments: client?.attachments || [],
  }));

  if (!client) return (
    <div className="p-6">
      <h2 className="text-lg font-semibold">Client not found</h2>
      <Button onClick={() => navigate('/clients')}>Back to Clients</Button>
    </div>
  );

  const tasks = state.tasks.filter(t => t.clientId === client.id || t.clientName === client.name);
  const draftsForClient = getDraftEventsForClient(client.id, state.voiceMemos);
  const pendingDraftsForClient = draftsForClient.filter(({ draft }) => draft.status !== 'confirmed');
  const confirmedDraftsForClient = draftsForClient.filter(({ draft }) => draft.status === 'confirmed');
  const [draftDialogOpen, setDraftDialogOpen] = useState(false);
  const [selectedDraftCtx, setSelectedDraftCtx] = useState<{ draft: any; memoId: string } | null>(null);
  const [draftMode, setDraftMode] = useState<'view' | 'edit' | 'confirm'>('view');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isRetainerModalOpen, setIsRetainerModalOpen] = useState(false);
  const [tempRetainerEdit, setTempRetainerEdit] = useState<any>(null);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [proposalTerms, setProposalTerms] = useState<any>(null);
  const [proposalMemoId, setProposalMemoId] = useState<string | null>(null);
  const [proposalDraftId, setProposalDraftId] = useState<string | null>(null);
  const [quickAddMessage, setQuickAddMessage] = useState<string | null>(null);
  const [emailDraftSubject, setEmailDraftSubject] = useState<string | undefined>(undefined);
  const [emailDraftBody, setEmailDraftBody] = useState<string | undefined>(undefined);
  const [emailDraftTo, setEmailDraftTo] = useState<string | undefined>(undefined);
  const { sendMessage } = useOpenAI();

  const handleTaskCreate = (data: any) => {
    if (editingTaskId) {
      updateTask(editingTaskId, { ...data, clientId: client.id, clientName: client.name });
      setEditingTaskId(null);
    } else {
      addTask({ ...data, clientId: client.id, clientName: client.name });
    }
    setIsTaskModalOpen(false);
  };

  const handleTaskEdit = (taskId: string) => {
    const t = state.tasks.find(x => x.id === taskId);
    if (!t) return;
    setEditingTaskId(taskId);
    setIsTaskModalOpen(true);
  };

  const handleCreateInvoice = (data: any) => {
    // handle invoice creation
    // data may include lineItems (from modal) or fields (description, qty, rate)
    const incomingLine = data.lineItems?.[0];
    let lineItem = incomingLine;
    if (!lineItem) {
      lineItem = {
        id: `li_${Date.now()}`,
        description: data.description,
        qty: Number(data.qty) || 1,
        rate: Number(data.rate) || 0,
      };
    }

    if (data.id || editingInvoiceId) {
      const invId = data.id || editingInvoiceId!;
      const prev = state.invoices.find(i => i.id === invId);
      // updating invoice
      updateInvoice(invId, { ...prev, dueDate: data.dueDate, notes: data.notes, lineItems: [lineItem] });
      // adjust revenue by delta
      const prevTotal = prev ? prev.total || (prev.lineItems?.[0]?.qty * prev.lineItems?.[0]?.rate || 0) : 0;
      const newTotal = (lineItem.qty * lineItem.rate) || 0;
      const targetClientId = prev?.clientId || client.id;
      const targetClient = state.clients.find(c => c.id === targetClientId) || client;
      updateClient(targetClientId, { revenue: (targetClient.revenue || 0) + (newTotal - prevTotal) });
      setEditingInvoiceId(null);

    } else {
      // Use data.clientId if present, else fallback to client.id
      const invoiceClientId = data.clientId || client.id;
      let invoice: any = null;
      try {
        invoice = addInvoice({ clientId: invoiceClientId, dueDate: data.dueDate, notes: data.notes, lineItems: [lineItem] });
      } catch (e) {
        console.error('[ClientWorkspace] addInvoice threw', e);
      }

      // If addInvoice didn't persist for any reason, write directly to localStorage as a fallback
      if (!invoice) {
        try {
          const KEY = 'trp-workstation-data-v1';
          const raw = window.localStorage.getItem(KEY);
          const store = raw ? JSON.parse(raw) : { clients: [], tasks: [], activities: [], invoices: [] };
          const directInv = {
            id: `inv_${Date.now()}`,
            clientId: invoiceClientId,
            clientName: client.name,
            invoiceNumber: `INV-${String(Date.now()).slice(-6)}`,
            status: 'draft',
            dueDate: data.dueDate,
            createdAt: new Date().toISOString(),
            notes: data.notes,
            lineItems: [lineItem],
            total: lineItem.qty * lineItem.rate,
          };
          store.invoices = [directInv, ...(store.invoices || [])];
          window.localStorage.setItem(KEY, JSON.stringify(store));
          window.dispatchEvent(new Event('local-storage-update'));
          invoice = directInv;
          // fallback wrote invoice directly to localStorage
        } catch (e) {
          console.error('[ClientWorkspace] direct localStorage write failed', e);
        }
      }

      const total = invoice?.total || (lineItem.qty * lineItem.rate);
      const targetClient = state.clients.find(c => c.id === invoiceClientId) || client;
      updateClient(invoiceClientId, { revenue: (targetClient.revenue || 0) + total });
    }

    setIsCreateInvoiceOpen(false);
    // small snapshot for debugging: ensure storage reflects new invoice
    try {
      const KEY = 'trp-workstation-data-v1';
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null;
      // localStorage snapshot omitted
    } catch (e) {
      // ignore
    }
  };

  React.useEffect(() => {
    // render effect
  }, [state.invoices, client?.id, id]);

  const handleSaveRetainer = (patch: any) => {
    // preserve provenance fields if present
    const prev = client.billing?.retainer || {};
    const next = { ...(prev || {}), ...patch, updatedAt: new Date().toISOString() };
    setClientRetainer(client.id, next);
    try { toast({ title: 'Retainer saved' }); } catch(e){}
  };

  // Payment tracker calculations
  const clientInvoices = state.invoices.filter(inv => String(inv.clientId) === String(client.id));
  const outstandingTotalCents = clientInvoices.filter(inv => inv.status !== 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const paidTotalCents = clientInvoices.filter(inv => inv.status === 'paid').reduce((s, i) => s + (i.total || 0), 0);
  const overdueCount = clientInvoices.filter(inv => {
    if (!inv.dueDate) return false;
    const due = new Date(inv.dueDate + 'T23:59:59');
    const now = new Date();
    return due < now && inv.status !== 'paid';
  }).length;
  const upcomingDue = clientInvoices.filter(inv => inv.status !== 'paid' && inv.dueDate).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  // Push due-date notifications for this client (once per mount) for invoices due within 3 days or overdue
  React.useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const rawNotes = window.localStorage.getItem('trp-notifications');
      const existingNotes = rawNotes ? JSON.parse(rawNotes) : [];
      const today = new Date();
      clientInvoices.forEach(inv => {
        if (!inv.dueDate || inv.status === 'paid') return;
        const due = new Date(inv.dueDate + 'T00:00:00');
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const isDueSoon = diffDays <= 3 && diffDays >= 0;
        const isOverdue = diffDays < 0;
        if (isDueSoon || isOverdue) {
          const title = isOverdue ? `Invoice overdue: ${inv.invoiceNumber}` : `Invoice due soon: ${inv.invoiceNumber}`;
          const already = existingNotes.find((n:any) => n.title && n.title.includes(inv.invoiceNumber));
          if (!already) {
            const note = { id: `note_${Date.now()}`, title, description: `${client.name} — Due ${inv.dueDate}`, createdAt: new Date().toISOString(), read: false };
            window.localStorage.setItem('trp-notifications', JSON.stringify([note, ...existingNotes]));
            window.dispatchEvent(new Event('local-storage-update'));
          }
        }
      });
    } catch (e) {
      // ignore
    }
  // run once per client/invoice set
  }, [client?.id]);

  const handleGenerateEmailDraft = async (inv: any) => {
    const prompt = `Write a professional, friendly invoice email to ${client.name} (${client.email}) for invoice ${inv.invoiceNumber}. Include due date ${inv.dueDate} and total $${((inv.total|| (inv.lineItems?.[0]?.qty*inv.lineItems?.[0]?.rate||0))/100).toFixed(2)}. Mention line items: ${inv.lineItems.map((li:any)=> li.description + ' ('+(li.qty||1)+'×$'+((li.rate||0)/100).toFixed(2)+')').join(', ')}. Keep it concise and polite.`;
    const res = await sendMessage(prompt);
    const assistantText = res?.choices?.[0]?.message?.content || res?.choices?.[0]?.text || '';
    setEmailDraftSubject(`Invoice ${inv.invoiceNumber} from ${client.company}`);
    setEmailDraftBody(assistantText || `Hi ${client.name},\n\nPlease find attached invoice ${inv.invoiceNumber}...`);
    setEmailDraftTo(client.email);
    setIsEmailModalOpen(true);
  };

  const handleQuickAddTestInvoice = () => {
    try {
      const testLine = { id: `li_${Date.now()}`, description: 'Test invoice', qty: 1, rate: 10000 };
      // First try the normal API
      let inv: any = null;
      try {
        inv = addInvoice({ clientId: client.id, dueDate: new Date().toISOString().slice(0,10), notes: 'Quick test', lineItems: [testLine] });
        updateClient(client.id, { revenue: (client.revenue || 0) + (inv.total || (testLine.qty * testLine.rate)) });
      } catch (e) {
        console.error('[ClientWorkspace] addInvoice threw', e);
      }

      // Additionally write directly to localStorage as a fallback for debugging
      try {
        const KEY = 'trp-workstation-data-v1';
        const raw = window.localStorage.getItem(KEY);
        const store = raw ? JSON.parse(raw) : { clients: [], tasks: [], activities: [], invoices: [] };
        const directInv = inv || {
          id: `inv_${Date.now()}`,
          clientId: client.id,
          clientName: client.name,
          invoiceNumber: `INV-${String(Date.now()).slice(-6)}`,
          status: 'draft',
          dueDate: new Date().toISOString().slice(0,10),
          createdAt: new Date().toISOString(),
          notes: 'Quick test (direct)',
          lineItems: [testLine],
          total: testLine.qty * testLine.rate,
        };
        store.invoices = [directInv, ...(store.invoices || [])];
        window.localStorage.setItem(KEY, JSON.stringify(store));
        window.dispatchEvent(new Event('local-storage-update'));
      } catch (e) {
        console.error('[ClientWorkspace] direct localStorage write failed', e);
      }
      setQuickAddMessage(`Added invoice ${inv.invoiceNumber}`);
      setTimeout(() => setQuickAddMessage(null), 3000);
    } catch (err) {
      console.error('[ClientWorkspace] quick add error', err);
      setQuickAddMessage('Error adding invoice (check console)');
      setTimeout(() => setQuickAddMessage(null), 5000);
    }
  };

  

  const handleExportInvoice = (inv: any) => {
    const template = state.invoiceTemplate || '';
    const html = renderInvoiceHTML(template, client, inv);
    const popup = window.open('', '_blank');
    if (!popup) return;
    popup.document.write(html);
    popup.document.close();
    setTimeout(() => popup.print(), 300);
    try { toast({ title: 'Export opened', description: `Invoice ${inv.invoiceNumber} opened for printing` }); } catch (e) {}
  };

  const handleSave = () => {
    const updates: any = { ...form };
    if (typeof updates.socials === 'string') updates.socials = updates.socials.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
    updateClient(client.id, updates);
    setEditing(false);
  };
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Attachments</div>
                    <input type="file" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setForm(f => ({ ...f, attachments: [...(f.attachments || []), { id: `att_${Date.now()}`, name: file.name, url: String(reader.result), size: String(file.size) }] }));
                      reader.readAsDataURL(file);
                    }} />
                    <ul className="mt-2 space-y-2">
                      {(form.attachments || []).map((a: any) => (
                        <li key={a.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3">
                            <a href={a.url} target="_blank" rel="noreferrer" className="text-primary underline">{a.name}</a>
                            <span className="text-muted-foreground text-[11px]">{Math.round((Number(a.size) || 0) / 1024)} KB</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => window.open(a.url, '_blank')}>Preview</Button>
                            <Button variant="destructive" size="sm" onClick={() => setForm(f => ({ ...f, attachments: (f.attachments || []).filter((x: any) => x.id !== a.id) }))}>Delete</Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

  return (
    <div className="p-6 lg:p-10">
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold"><ClientLabel clientId={client.id} clientName={client.name} /></h1>
              </div>
              <p className="text-sm text-muted-foreground">{client.company}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</Button>
              {editing ? <Button onClick={handleSave}>Save</Button> : <Button onClick={() => navigate('/clients')}>Back</Button>}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Contact & Profile</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {form.avatar ? <img src={form.avatar} alt="avatar" className="w-24 h-24 rounded-full object-cover" /> : <div className="w-24 h-24 rounded-full bg-muted" />}
                    <div className="flex flex-col gap-2">
                      <Button onClick={() => document.getElementById('avatar-upload-input')?.click()}>Upload Avatar</Button>
                      <input id="avatar-upload-input" type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setForm(f => ({ ...f, avatar: String(reader.result) }));
                        reader.readAsDataURL(file);
                      }} />
                      <Button variant="outline" onClick={() => setForm(f => ({ ...f, avatar: '' }))}>Remove</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Full Name</div>
                      <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Company</div>
                      <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Website</div>
                      <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Socials (one per line)</div>
                      <Textarea value={form.socials} onChange={e => setForm(f => ({ ...f, socials: e.target.value }))} placeholder="One per line: instagram.com/..., twitter.com/..." />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Notes</div>
                      <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    {client.avatar ? <img src={client.avatar} alt="avatar" className="w-20 h-20 rounded-full object-cover" /> : <div className="w-20 h-20 rounded-full bg-muted" />}
                    <div>
                      <div className="font-medium">{client.company}</div>
                      <div className="text-sm text-muted-foreground">{client.tags?.join(', ')}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium">{client.email}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Phone</div>
                    <div className="font-medium">{client.phone}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Website</div>
                    <div className="font-medium"><a href={client.website} target="_blank" rel="noreferrer" className="text-primary underline">{client.website || '—'}</a></div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Notes</div>
                    <div className="font-medium">{client.notes}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Attachments</div>
                    <ul className="mt-2 space-y-2">
                      {(client.attachments || []).map((a: any) => (
                        <li key={a.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3">
                            <a href={a.url} target="_blank" rel="noreferrer" className="text-primary underline">{a.name}</a>
                            <span className="text-muted-foreground text-[11px]">{Math.round((Number(a.size) || 0) / 1024)} KB</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => window.open(a.url, '_blank')}>Preview</Button>
                            <Button variant="destructive" size="sm" onClick={() => {
                              const remaining = (client.attachments || []).filter((x: any) => x.id !== a.id);
                              updateClient(client.id, { attachments: remaining });
                            }}>Delete</Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Socials</div>
                    <div className="font-medium">{client.socials?.join(', ')}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <Button onClick={() => setIsTaskModalOpen(true)}>Add Task</Button>
                <Button onClick={() => setIsCreateInvoiceOpen(true)}>Create Invoice</Button>
                <Button variant="ghost" asChild>
                  <a href={`mailto:${client.email}`}>Email</a>
                </Button>
                {client.phone && (
                  <Button variant="ghost" asChild>
                    <a href={`tel:${client.phone}`}>Call</a>
                  </Button>
                )}
                {client.website && (
                  <Button variant="ghost" asChild>
                    <a href={client.website} target="_blank" rel="noreferrer">Visit</a>
                  </Button>
                )}
                <div className="pt-2">
                  <Button variant={client.status === 'active' ? 'default' : 'ghost'} size="sm" onClick={() => updateClient(client.id, { status: client.status === 'active' ? 'inactive' : 'active' })}>{client.status === 'active' ? 'Set Inactive' : 'Set Active'}</Button>
                </div>
              </div>
              
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-sm text-muted-foreground">No tasks for this client.</div>
              ) : (
                <ul className="space-y-2">
                  {tasks.map(t => (
                    <li key={t.id} className="p-3 border border-border/50 rounded-md flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{t.title}</div>
                          {(t.source === 'voice_memo' || t.sourceMemoId) ? <Badge variant="outline" className="text-[10px]">From Voice Memo</Badge> : null}
                        </div>
                        <div className="text-xs text-muted-foreground">{t.status} • Due: {t.dueDate || '—'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleTaskEdit(t.id)}>Edit</Button>
                        {t.status !== 'completed' && <Button size="sm" onClick={() => updateTask(t.id, { status: 'completed' })}>Complete</Button>}
                        <Button variant="destructive" size="sm" onClick={() => deleteTask(t.id)}>Delete</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Event History</CardTitle>
            </CardHeader>
            <CardContent>
              {state.events.filter((e:any) => String(e.clientId) === String(client.id)).length === 0 ? (
                <div className="text-xs text-muted-foreground">No events for this client.</div>
              ) : (
                <ul className="space-y-2">
                  {state.events.filter((e:any) => String(e.clientId) === String(client.id)).slice(0, 10).map((ev:any) => (
                    <li key={ev.id} className="p-2 border border-border/40 rounded-md flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{ev.title}</div>
                        <div className="text-xs text-muted-foreground">{ev.date || ev.whenText || new Date(ev.createdAt).toLocaleString()}</div>
                        <div className="text-[11px] text-muted-foreground">Source: {ev.source || 'manual'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => { window.location.href = `/calendar#${ev.id}`; }}>Open</Button>
                        <Confirm title="Reopen / Delete" description={`Reopen or delete event "${ev.title}"?`} onConfirm={() => {
                          // attempt to unconfirm via linked draft if possible
                          if (ev.sourceMemoId) {
                            const memo = state.voiceMemos.find((m:any) => m.id === ev.sourceMemoId);
                            const draft = memo?.extracted?.draftEvents?.find((d:any) => d.createdEventId === ev.id);
                            if (memo && draft) {
                              unconfirmDraftEvent && unconfirmDraftEvent(memo.id, draft.id);
                              return;
                            }
                          }
                          deleteEvent && deleteEvent(ev.id);
                        }}>
                          <Button size="sm" variant="outline">Reopen</Button>
                        </Confirm>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Draft Events — Needs Review</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingDraftsForClient.length === 0 ? (
                <div className="text-xs text-muted-foreground">No draft events for review.</div>
              ) : (
                <ul className="space-y-2">
                  {pendingDraftsForClient.map(({ draft, sourceMemoId }) => (
                    <li key={draft.id} className="p-2 border border-border/40 rounded-md flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{draft.title}</div>
                        <div className="text-xs text-muted-foreground">{draft.whenText || draft.date || draft.context}</div>
                        <div className="text-[11px] text-muted-foreground">Status: {draft.status}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {draft.status !== 'confirmed' && <Button size="sm" onClick={() => { setSelectedDraftCtx({ draft, memoId: sourceMemoId }); setDraftMode('confirm'); setDraftDialogOpen(true); }}>Confirm</Button>}
                        <Button size="sm" variant="outline" onClick={() => { setSelectedDraftCtx({ draft, memoId: sourceMemoId }); setDraftMode('edit'); setDraftDialogOpen(true); }}>Edit</Button>
                        {draft.status !== 'dismissed' && <Button size="sm" variant="ghost" onClick={() => { dismissDraftEvent(sourceMemoId, draft.id); }}>{draft.status === 'dismissed' ? 'Dismissed' : 'Dismiss'}</Button>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <DraftEventDialog
                open={draftDialogOpen}
                mode={draftMode}
                draft={selectedDraftCtx?.draft}
                onOpenChange={(v) => { setDraftDialogOpen(v); if (!v) setSelectedDraftCtx(null); }}
                onSave={(updated) => {
                  if (!selectedDraftCtx) return;
                  saveDraftEvent(selectedDraftCtx.memoId, selectedDraftCtx.draft.id, updated);
                  setDraftDialogOpen(false);
                  setSelectedDraftCtx(null);
                }}
                onConfirm={(updated) => {
                  if (!selectedDraftCtx) return;
                  // save updated draft first
                  saveDraftEvent(selectedDraftCtx.memoId, selectedDraftCtx.draft.id, updated);
                  const memo = state.voiceMemos.find((m:any)=>m.id === selectedDraftCtx.memoId);
                  const terms = memo?.extracted?.paymentTerms;
                  const confidence = terms?.confidence || (terms && 'medium');
                  if (terms && (!confidence || confidence !== 'high')) {
                    // show proposal for user review
                    setProposalTerms(terms);
                    setProposalMemoId(selectedDraftCtx.memoId);
                    setProposalDraftId(selectedDraftCtx.draft.id);
                    setIsProposalOpen(true);
                    setDraftDialogOpen(false);
                    return;
                  }
                  // otherwise auto confirm
                  confirmDraftEvent(selectedDraftCtx.memoId, selectedDraftCtx.draft.id);
                  setDraftDialogOpen(false);
                  setSelectedDraftCtx(null);
                }}
                onDismiss={() => {
                  if (!selectedDraftCtx) return;
                  dismissDraftEvent(selectedDraftCtx.memoId, selectedDraftCtx.draft.id);
                  setDraftDialogOpen(false);
                  setSelectedDraftCtx(null);
                }}
                onCancel={() => { setDraftDialogOpen(false); setSelectedDraftCtx(null); }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Voice Memos</CardTitle>
            </CardHeader>
            <CardContent>
              {state.voiceMemos.filter((m:any)=>String(m.clientId) === String(client.id)).length === 0 ? (
                <div className="text-xs text-muted-foreground">No memos for this client.</div>
              ) : (
                <ul className="space-y-2">
                  {state.voiceMemos.filter((m:any)=>String(m.clientId) === String(client.id)).map((m:any) => (
                    <li key={m.id} className="p-2 border border-border/40 rounded-md flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-sm">{m.title}</div>
                          <div className="text-[11px] text-muted-foreground">T:{m.transcription?.status||'none'}</div>
                          <div className="text-[11px] text-muted-foreground">A:{m.analysis?.status||'none'}</div>
                          {m.extracted?.appliedAt ? <Badge variant="secondary" className="text-[10px]">Applied</Badge> : null}
                        </div>
                        <div className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.extracted?.appliedAt ? (
                          <Confirm title="Unapply memo" description="Unapply items created by this memo?" onConfirm={() => { unapplyVoiceMemo && unapplyVoiceMemo(m.id); try { toast({ title: 'Memo unapplied' }); } catch(e){} }}>
                            <Button size="sm" variant="destructive">Unapply</Button>
                          </Confirm>
                        ) : null}
                        <Button size="sm" onClick={() => { window.location.href = `/voice#${m.id}`; }}>Open</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex items-center justify-between">
                  <CardTitle>Payments</CardTitle>
                  <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsTemplateModalOpen(true)}>Edit Template</Button>
                </div>
                </CardHeader>
            <CardContent>
                <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 bg-muted/10 rounded">
                    <div className="text-xs text-muted-foreground">Outstanding</div>
                    <div className="text-lg font-medium">${(outstandingTotalCents/100).toFixed(2)}</div>
                  </div>

                    {/* Retainer / Recurring Payment block */}
                    {client.billing && client.billing.retainer ? (
                      <div className="p-3 bg-muted/10 rounded grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                        <div>
                          <div className="text-xs text-muted-foreground">Retainer</div>
                          <div className="flex items-center gap-2">
                            <div className="text-lg font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((client.billing.retainer.amountCents||0)/100)}</div>
                            {(() => {
                              try {
                                const s = computeRetainerStatus(client.id) || {};
                                if (s.status === 'paid') return <Badge variant="secondary">Paid</Badge>;
                                if (s.status === 'late') return <Badge variant="destructive">Late {s.daysLate ? `${s.daysLate}d` : ''}</Badge>;
                                if (s.status === 'not_started') return <Badge variant="outline">Not started</Badge>;
                                return <Badge variant="outline">Unknown</Badge>;
                              } catch (e) { return null; }
                            })()}
                          </div>
                          <div className="text-sm text-muted-foreground">{client.billing.retainer.cadence || 'monthly'} on day {client.billing.retainer.dayOfMonth || '—'}</div>
                          {client.billing.retainer.nextDueDate && <div className="text-xs text-muted-foreground">Next: {client.billing.retainer.nextDueDate}</div>}
                          {client.billing.retainer.sourceMemoTitle ? <div className="text-xs text-muted-foreground">Source: {client.billing.retainer.sourceMemoTitle}</div> : null}
                        </div>
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="w-9 h-9 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => setIsRetainerModalOpen(true)} onClick={() => setIsRetainerModalOpen(true)}>Edit Retainer</DropdownMenuItem>
                              <Confirm title="Clear retainer" description="Clear retainer for this client?" onConfirm={() => { setClientRetainer(client.id, null); }}>
                                <DropdownMenuItem>Clear Retainer</DropdownMenuItem>
                              </Confirm>
                              {client.billing.retainer.sourceMemoId ? (
                                <Confirm title="Unapply memo" description="Unapply voice memo that created this retainer?" onConfirm={() => { try { unapplyVoiceMemo && unapplyVoiceMemo(client.billing.retainer.sourceMemoId); } catch(e){} }}>
                                  <DropdownMenuItem>Unapply</DropdownMenuItem>
                                </Confirm>
                              ) : null}
                              <DropdownMenuItem onSelect={() => {
                                const existingId = client.billing?.retainer?.reminderTaskId;
                                const exists = existingId ? state.tasks.find(t => t.id === existingId) : undefined;
                                if (exists) { try { toast({ title: 'Reminder exists', description: 'A reminder task already exists' }); } catch(e){}; return; }
                                const title = `Retainer reminder — ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((client.billing.retainer.amountCents||0)/100)}`;
                                const task = addTask({ title, clientId: client.id, clientName: client.name, status: 'todo', tags: ['retainer_reminder'], dueDate: client.billing.retainer.nextDueDate || undefined });
                                setClientRetainer(client.id, { ...(client.billing.retainer || {}), reminderTaskId: task.id, updatedAt: new Date().toISOString() });
                                try { toast({ title: 'Reminder created', description: `Task ${task.title}` }); } catch(e){}
                              }} onClick={() => {
                                const existingId = client.billing?.retainer?.reminderTaskId;
                                const exists = existingId ? state.tasks.find(t => t.id === existingId) : undefined;
                                if (exists) { try { toast({ title: 'Reminder exists', description: 'A reminder task already exists' }); } catch(e){}; return; }
                                const title = `Retainer reminder — ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((client.billing.retainer.amountCents||0)/100)}`;
                                const task = addTask({ title, clientId: client.id, clientName: client.name, status: 'todo', tags: ['retainer_reminder'], dueDate: client.billing.retainer.nextDueDate || undefined });
                                setClientRetainer(client.id, { ...(client.billing.retainer || {}), reminderTaskId: task.id, updatedAt: new Date().toISOString() });
                                try { toast({ title: 'Reminder created', description: `Task ${task.title}` }); } catch(e){}
                              }}>Create Reminder</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/10 rounded flex items-center justify-between">
                        <div>
                          <div className="text-xs text-muted-foreground">Retainer</div>
                          <div className="text-sm text-muted-foreground">No retainer set for this client.</div>
                        </div>
                        <div>
                          <Button onClick={() => { setTempRetainerEdit(client.billing?.retainer || {}); setIsRetainerModalOpen(true); }}>Add Retainer</Button>
                        </div>
                      </div>
                    )}
                  <div className="p-3 bg-muted/10 rounded">
                    <div className="text-xs text-muted-foreground">Paid</div>
                    <div className="text-lg font-medium">${(paidTotalCents/100).toFixed(2)}</div>
                  </div>
                  <div className="p-3 bg-muted/10 rounded">
                    <div className="text-xs text-muted-foreground">Overdue</div>
                    <div className="text-lg font-medium">{overdueCount}</div>
                    <div className="text-xs text-muted-foreground">{upcomingDue ? `Next: ${upcomingDue.dueDate}` : 'No upcoming'}</div>
                  </div>
                </div>

                {clientInvoices.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No invoices for this client.</div>
                ) : (
                  <ul className="space-y-2">
                      {clientInvoices.map(inv => (
                    <li key={inv.id} className="p-3 border border-border/50 rounded-md flex items-center justify-between">
                      <div>
                        <div className="font-medium">{inv.invoiceNumber} — {inv.lineItems[0]?.description}</div>
                        <div className="text-xs text-muted-foreground">{inv.status} • Due: {inv.dueDate}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-mono">${((inv.total || (inv.lineItems?.[0]?.qty * inv.lineItems?.[0]?.rate || 0))/100).toFixed(2)}</div>
                        <Button size="sm" onClick={() => { setEditingInvoiceId(inv.id); setIsCreateInvoiceOpen(true); }}>Edit</Button>
                        <Button size="sm" onClick={() => handleGenerateEmailDraft(inv)}>Email Draft</Button>
                        <Button size="sm" onClick={() => handleExportInvoice(inv)}>Export</Button>
                        {inv.status !== 'paid' && (
                          <Button size="sm" onClick={() => { updateInvoice(inv.id, { status: 'paid', paidAt: new Date().toISOString() }); try { toast({ title: 'Invoice marked paid', description: `${inv.invoiceNumber} marked as paid` }); } catch(e){} }}>Mark Paid</Button>
                        )}
                        <Button variant="destructive" size="sm" onClick={() => { deleteInvoice(inv.id); }}>Delete</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <AddTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => { setIsTaskModalOpen(false); setEditingTaskId(null); }}
        onSubmit={handleTaskCreate}
        initialClientId={client.id}
        initialValues={editingTaskId ? state.tasks.find(t => t.id === editingTaskId) : undefined}
      />
      <RetainerModal isOpen={isRetainerModalOpen} onClose={() => { setIsRetainerModalOpen(false); setTempRetainerEdit(null); }} initialValues={tempRetainerEdit || client.billing?.retainer || {}} onSubmit={(patch)=>{ handleSaveRetainer(patch); setTempRetainerEdit(null); setIsRetainerModalOpen(false); }} clientId={client.id} />

      <RetainerProposalModal open={isProposalOpen} onOpenChange={(v)=>{ setIsProposalOpen(v); if (!v) { setProposalTerms(null); setProposalMemoId(null); setProposalDraftId(null); } }} terms={proposalTerms} confidence={proposalTerms?.confidence}
        onApply={() => {
          if (!proposalMemoId || !proposalDraftId || !proposalTerms) return;
          // apply retainer to client with provenance
          const memo = state.voiceMemos.find((m:any)=>m.id === proposalMemoId);
          const ret = { ...(proposalTerms || {}), sourceMemoId: proposalMemoId, sourceMemoTitle: memo?.title || undefined, updatedAt: new Date().toISOString() };
          setClientRetainer(client.id, ret);
          try { if (updateVoiceMemo) updateVoiceMemo(proposalMemoId, { extracted: { ...(memo?.extracted || {}), paymentTerms: proposalTerms, appliedAt: new Date().toISOString() } }); } catch(e){}
          // confirm the draft event (creates event)
          confirmDraftEvent(proposalMemoId, proposalDraftId);
          setIsProposalOpen(false);
          setProposalTerms(null);
          setProposalMemoId(null);
          setProposalDraftId(null);
        }}
        onEdit={() => {
          // open Retainer modal prefilled with parsed terms for manual edit
          setTempRetainerEdit(proposalTerms);
          setIsProposalOpen(false);
          setIsRetainerModalOpen(true);
        }}
        onKeepNote={() => {
          // just confirm the draft and keep retainer as note (do not apply)
          if (!proposalMemoId || !proposalDraftId) return;
          confirmDraftEvent(proposalMemoId, proposalDraftId);
          setIsProposalOpen(false);
          setProposalTerms(null);
          setProposalMemoId(null);
          setProposalDraftId(null);
        }}
      />
      <CreateInvoiceModal
        isOpen={isCreateInvoiceOpen}
        onClose={() => { setIsCreateInvoiceOpen(false); setEditingInvoiceId(null); }}
        onSubmit={handleCreateInvoice}
        initialClientId={client.id}
        initialValues={editingInvoiceId ? state.invoices.find(i => i.id === editingInvoiceId) : undefined}
      />
      <InvoiceTemplateModal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} />
      <EmailDraftModal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} subject={emailDraftSubject} body={emailDraftBody} to={emailDraftTo} />
    </div>
  );
}
