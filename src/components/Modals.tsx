import React, { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTRPData } from '@/lib/trpData';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialClientId?: string;
  initialValues?: Partial<Record<string, any>>;
}

// Invoice Template Editor Modal
interface InvoiceTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceTemplateModal({ isOpen, onClose }: InvoiceTemplateModalProps) {
  const { state, updateInvoiceTemplate } = useTRPData();
  const [value, setValue] = React.useState(state.invoiceTemplate || '');

  useEffect(() => {
    if (isOpen) setValue(state.invoiceTemplate || '');
  }, [isOpen, state.invoiceTemplate]);

  const handleSave = () => {
    updateInvoiceTemplate(value);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Invoice Template</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Edit the HTML template used for invoice exports. Use placeholders like <code>{'{{client.company}}'}</code>, <code>{'{{client.email}}'}</code>, <code>{'{{invoice.invoiceNumber}}'}</code>, and <code>{'{{lineItems}}'}</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea className="min-h-[360px]" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Template</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Email Draft Preview Modal
interface EmailDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject?: string;
  body?: string;
  to?: string;
}

export function EmailDraftModal({ isOpen, onClose, subject, body, to }: EmailDraftModalProps) {
  const [localBody, setLocalBody] = React.useState(body || '');
  React.useEffect(() => {
    setLocalBody(body || '');
  }, [body]);

  const openMailClient = () => {
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (localBody) params.set('body', localBody);
    const mailto = `mailto:${encodeURIComponent(to || '')}?${params.toString()}`;
    window.location.href = mailto;
    try {
      toast({ title: 'Email draft opened', description: `Opening mail client for ${to}` });
    } catch (e) {}
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Invoice Email Draft</DialogTitle>
          <DialogDescription className="text-muted-foreground">Preview the email the AI generated for this invoice.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <div><strong>To:</strong> {to}</div>
          <div><strong>Subject:</strong> {subject}</div>
          <div>
            <Textarea className="min-h-[240px]" value={localBody} onChange={(e) => setLocalBody(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={openMailClient}>Open Mail Client</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
 

/**
 * Add Client Modal
 */
const clientSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address").optional(),
  company: z.string().min(1, "Company name is required").optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  avatar: z.string().optional(),
  status: z.enum(["active", "inactive", "onboarding", "pending"]),
});

export function AddClientModal({ isOpen, onClose, onSubmit }: ModalProps) {
  const form = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      phone: "",
      website: "",
      avatar: "",
      status: "pending",
    },
  });

  const handleFormSubmit = (values: z.infer<typeof clientSchema>) => {
    onSubmit(values);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Client</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter the details of the new client to add to your workstation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="(123) 456-7890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="avatar"
              render={() => (
                <FormItem>
                  <FormLabel>Avatar (optional)</FormLabel>
                  <FormControl>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          form.setValue('avatar', String(reader.result));
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corp" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">Add Client</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Add Task Modal
 */
const taskSchema = z.object({
  title: z.string().min(2, "Title is required"),
  clientId: z.string().min(1, "Please select a client"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["todo", "in-progress", "review", "completed"]),
  type: z.enum(["admin","design","social","website","shoot","edit","event","invoice","photo","video","web","socials","meeting","email"]).optional(),
  toolLink: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().optional(),
});

export function AddTaskModal({ isOpen, onClose, onSubmit, initialClientId, initialValues }: ModalProps) {
  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      clientId: initialClientId || "",
      priority: "medium",
      status: "todo",
      type: 'admin',
      dueDate: "",
      description: "",
    },
  });

  const { state } = useTRPData();

  useEffect(() => {
    if (isOpen) {
      const init = {
        ...form.getValues(),
        ...initialValues,
      } as Partial<z.infer<typeof taskSchema>>;
      if (initialClientId) init.clientId = initialClientId;
      form.reset(init);
    }
  }, [isOpen, initialClientId, initialValues]);

  const isEditing = Boolean(initialValues && (initialValues as any).id);

  const handleFormSubmit = (values: z.infer<typeof taskSchema>) => {
    onSubmit(values);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] border-border bg-card">
          <DialogHeader>
          <DialogTitle className="text-foreground">{isEditing ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEditing ? 'Update task details.' : 'Assign a new task to a client and set deadlines.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Q1 Content Strategy" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {state.clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="photo">Photo</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="web">Web</SelectItem>
                          <SelectItem value="socials">Socials</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="design">Design</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="shoot">Shoot</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="toolLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tool Link (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://canva.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detailed description of the task..." 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">{isEditing ? 'Save Changes' : 'Create Task'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Retainer Edit Modal
 */
interface RetainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  clientId?: string;
  initialValues?: any;
}

export function RetainerModal({ isOpen, onClose, onSubmit, clientId, initialValues }: RetainerModalProps) {
  const [amount, setAmount] = React.useState((initialValues?.amountCents ? (initialValues.amountCents/100).toFixed(2) : ''));
  const [cadence, setCadence] = React.useState(initialValues?.cadence || 'monthly');
  const [dayOfMonth, setDayOfMonth] = React.useState(initialValues?.dayOfMonth || '');
  const [startDate, setStartDate] = React.useState(initialValues?.startDate || '');
  const [endDate, setEndDate] = React.useState(initialValues?.endDate || '');
  const [notes, setNotes] = React.useState(initialValues?.notes || '');

  React.useEffect(() => {
    if (isOpen) {
      setAmount(initialValues?.amountCents ? (initialValues.amountCents/100).toFixed(2) : '');
      setCadence(initialValues?.cadence || 'monthly');
      setDayOfMonth(initialValues?.dayOfMonth || '');
      setStartDate(initialValues?.startDate || '');
      setEndDate(initialValues?.endDate || '');
      setNotes(initialValues?.notes || '');
    }
  }, [isOpen, initialValues]);

  const handleSave = () => {
    const amt = Number(amount || 0);
    const payload: any = {
      amountCents: Math.round((amt || 0) * 100),
      cadence,
      dayOfMonth: dayOfMonth ? Number(dayOfMonth) : null,
      startDate: startDate || null,
      endDate: endDate || null,
      notes: notes || null,
    };
    onSubmit(payload);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Retainer</DialogTitle>
          <DialogDescription className="text-muted-foreground">Configure recurring retainer for this client.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <div className="grid grid-cols-3 items-center gap-2">
            <div className="col-span-1 text-sm text-muted-foreground">Amount (USD)</div>
            <Input className="col-span-2" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="250.00" />
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            <div className="col-span-1 text-sm text-muted-foreground">Cadence</div>
            <Select onValueChange={(v) => setCadence(v)} defaultValue={cadence}>
              <SelectTrigger className="col-span-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            <div className="col-span-1 text-sm text-muted-foreground">Day of month</div>
            <Input className="col-span-2" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} placeholder="14" />
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            <div className="col-span-1 text-sm text-muted-foreground">Start</div>
            <Input className="col-span-2" type="date" value={startDate || ''} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            <div className="col-span-1 text-sm text-muted-foreground">End</div>
            <Input className="col-span-2" type="date" value={endDate || ''} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Notes</div>
            <Textarea value={notes || ''} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Retainer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Proposal modal shown when a draft suggests a retainer
interface RetainerProposalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  terms?: any;
  confidence?: string;
  onApply?: () => void;
  onEdit?: () => void;
  onKeepNote?: () => void;
}

export function RetainerProposalModal({ open, onOpenChange, terms, confidence, onApply, onEdit, onKeepNote }: RetainerProposalProps) {
  if (!terms) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => { if (onOpenChange) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[520px] border-border bg-card">
        <DialogHeader>
          <DialogTitle>Proposed Retainer</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-3">
          <div className="text-sm text-muted-foreground">Suggested: <strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((terms.amountCents||0)/100)}</strong></div>
          <div className="text-sm text-muted-foreground">Cadence: {terms.cadence || 'monthly'}</div>
          <div className="text-sm text-muted-foreground">Day of month: {terms.dayOfMonth || '—'}</div>
          <div className="text-xs text-muted-foreground">Confidence: {confidence || terms.confidence || 'unknown'}</div>
          {terms.notes && <div className="text-xs text-muted-foreground">Notes: {terms.notes}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { if (onKeepNote) onKeepNote(); if (onOpenChange) onOpenChange(false); }}>Keep as Note</Button>
          <Button variant="ghost" onClick={() => { if (onEdit) onEdit(); if (onOpenChange) onOpenChange(false); }}>Edit</Button>
          <Button onClick={() => { if (onApply) onApply(); if (onOpenChange) onOpenChange(false); }}>Apply Retainer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Content Creator Modal
 */
const contentSchema = z.object({
  title: z.string().min(2, "Title is required"),
  type: z.enum(["social", "blog", "video", "email", "ad"]),
  clientName: z.string().min(1, "Client name is required"),
  publishDate: z.string().min(1, "Publish date is required"),
  description: z.string().optional(),
});

export function ContentCreatorModal({ isOpen, onClose, onSubmit }: ModalProps) {
  const form = useForm<z.infer<typeof contentSchema>>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      title: "",
      type: "social",
      clientName: "",
      publishDate: "",
      description: "",
    },
  });

  const handleFormSubmit = (values: z.infer<typeof contentSchema>) => {
    onSubmit(values);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Plan New Content</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Draft ideas and schedule content across all platforms.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Summer Launch Instagram Reel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="social">Social Media</SelectItem>
                        <SelectItem value="blog">Blog Post</SelectItem>
                        <SelectItem value="video">Video / Reel</SelectItem>
                        <SelectItem value="email">Email Newsletter</SelectItem>
                        <SelectItem value="ad">Paid Advertisement</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Client Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="publishDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content Outline / Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Key talking points, hashtags, or copy drafts..." 
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Discard Draft</Button>
              <Button type="submit" className="bg-accent text-accent-foreground hover:bg-accent/90">Schedule Content</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


// -------- Added for TRP Workstation functional wiring --------

const activitySchema = z.object({
  clientId: z.string().optional(),
  type: z.enum(["post","outreach","delivery","dropoff","meeting","misc"]).default("misc"),
  platform: z.string().optional(),
  notes: z.string().min(1, "Notes are required"),
  link: z.string().optional(),
});

export function LogActivityModal({ isOpen, onClose, onSubmit }: ModalProps) {
  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: { type: "misc", notes: "" },
  });

  const handleFormSubmit = (values: z.infer<typeof activitySchema>) => {
    onSubmit(values);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Log Activity</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Record a marketing action, meeting, delivery, or post.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client ID (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Paste client id or leave blank" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select activity type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="post">Post</SelectItem>
                        <SelectItem value="outreach">Outreach</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
                        <SelectItem value="dropoff">Dropoff</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="misc">Misc</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Facebook, Instagram, TikTok..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What happened? What did you post/do?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit">Save Activity</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const shootSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  dueDate: z.string().optional(),
  goal: z.enum(["awareness","promo","testimonial","ad","recap","product","interview"]).default("promo"),
  platforms: z.string().optional(),
});

export function ScheduleShootModal({ isOpen, onClose, onSubmit }: ModalProps) {
  const form = useForm<z.infer<typeof shootSchema>>({
    resolver: zodResolver(shootSchema),
    defaultValues: { clientId: '', goal: "promo", platforms: "Facebook, Instagram" },
  });

  const handleFormSubmit = (values: z.infer<typeof shootSchema>) => {
    // Synthesize a task-like payload so callers can forward directly to addTask
    const platformLabel = values.platforms ? ` - ${String(values.platforms).split(',')[0].trim()}` : '';
    const title = `Shoot — ${values.goal}${platformLabel}`;
    const payload: any = {
      title,
      clientId: values.clientId || '',
      clientName: undefined,
      dueDate: values.dueDate || '',
      priority: 'high',
      status: 'todo',
      type: 'shoot',
      description: `Goal: ${values.goal}${values.platforms ? `; Platforms: ${values.platforms}` : ''}`,
      createdAt: new Date().toISOString(),
    };
    onSubmit(payload);
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Schedule Shoot</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a shoot task and kick off a simple shoot plan.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Paste client id (from Clients page)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shoot Date (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select goal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="awareness">Awareness</SelectItem>
                        <SelectItem value="promo">Promo</SelectItem>
                        <SelectItem value="testimonial">Testimonial</SelectItem>
                        <SelectItem value="ad">Ad</SelectItem>
                        <SelectItem value="recap">Event Recap</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="interview">Interview</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="platforms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platforms</FormLabel>
                  <FormControl>
                    <Input placeholder="Facebook, Instagram, TikTok..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="submit">Create Shoot Task</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const invoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  paymentType: z.enum(["single", "hourly"]).default("single"),
  amount: z.coerce.number().min(0).optional(),
  description: z.string().min(1, "Line item description required"),
  qty: z.coerce.number().min(1).default(1),
  rate: z.coerce.number().min(0).default(0),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
});

export function CreateInvoiceModal({ isOpen, onClose, onSubmit, initialClientId, initialValues }: ModalProps) {
  const { state } = useTRPData();
  const form = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { clientId: initialClientId || "", paymentType: "single", amount: 0, qty: 1, rate: 0, description: "", dueDate: new Date().toISOString().slice(0,10) },
  });

  useEffect(() => {
    if (isOpen) {
      const base = { ...form.getValues(), clientId: initialClientId || form.getValues().clientId } as any;
      if (initialValues) {
        base.clientId = initialValues.clientId || base.clientId;
        base.dueDate = initialValues.dueDate || base.dueDate;
        base.notes = initialValues.notes || base.notes;
        const li = initialValues.lineItems?.[0];
        if (li) {
          base.description = li.description || '';
          base.qty = li.qty || 1;
          // Convert stored cents to dollars for form inputs
          base.rate = li.rate ? (li.rate / 100) : 0;
          base.amount = (li.qty && li.rate) ? ((li.qty * li.rate) / 100) : (li.rate ? (li.rate / 100) : base.amount);
          base.paymentType = (li.qty && li.rate) ? 'hourly' : 'single';
        }
      }
      form.reset(base);
    }
  }, [isOpen, initialClientId, initialValues]);

  const isEditing = Boolean(initialValues && (initialValues as any).id);

  const handleFormSubmit = (values: z.infer<typeof invoiceSchema>) => {
    // Always use initialClientId if present
    const clientId = initialClientId || values.clientId;
    const { paymentType, amount, description, qty, rate, dueDate, notes } = values as any;

    // form submission

    let lineItem: any;
    if (paymentType === 'single') {
      // amount entered as dollars -> convert to cents
      const cents = Math.round(Number(amount || 0) * 100);
      lineItem = { id: `li_${Date.now()}`, description, qty: 1, rate: cents };
    } else {
      // rate entered as dollars -> convert to cents
      const cents = Math.round(Number(rate || 0) * 100);
      lineItem = { id: `li_${Date.now()}`, description, qty: Number(qty || 1), rate: cents };
    }

    const payload: any = { clientId, dueDate, notes, lineItems: [lineItem] };
    if (isEditing) payload.id = (initialValues as any).id;

    if (typeof onSubmit === 'function') {
      try {
        onSubmit(payload);
      } catch (e) {
        console.error('[CreateInvoiceModal] onSubmit threw', e);
      }
    }

    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[620px] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create Invoice</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Generate a basic invoice record (PDF export can be added later).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            {!initialClientId && (
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {state.clients.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="paymentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Type</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="single">Single Amount</SelectItem>
                        <SelectItem value="hourly">Hourly (qty × rate)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Line Item</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Monthly retainer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (single)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="qty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qty (hourly)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate (hourly)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any notes..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
              <Button type="button" onClick={() => form.handleSubmit(handleFormSubmit)()}>{isEditing ? 'Save Invoice' : 'Save Invoice'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

