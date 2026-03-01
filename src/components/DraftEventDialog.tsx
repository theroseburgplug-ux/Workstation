import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export type DraftDialogMode = 'view' | 'edit' | 'confirm';

export interface DraftDialogProps {
  open: boolean;
  mode?: DraftDialogMode;
  draft: any; // DraftEvent
  onOpenChange?: (open: boolean) => void;
  onSave?: (updated: any) => void; // save changes (keeps draft)
  onConfirm?: (updated: any) => void; // confirm (creates event + confirms)
  onCancel?: () => void;
  onDismiss?: () => void;
}

export default function DraftEventDialog({ open, mode = 'edit', draft, onOpenChange, onSave, onConfirm, onCancel, onDismiss }: DraftDialogProps) {
  const [local, setLocal] = useState<any>({ title: '', whenText: '', date: null, context: '' });

  useEffect(() => {
    if (draft) setLocal({ title: draft.title || '', whenText: draft.whenText || draft.whenText || draft.context || '', date: draft.date ?? null, context: draft.context || '' });
  }, [draft]);

  if (!draft) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (onOpenChange) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{mode === 'confirm' ? 'Confirm Draft Event' : mode === 'view' ? 'View Draft Event' : 'Edit Draft Event'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={local.title} onChange={(e) => setLocal({ ...local, title: e.target.value })} />
          </div>
          <div>
            <Label>When (text)</Label>
            <Input value={local.whenText} onChange={(e) => setLocal({ ...local, whenText: e.target.value })} />
          </div>
          <div>
            <Label>Date (optional)</Label>
            <Input type="date" value={local.date || ''} onChange={(e) => setLocal({ ...local, date: e.target.value || null })} />
          </div>
          <div>
            <Label>Notes / Context</Label>
            <Textarea value={local.context} onChange={(e) => setLocal({ ...local, context: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { if (onDismiss) onDismiss(); }} className="text-sm">Dismiss</Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { if (onCancel) onCancel(); }}>{mode === 'view' ? 'Close' : 'Cancel'}</Button>
              <Button onClick={() => { if (onSave) onSave({ ...draft, title: local.title, whenText: local.whenText, date: local.date, context: local.context, updatedAt: new Date().toISOString() }); }}>{mode === 'confirm' ? 'Save' : 'Save'}</Button>
              {mode !== 'view' && <Button className="ml-2" onClick={() => { if (onConfirm) onConfirm({ ...draft, title: local.title, whenText: local.whenText, date: local.date, context: local.context, updatedAt: new Date().toISOString() }); }}>{mode === 'confirm' ? 'Confirm' : 'Confirm'}</Button>}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
