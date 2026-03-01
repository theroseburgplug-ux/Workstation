export function overallStrategyPrompt(memos: string) {
  return `You are an assistant that reads recent voice memo strategy notes and produces a high-level Strategy Overview for the business.

Respond with a single JSON object only (no markdown) with the following shape:
{
  "themes": ["short theme sentences"],
  "priority_opportunities": ["3 short opportunities"],
  "recommended_next_steps": ["5 actionable next steps, each 1-2 sentences"],
  "notes": "freeform notes or clarifications"
}

Use the following memos as input. If any field is unknown, provide an empty array or empty string. Be concise.

Memos:\n\n${memos}`;
}

export function entityAnalysisPrompt(entityName: string, texts: string) {
  return `Analyze memos mentioning ${entityName}. Respond with a single JSON object only (no markdown) with this shape:
{
  "summary": "one-paragraph strategic summary",
  "key_people": ["names and roles"],
  "suggested_next_actions": ["3 short actionable steps"],
  "risks": ["short risk statements"],
  "source_memos": [{"id":"memo id if known","excerpt":"short excerpt"}]
}

Provide concise answers and include any citations to source memos in "source_memos". Use the following texts as input:\n\n${texts}`;
}

export default { overallStrategyPrompt, entityAnalysisPrompt };
