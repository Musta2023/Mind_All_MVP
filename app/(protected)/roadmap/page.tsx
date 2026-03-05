'use client';
// Build Force: 2026-03-03 14:50

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { getAccessToken, ApiClient, API_URL } from '@/lib/api-client';
import ReactMarkdown from 'react-markdown';
import {
  Map,
  Target,
  Calendar,
  CheckCircle2,
  Sparkles,
  Loader2,
  Flag,
  BarChart3,
  ListTodo,
  Clock,
  ArrowRight,
  Trash2
} from 'lucide-react';

// 1. Strict Type Definitions (Force Redeploy)
interface Objective {
  title: string;
  why: string;
  success_metric: string;
}

interface Task {
  title: string;
}

interface Initiative {
  title: string;
  deadline: string;
  tasks: Task[];
}

interface Roadmap {
  id: string;
  summary: string;
  objectives: Objective[];
  initiatives: Initiative[];
  createdAt: string;
}

export default function RoadmapPage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [generating, setGenerating] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roadmapToDelete, setRoadmapToDelete] = useState<string | null>(null);

  const streamEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadRoadmaps();
  }, []);

  // Auto-scroll stream content
  useEffect(() => {
    if (streaming && streamEndRef.current) {
      streamEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamContent, streaming]);

  const loadRoadmaps = async () => {
    try {
      const data = await ApiClient.get('/roadmap');
      setRoadmaps(data.roadmaps || []);
    } catch (err) {
      console.error('Failed to load roadmaps:', err);
      setError('Failed to load your roadmaps. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Robust Server-Sent Events (SSE) Parser
  const handleGenerateRoadmap = async () => {
    setGenerating(true);
    setStreaming(true);
    setStreamContent('');
    setError(null);

    try {
      const token = await getAccessToken();
      const generateUrl = new URL('roadmap/generate', API_URL).toString();
      let response = await fetch(generateUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.status === 401) {
        const { refreshAccessToken } = await import('@/lib/api-client');
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(generateUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${newToken}` },
            credentials: 'include',
          });
        } else {
          window.location.href = '/auth/login';
          return;
        }
      }

      if (!response.ok) throw new Error('Generation failed');

      const reader = response.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || ''; // Keep the last incomplete chunk in the buffer

          for (const part of parts) {
            if (part.startsWith('event: token')) {
              const dataLine = part.split('\n').find(l => l.startsWith('data: '));
              if (dataLine) {
                try {
                  const data = JSON.parse(dataLine.slice(6));
                  setStreamContent((prev) => prev + data.token);
                } catch (e) { /* Ignore partial JSON parses */ }
              }
            } else if (part.startsWith('event: complete')) {
              const dataLine = part.split('\n').find(l => l.startsWith('data: '));
              if (dataLine) {
                try {
                  const data = JSON.parse(dataLine.slice(6));
                  // Prepend the new roadmap to the list
                  setRoadmaps((prev) => [
                    { ...data.roadmap, id: data.savedId || Date.now().toString(), createdAt: new Date().toISOString() },
                    ...prev,
                  ]);
                } catch (e) { console.error('Error parsing complete event', e) }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error generating roadmap:', err);
      setError('Generation interrupted. Please try again.');
    } finally {
      setGenerating(false);
      setStreaming(false);
      // Small delay to clear stream content so the user sees the transition to the actual card
      setTimeout(() => setStreamContent(''), 500);
    }
  };

  const handleDeleteRoadmap = async (id: string) => {
    try {
      await ApiClient.delete(`/roadmap/${id}`);
      setRoadmaps((prev) => prev.filter((r) => r.id !== id));
      setRoadmapToDelete(null);
    } catch (err: any) {
      console.error('Error deleting roadmap:', err);
      alert(`Failed to delete roadmap: ${err.message}`);
    }
  };

  const formatDate = (isoString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(isoString));
  };

  return (
    <>
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="mx-auto max-w-5xl space-y-8 p-6 md:p-8">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-primary/10 text-primary rounded-lg shadow-sm border border-primary/20">
                  <Map className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-primary tracking-wide uppercase">Strategic Execution</span>
              </div>
              <h1 className="text-xl font-medium tracking-tight text-foreground dark:text-white">90-Day Roadmaps</h1>
              <p className="text-muted-foreground mt-1 font-medium">AI-generated operational plans tailored to your current stage and goals.</p>
            </div>

            <Button
              onClick={handleGenerateRoadmap}
              disabled={generating}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-primary gap-2 rounded-full px-6 transition-all duration-300"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Drafting Strategy...' : 'Generate New Roadmap'}
            </Button>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20 animate-in fade-in slide-in-from-top-2">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Active Generation Streaming UI */}
          {streaming && (
            <Card className="border-primary/30 bg-card shadow-lg shadow-primary/5 overflow-hidden animate-in fade-in slide-in-from-bottom-4 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary via-accent to-primary bg-size-[200%_auto] animate-gradient"></div>
              <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <BotIcon className="w-5 h-5 text-primary animate-pulse" />
                  AI Architect Thinking...
                </CardTitle>
                <CardDescription className="text-primary/70">Analyzing profile constraints and drafting 90-day execution steps.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 bg-background/80 backdrop-blur-xl">
                <div className="p-6 max-h-[40vh] overflow-y-auto font-mono text-sm text-primary whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => <h1 className="text-foreground dark:text-white mt-4 mb-2 font-medium" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="text-primary mt-4 mb-2 font-semibold" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-4 text-muted-foreground" {...props} />,
                      li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                      strong: ({ node, ...props }) => <strong className="text-foreground dark:text-white" {...props} />
                    }}
                  >
                    {streamContent}
                  </ReactMarkdown>
                  <span className="animate-pulse inline-block w-2 h-4 bg-primary ml-1 translate-y-1"></span>
                  <div ref={streamEndRef} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Area */}
          {loading ? (
            /* Skeleton Loading State */
            <div className="space-y-8">
              <Skeleton className="h-64 w-full rounded-2xl bg-muted/50" />
              <Skeleton className="h-64 w-full rounded-2xl bg-muted/50" />
            </div>
          ) : roadmaps.length === 0 && !streaming ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-border rounded-3xl bg-card shadow-sm animate-in fade-in duration-700">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                <Map className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground dark:text-white mb-2">No roadmaps generated</h3>
              <p className="text-muted-foreground max-w-sm mb-6 text-sm">
                Generate your first 90-day strategic execution plan. The AI will align it with your current runway and funding constraints.
              </p>
              <Button onClick={handleGenerateRoadmap} variant="outline" className="gap-2 rounded-full border-primary/20 text-primary hover:bg-primary/5">
                <Sparkles className="w-4 h-4 text-primary" />
                Generate 90-Day Plan
              </Button>
            </div>
          ) : (
            /* Roadmap Feed */
            <div className="space-y-10 animate-in fade-in duration-700">
              {roadmaps.map((roadmap, index) => (
                <div key={roadmap.id} className="relative">
                  {/* Timeline connecting line removed */}

                  <Card glass className="relative z-10 overflow-hidden shadow-sm border-border bg-card transition-all hover:shadow-glow-soft">
                    {/* Header */}
                    <CardHeader className="bg-muted/30 border-b border-border/50 pb-5">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            {index === 0 && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium uppercase tracking-wider border border-primary/20">Latest Version</span>}
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> {formatDate(roadmap.createdAt)}
                            </span>
                          </div>
                          <CardTitle className="text-xl leading-tight text-foreground dark:text-white">{roadmap.summary}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRoadmapToDelete(roadmap.id)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0">

                      {/* Objectives Section - Shows why & success metrics */}
                      {roadmap.objectives?.length > 0 && (
                        <div className="p-6 border-b border-border/50">
                          <h3 className="text-sm font-medium text-foreground dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" /> Strategic Objectives
                          </h3>
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {roadmap.objectives.map((obj, idx) => (
                              <div key={idx} className="bg-muted/30 rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-colors">
                                <h4 className="font-semibold text-foreground dark:text-white mb-2 flex items-start gap-2">
                                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0 shadow-[0_0_5px_#2FD3FF]" />
                                  {obj.title}
                                </h4>
                                {obj.why && (
                                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                                    <span className="font-medium text-muted-foreground/70">Why:</span> {obj.why}
                                  </p>
                                )}
                                {obj.success_metric && (
                                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-background/50 border border-border rounded-md text-[11px] font-medium text-primary">
                                    <BarChart3 className="w-3 h-3 text-primary" />
                                    {obj.success_metric}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Initiatives Section - Shows timeline & tasks */}
                      {roadmap.initiatives?.length > 0 && (
                        <div className="p-6">
                          <h3 className="text-sm font-medium text-foreground dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                            <Flag className="w-4 h-4 text-primary" /> Execution Initiatives
                          </h3>

                          <div className="space-y-6">
                            {roadmap.initiatives.map((init, idx) => (
                              <div key={idx} className="relative md:pl-0">
                                {/* Mobile timeline line removed */}

                                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                                  {/* Desktop Timeline Info */}
                                  <div className="md:w-1/4 shrink-0 pt-1 relative">
                                    <div className="flex items-center gap-2 mb-1">
                                      {/* Circle removed */}
                                      <Calendar className="w-4 h-4 text-muted-foreground hidden md:block" />
                                      <span className="text-sm font-semibold text-primary">{init.deadline}</span>
                                    </div>
                                  </div>

                                  {/* Content */}
                                  <div className="md:w-3/4 bg-background/40 border border-border rounded-xl p-4 md:p-5 shadow-sm hover:border-primary/20 transition-colors">
                                    <h4 className="text-base font-semibold text-foreground dark:text-white mb-3">{init.title}</h4>

                                    {init.tasks?.length > 0 && (
                                      <div className="space-y-2.5 mt-4">
                                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                          <ListTodo className="w-3.5 h-3.5" /> Action Items
                                        </h5>
                                        <ul className="space-y-2">
                                          {init.tasks.map((task, tIdx) => (
                                            <li key={tIdx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                                              <CheckCircle2 className="w-4 h-4 text-success/50 mt-0.5 shrink-0" />
                                              <span className="leading-snug">{task.title}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={!!roadmapToDelete} onOpenChange={(open) => !open && setRoadmapToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-border bg-card shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-medium text-foreground dark:text-white">Delete Strategic Roadmap?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground leading-relaxed">
              This action cannot be undone. This will permanently remove the 90-day plan and all associated strategic initiatives from your archives.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row items-center justify-end gap-3 mt-4">
            <AlertDialogCancel className="rounded-full border-border text-muted-foreground hover:bg-muted bg-card mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roadmapToDelete && handleDeleteRoadmap(roadmapToDelete)}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20 transition-all border-none font-medium"
            >
              Confirm Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Quick inline icon component to keep imports clean above
function BotIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
    </svg>
  );
}
