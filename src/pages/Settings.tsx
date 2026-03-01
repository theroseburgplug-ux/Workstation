import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Cpu, 
  Bell, 
  Database, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Save,
  RotateCcw,
  Download,
  Trash2,
  Globe,
  Mic
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useOpenAI } from '@/hooks/useOpenAI';
import { useTRPData } from '@/lib/trpData';
import type { UserSettings } from '@/lib/index';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { fetchFacebookInsights, fetchFacebookPages, fetchFacebookMe } from '@/lib/facebook';
import Confirm from '@/components/Confirm';

export default function Settings() {
  const [settings, setSettings] = useLocalStorage('user-settings', {
    theme: 'dark',
    apiKey: '',
    aiModel: 'gpt-4o',
    notificationsEnabled: true,
    autoTranscribe: false,
    // Productivity defaults
    workStart: '09:00',
    workEnd: '18:00',
    defaultFocusLength: 45,
    defaultBreakLength: 10,
    preferMornings: true,
    bufferBetweenMeetings: 10,
  } as UserSettings);

  const { testConnection, isLoading: isTesting, isConnected, error: aiError } = useOpenAI();
  const { clearAllData } = useTRPData();
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingFB, setIsTestingFB] = useState(false);
  const [fbPages, setFbPages] = useState<any[] | null>(null);
  const [isFetchingPages, setIsFetchingPages] = useState(false);
  const [fbPagesRaw, setFbPagesRaw] = useState<string | null>(null);
  const [fbTokenTestRaw, setFbTokenTestRaw] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      setSettings((prev) => ({ ...prev }));
      if (settings.apiKey) await testConnection();
      toast.success('Settings saved successfully');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(window.localStorage);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `trp-backup-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.info('Data backup started');
  };

  const handleClearData = () => {
    clearAllData();
    toast.success('TRP Workstation data cleared');
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, staggerChildren: 0.1 } }
  };

  const itemVariants = { hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your agency command center preferences and integrations.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="general" className="px-6">General</TabsTrigger>
          <TabsTrigger value="ai" className="px-6">AI Intelligence</TabsTrigger>
          <TabsTrigger value="data" className="px-6">Data & Security</TabsTrigger>
        </TabsList>

        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <TabsContent value="general" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4 border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5 text-primary" />
                    Appearance
                  </CardTitle>
                  <CardDescription>Customize the visual style of your workstation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Interface Theme</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <Button 
                        variant={settings.theme === 'light' ? 'default' : 'outline'} 
                        className="w-full justify-start"
                        onClick={() => setSettings({ ...settings, theme: 'light' })}
                      >
                        <Sun className="mr-2 h-4 w-4" /> Light
                      </Button>
                      <Button 
                        variant={settings.theme === 'dark' ? 'default' : 'outline'} 
                        className="w-full justify-start"
                        onClick={() => setSettings({ ...settings, theme: 'dark' })}
                      >
                        <Moon className="mr-2 h-4 w-4" /> Dark
                      </Button>
                      <Button 
                        variant={settings.theme === 'system' ? 'default' : 'outline'} 
                        className="w-full justify-start"
                        onClick={() => setSettings({ ...settings, theme: 'system' })}
                      >
                        <Globe className="mr-2 h-4 w-4" /> System
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive desktop alerts for task deadlines and AI updates.
                      </p>
                    </div>
                    <Switch 
                      checked={settings.notificationsEnabled}
                      onCheckedChange={(checked) => setSettings({ ...settings, notificationsEnabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Auto-Transcription</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically transcribe voice memos using Whisper API.
                      </p>
                    </div>
                    <Switch 
                      checked={settings.autoTranscribe}
                      onCheckedChange={(checked) => setSettings({ ...settings, autoTranscribe: checked })}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <Label className="text-base">Productivity Defaults</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Workday start</Label>
                        <Input type="time" value={settings.workStart || '09:00'} onChange={(e) => setSettings({ ...settings, workStart: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Workday end</Label>
                        <Input type="time" value={settings.workEnd || '18:00'} onChange={(e) => setSettings({ ...settings, workEnd: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Default focus (min)</Label>
                        <select value={String(settings.defaultFocusLength || 45)} onChange={(e) => setSettings({ ...settings, defaultFocusLength: Number(e.target.value) })} className="px-2 rounded border">
                          <option value="25">25</option>
                          <option value="45">45</option>
                          <option value="60">60</option>
                          <option value="90">90</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Default break (min)</Label>
                        <select value={String(settings.defaultBreakLength || 10)} onChange={(e) => setSettings({ ...settings, defaultBreakLength: Number(e.target.value) })} className="px-2 rounded border">
                          <option value="5">5</option>
                          <option value="10">10</option>
                          <option value="15">15</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Prefer mornings for deep work</Label>
                        <div className="pt-2">
                          <Switch checked={settings.preferMornings} onCheckedChange={(v) => setSettings({ ...settings, preferMornings: v })} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Buffer between meetings (min)</Label>
                        <Input type="number" value={String(settings.bufferBetweenMeetings || 10)} onChange={(e) => setSettings({ ...settings, bufferBetweenMeetings: Number(e.target.value) })} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-3 border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    System Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Workstation Version</span>
                      <span className="font-mono font-medium">v2.4.0-prod</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Node</span>
                      <span className="font-mono font-medium">Roseburg-Main-01</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">System Date</span>
                      <span className="font-mono font-medium">2026-02-14</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">License Status</span>
                      <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">Enterprise</Badge>
                    </div>
                  </div>
                  <div className="pt-4 text-xs text-center text-muted-foreground">
                    © 2026 The Roseburg Plug. All rights reserved.
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-accent" />
                  AI Configuration
                </CardTitle>
                <CardDescription>
                  Power your agency intelligence with high-performance LLMs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">OpenAI API Key</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="apiKey" 
                        type="password" 
                        placeholder="sk-................................................"
                        value={settings.apiKey}
                        onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                        className="font-mono"
                      />
                      <Button 
                        variant="secondary"
                        onClick={testConnection}
                        disabled={isTesting || !settings.apiKey}
                      >
                        {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test Connection"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your key is stored locally in your browser and never sent to our servers.
                    </p>
                  </div>

                  <Separator />

                  {/* Facebook integration paused — Coming Soon */}
                  <div className="space-y-2 opacity-60 pointer-events-none">
                    <Label>Facebook Integration</Label>
                    <p className="text-sm text-muted-foreground">This integration is paused and marked as Coming Soon. We'll re-enable Facebook Page metrics after additional testing.</p>
                    <div className="flex items-center gap-2">
                      <Button disabled>Test FB Connection</Button>
                      <Button variant="outline" disabled>Use my worker URL</Button>
                    </div>
                    <div className="mt-2">
                      <Label>Fetch Pages (disabled)</Label>
                      <p className="text-xs text-muted-foreground">Page fetching is temporarily disabled while we finalize permissions and security.</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Token storage and page fetching will be available in a future release.</p>
                  </div>

                  {isConnected === true && (
                    <div className="flex items-center gap-2 text-sm text-primary p-2 bg-primary/5 rounded border border-primary/20">
                      <CheckCircle2 className="h-4 w-4" />
                      Connection successful! Ready for AI operations.
                    </div>
                  )}

                  {isConnected === false && aiError && (
                    <div className="flex items-center gap-2 text-sm text-destructive p-2 bg-destructive/5 rounded border border-destructive/20">
                      <AlertCircle className="h-4 w-4" />
                      {aiError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="model">Default Intelligence Model</Label>
                    <Select 
                      value={settings.aiModel}
                      onValueChange={(value) => setSettings({ ...settings, aiModel: value })}
                    >
                      <SelectTrigger id="model">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4o (High Performance)</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo (Legacy)</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Efficient)</SelectItem>
                        <SelectItem value="o1-preview">o1 Preview (Reasoning)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t border-border/50 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" />
                  TRP Workstation uses end-to-end encrypted local storage for credentials.
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Data Portability
                  </CardTitle>
                  <CardDescription>
                    Export or import your workstation settings and local cache.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <Button variant="outline" className="justify-start" onClick={handleExportData}>
                      <Download className="mr-2 h-4 w-4" />
                      Export All Local Data (.json)
                    </Button>
                    <Button variant="outline" className="justify-start" disabled>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Import Backup Data
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <Trash2 className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Irreversible actions related to your local environment.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Clear Workstation Cache</p>
                    <p className="text-xs text-muted-foreground">
                      This will reset all your settings, delete locally stored tasks, and sign you out of AI services.
                    </p>
                  </div>
                  <Confirm title="Clear ALL data" description="Clear ALL TRP Workstation data (clients, tasks, activities, invoices)? This cannot be undone." onConfirm={handleClearData}>
                    <Button variant="destructive" className="w-full">Delete All Workstation Data</Button>
                  </Confirm>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </motion.div>
      </Tabs>
    </div>
  );
}
