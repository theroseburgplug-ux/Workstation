import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  HardDrive, 
  Cloud, 
  ShieldCheck, 
  FilePlus, 
  MoreHorizontal, 
  Grid,
  List,
  FolderOpen
} from 'lucide-react';
import { FileItem } from '@/lib/index';
import { FileUpload, FileList } from '@/components/FileUpload';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

const MOCK_FILES: FileItem[] = [
  {
    id: '1',
    name: 'Q1_Marketing_Strategy.pdf',
    type: 'application/pdf',
    size: '2.4 MB',
    uploadedAt: '2026-02-10T14:30:00Z',
    owner: 'Roseburg Admin',
    url: '#'
  },
  {
    id: '2',
    name: 'Brand_Assets_Final.zip',
    type: 'application/zip',
    size: '145.8 MB',
    uploadedAt: '2026-02-12T09:15:00Z',
    owner: 'Roseburg Admin',
    url: '#'
  },
  {
    id: '3',
    name: 'Social_Media_Templates.psd',
    type: 'image/vnd.adobe.photoshop',
    size: '54.2 MB',
    uploadedAt: '2026-02-13T16:45:00Z',
    owner: 'Creative Lead',
    url: '#'
  },
  {
    id: '4',
    name: 'Client_Interview_February.mp4',
    type: 'video/mp4',
    size: '890.5 MB',
    uploadedAt: '2026-02-14T01:00:00Z',
    owner: 'Roseburg Admin',
    url: '#'
  },
  {
    id: '5',
    name: 'Revenue_Projections_2026.xlsx',
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: '1.2 MB',
    uploadedAt: '2026-02-08T11:20:00Z',
    owner: 'Finance Dept',
    url: '#'
  }
];

export default function FileVault() {
  const [files, setFiles] = useState<FileItem[]>(MOCK_FILES);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = 
        activeCategory === 'all' || 
        (activeCategory === 'documents' && (file.type.includes('pdf') || file.type.includes('sheet') || file.type.includes('document'))) ||
        (activeCategory === 'media' && (file.type.includes('video') || file.type.includes('image') || file.type.includes('audio'))) ||
        (activeCategory === 'archives' && file.type.includes('zip'));
      
      return matchesSearch && matchesCategory;
    });
  }, [files, searchQuery, activeCategory]);

  const handleDelete = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">File Vault</h1>
          <p className="text-muted-foreground">Manage your agency's digital assets and client deliverables securely.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <FolderOpen className="w-4 h-4" />
            New Folder
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90">
            <FilePlus className="w-4 h-4" />
            Upload New
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Storage Used</CardTitle>
            <HardDrive className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.24 GB</div>
            <p className="text-xs text-muted-foreground">Of 50 GB available (2.5%)</p>
            <div className="w-full bg-muted rounded-full h-1.5 mt-4 overflow-hidden">
              <div className="bg-primary h-full rounded-full" style={{ width: '2.5%' }} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Cloud className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{files.length} Files</div>
            <p className="text-xs text-muted-foreground">Across 12 shared folders</p>
            <div className="flex gap-2 mt-4">
              <Badge variant="secondary" className="text-[10px]">34 PDFs</Badge>
              <Badge variant="secondary" className="text-[10px]">12 Videos</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Security Status</CardTitle>
            <ShieldCheck className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Protected</div>
            <p className="text-xs text-muted-foreground">AES-256 Encryption active</p>
            <div className="mt-4 flex items-center text-xs text-green-600 font-medium">
              <div className="w-2 h-2 rounded-full bg-green-600 mr-2" />
              Cloud Sync Healthy
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="browse" className="gap-2">
              Browse Files
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              Direct Upload
            </TabsTrigger>
            <TabsTrigger value="shared" className="gap-2">
              Shared with Me
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search files..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            >
              {viewMode === 'list' ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <TabsContent value="browse" className="mt-0">
          <div className="flex flex-wrap gap-2 mb-6">
            <Button 
              variant={activeCategory === 'all' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setActiveCategory('all')}
              className="rounded-full"
            >
              All Files
            </Button>
            <Button 
              variant={activeCategory === 'documents' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setActiveCategory('documents')}
              className="rounded-full"
            >
              Documents
            </Button>
            <Button 
              variant={activeCategory === 'media' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setActiveCategory('media')}
              className="rounded-full"
            >
              Media
            </Button>
            <Button 
              variant={activeCategory === 'archives' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setActiveCategory('archives')}
              className="rounded-full"
            >
              Archives
            </Button>
            <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground">
              <Filter className="w-3 h-3 mr-2" />
              More Filters
            </Button>
          </div>

          <div className="min-h-[400px]">
            <FileList 
              files={filteredFiles} 
              onDelete={handleDelete}
            />
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-0">
          <Card className="border-dashed border-2 border-border/50 bg-muted/20">
            <CardContent className="pt-10 pb-10">
              <FileUpload />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shared" className="mt-0">
          <div className="flex flex-col items-center justify-center h-64 text-center border rounded-xl bg-card">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <FolderOpen className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No shared files yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Files shared by clients or other team members will appear here.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <footer className="mt-auto pt-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
        <p>© 2026 The Roseburg Plug. All files are encrypted end-to-to.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-primary transition-colors">Compliance Audit</a>
        </div>
      </footer>
    </div>
  );
}
