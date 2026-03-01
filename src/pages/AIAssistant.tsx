import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  BrainCircuit, 
  Zap, 
  History, 
  Lightbulb,
  MessageSquare,
  BarChart3,
  Search,
  ArrowRight,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { AIChat } from '@/components/AIChat';

const AI_INSIGHTS = [
  {
    id: 1,
    title: 'Revenue Forecast',
    description: 'Predicted 12% growth next quarter based on current lead velocity.',
    icon: BarChart3,
    color: 'text-primary',
    status: 'Positive'
  },
  {
    id: 2,
    title: 'Campaign Alert',
    description: 'Facebook Ad "Spring Launch" is underperforming by 5% compared to benchmark.',
    icon: Zap,
    color: 'text-accent',
    status: 'Action Required'
  },
  {
    id: 3,
    title: 'Task Optimization',
    description: 'Automating 3 recurring tasks for "EcoFlow" could save 4 hours weekly.',
    icon: Lightbulb,
    color: 'text-amber-500',
    status: 'Suggestion'
  },
];

const SUGGESTED_PROMPTS = [
  "Summarize last meeting notes",
  "Generate content ideas for June",
  "Analyze client retention rate",
  "Write follow-up email for leads",
];

const AIAssistant = () => {
  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16))] overflow-visible">
      {/* Page Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-background border-b border-border/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BrainCircuit className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">AI Intelligence Hub</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                GPT-5 Nano Active • Production Ready
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-xs font-medium">
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span>Latency: 42ms</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Encrypted Session</span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Main Chat Area */}
        <section className="flex-1 flex flex-col bg-muted/20 border-r border-border/50 min-w-0">
          <div className="w-full max-w-3xl mx-auto p-4">
            <AIChat />
          </div>
        </section>

        {/* Right Sidebar - Intelligence & Context */}
        <aside className="hidden lg:flex flex-col w-80 shrink-0 overflow-y-auto bg-background">
          <div className="p-6 space-y-8">
            {/* Intelligence Cards */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  Real-time Insights
                </h3>
                <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded uppercase tracking-tighter">
                  Live
                </span>
              </div>
              <div className="space-y-4">
                {AI_INSIGHTS.map((insight) => {
                  const Icon = insight.icon as React.ComponentType;
                  return (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * insight.id }}
                      className="p-4 rounded-xl border border-border hover:border-primary/50 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-foreground">{insight.title}</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{insight.description}</p>
                          <div className="pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider">{insight.status}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Suggested Prompts */}
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-primary" />
                Quick Actions
              </h3>
              <div className="grid gap-2">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted hover:border-primary/30 transition-all text-[11px] font-medium text-foreground flex items-center justify-between group"
                  >
                    {prompt}
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-primary" />
                  </button>
                ))}
              </div>
            </div>

            {/* History Summary */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <History className="w-4 h-4 text-muted-foreground" />
                  Recent Context
                </h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                  <span>TechCorp Q1 Strategy Analysis</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                  <span>EcoFlow Landing Page Copy Generation</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <div className="w-1 h-1 rounded-full bg-primary shrink-0" />
                  <span>Marketing Automation Workflow Design</span>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="p-4 rounded-lg bg-accent/5 border border-accent/10">
              <div className="flex items-center gap-2 mb-1">
                <Search className="w-3 h-3 text-accent" />
                <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Pro Tip</span>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                "AI insights are based on your synchronized CRM data from the last 30 days."
              </p>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default AIAssistant;