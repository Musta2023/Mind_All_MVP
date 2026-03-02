'use client';

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
import { getAccessToken } from '@/lib/api-client';
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// 1. Strict Type Definitions
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
      const token = await getAccessToken();
      let response = await fetch(`${API_URL}/roadmap`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.status === 401) {
        const { refreshAccessToken } = await import('@/lib/api-client');
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(`${API_URL}/roadmap`, {
            headers: { Authorization: `Bearer ${newToken}` },
            credentials: 'include',
          });
        } else {
          window.location.href = '/auth/login';
          return;
        }
      }

      if (!response.ok) throw new Error('Failed to fetch roadmaps');
      const data = await response.json();
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
      let response = await fetch(`${API_URL}/roadmap/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.status === 401) {
        const { refreshAccessToken } = await import('@/lib/api-client');
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(`${API_URL}/roadmap/generate`, {
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
      const token = await getAccessToken();
      let response = await fetch(`${API_URL}/roadmap/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.status === 401) {
        const { refreshAccessToken } = await import('@/lib/api-client');
        const newToken = await refreshAccessToken();
        if (newToken) {
          response = await fetch(`${API_URL}/roadmap/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${newToken}` },
            credentials: 'include',
          });
        } else {
          window.location.href = '/auth/login';
          return;
        }
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Delete failed');
      }

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
                <div className="p-2 bg-violet-500/10 text-violet-500 rounded-lg shadow-sm border border-violet-500/20">
                  <Map className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-violet-600 tracking-wide uppercase">Strategic Execution</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">90-Day Roadmaps</h1>
              <p className="text-muted-foreground mt-1 font-medium">AI-generated operational plans tailored to your current stage and goals.</p>
            </div>

            <Button
              onClick={handleGenerateRoadmap}
              disabled={generating}
              className="bg-violet-600 hover:bg-violet-700 shadow-md gap-2 rounded-full px-6 transition-all duration-300"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Drafting Strategy...' : 'Generate New Roadmap'}
            </Button>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-100 animate-in fade-in slide-in-from-top-2">
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Active Generation Streaming UI */}
          {streaming && (
            <Card className="border-violet-500/30 bg-card shadow-lg shadow-violet-500/5 overflow-hidden animate-in fade-in slide-in-from-bottom-4 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-violet-500 via-purple-500 to-violet-500 bg-size-[200%_auto] animate-gradient"></div>
              <CardHeader className="bg-violet-500/5 border-b border-violet-500/10 pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-violet-500">
                  <BotIcon className="w-5 h-5 text-violet-500 animate-pulse" />
                  AI Architect Thinking...
                </CardTitle>
                <CardDescription className="text-violet-500/70">Analyzing profile constraints and drafting 90-day execution steps.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 bg-slate-950">
                <div className="p-6 max-h-[40vh] overflow-y-auto font-mono text-sm text-violet-400 whitespace-pre-wrap prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      h1: ({ node, ...props }) => <h1 className="text-white mt-4 mb-2 font-bold" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="text-violet-300 mt-4 mb-2 font-semibold" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc ml-4 mb-4 text-slate-300" {...props} />,
                      li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                      strong: ({ node, ...props }) => <strong className="text-white" {...props} />
                    }}
                  >
                    {streamContent}
                  </ReactMarkdown>
                  <span className="animate-pulse inline-block w-2 h-4 bg-violet-400 ml-1 translate-y-1"></span>
                  <div ref={streamEndRef} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Area */}
          {loading ? (
            /* Skeleton Loading State */
            <div className="space-y-8">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          ) : roadmaps.length === 0 && !streaming ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-border rounded-3xl bg-card shadow-sm animate-in fade-in duration-700">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
                <Map className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No roadmaps generated</h3>
              <p className="text-muted-foreground max-w-sm mb-6 text-sm">
                Generate your first 90-day strategic execution plan. The AI will align it with your current runway and funding constraints.
              </p>
              <Button onClick={handleGenerateRoadmap} variant="outline" className="gap-2 rounded-full border-border hover:bg-muted text-foreground">
                <Sparkles className="w-4 h-4 text-violet-500" />
                Generate 90-Day Plan
              </Button>
            </div>
          ) : (
            /* Roadmap Feed */
            <div className="space-y-10 animate-in fade-in duration-700">
              {roadmaps.map((roadmap, index) => (
                <div key={roadmap.id} className="relative">
                  {/* Timeline connecting line for multiple roadmaps */}
                  {index !== roadmaps.length - 1 && (
                    <div className="absolute left-8 top-24 -bottom-10 w-px bg-border z-0 hidden md:block"></div>
                  )}

                  <Card className="relative z-10 overflow-hidden shadow-sm border-border bg-card transition-shadow hover:shadow-md">
                    {/* Header */}
                    <CardHeader className="bg-muted/30 border-b border-border/50 pb-5">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            {index === 0 && <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500 text-[10px] font-bold uppercase tracking-wider">Latest Version</span>}
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> {formatDate(roadmap.createdAt)}
                            </span>
                          </div>
                          <CardTitle className="text-xl leading-tight text-foreground">{roadmap.summary}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRoadmapToDelete(roadmap.id)}
                          className="text-muted-foreground hover:text-rose-500 hover:bg-rose-50/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-0">

                      {/* Objectives Section - Shows why & success metrics */}
                      {roadmap.objectives?.length > 0 && (
                        <div className="p-6 border-b border-border/50">
                          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Target className="w-4 h-4 text-rose-500" /> Strategic Objectives
                          </h3>
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {roadmap.objectives.map((obj, idx) => (
                              <div key={idx} className="bg-muted/30 rounded-xl p-4 border border-border/50">
                                <h4 className="font-semibold text-foreground mb-2 flex items-start gap-2">
                                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                  {obj.title}
                                </h4>
                                {obj.why && (
                                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                                    <span className="font-medium text-muted-foreground/70">Why:</span> {obj.why}
                                  </p>
                                )}
                                {obj.success_metric && (
                                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-card border border-border rounded-md text-[11px] font-medium text-foreground">
                                    <BarChart3 className="w-3 h-3 text-violet-500" />
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
                          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                            <Flag className="w-4 h-4 text-violet-500" /> Execution Initiatives
                          </h3>

                          <div className="space-y-6">
                            {roadmap.initiatives.map((init, idx) => (
                              <div key={idx} className="relative pl-6 md:pl-0">
                                {/* Mobile timeline line */}
                                <div className="absolute left-2.75 top-8 -bottom-6 w-px bg-border md:hidden"></div>

                                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                                  {/* Desktop Timeline Info */}
                                  <div className="md:w-1/4 shrink-0 pt-1 relative">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="absolute -left-6 md:hidden w-3 h-3 rounded-full border-2 border-violet-500 bg-background z-10" />
                                      <Calendar className="w-4 h-4 text-muted-foreground hidden md:block" />
                                      <span className="text-sm font-semibold text-violet-500">{init.deadline}</span>
                                    </div>
                                  </div>

                                  {/* Content */}
                                  <div className="md:w-3/4 bg-card border border-border rounded-xl p-4 md:p-5 shadow-sm">
                                    <h4 className="text-base font-semibold text-foreground mb-3">{init.title}</h4>

                                    {init.tasks?.length > 0 && (
                                      <div className="space-y-2.5 mt-4">
                                        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                          <ListTodo className="w-3.5 h-3.5" /> Action Items
                                        </h5>
                                        <ul className="space-y-2">
                                          {init.tasks.map((task, tIdx) => (
                                            <li key={tIdx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                                              <CheckCircle2 className="w-4 h-4 text-emerald-500/50 mt-0.5 shrink-0" />
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
            <AlertDialogTitle className="text-xl font-bold text-foreground">Delete Strategic Roadmap?</AlertDialogTitle>
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
              className="rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20 transition-all border-none"
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
