export type RawMemo = { id: string; title?: string; transcription?: { text?: string }; extracted?: { strategy?: string } };
export type RawExtractedEntity = { name?: string; type?: string; aliases?: string[]; notes?: string; linkedClientId?: string };

export function defaultMakeId(prefix = 'ent') {
  return `${prefix}_${Math.random().toString(36).slice(2,8)}_${Date.now()}`;
}

export function buildEntityFromExtracted(memo: RawMemo, e: RawExtractedEntity, makeIdFn: (p?:string)=>string = defaultMakeId) {
  const rawName = (e.name || '').trim();
  if (!rawName) throw new Error('Entity must have a name');
  const memoExcerpt = (memo.extracted?.strategy && String(memo.extracted.strategy).trim()) || (memo.transcription?.text && String(memo.transcription.text).slice(0,400)) || '';
  const notesParts: string[] = [];
  if (memoExcerpt) notesParts.push(`From memo "${memo.title || memo.id}": ${memoExcerpt}`);
  if (e.notes) notesParts.push(String(e.notes));

  return {
    id: makeIdFn('ent'),
    type: (e.type as any) || 'person',
    name: rawName,
    aliases: (e.aliases || []).map(a => (a||'').trim()).filter(Boolean),
    notes: notesParts.join('\n').trim(),
    linkedClientId: e.linkedClientId || undefined,
    createdFromMemoIds: [memo.id],
    exampleMemoIds: [memo.id],
    links: [],
    createdAt: new Date().toISOString(),
  };
}

export default { buildEntityFromExtracted, defaultMakeId };
