import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Headphones, FileText, Info, Search, Filter } from 'lucide-react';
import { VoiceRecorder, VoiceRecordingsList } from '@/components/VoiceRecorder';

const Voice = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="p-6 lg:p-10 space-y-8"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Voice Memos & Meeting Notes
          </h1>
          <p className="text-muted-foreground mt-1">
            Capture ideas, record meetings, and transcribe audio with AI precision.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search recordings..."
              className="pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 w-64"
            />
          </div>
          <button className="p-2 bg-card border border-border rounded-lg hover:bg-secondary transition-colors">
            <Filter className="h-4 w-4 text-foreground" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Main Recording Interface */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm overflow-visible relative">
            <div className="absolute top-0 right-0 p-4">
              <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            </div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Capture Audio</h2>
            </div>
            
            <VoiceRecorder />
            
            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Recording Tips
              </h3>
              <ul className="space-y-3">
                <li className="text-xs text-muted-foreground flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  Keep the microphone 6-12 inches away for optimal clarity.
                </li>
                <li className="text-xs text-muted-foreground flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  Use a quiet environment to improve AI transcription accuracy.
                </li>
                <li className="text-xs text-muted-foreground flex gap-2">
                  <span className="text-primary font-bold">•</span>
                  Recording automatically stops after 60 minutes.
                </li>
              </ul>
            </div>
          </div>

          {/* Stats/Summary Card */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Memos</p>
              <p className="text-2xl font-bold">24</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Storage Used</p>
              <p className="text-2xl font-bold">1.2 GB</p>
            </div>
          </div>
        </div>

        {/* History & Recordings List */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Headphones className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Recent Recordings</h2>
                  <p className="text-xs text-muted-foreground">Manage and transcribe your voice logs</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-md hover:opacity-90 transition-opacity">
                  Select All
                </button>
                <button className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Export All
                </button>
              </div>
            </div>

            <div className="p-0">
              <VoiceRecordingsList />
            </div>
          </div>

          {/* Empty State / Additional Info (Optional) */}
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex items-start gap-4">
            <div className="p-3 bg-primary/20 rounded-full">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-primary">Automatic Transcription</h4>
              <p className="text-sm text-primary/80 mt-1">
                Your recordings are automatically processed by our GPT-5 Nano engine to generate highly accurate summaries and action items. Access them by clicking on any recording in the list.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Voice;