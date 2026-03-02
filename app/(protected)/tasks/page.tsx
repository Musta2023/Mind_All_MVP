'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import {
  Map,
  Rocket,
  Clock,
  CheckCircle2,
  Trash2,
  Plus,
  ArrowRight,
  Bot,
  Filter,
  ListTodo,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
  priority: number;
  dueDate?: string;
  goal?: { title: string };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await ApiClient.get('/startup/tasks');
      setTasks(data || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await ApiClient.patch(`/startup/tasks/${id}`, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
    } catch (e) {
      console.error('Failed to update task status:', e);
    }
  };

  const handleDeleteTask = (id: string) => {
    setTaskToDelete(id);
    setIsDeleteOpen(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await ApiClient.delete(`/startup/tasks/${taskToDelete}`);
      setTasks(prev => prev.filter(t => t.id !== taskToDelete));
      if (selectedTask?.id === taskToDelete) setSelectedTask(null);
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setIsDeleteOpen(false);
      setTaskToDelete(null);
    }
  };

  return (
    <>
      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 animate-in fade-in duration-500">
        <div className="mx-auto max-w-7xl space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                <div className="p-2 bg-violet-600/10 rounded-xl">
                  <ListTodo className="w-8 h-8 text-violet-600" />
                </div>
                Execution Board
              </h1>
              <p className="text-muted-foreground mt-1 font-medium">Manage and track your AI-generated tactical operations.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2 border-border" onClick={() => router.push('/chat')}>
                <Plus className="w-4 h-4" />
                Add Strategic Task
              </Button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {['TODO', 'IN_PROGRESS', 'DONE'].map(status => (
              <div key={status} className="flex flex-col h-full min-h-[650px] bg-muted/20 rounded-2xl border border-border/50 p-4 space-y-4 shadow-inner">
                <div className="flex items-center justify-between px-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full ring-4 ring-offset-2 ring-transparent",
                      status === 'TODO' ? "bg-slate-400 ring-slate-400/10" : status === 'IN_PROGRESS' ? "bg-violet-500 ring-violet-500/10" : "bg-emerald-500 ring-emerald-500/10"
                    )} />
                    <span className="text-xs font-bold uppercase tracking-widest text-foreground/70">
                      {status.replace('_', ' ')}
                    </span>
                  </div>
                  <Badge variant="secondary" className="bg-muted text-[10px] h-5 px-2 font-bold shadow-sm">
                    {tasks.filter(t => t.status === status).length}
                  </Badge>
                </div>

                <div className="flex-1 space-y-3">
                  {loading ? (
                    [1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)
                  ) : tasks.filter(t => t.status === status).length === 0 ? (
                    <div className="h-32 border border-dashed border-border/50 rounded-xl flex flex-col items-center justify-center text-muted-foreground/30 text-xs font-medium italic gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                      Empty Stage
                    </div>
                  ) : (
                    tasks.filter(t => t.status === status).map(task => (
                      <Card 
                        key={task.id} 
                        onClick={() => setSelectedTask(task)}
                        className="border-border bg-card shadow-sm hover:shadow-lg transition-all group cursor-pointer hover:border-violet-500/40 relative"
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-[14px] font-bold text-foreground leading-tight line-clamp-2">{task.title}</h4>
                            <Badge className={cn(
                              "text-[8px] font-bold px-1.5 py-0 h-4 shrink-0",
                              task.priority > 7 ? "bg-rose-500" : task.priority > 4 ? "bg-amber-500" : "bg-violet-500"
                            )}>
                              P{task.priority}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1.5">
                              {task.goal && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-violet-500/5 border border-violet-500/10 rounded text-[9px] text-violet-600 font-bold uppercase tracking-tighter">
                                  <Rocket className="w-2.5 h-2.5" />
                                  {task.goal.title.substring(0, 12)}...
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                              {status !== 'DONE' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-emerald-500 hover:bg-emerald-50 rounded-lg"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskStatusUpdate(task.id, status === 'TODO' ? 'IN_PROGRESS' : 'DONE');
                                  }}
                                >
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-[550px] border-border bg-card shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-border">
                {selectedTask?.status.replace('_', ' ')}
              </Badge>
              <Badge className={cn(
                "text-[10px] font-bold shadow-sm",
                selectedTask && selectedTask.priority > 7 ? "bg-rose-500" : selectedTask && selectedTask.priority > 4 ? "bg-amber-500" : "bg-violet-500"
              )}>
                Priority P{selectedTask?.priority}
              </Badge>
            </div>
            <DialogTitle className="text-2xl font-bold leading-tight tracking-tight text-foreground">
              {selectedTask?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            {selectedTask?.description && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Bot className="w-3 h-3 text-violet-500" />
                  Strategic Context
                </h4>
                <div className="p-5 bg-muted/30 rounded-2xl border border-border text-sm leading-relaxed text-foreground whitespace-pre-wrap font-medium">
                  {selectedTask.description}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Strategic Goal</p>
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <div className="p-1.5 bg-violet-500/10 rounded-lg">
                    <Rocket className="w-4 h-4 text-violet-500" />
                  </div>
                  {selectedTask?.goal?.title || 'General Strategy'}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Target Date</p>
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                  <div className="p-1.5 bg-muted rounded-lg">
                    <Clock className="w-4 h-4" />
                  </div>
                  {selectedTask?.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'No deadline'}
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-between items-center border-t border-border/50">
              <Button 
                variant="ghost" 
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 gap-2 font-bold text-xs"
                onClick={() => handleDeleteTask(selectedTask!.id)}
              >
                <Trash2 className="w-4 h-4" />
                Purge Operation
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" className="font-bold text-xs" onClick={() => setSelectedTask(null)}>Close</Button>
                {selectedTask?.status !== 'DONE' && (
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 font-bold text-xs"
                    onClick={() => {
                      if (selectedTask) {
                        handleTaskStatusUpdate(selectedTask.id, selectedTask.status === 'TODO' ? 'IN_PROGRESS' : 'DONE');
                        setSelectedTask(null);
                      }
                    }}
                  >
                    Mark as {selectedTask?.status === 'TODO' ? 'In Progress' : 'Completed'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDeleteTask}
        title="Confirm Deletion?"
        description="This will permanently purge this tactical operation from your board and remove it from the strategic progression tracking."
      />
    </>
  );
}
