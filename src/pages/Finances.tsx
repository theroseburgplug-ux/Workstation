import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RevenueChart } from '@/components/Charts';
import { useTRPData } from '@/lib/trpData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { StatCard as DummyStat } from './Dashboard';
import ClientLabel from '@/components/ClientLabel';

export default function Finances() {
  const { state, addTask, setClientRetainer, computeRetainerStatus } = useTRPData();
  const invoices = state.invoices || [];
  const clients = state.clients || [];

  const totalRevenue = useMemo(() => invoices.reduce((acc, inv) => acc + (inv.total || 0), 0), [invoices]);

  const revenueByMonth = useMemo(() => {
    const map = new Map<string, number>();
    invoices.forEach(inv => {
      const d = new Date(inv.createdAt || inv.dueDate || Date.now());
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      map.set(key, (map.get(key) || 0) + (inv.total || 0));
    });
    // convert to sorted array
    return Array.from(map.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([k,v]) => ({ name: k, value: v }));
  }, [invoices]);

  const retainers = clients.map(c => (c.billing && c.billing.retainer) ? (c.billing.retainer as any) : null).filter(Boolean);
  // helper: convert cadence + amount to a monthly cents amount
  const monthlyFrom = (r: any) => {
    const amt = r?.amountCents || 0;
    const cadence = (r?.cadence || 'monthly') as string;
    if (cadence === 'monthly') return amt;
    if (cadence === 'weekly') return Math.round(amt * 52 / 12);
    if (cadence === 'quarterly') return Math.round(amt / 3);
    if (cadence === 'annually' || cadence === 'yearly') return Math.round(amt / 12);
    return amt;
  };

  // determine if a retainer has a billing occurrence in the given month
  // Treat `endDate` as exclusive: a retainer with endDate 2026-05-14 will NOT include a 2026-05-14 occurrence
  const isActiveDuringMonth = (r: any, year: number, monthZeroBased: number) => {
    const start = r.startDate ? new Date(r.startDate) : (r.nextDueDate ? new Date(r.nextDueDate) : new Date('1970-01-01'));
    const endExclusive = r.endDate ? new Date(r.endDate) : (r.termMonths ? (() => { const s = start; return new Date(s.getFullYear(), s.getMonth() + (r.termMonths || 0), s.getDate()); })() : null);
    // determine dayOfMonth for billing occurrences
    const day = r.dayOfMonth ? Number(r.dayOfMonth) : (start.getDate() || 1);
    // build the occurrence date for this month
    let occ: Date;
    try {
      occ = new Date(year, monthZeroBased, day);
    } catch (e) {
      occ = new Date(year, monthZeroBased, 1);
    }
    // cadence support (only monthly currently influences day-of-month); other cadences approximate by monthlyFrom
    // occurrence must be >= start (inclusive) and < endExclusive (exclusive) if endExclusive provided
    if (occ.getTime() < start.getTime()) return false;
    if (endExclusive && occ.getTime() >= endExclusive.getTime()) return false;
    return true;
  };

  const today = new Date();
  // MRR: sum monthly amounts for retainers that have an occurrence this month (treating endDate as exclusive)
  const mrrCents = retainers.reduce((acc:any, r:any) => {
    const monthly = monthlyFrom(r);
    const occThisMonth = isActiveDuringMonth(r, today.getFullYear(), today.getMonth());
    return acc + (occThisMonth ? monthly : 0);
  }, 0);

  // 12-month projection: sum monthly amounts only for months where each retainer is active
  let projection12Cents = 0;
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const monthTotal = retainers.reduce((acc:any, r:any) => acc + (isActiveDuringMonth(r, y, m) ? monthlyFrom(r) : 0), 0);
    projection12Cents += monthTotal;
  }

  return (
    <motion.div className="space-y-6 p-6 lg:p-10" initial="hidden" animate="visible" variants={staggerContainer}>
      <div>
        <h1 className="text-3xl font-bold">Finances</h1>
        <p className="text-muted-foreground mt-1">Revenue and invoices overview.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
            <CardDescription>All invoices total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${(totalRevenue/100).toLocaleString()}</div>
            <div className="text-sm text-muted-foreground mt-2">{invoices.length} invoices across {clients.length} clients</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>MRR</CardTitle>
            <CardDescription>Monthly Recurring Revenue (from active retainers)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(mrrCents/100)}</div>
            <div className="text-sm text-muted-foreground mt-2">12-mo projection: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(projection12Cents/100)}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue (by month)</CardTitle>
            <CardDescription>Recent months</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <RevenueChart data={revenueByMonth.map(r => ({ name: r.name, value: r.value/100 }))} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Recent invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-sm text-muted-foreground">No invoices yet.</div>
          ) : (
            <ul className="space-y-2">
              {invoices.slice(0,20).map(inv => (
                <li key={inv.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium flex items-center gap-2">{inv.invoiceNumber} — <ClientLabel clientId={inv.clientId} clientName={inv.clientName} /></div>
                    <div className="text-xs text-muted-foreground">{inv.createdAt?.slice(0,10)} • {inv.status}</div>
                  </div>
                  <div className="font-medium">${(inv.total/100).toFixed(2)}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Active Retainers</CardTitle>
          <CardDescription>Clients with recurring retainers</CardDescription>
        </CardHeader>
        <CardContent>
          {clients.filter(c => c.billing && c.billing.retainer).length === 0 ? (
            <div className="text-sm text-muted-foreground">No active retainers.</div>
          ) : (
            <div className="space-y-2">
              {clients.filter(c => c.billing && c.billing.retainer).map(c => {
                const r = (c.billing as any).retainer || {};
                return (
                  <div key={c.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium flex items-center gap-2"><ClientLabel clientId={c.id} clientName={c.name} /></div>
                      <div className="text-xs text-muted-foreground">{r.cadence || 'monthly'} — {r.dayOfMonth ? `day ${r.dayOfMonth}` : 'day —'} • Next: {r.nextDueDate || '—'}</div>
                              <div className="text-xs text-muted-foreground">End: {r.endDate || (r.termMonths ? (() => {
                                const base = r.startDate || r.nextDueDate || null;
                                if (!base) return '—';
                                const b = new Date(base);
                                const end = new Date(b.getFullYear(), b.getMonth() + (r.termMonths || 0) - 1, b.getDate());
                                return end.toISOString().slice(0,10);
                              })() : '—')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div className="font-mono">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((r.amountCents||0)/100)}</div>
                        {(() => {
                          try {
                            const s = computeRetainerStatus(c.id) || {};
                            if (s.status === 'paid') return <Badge variant="secondary">Paid</Badge>;
                            if (s.status === 'late') return <Badge variant="destructive">Late {s.daysLate ? `${s.daysLate}d` : ''}</Badge>;
                            if (s.status === 'not_started') return <Badge variant="outline">Not started</Badge>;
                            return <Badge variant="outline">Unknown</Badge>;
                          } catch (e) { return null; }
                        })()}
                      </div>
                      <Button size="sm" onClick={() => { window.location.href = `/clients/${c.id}`; }}>Open</Button>
                      <Button size="sm" onClick={() => {
                        const existingId = r.reminderTaskId;
                        const exists = existingId ? state.tasks.find((t:any) => t.id === existingId) : undefined;
                        if (exists) return;
                        const title = `Retainer reminder — ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((r.amountCents||0)/100)}`;
                        const task = addTask({ title, clientId: c.id, clientName: c.name, status: 'todo', tags: ['retainer_reminder'], dueDate: r.nextDueDate || undefined });
                        setClientRetainer(c.id, { ...(r || {}), reminderTaskId: task.id, updatedAt: new Date().toISOString() });
                      }}>Create Reminder</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
