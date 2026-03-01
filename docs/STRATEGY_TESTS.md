# Strategy & Connections — Test Plan

Purpose
- Provide a minimal set of tests and instructions to validate the `state.entities` helpers in `src/lib/trpData.ts`.

Goals
- Verify `addEntity`, `findEntityByName`, `linkEntities`, `mergeEntities`, and `createClientFromEntity` behave as expected.
- Provide a runnable developer path to add a test runner (Vitest recommended).

Local setup (recommended)
1. Install dependencies locally:

```bash
npm install
# optional: install vitest for test runner
npm install -D vitest @types/jest ts-node
```

2. Add a test script to `package.json`:

```json
"scripts": {
  "test": "vitest"
}
```

Test cases (suggested)
- addEntity: creates an entity and returns its id; subsequent findEntityByName returns it.
- findEntityByName: case-insensitive match and ignores punctuation.
- linkEntities: creates a bidirectional link object and stores it in state.
- mergeEntities: merges aliases/notes/links from `source` into `target`, removes `source`.
- createClientFromEntity: creates a minimal client and sets `linkedClientId` on entity.

- ApplyAnalysis: verify the analysis flow. Suggested checks:
  - Given an array of memo texts, `ApplyAnalysis` should combine them into a single input string.
  - The provided `analyze` function should be invoked with the combined text.
  - When `analyze` resolves, the component should populate the `Summary` field.
  - The `onSave` callback should receive the produced summary when `Save Summary` is clicked.

Stub test file
- `src/__tests__/trpData.test.ts` — simple, framework-agnostic assertions provided as a starting point.

Next steps I can do for you
- Add real runnable tests wired to `vitest` and update `package.json`.
- Implement an automated import test fixture and an integration test for export/import.

If you want me to add actual runnable tests now, tell me which test runner you prefer (`vitest` recommended) and I'll update `package.json` and add tests accordingly.
