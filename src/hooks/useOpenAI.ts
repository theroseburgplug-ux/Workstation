import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { UserSettings } from '@/lib/index';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Custom hook for interacting with OpenAI API via Cloudflare Worker proxy or direct connection.
 * Handles chat state, connection testing, and system prompting for the TRP Workstation.
 */
export function useOpenAI() {
  const [settings] = useLocalStorage<UserSettings>('trp-user-settings', {
    theme: 'dark',
    apiKey: '',
    aiModel: 'gpt-4o',
    notificationsEnabled: true,
    autoTranscribe: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isToolRunning, setIsToolRunning] = useState<boolean>(false);
  const [messages, setMessages] = useLocalStorage<Message[]>('trp-ai-messages', []);

  const testConnection = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (settings.apiKey) headers['X-OpenAI-Key'] = settings.apiKey;

      const response = await fetch('https://trp-openai-proxy.theroseburgplug.workers.dev/', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: settings.aiModel || 'gpt-5-nano',
          messages: [{ role: 'user', content: 'ping' }],
          max_completion_tokens: 32,
        }),
      });

      if (response.ok) {
        setIsConnected(true);
        return true;
      }

      const data = await response.json().catch(() => ({}));
      setError(data?.error || data?.message || 'Authentication failed');
      setIsConnected(false);
      return false;
    } catch (err) {
      setError('Network error: Unable to connect to AI services');
      setIsConnected(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [settings.apiKey, settings.aiModel]);

  const sendMessage = useCallback(async (content: string) => {
    setIsLoading(true);
    setError(null);

    // Optimistic UI update
    const nextMessages: Message[] = [
      ...messages,
      { role: 'user', content },
    ];

    // Ensure system instruction for function calling is present so model uses functions
    const systemInstruction: Message = {
      role: 'system',
      content: 'You are TRP Workstation assistant. For any request that modifies workstation data (clients/tasks), use the provided function tools: "manage_client" and "manage_task" with appropriate JSON arguments. Return function calls instead of plain text when performing such actions. For searches use the "search_web" tool. For gpt-5-nano, use temperature=1.'
    };

    // Build payload messages and avoid duplicating system message if already present
    const payloadMessages: Message[] = nextMessages.some(m => m.role === 'system')
      ? nextMessages
      : [systemInstruction, ...nextMessages];

    // Keep stored message history bounded to avoid unbounded localStorage growth
    const HIST_MAX = 200;
    setMessages(nextMessages.slice(-HIST_MAX));

    // Prepare a safe, truncated message list to send to the proxy to avoid TPM/token overages
    const MAX_MESSAGES = 8; // includes system message when present
    const MAX_CONTENT_CHARS = 3000; // per-message char cap (approx tokens)

    // Preserve system instruction (if present) and take the last (MAX_MESSAGES-1) user/assistant messages
    let messagesToSend: Message[];
    const systemMsg = payloadMessages.find(m => m.role === 'system');
    const others = payloadMessages.filter(m => m.role !== 'system');
    if (systemMsg) {
      const tail = others.slice(-Math.max(0, MAX_MESSAGES - 1));
      messagesToSend = [systemMsg, ...tail];
    } else {
      messagesToSend = payloadMessages.slice(-MAX_MESSAGES);
    }

    // Truncate long message contents to keep request size reasonable (keep tail of text)
    const safeMessages = messagesToSend.map(m => {
      const content = m.content || '';
      if (content.length > MAX_CONTENT_CHARS) {
        // keep the most recent text
        return { ...m, content: content.slice(-MAX_CONTENT_CHARS) };
      }
      return m;
    });

    // Helper to format DuckDuckGo Instant Answer API response into readable items
    const formatDuckDuckGo = (dd: any) => {
      if (!dd) return '';
      const items: Array<{ title: string; text: string; url?: string }> = [];
      if (dd.AbstractText && dd.AbstractText.trim()) {
        items.push({ title: 'Instant Answer', text: dd.AbstractText.trim(), url: dd.AbstractURL || '' });
      }
      if (Array.isArray(dd.Results) && dd.Results.length) {
        dd.Results.slice(0, 5).forEach((r: any) => {
          items.push({ title: r.Heading || (r.Text || r.Result || '').slice(0, 80), text: (r.Text || r.Result || '').trim(), url: r.FirstURL || r.FirstURL || '' });
        });
      }
      if (Array.isArray(dd.RelatedTopics) && dd.RelatedTopics.length) {
        // RelatedTopics may be nested with Topics arrays
        const gather = (t: any) => {
          if (!t) return;
          if (t.Text && t.FirstURL) items.push({ title: (t.Text || '').split(' - ')[0], text: t.Text || '', url: t.FirstURL });
          if (t.Topics && Array.isArray(t.Topics)) {
            t.Topics.slice(0, 3).forEach((st: any) => {
              if (st.Text) items.push({ title: (st.Text || '').split(' - ')[0], text: st.Text || '', url: st.FirstURL || '' });
            });
          }
        };
        dd.RelatedTopics.slice(0, 10).forEach((t: any) => gather(t));
      }
      if (items.length === 0) return '';
      return items.map((it, i) => `${i + 1}. ${it.title}\n${it.text}${it.url ? `\nSource: ${it.url}` : ''}`).join('\n\n');
    };

    const buildDuckDuckGoFallback = (dd: any, q: string) => {
      try {
        if (!dd) return `No concise Instant Answer found for query: ${q}`;
        const parts: string[] = [];
        if (dd.AbstractSource) parts.push(`Instant answer source: ${dd.AbstractSource}`);
        if (dd.AbstractURL) parts.push(`Source URL: ${dd.AbstractURL}`);
        const resultsCount = Array.isArray(dd.Results) ? dd.Results.length : 0;
        const relatedCount = Array.isArray(dd.RelatedTopics) ? dd.RelatedTopics.length : 0;
        parts.push(`Results: ${resultsCount}, Related topics: ${relatedCount}`);
        // collect top related topic titles
        const tops: string[] = [];
        if (Array.isArray(dd.RelatedTopics)) {
          for (const t of dd.RelatedTopics.slice(0, 5)) {
            if (t.Text) tops.push(t.Text.split(' - ')[0]);
            else if (t.Topics && Array.isArray(t.Topics) && t.Topics[0] && t.Topics[0].Text) tops.push(t.Topics[0].Text.split(' - ')[0]);
          }
        }
        if (tops.length) parts.push(`Top related: ${tops.join('; ')}`);
        parts.push(`No concise Instant Answer found for query: ${q}. Try supplying more context (e.g., 'Is it a product, document, or event?') or provide alternate keywords.`);
        return parts.join('\n');
      } catch (e) {
        return `No concise Instant Answer found for query: ${q}`;
      }
    };

    try {
      const payload = {
        model: settings.aiModel || 'gpt-5-nano',
        messages: safeMessages,
        max_completion_tokens: 1200,
      };

      console.debug('[useOpenAI] Sending payload to worker:', payload);

      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (settings.apiKey) headers['X-OpenAI-Key'] = settings.apiKey;

      const response = await fetch('https://trp-openai-proxy.theroseburgplug.workers.dev/', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      // Capture raw response text for debugging the deployed worker
      const raw = await response.clone().text().catch(() => null);
      try {
        if (raw) {
          console.debug('[useOpenAI] Raw worker response text:', raw);
          try { localStorage.setItem('trp-ai-last-worker-response', raw); } catch (e) {}
        }
      } catch (e) {}

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || data.message || 'AI request failed');
        setIsConnected(false);
        return;
      }
      const data = await response.json();
      console.debug('[useOpenAI] Parsed worker response:', data);

      // Log any function_call metadata
      const fnCall = data?.choices?.[0]?.message?.function_call || data?.function_call || null;
      if (fnCall) {
        console.debug('[useOpenAI] Detected function_call:', fnCall);
        try { localStorage.setItem('trp-ai-last-function-call', JSON.stringify(fnCall)); } catch (e) {}
      }

      // If the worker returned function call info, attempt to execute supported functions automatically
      const assistantContent = data?.choices?.[0]?.message?.content ?? '';
      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent || (fnCall ? `Function call ${fnCall.name}` : '...') }]);

      // We'll attempt to resolve function calls and then return a final response object
      let finalResponse: any = data;

      if (fnCall && fnCall.name) {
        // Basic built-in function handling: support `search_web` by calling DuckDuckGo Instant Answer API
        let handled = false;
        try {
          const name = fnCall.name;
          const args = typeof fnCall.arguments === 'string' ? JSON.parse(fnCall.arguments || '{}') : (fnCall.arguments || {});
          if (name === 'search_web' && args.query) {
            // perform a quick search using DuckDuckGo Instant Answer API
            try {
              setIsToolRunning(true);
              const q = String(args.query || '');
              const resSearch = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&no_redirect=1`);
              // capture raw dd response
              const ddRaw = await resSearch.clone().text().catch(() => null);
              try { if (ddRaw) { console.debug('[useOpenAI] DuckDuckGo raw response:', ddRaw); try { localStorage.setItem('trp-ai-last-dd-response', ddRaw); } catch(e){} } } catch(e){}
              let searchResultText = '';
              if (resSearch.ok) {
                const dd = await resSearch.json().catch(() => null);
                if (dd) {
                  const formatted = formatDuckDuckGo(dd);
                  if (formatted && formatted.length) searchResultText = formatted;
                }
              }
              if (!searchResultText) searchResultText = `No concise Instant Answer found for query: ${q}`;

              const functionMessage = { role: 'function', name: name, content: JSON.stringify({ result: searchResultText }) };

              // build follow-up messages: include system (if present), last few messages, assistant function_call, then function result
              const followMessages = [...safeMessages];
              // append assistant function_call representation
              followMessages.push({ role: 'assistant', content: `Function call: ${name} -> ${JSON.stringify(args)}` });
              followMessages.push(functionMessage as any);

              // send follow-up to model to get final answer
              const followPayload = { model: settings.aiModel || 'gpt-5-nano', messages: followMessages, max_completion_tokens: 1200 };
              const followRes = await fetch('https://trp-openai-proxy.theroseburgplug.workers.dev/', { method: 'POST', headers: (settings.apiKey ? { 'Content-Type':'application/json','X-OpenAI-Key': settings.apiKey } : { 'Content-Type':'application/json' }), body: JSON.stringify(followPayload) });
              const followRaw = await followRes.clone().text().catch(() => null);
              try { if (followRaw) { console.debug('[useOpenAI] Follow-up raw response:', followRaw); try { localStorage.setItem('trp-ai-last-followup-response', followRaw); } catch(e){} } } catch(e){}
              if (followRes.ok) {
                const followData = await followRes.json().catch(() => null);
                const finalContent = followData?.choices?.[0]?.message?.content ?? followData?.choices?.[0]?.text ?? '';
                setMessages(prev => [...prev, { role: 'assistant', content: finalContent }]);
                setIsConnected(true);
                handled = true;
                return followData;
              } else {
                // attach an explicit assistant message informing user follow-up failed
                setMessages(prev => [...prev, { role: 'assistant', content: `I attempted to perform a web search for "${String(args.query || '')}", but couldn't reach the search endpoint.` }]);
              }
            } catch (e) {
              console.debug('[useOpenAI] search_web execution failed', e);
              setMessages(prev => [...prev, { role: 'assistant', content: `I attempted to perform a web search for "${String(args.query || '')}", but an error occurred.` }]);
            } finally {
              setIsToolRunning(false);
            }
          }
        } catch (e) {
          console.debug('[useOpenAI] function handling failed', e);
          setMessages(prev => [...prev, { role: 'assistant', content: 'I attempted to run a background tool but it failed to execute.' }]);
        }

        if (!handled) {
          const failMsg = `I tried to run a background search but could not retrieve results. Please try again or ask me to search again.`;
          setMessages(prev => [...prev, { role: 'assistant', content: failMsg }]);
          // synthesize a finalResponse similar to model output so callers receive content
          finalResponse = { choices: [{ message: { role: 'assistant', content: failMsg } }] };
        }
      }

      // If the assistant's reply indicates it will look something up but didn't emit a function_call,
      // proactively run the `search_web` flow using the original user content.
      if (!fnCall && assistantContent && /\b(search|look up|look for|google|find information|I'll search|I'll look up|please hold on|hold on)\b/i.test(assistantContent)) {
        try {
          setIsToolRunning(true);
          const q = String(content || (safeMessages.length ? safeMessages[safeMessages.length - 1].content : ''));
          console.debug('[useOpenAI] Assistant indicated a search; initiating client-side search for:', q);

          const resSearch = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&no_redirect=1`);
          let searchResultText = '';
          if (resSearch.ok) {
            const dd = await resSearch.json().catch(() => null);
            if (dd) {
              const formatted = formatDuckDuckGo(dd);
              if (formatted && formatted.length) searchResultText = formatted;
            }
          }
          if (!searchResultText) searchResultText = `No concise Instant Answer found for query: ${q}`;

          const functionMessage = { role: 'function', name: 'search_web', content: JSON.stringify({ result: searchResultText }) };
          const followMessages = [...safeMessages];
          followMessages.push({ role: 'assistant', content: `Function call: search_web -> ${JSON.stringify({ query: q })}` });
          followMessages.push(functionMessage as any);

          const followPayload = { model: settings.aiModel || 'gpt-5-nano', messages: followMessages, max_completion_tokens: 1200 };
          const followRes = await fetch('https://trp-openai-proxy.theroseburgplug.workers.dev/', { method: 'POST', headers: (settings.apiKey ? { 'Content-Type':'application/json','X-OpenAI-Key': settings.apiKey } : { 'Content-Type':'application/json' }), body: JSON.stringify(followPayload) });
          if (followRes.ok) {
            const followData = await followRes.json().catch(() => null);
            const finalContent = followData?.choices?.[0]?.message?.content ?? followData?.choices?.[0]?.text ?? '';
            setMessages(prev => [...prev, { role: 'assistant', content: finalContent }]);
            setIsConnected(true);
            finalResponse = followData;
          } else {
            const failMsg = `I attempted to perform a web search for "${q}", but couldn't reach the search endpoint.`;
            setMessages(prev => [...prev, { role: 'assistant', content: failMsg }]);
            finalResponse = { choices: [{ message: { role: 'assistant', content: failMsg } }] };
          }
        } catch (e) {
          console.debug('[useOpenAI] proactive search failed', e);
          const failMsg = `I attempted to perform a web search but an error occurred.`;
          setMessages(prev => [...prev, { role: 'assistant', content: failMsg }]);
          finalResponse = { choices: [{ message: { role: 'assistant', content: failMsg } }] };
        } finally {
          setIsToolRunning(false);
        }
      }

      setIsConnected(true);
      return finalResponse;
    } catch (err: any) {
      setError('Network error: Unable to connect to AI services');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [settings.apiKey, settings.aiModel, messages]);

  const clearHistory = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    isLoading,
    error,
    isConnected,
    isToolRunning,
    messages,
    testConnection,
    sendMessage,
    clearHistory,
    setMessages
  };
}
