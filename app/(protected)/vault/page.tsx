'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiClient } from '@/lib/api-client';
import {
  FileUp,
  FileText,
  Search,
  Database,
  Trash2,
  Clock,
  ExternalLink,
  BrainCircuit,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

import { cn } from '@/lib/utils';

interface Document {
  name: string;
  ingestedAt: string;
  // Fields for UI compatibility with previous version
  status?: 'PROCESSING' | 'READY' | 'ERROR';
  size?: number;
}

import { useStrategicStore } from '@/lib/store/use-strategic-store';

export default function VaultPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  
  // Zustand Store
  const { vaultProgress, isVaultUploading, updateVaultProgress } = useStrategicStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await ApiClient.get('/vault/documents');
      setDocuments(data || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      updateVaultProgress(5, true);
      
      const formData = new FormData();
      formData.append('file', file);

      await ApiClient.post('/vault/upload', formData);
      // Global SSE in layout will handle the rest
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload document. Please ensure the backend is running.');
      updateVaultProgress(0, false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (name: string) => {
    try {
      await ApiClient.delete(`/vault/documents/${encodeURIComponent(name)}`);
      setDocuments(documents.filter(doc => doc.name !== name));
      setDocumentToDelete(null);
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <>
      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-xl font-medium text-foreground tracking-tight flex items-center gap-3">
                <Database className="w-8 h-8 text-primary" />
                Knowledge Vault
                {loading && documents.length > 0 && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-2" />}
              </h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Ingest your pitch decks, financials, and research to give your AI Copilot proprietary context.
              </p>
            </div>

            <div className="relative shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.md,.txt"
              />
              <Button 
                onClick={handleUploadClick}
                disabled={isVaultUploading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 shadow-glow-soft gap-2 transition-all w-full sm:w-auto"
              >
                {isVaultUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                {isVaultUploading ? `Ingesting (${vaultProgress}%)` : 'Upload Intelligence'}
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            {/* Sidebar Controls */}
            <div className="md:col-span-1 space-y-6">
              <Card glass className="border-border bg-card shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Search & Filter</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search files..." 
                      className="pl-9 bg-background/50 border-border rounded-xl focus:ring-primary"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground ml-1">File Type</label>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="cursor-pointer bg-primary/10 text-primary border-primary/20">All</Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted">PDF</Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted">MD</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card glass className="border-primary/20 bg-primary/5 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <BrainCircuit className="w-5 h-5 text-primary shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-primary uppercase tracking-wider">Strategic Ingestion</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Uploaded documents are automatically vector-embedded into your private Strategic Knowledge Base.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Documents List */}
            <div className="md:col-span-3">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-2xl bg-muted/50" />
                  ))}
                </div>
              ) : filteredDocs.length === 0 ? (
                <Card className="border-dashed border-2 border-border bg-transparent shadow-none p-12 flex flex-col items-center justify-center text-center">
                  <div className="p-4 bg-muted rounded-full mb-4">
                    <Database className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">No Knowledge Assets</h3>
                  <p className="text-muted-foreground max-w-xs mt-1">
                    Your Knowledge Vault is empty. Upload documents to give your AI founder proprietary business context.
                  </p>
                  <Button variant="outline" className="mt-6 rounded-full border-primary/20 text-primary hover:bg-primary/5" onClick={handleUploadClick}>
                    Add First Asset
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredDocs.map((doc) => (
                    <Card key={doc.name} glass className="border-border bg-card hover:border-primary/30 transition-all group overflow-hidden shadow-sm">
                      <CardContent className="p-0">
                        <div className="flex items-center p-4 gap-4">
                          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                            <FileText className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground truncate">{doc.name}</h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(doc.ingestedAt)}</span>
                              <span>•</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-success border-success/20 bg-success/5">
                                READY
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDocumentToDelete(doc.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <AlertDialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
          <AlertDialogContent className="rounded-2xl border-border shadow-xl bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-medium">Purge Asset from Memory?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This will permanently remove this knowledge asset from your Strategic Brain. Your AI will no longer be able to reference this information.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 gap-3">
              <AlertDialogCancel className="rounded-xl border-border bg-card">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  if (documentToDelete) handleDelete(documentToDelete);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl shadow-sm transition-colors"
              >
                Delete Intelligence
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  );
}

// Removing local cn function as we now use import

