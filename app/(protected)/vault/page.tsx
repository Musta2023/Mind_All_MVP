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

interface Document {
  name: string;
  ingestedAt: string;
  // Fields for UI compatibility with previous version
  status?: 'PROCESSING' | 'READY' | 'ERROR';
  size?: number;
}

export default function VaultPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();

    // Set up SSE for ingestion progress
    const setupSSE = async () => {
      try {
        const accessToken = await (await import('@/lib/api-client')).getAccessToken();
        const eventSource = new EventSource(`${API_URL}/vault/progress?token=${accessToken}`);
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.status === 'COMPLETED') {
              setUploadProgress(100);
              setTimeout(() => {
                setUploading(false);
                setUploadProgress(0);
                loadDocuments();
              }, 1000);
            } else if (data.status === 'FAILED') {
              setUploading(false);
              setUploadProgress(0);
              alert(`Ingestion failed: ${data.message}`);
            } else {
              setUploadProgress(data.progress || 0);
              setUploading(true);
            }
          } catch (e) {
            console.error('Failed to parse SSE message:', e);
          }
        };

        eventSource.onerror = () => {
          console.warn('SSE connection lost, reconnecting...');
          eventSource.close();
          // Optional: Reconnect after a delay
          setTimeout(setupSSE, 5000);
        };

        return () => eventSource.close();
      } catch (e) {
        console.error('Failed to set up SSE:', e);
      }
    };

    const cleanup = setupSSE();
    return () => {
      cleanup.then(fn => fn?.());
    };
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
      setUploading(true);
      setUploadProgress(5);
      
      const formData = new FormData();
      formData.append('file', file);

      await ApiClient.post('/vault/upload', formData);
      // The SSE will take over the progress updates from here
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload document. Please ensure the backend is running.');
      setUploading(false);
      setUploadProgress(0);
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
      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                <Database className="w-8 h-8 text-violet-600" />
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
                disabled={uploading}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-full px-6 shadow-lg shadow-violet-500/20 gap-2 transition-all w-full sm:w-auto"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                {uploading ? `Ingesting (${uploadProgress}%)` : 'Upload Intelligence'}
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            {/* Sidebar Controls */}
            <div className="md:col-span-1 space-y-6">
              <Card className="border-border bg-card shadow-sm overflow-hidden">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Search & Filter</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search files..." 
                      className="pl-9 bg-muted/50 border-border rounded-xl focus:ring-violet-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">File Type</label>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="cursor-pointer bg-violet-500/10 text-violet-600 border-violet-500/20">All</Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted">PDF</Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-muted">MD</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-violet-600/20 bg-violet-500/5 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <BrainCircuit className="w-5 h-5 text-violet-600 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-violet-600 uppercase tracking-wider">Strategic Ingestion</p>
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
                    <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                  ))}
                </div>
              ) : filteredDocs.length === 0 ? (
                <Card className="border-dashed border-2 border-border bg-transparent shadow-none p-12 flex flex-col items-center justify-center text-center">
                  <div className="p-4 bg-muted rounded-full mb-4">
                    <Database className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">No Knowledge Assets</h3>
                  <p className="text-muted-foreground max-w-xs mt-1">
                    Your Knowledge Vault is empty. Upload documents to give your AI founder proprietary business context.
                  </p>
                  <Button variant="outline" className="mt-6 rounded-full" onClick={handleUploadClick}>
                    Add First Asset
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredDocs.map((doc) => (
                    <Card key={doc.name} className="border-border bg-card hover:border-violet-500/30 transition-all group overflow-hidden shadow-sm">
                      <CardContent className="p-0">
                        <div className="flex items-center p-4 gap-4">
                          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-violet-600/10 transition-colors">
                            <FileText className="h-6 w-6 text-muted-foreground group-hover:text-violet-600" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-foreground truncate">{doc.name}</h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(doc.ingestedAt)}</span>
                              <span>•</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-violet-500 border-violet-500/20 bg-violet-500/5">
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
                              className="h-9 w-9 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
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
              <AlertDialogTitle className="text-xl font-bold">Purge Asset from Memory?</AlertDialogTitle>
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
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition-colors"
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

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
