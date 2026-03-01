Retainer QA Checklist

Prereqs
- Run locally: `npm install` then `npm run dev` and `npx tsc --noEmit`.

Quick test commands
- Start dev server: `npm run dev`
- Open the app and navigate to a client workspace and the Finances page.

Scenarios

1) Parse & Proposal from Draft Event
- Create a voice memo (or simulate by creating a voiceMemo in localStorage/state) containing text: "We charge $250 on the 14th of every month for a 12 month retainer."
- Run analysis/apply (or click the Apply/Analyze button in voice UI).
- Confirm a draft event extracted for the date appears under Client Workspace -> Draft Events.
- Click Confirm on the draft. Expected: a Retainer Proposal modal appears with amount $250, cadence monthly, dayOfMonth 14, term 12 months, confidence medium.
- Choose "Apply Retainer". Expected: Client `billing.retainer` is set with `sourceMemoId` and `sourceMemoTitle`, and a reminder task created only if you choose Create Reminder.
- Verify: Finances page shows MRR that includes $250/mo and 12-month projection reflects $250*12.

2) Edit Retainer
- In Client Workspace -> Payments, click Edit Retainer to open the Retainer modal.
- Change cadence, amount, day, start/end dates, save. Expected: client.billing.retainer updates and Finances MRR recalculates.

3) Unapply Safety
- From Client Workspace, click Unapply on the retainer (visible when `sourceMemoId` present). Expected: `unapplyVoiceMemo` removes only items created by that memo (tasks/events/activities) and clears retainer only if `retainer.sourceMemoId === memoId`.
- Verify other tasks/invoices remain.

4) Keep as Note
- When proposal appears, select "Keep as Note". Expected: draft is confirmed and event created but `client.billing.retainer` NOT set.

5) Confirm with High Confidence Auto-apply
- If analysis returns `confidence: 'high'`, confirming a draft should auto-apply the retainer without prompting. Expected: client.retainer set and memo.extracted.appliedAt populated.

6) Reminders
- Use "Create Reminder" in Client Workspace Payments or Finances Active Retainers to create a task with tag `retainer_reminder`. Expected: task due date equals retainer.nextDueDate if set.

7) Edge Cases
- If memo suggests an amount without cadence, proposal should not auto-apply — instead prompt user to edit.
- If a different memo created a retainer, Unapply should not remove it.

Validation checks (inspect state)
- Open DevTools and inspect `localStorage` key `trp-workstation-data-v1` to confirm `clients[].billing.retainer` includes: `amountCents`, `cadence`, `dayOfMonth`, `nextDueDate`, `sourceMemoId`, `sourceMemoTitle`, `updatedAt`.
- Check `state.voiceMemos[].extracted.paymentTerms` contains parsed `termMonths` when phrase like "for 12 months" used.

If you run into TypeScript or bundler errors, paste the full error output here and I'll patch the code. If everything passes, tell me and I'll close out remaining minor polish tasks.
