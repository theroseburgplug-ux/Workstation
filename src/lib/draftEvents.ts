import type { VoiceMemo, DraftEvent } from './trpData';

export function getAllDraftEvents(voiceMemos: VoiceMemo[] | undefined) {
  const list: Array<{ draft: DraftEvent; sourceMemoId: string; clientId?: string; clientName?: string }> = [];
  if (!voiceMemos) return list;
  for (const m of voiceMemos) {
    const drafts = m.extracted?.draftEvents || [];
    for (const d of drafts) {
      list.push({ draft: d, sourceMemoId: m.id, clientId: m.clientId, clientName: m.clientName });
    }
  }
  // sort by createdAt desc
  return list.sort((a,b) => new Date(b.draft.createdAt).getTime() - new Date(a.draft.createdAt).getTime());
}

export function getDraftEventsForClient(clientId: string, voiceMemos: VoiceMemo[] | undefined) {
  return getAllDraftEvents(voiceMemos).filter(x => String(x.clientId) === String(clientId));
}
