import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Trash2,
  Bot,
  User,
  Sparkles,
  AlertCircle,
  Loader2,
  RefreshCcw,
  MessageSquarePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOpenAI } from '@/hooks/useOpenAI';
import { useTRPData } from '@/lib/trpData';
import { StatusBadge } from '@/components/StatusBadge';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';

/**
 * AI Chat Interface Component
 * Provides a high-performance chat experience for interacting with the TRP Workstation AI.
 */
export function AIChat() {
  const { 
    isLoading, 
    error, 
    messages, 
    sendMessage, 
    clearHistory, 
    isConnected, 
    testConnection,
    setMessages,
    isToolRunning
  } = useOpenAI();
  const { state, addTask, addClient, updateTask, deleteTask, updateClient, deleteClient } = useTRPData();
  
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [messages, isLoading]);

  const confirmAction = () => {
    if (!pendingAction) return;
    try {
      if (pendingAction.entity === 'task') {
        const { action, taskId, updates } = pendingAction;
        const task = state.tasks.find(t => t.id === taskId);
        if (action === 'delete') {
          deleteTask(taskId);
          setMessages(prev => [...prev, { role: 'assistant', content: `Deleted task "${task?.title || taskId}"` }]);
        } else if (action === 'complete') {
          updateTask(taskId, { status: 'completed' });
          setMessages(prev => [...prev, { role: 'assistant', content: `Marked task "${task?.title || taskId}" as completed.` }]);
        } else if (action === 'edit') {
          updateTask(taskId, updates || {});
          setMessages(prev => [...prev, { role: 'assistant', content: `Updated task "${task?.title || taskId}".` }]);
        }
      }

      if (pendingAction.entity === 'client') {
        const { action, clientId, updates } = pendingAction;
        const client = state.clients.find(c => c.id === clientId);
        if (action === 'delete') {
          deleteClient(clientId);
          setMessages(prev => [...prev, { role: 'assistant', content: `Deleted client "${client?.name || clientId}"` }]);
        } else if (action === 'edit') {
          updateClient(clientId, updates || {});
          setMessages(prev => [...prev, { role: 'assistant', content: `Updated client "${client?.name || clientId}".` }]);
        }
      }
    } catch (err) {
      console.error('Error confirming action', err);
    } finally {
      setConfirmOpen(false);
      setPendingAction(null);
    }
  };

  const cancelAction = () => {
    setConfirmOpen(false);
    setPendingAction(null);
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');

    setIsSending(true);
    try {
      // Local quick parser for simple imperative commands as a fallback
      const clientMatch = message.match(/create\s+(?:a\s+)?(?:new\s+)?client(?:\s+named)?\s+"?([\w\s'\-]+)"?/i);
      if (clientMatch) {
        const name = clientMatch[1].trim();
        const created = addClient({ name });
        setMessages(prev => [...prev, { role: 'user', content: message }, { role: 'assistant', content: `Created client "${created.name}" (id: ${created.id})` }]);
        return;
      }

      const taskMatch = message.match(/create\s+(?:a\s+)?(?:new\s+)?task(?:\s+named|\s+)"?([\w\s'\-]+)"?(?:.*for\s+client\s+"?([\w\s'\-]+)"?)?/i);
      if (taskMatch) {
        const title = taskMatch[1].trim();
        const clientName = taskMatch[2] ? taskMatch[2].trim() : undefined;
        let clientId: string | undefined;
        if (clientName) {
          const found = state.clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
          if (found) clientId = found.id;
          else clientId = addClient({ name: clientName }).id;
        }
        const created = addTask({ title, clientId: clientId || '' });
        setMessages(prev => [...prev, { role: 'user', content: message }, { role: 'assistant', content: `Created task "${created.title}" (id: ${created.id})` }]);
        return;
      }

      // Otherwise send to AI worker — sendMessage will include system instruction to prefer function calls
      const result = await sendMessage(message);

      // If the worker returned function_calls, execute supported actions locally
      try {
        if (result?.function_calls && Array.isArray(result.function_calls)) {
          for (const fc of result.function_calls) {
            const fn = fc.function;
            const args = fc.arguments || {};

            if (fn === 'manage_task') {
              if (args.action === 'add' && args.task_data) {
                const td = args.task_data;
                let clientId = td.clientId || '';
                let clientName = td.clientName || '';

                if (!clientId && clientName) {
                  const found = state.clients.find(c => c.name.toLowerCase() === String(clientName).toLowerCase());
                  if (found) {
                    clientId = found.id;
                  } else {
                    const newClient = addClient({ name: clientName, company: clientName });
                    clientId = newClient.id;
                  }
                }

                const created = addTask({
                  title: td.title || 'AI Task',
                  description: td.description || '',
                  clientId: clientId || '',
                  clientName: clientName || '',
                  status: td.status || 'todo',
                  priority: td.priority || 'medium',
                  dueDate: td.dueDate || ''
                });

                setMessages(prev => [...prev, { role: 'assistant', content: `Created task "${created.title}" (id: ${created.id})` }]);
              }

              // handle edit/complete/delete with confirmation
              if (args.action === 'edit' && args.task_id && args.updates) {
                setPendingAction({ entity: 'task', action: 'edit', taskId: args.task_id, updates: args.updates });
                setConfirmOpen(true);
              }

              if (args.action === 'complete' && args.task_id) {
                setPendingAction({ entity: 'task', action: 'complete', taskId: args.task_id });
                setConfirmOpen(true);
              }

              if (args.action === 'delete' && args.task_id) {
                setPendingAction({ entity: 'task', action: 'delete', taskId: args.task_id });
                setConfirmOpen(true);
              }
            }

            if (fn === 'manage_client') {
              if (args.action === 'add' && args.client_data) {
                const cd = args.client_data;
                const created = addClient({
                  name: cd.name || cd.client_name || cd.clientName || 'New Client',
                  email: cd.email || cd.client_email || cd.clientEmail || '',
                  phone: cd.phone || cd.client_phone || cd.clientPhone || '',
                  website: cd.website || cd.site || '',
                  avatar: cd.avatar || cd.image || cd.photo || '',
                  company: cd.company || cd.org || '',
                });
                setMessages(prev => [...prev, { role: 'assistant', content: `Created client "${created.name}" (id: ${created.id})` }]);
              }

              if (args.action === 'delete' && args.client_id) {
                setPendingAction({ entity: 'client', action: 'delete', clientId: args.client_id });
                setConfirmOpen(true);
              }

              if (args.action === 'edit' && args.client_id && args.updates) {
                setPendingAction({ entity: 'client', action: 'edit', clientId: args.client_id, updates: args.updates });
                setConfirmOpen(true);
              }
            }
          }
        }

        // If no function_calls were provided, fallback: attempt to parse assistant message for JSON blocks
        const assistantRaw = result?.choices?.[0]?.message?.content || '';
        if (!result?.function_calls && assistantRaw) {
          // try to extract a ```json ... ``` block
          const fencedMatch = assistantRaw.match(/```(?:json)?([\s\S]*?)```/i);
          const jsonText = fencedMatch ? fencedMatch[1].trim() : null;
          let parsed: any = null;
          try {
            if (jsonText) {
              parsed = JSON.parse(jsonText);
            } else {
              // try to find a JSON object in the text
              const objMatch = assistantRaw.match(/({[\s\S]*})/);
              if (objMatch) parsed = JSON.parse(objMatch[1]);
            }
          } catch (err) {
            parsed = null;
          }

          if (parsed) {
            // Handle older style: { action: 'manage_client', parameters: { operation: 'add', client_name: 'sad guy' } }
            const action = parsed.action || parsed.type || '';
            const params = parsed.parameters || parsed.params || {};

            if (action === 'manage_client' || action === 'manage_client'.toLowerCase()) {
              if (params.operation === 'add' || params.operation === 'create') {
                const name = params.client_name || params.clientName || params.name || 'New Client';
                const email = params.client_email || params.clientEmail || params.email || '';
                const phone = params.client_phone || params.clientPhone || params.phone || '';
                const website = params.website || params.client_website || '';
                const avatar = params.avatar || params.photo || params.image || '';
                const created = addClient({ name, email, phone, website, avatar });
                setMessages(prev => [...prev, { role: 'assistant', content: `Created client "${created.name}" (id: ${created.id})` }]);
              }
            }

            if (action === 'manage_task') {
              if (params.operation === 'add' || params.operation === 'create') {
                const title = params.task_title || params.title || 'New Task';
                let clientId: string | undefined;
                if (params.client_name || params.clientName) {
                  const cn = params.client_name || params.clientName;
                  const f = state.clients.find(c => c.name.toLowerCase() === String(cn).toLowerCase());
                  clientId = f ? f.id : addClient({ name: cn }).id;
                }
                const created = addTask({ title, clientId: clientId || '' });
                setMessages(prev => [...prev, { role: 'assistant', content: `Created task "${created.title}" (id: ${created.id})` }]);
              }
            }

            // Backwards-compatible: { action: 'add', entity: 'client', name: '...' }
            if (parsed.action === 'add' && (parsed.entity === 'client' || parsed.entity === 'customer')) {
              const name = parsed.name || parsed.client_name || parsed.clientName || 'New Client';
              const created = addClient({ name });
              setMessages(prev => [...prev, { role: 'assistant', content: `Created client "${created.name}" (id: ${created.id})` }]);
            }

            if (parsed.action === 'add' && (parsed.entity === 'task' || parsed.entity === 'todo')) {
              const title = parsed.title || parsed.name || 'New Task';
              let clientId: string | undefined;
              if (parsed.client) clientId = parsed.client;
              if (parsed.clientName) {
                const f = state.clients.find(c => c.name.toLowerCase() === String(parsed.clientName).toLowerCase());
                clientId = f ? f.id : addClient({ name: parsed.clientName }).id;
              }
              const created = addTask({ title, clientId: clientId || '' });
              setMessages(prev => [...prev, { role: 'assistant', content: `Created task "${created.title}" (id: ${created.id})` }]);
            }
          }
        }
      } catch (err) {
        console.error('Error executing function_calls or parsing assistant JSON:', err);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedPrompts = [
    "Analyze last month's ROI",
    "Draft a content strategy for Q1",
    "Summarize recent client feedback",
    "Generate 5 Instagram hook ideas"
  ];

  return (
    <Card className="flex flex-col h-[720px] max-h-[800px] border-border shadow-lg bg-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              TRP Intelligence
              <Sparkles className="w-3 h-3 text-accent animate-pulse" />
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge 
                type="connection" 
                status={isConnected ? 'connected' : isConnected === false ? 'error' : 'disconnected'} 
              />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">GPT-5 Nano Powered</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => testConnection()} 
            className="h-8 w-8 text-muted-foreground"
            title="Test Connection"
          >
            <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={clearHistory} 
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            title="Clear History"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden relative">
        <ScrollArea ref={scrollRef} className="p-6" style={{ height: 'calc(100% - 88px)' }}>
          <div className="space-y-6">
            <AnimatePresence initial={false}>
              {messages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-12 text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                    <Bot className="w-8 h-8 text-primary" />
                  </div>
                  <div className="max-w-xs">
                    <h3 className="text-lg font-medium">How can I assist you today?</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      I can help you with client reports, automation scripts, or content planning.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md mt-6">
                    {suggestedPrompts.map((prompt) => (
                      <Button
                        key={prompt}
                        variant="outline"
                        className="text-xs h-auto py-2 px-3 justify-start text-left hover:border-primary/50"
                        onClick={() => setInput(prompt)}
                      >
                        <MessageSquarePlus className="w-3 h-3 mr-2 text-primary" />
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Avatar className="w-8 h-8 shrink-0 border border-border/50 shadow-sm">
                        <AvatarFallback className={msg.role === 'user' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}>
                          {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </AvatarFallback>
                        {msg.role === 'assistant' && <AvatarImage src="" />}
                      </Avatar>
                      <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div 
                          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                              ? 'bg-primary text-primary-foreground rounded-tr-none' 
                              : 'bg-secondary text-secondary-foreground rounded-tl-none'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 px-1">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>

            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="flex gap-3 items-center">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-secondary text-secondary-foreground px-4 py-2 rounded-2xl rounded-tl-none flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs italic">{isToolRunning ? 'Searching...' : 'Thinking...'}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-center"
              >
                <div className="flex items-center gap-2 bg-destructive/10 text-destructive text-xs px-4 py-2 rounded-lg border border-destructive/20">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="p-4 border-t border-border/50 bg-muted/30">
        <form onSubmit={handleSend} className="flex w-full items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask TRP Intelligence..."
              disabled={isLoading}
              className="pr-10 py-6 bg-background border-border/50 focus-visible:ring-accent"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                <span className="text-xs">↵</span>
              </kbd>
            </div>
          </div>
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || isLoading}
            className="h-12 w-12 rounded-xl transition-all active:scale-95 bg-primary hover:bg-primary/90"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>
      </CardFooter>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.entity === 'task' ? (
                pendingAction?.action === 'delete' ? 'Delete Task?' : pendingAction?.action === 'complete' ? 'Complete Task?' : 'Edit Task?'
              ) : pendingAction?.entity === 'client' ? (
                pendingAction?.action === 'delete' ? 'Delete Client?' : 'Edit Client?'
              ) : 'Confirm Action'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.entity === 'task' && (
                <div className="text-sm">{pendingAction?.taskId ? `Task ID: ${pendingAction.taskId}` : ''}</div>
              )}
              {pendingAction?.entity === 'client' && (
                <div className="text-sm">{pendingAction?.clientId ? `Client ID: ${pendingAction.clientId}` : ''}</div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
