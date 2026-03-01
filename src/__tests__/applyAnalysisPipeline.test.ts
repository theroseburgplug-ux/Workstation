import { describe, it, expect } from 'vitest';
import { applyAnalysis } from '@/lib/voiceMemoPipeline';

describe('applyAnalysis', () => {
  it('creates tasks, draft events, and paymentTerms from analysis', async () => {
    const memo = {
      id: 'vm_test_1',
      title: 'Test Memo for Events',
      createdAt: new Date().toISOString(),
      clientId: 'client_1',
      clientName: 'Client One',
      transcription: { status: 'done', text: 'We should schedule the BBQ on June 14th and coordinate vendors.' },
      analysis: { status: 'done', data: {
        summary: 'Discussed BBQ event logistics and sponsorship.',
        dates_and_deadlines: [ { context: 'Plan meeting', date: '2026-06-14' } ],
        action_items: [ { task: 'Contact vendors', owner: 'Me', priority: 'high' } ],
        billing_terms: { retainer_amount: 250, cadence: 'monthly', day_of_month: 14, due_rule_text: 'on the 14th of every month', confidence: 'high' }
      } }
    } as any;

    const addedActivities: any[] = [];
    const addedTasks: any[] = [];
    const updates: any[] = [];

    const hooks = {
      addActivity: (a:any) => { addedActivities.push(a); return { id: 'act_1', ...a }; },
      addTask: (t:any) => { const created = { id: 't_' + (addedTasks.length+1), ...t }; addedTasks.push(created); return created; },
      updateVoiceMemo: (id:string, patch:any) => { updates.push({ id, patch }); }
    };

    const res = await applyAnalysis(memo, hooks as any);

    expect(res).toBeTruthy();
    expect(Array.isArray(res.createdTaskIds)).toBe(true);
    expect(res.createdTaskIds.length).toBe(1);
    expect(Array.isArray(res.draftEvents)).toBe(true);
    expect(res.draftEvents.length).toBe(1);
    expect(res.paymentTerms).toBeDefined();
    expect(res.paymentTerms.amountDollars).toBe(250);
  });
});
