import React, { useMemo, useState } from 'react'

type Props = {
  /** Array of text snippets to analyze (memos, notes) */
  texts: string[]
  /** perform analysis on combined text and return a summary */
  analyze: (input: string) => Promise<string>
  /** optional save callback to persist the produced summary */
  onSave?: (summary: string) => Promise<void> | void
  label?: string
}

export default function ApplyAnalysis({ texts, analyze, onSave, label = 'Apply Analysis' }: Props) {
  const combined = useMemo(() => texts.filter(Boolean).join('\n---\n'), [texts])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function runAnalysis() {
    setError(null)
    setLoading(true)
    try {
      const result = await analyze(combined)
      setSummary(result || '')
    } catch (err: any) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!onSave) return
    try {
      await onSave(summary)
    } catch (err) {
      // swallow — caller may show UI
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="flex gap-2">
        <button className="btn" onClick={runAnalysis} disabled={loading || !combined}>
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
        <button className="btn" onClick={save} disabled={!summary || !onSave}>
          Save Summary
        </button>
      </div>

      {error ? <div className="text-red-600">Error: {error}</div> : null}

      <div>
        <label className="block text-xs font-medium text-gray-600">Combined Text</label>
        <textarea readOnly value={combined} className="w-full h-28 mt-1 p-2 rounded border" />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600">Summary</label>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="w-full h-28 mt-1 p-2 rounded border" />
      </div>
    </div>
  )
}
