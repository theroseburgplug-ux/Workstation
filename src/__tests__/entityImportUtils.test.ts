import { describe, it, expect } from 'vitest';
import { buildEntityFromExtracted } from '@/lib/entityImportUtils';

function makeIdStub(prefix = 'ent') { return `TEST_${prefix}_1`; }

describe('buildEntityFromExtracted', () => {
	it('builds entity with memo provenance and aliases', () => {
		const memo = { id: 'm1', title: 'Meeting with Alpha', transcription: { text: 'Discussion about partnership and budgets.' }, extracted: { strategy: 'Focus on partnership with Alpha for Q2.' } };
		const raw = { name: 'Alice Example', type: 'person', aliases: ['A. Example', 'Alice'], notes: 'Key decision maker' };

		const ent = buildEntityFromExtracted(memo as any, raw as any, makeIdStub);

		expect(ent.id).toBe('TEST_ent_1');
		expect(ent.name).toBe('Alice Example');
		expect(ent.type).toBe('person');
		expect(Array.isArray(ent.aliases)).toBe(true);
		expect(ent.aliases.length).toBe(2);
		expect(ent.exampleMemoIds).toContain('m1');
		expect(ent.notes).toContain('From memo "Meeting with Alpha":');
	});
});
