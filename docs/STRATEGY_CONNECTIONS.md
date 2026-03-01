# Strategy & Connections — Overview

This document describes the Strategy & Connections features added to the TRP Workstation app and how to use / test them.

Summary of features
- Global `state.entities` index of extracted entities (people, organizations, events, topics).
- Import entities from voice memos (`Import Entities from Memos`).
- Strategy page: list entities, view details, link/merge entities, create clients from entities.
- Mapping modal to map memo-extracted entities to clients or create placeholder clients.
- Entity merge modal to manually dedupe and merge records.
- Connections graph (SVG) with force-simulation fallback (no external `d3-force` required).
  - Node coloring by type, radius by degree, tooltips, hover neighbor highlighting, drag-to-position, physics presets, stabilize button.
- Export / Import Graph (JSON) with merge logic (entities are matched by name; links are re-created on import).
- AI actions: per-entity `AI Analyze` and global `AI Overview` using `useOpenAI`.

Files of interest
- `src/pages/StrategyConnections.tsx` — primary UI and controls.
- `src/components/ConnectionsGraph.tsx` — graph rendering and simulation.
- `src/lib/trpData.ts` — entity data helpers: `addEntity`, `findEntityByName`, `linkEntities`, `mergeEntities`, `createClientFromEntity`, `importAllMemoEntities`, etc.
- `src/components/EntityMappingModal.tsx`, `EntityMergeModal.tsx` — mapping and merge flows.
- `src/hooks/useOpenAI.ts` — AI integration helper (worker proxy). Ensure API key is set in user settings.

How to run locally
1. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

2. Open the app and navigate to the "Strategy & Connections" page.

Notes and testing tips
- Importing: use `Import Entities from Memos` to populate `state.entities` from existing memos. Export/Import works with a JSON file that includes `entities` and `voiceMemos`.
- Mapping: open an entity and use the mapping modal to link to an existing client or create a new one.
- Merge: select multiple entities (checkboxes) and use the Merge Selected flow.
- Graph tuning: use the panel above the graph to adjust `Repel`, `Spring`, `Link Dist`, `Damping`, or choose presets. Click `Stabilize Layout` to run extra iterations.
- AI: set your API key in Settings (user settings localStorage). `AI Analyze` summarizes memos for the selected entity; `AI Overview` summarizes recent memos across the workspace.

Known limitations & next steps
- Performance: the JS simulation is a lightweight fallback. For very large graphs consider using `d3-force` or a WebWorker offload.
- Search: entity search is currently in-memory and exact/substring-based; consider a fuzzy index for better matching.
- Tests & docs: more unit/integration tests and docs should be added for critical flows (import/merge, mapping, AI prompts).

If you want, I can:
- Add unit tests for `trpData` entity helpers, or
- Add a demo fixture (sample JSON) and automated import test, or
- Integrate `d3-force` for a production-grade simulation (requires dependency install).

