import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  File,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  MoreVertical,
  Trash2,
  Download,
  Search,
  X,
  CheckCircle2,
  Loader2,
  FileCode,
  HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileItem } from '@/lib/index';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

export function FileUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateUpload = useCallback((file: File) => {
    const id = Math.random().toString(36).substring(7);
    const newFile: UploadingFile = { id, name: file.name, progress: 0, status: 'uploading' };
    
    setUploadingFiles(prev => [newFile, ...prev]);

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setUploadingFiles(prev => 
          prev.map(f => f.id === id ? { ...f, progress: 100, status: 'completed' } : f)
        );
        // In a real app, you would add this to the actual file list after successful backend response
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== id));
        }, 3000);
      } else {
        setUploadingFiles(prev => 
          prev.map(f => f.id === id ? { ...f, progress } : f)
        );
      }
    }, 500);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(simulateUpload);
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    files.forEach(simulateUpload);
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-12 transition-all duration-200 flex flex-col items-center justify-center text-center",
          isDragging 
            ? "border-accent bg-accent/5 scale-[1.01]"
            : "border-muted-foreground/25 hover:border-primary/50 bg-card/50"
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          className="hidden"
          multiple
        />
        
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        
        <h3 className="text-xl font-semibold mb-2">Upload your assets</h3>
        <p className="text-muted-foreground max-w-xs mb-6">
          Drag and drop your files here, or click to browse from your computer
        </p>
        
        <Button 
          onClick={() => fileInputRef.current?.click()}
          variant="secondary"
          className="px-8"
        >
          Select Files
        </Button>

        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 bg-accent/10 backdrop-blur-[2px] rounded-xl flex items-center justify-center"
          >
            <p className="text-accent font-bold text-2xl">Drop to Upload</p>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {uploadingFiles.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <h4 className="text-sm font-medium text-muted-foreground px-1">Active Uploads</h4>
            {uploadingFiles.map((file) => (
              <Card key={file.id} className="border-border/50 bg-card/30 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    {file.status === 'uploading' ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{Math.round(file.progress)}%</span>
                    </div>
                    <Progress value={file.progress} className="h-1.5" />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <X className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FileListProps {
  files: FileItem[];
  onDelete?: (id: string) => void;
}

export function FileList({ files, onDelete }: FileListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const getFileIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('image')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
    if (t.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (t.includes('video')) return <Video className="w-5 h-5 text-purple-500" />;
    if (t.includes('audio')) return <Music className="w-5 h-5 text-pink-500" />;
    if (t.includes('code') || t.includes('javascript') || t.includes('json')) return <FileCode className="w-5 h-5 text-amber-500" />;
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            className="pl-10 bg-card/50 border-border/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HardDrive className="w-4 h-4" />
          <span>Storage used: 2.4GB / 10GB</span>
        </div>
      </div>

      <Card className="border-border/50 bg-card/30 overflow-hidden">
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[400px]">Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.length > 0 ? (
                filteredFiles.map((file) => (
                  <TableRow key={file.id} className="group hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-background border border-border/50 group-hover:border-primary/30 transition-colors">
                          {getFileIcon(file.type)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm truncate max-w-[280px]">{file.name}</span>
                          <span className="text-xs text-muted-foreground">by {file.owner}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {file.size}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                        {file.type.split('/')[1] || file.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {file.uploadedAt}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="cursor-pointer">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => onDelete?.(file.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No files found matching your search
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}
