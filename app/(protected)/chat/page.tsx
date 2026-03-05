'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Bot,
  Map,
  Rocket,
  Clock,
  Wallet,
  Sparkles,
  Activity,
  ArrowRight,
  TrendingUp,
  Sunrise,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  BrainCircuit,
  Trash2,
  Loader2,
  Send,
  User,
  Square,
  Copy,
  Check,
  Plus,
  MessageSquare,
  Menu,
  X,
  FileText,
  Gavel,
  Shield,
  AlertTriangle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getAccessToken, ApiClient, API_URL } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';

const TaskCard = ({ task }: { task: any }) => {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const tool = task.tool || task.tool_call || 'unknown';
  const isCreate = tool === 'createTask';
  const isSearch = tool === 'searchWeb';
  const isGoal = tool === 'createGoal' || tool === 'updateGoal';
  const args = task.args || task.parameters || {};
  
  const handleAddTask = async () => {
    setLoading(true);
    try {
      await ApiClient.post('/startup/tasks', {
        title: args.title,
        description: args.description,
        priority: args.priority,
        dueDate: args.dueDate,
        goalId: args.goalId,
        status: args.status || 'TODO'
      });
      setAdded(true);
    } catch (e) {
      console.error('Failed to manually add task:', e);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    if (isSearch) return <Activity className="w-5 h-5 text-accent" />;
    if (isGoal) return <TrendingUp className="w-5 h-5 text-success" />;
    if (args.title?.toLowerCase().includes('legal')) return <Gavel className="w-5 h-5 text-warning" />;
    if (args.title?.toLowerCase().includes('technical') || args.title?.toLowerCase().includes('mvp')) return <Rocket className="w-5 h-5 text-primary" />;
    return <FileText className="w-5 h-5 text-primary" />;
  };

  const getLabel = () => {
    if (isSearch) return 'Intelligence Search';
    if (isGoal) return tool === 'createGoal' ? 'Goal Proposed' : 'Goal Update';
    if (isCreate) return 'Action Proposed';
    return 'Action Update';
  };

  const getTitle = () => {
    if (isSearch) return args.query || 'Searching...';
    return args.title || 'Untitled Action';
  };

  return (
    <Card className={cn(
      "my-4 border-l-4 shadow-sm overflow-hidden animate-in zoom-in-95 duration-300",
      isSearch ? "border-l-accent bg-accent/5" :
      isGoal ? "border-l-success bg-success/5" :
      "border-l-primary bg-primary/5"
    )}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            isSearch ? "bg-accent/10" : isGoal ? "bg-success/10" : "bg-primary/10"
          )}>
            {getIcon()}
          </div>
          <div>
            <CardTitle className="text-sm font-medium text-foreground">
              {getLabel()}
            </CardTitle>
            <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-widest">
              {isSearch ? 'Real-time Intelligence' : 'Level 4 Operational Task'}
            </p>
          </div>
        </div>
        {(args.priority || args.deadline) && (
          <Badge className={cn(
            "text-[9px] font-medium px-1.5 py-0.5",
            args.priority === 'high' || args.priority > 7 ? "bg-destructive" : 
            isGoal ? "bg-success" : "bg-primary"
          )}>
            {args.priority || 'Medium'}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground leading-snug">
          {getTitle()}
        </h4>
        {args.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {args.description}
          </p>
        )}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3">
            {(args.dueDate || args.deadline) && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                <Clock className="w-3 h-3" />
                Due: {new Date(args.dueDate || args.deadline).toLocaleDateString()}
              </div>
            )}
            {args.goalId && (
              <div className="flex items-center gap-1 text-[10px] text-primary font-medium bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 uppercase tracking-tighter">
                <Rocket className="w-3 h-3" />
                {args.goalId}
              </div>
            )}
          </div>
          
          {isCreate && (
            <Button 
              size="sm" 
              variant={added ? "secondary" : "default"}
              disabled={loading || added}
              onClick={handleAddTask}
              className={cn(
                "h-7 text-[10px] font-medium px-3 gap-1.5 transition-all",
                added ? "bg-success/10 text-success border-success/20 hover:bg-success/10" : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              )}
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : added ? <CheckCircle2 className="w-3 h-3 text-success" /> : <Plus className="w-3 h-3" />}
              {added ? 'Added to Board' : 'Add to Board'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
}

const EpistemicHonestyCard = ({ content }: { content: string }) => {
  const lines = content.split('\n').filter(l => l.includes(':'));
  const data: Record<string, string> = {};
  lines.forEach(line => {
    const [key, ...val] = line.split(':');
    data[key.trim()] = val.join(':').trim();
  });

  const getScoreColor = (score: string) => {
    const val = parseFloat(score);
    if (isNaN(val)) return 'text-muted-foreground';
    if (val >= 0.8) return 'text-success';
    if (val >= 0.5) return 'text-warning';
    return 'text-destructive';
  };

  // Flexible key matching
  const conclusion = data['Main Conclusion'] || data['Conclusion'];
  const reasoning = data['Reasoning'] || data['Analysis'];
  const risk = data['Primary Risk'] || data['Primary Risk Factor'] || data['Risk'];
  const score = data['Confidence Score'] || data['Confidence'];

  return (
    <Card className="my-6 border-l-4 border-l-warning bg-warning/5 shadow-md overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      <CardHeader className="pb-2 flex flex-row items-center justify-between bg-warning/10">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-warning" />
          <CardTitle className="text-xs font-black uppercase tracking-widest text-warning-foreground dark:text-warning">
            Epistemic Honesty Protocol
          </CardTitle>
        </div>
        {score && (
          <Badge variant="outline" className={cn("bg-card font-mono text-[10px]", getScoreColor(score))}>
            Score: {score}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {conclusion && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Conclusion</p>
            <p className="text-sm font-semibold text-foreground leading-snug">{conclusion}</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reasoning && (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Reasoning</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{reasoning}</p>
            </div>
          )}
          {risk && (
            <div className="space-y-1 p-2 bg-destructive/5 border border-destructive/10 rounded-lg">
              <p className="text-[10px] font-medium text-destructive uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Risk Factor
              </p>
              <p className="text-xs text-destructive leading-relaxed font-medium">{risk}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = status.toUpperCase();
  if (s.includes('DONE')) return <Badge className="bg-success/10 text-success border-success/20 text-[9px] px-1.5 py-0">DONE</Badge>;
  if (s.includes('PROGRESS')) return <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] px-1.5 py-0">IN PROGRESS</Badge>;
  if (s.includes('TODO')) return <Badge className="bg-muted text-muted-foreground border-border text-[9px] px-1.5 py-0">TODO</Badge>;
  if (s.includes('BLOCK')) return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[9px] px-1.5 py-0">BLOCKED</Badge>;
  return <Badge variant="outline" className="text-[9px] px-1.5 py-0">{status}</Badge>;
};

const extractText = (node: any): string => {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node?.props?.children) return extractText(node.props.children);
  return '';
};

const TaskCardItem = ({ status, content, priority }: { status: string, content: string, priority?: string }) => {
  return (
    <div className="flex items-start gap-3 p-3 bg-card border border-border/50 rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all group mb-2 last:mb-0">
      <div className="mt-0.5 shrink-0">
        <StatusBadge status={status} />
      </div>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors truncate">
          <ReactMarkdown components={{ p: ({node, ...props}) => <span {...props} /> }}>{content}</ReactMarkdown>
        </div>
        {priority && (
          <Badge className={cn(
            "text-[8px] font-medium px-1.5 h-4 shrink-0",
            parseInt(priority) > 7 ? "bg-destructive" : parseInt(priority) > 4 ? "bg-warning" : "bg-primary"
          )}>
            P{priority}
          </Badge>
        )}
      </div>
    </div>
  );
};

import { useStrategicStore } from '@/lib/store/use-strategic-store';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  // Zustand Store
  const { 
    confirmedStrategy, 
    emergingObservations, 
    fetchDashboardData,
    profile 
  } = useStrategicStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
    if (!profile) {
      fetchDashboardData();
    }
    
    // Automatically load the latest conversation if none is selected
    // but don't create one if none exist.
    const initializeChat = async () => {
      try {
        const data = await ApiClient.get('/chat/conversations');
        const latest = data.conversations?.[0];
        if (latest && !conversationId) {
          loadConversation(latest.id);
        }
      } catch (e) {}
    };
    
    initializeChat();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await ApiClient.get('/chat/conversations');
      setConversations(data.conversations || []);
      return data.conversations;
    } catch (error) {
      console.error('Failed to load conversations:', error);
      return [];
    }
  };

  const loadConversation = async (id: string) => {
    setLoadingHistory(true);
    try {
      const data = await ApiClient.get(`/chat/conversations/${id}`);
      setMessages(data.messages || []);
      setConversationId(id);
      setShowHistory(false);
      
      // Refresh global store to sync any new insights from history
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setConversationId(undefined); // Clear ID so next message creates a NEW conversation
    setShowHistory(false);
    if (textareaRef.current) {
      textareaRef.current.value = '';
      textareaRef.current.focus();
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatToDelete(id);
    setIsDeleteOpen(true);
  };

  const confirmDeleteChat = async () => {
    if (!chatToDelete) return;
    try {
      await ApiClient.delete(`/chat/conversations/${chatToDelete}`);
      setConversations(prev => prev.filter(c => c.id !== chatToDelete));
      if (conversationId === chatToDelete) {
        startNewChat();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    } finally {
      setIsDeleteOpen(false);
      setChatToDelete(null);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as unknown as React.FormEvent);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const messageId = Date.now().toString();
    setMessages((prev) => [...prev, { id: messageId, role: 'user', content: userMessage }]);
    setLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      const token = await getAccessToken();
      const chatSendUrl = new URL('chat/send', API_URL).toString();
      let response = await fetch(chatSendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          conversationId,
          message: userMessage,
        }),
        signal: abortControllerRef.current.signal,
      });

      // Handle token expiration/401
      if (response.status === 401) {
        const { refreshAccessToken } = await import('@/lib/api-client');
        const newToken = await refreshAccessToken();
        if (newToken) {
          // Retry once with new token
          response = await fetch(chatSendUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${newToken}`,
            },

            credentials: 'include',
            body: JSON.stringify({
              conversationId,
              message: userMessage,
            }),
            signal: abortControllerRef.current.signal,
          });
        } else {
          window.location.href = '/auth/login';
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to send message' }));
        throw new Error(errorData.message || 'Failed to send message');
      }

      const assistantMsgId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

      let assistantMessage = '';
      const reader = response.body?.getReader();

      if (reader) {
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            if (part.startsWith('event: token')) {
              const dataLine = part.split('\n').find(l => l.startsWith('data: '));
              if (dataLine) {
                try {
                  const data = JSON.parse(dataLine.slice(6));
                  assistantMessage += data.token;
                  setMessages((prev) =>
                    prev.map(msg =>
                      msg.id === assistantMsgId
                        ? { ...msg, content: assistantMessage }
                        : msg
                    )
                  );
                } catch (e) { }
              }
            } else if (part.startsWith('event: complete')) {
              const dataLine = part.split('\n').find(l => l.startsWith('data: '));
              if (dataLine) {
                try {
                  const data = JSON.parse(dataLine.slice(6));
                  if (data.conversationId) {
                    setConversationId(data.conversationId);
                    loadConversations();
                  }
                } catch (e) { }
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation stopped by user');
      } else {
        console.error('Error:', error);
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: 'assistant', content: '⚠️ *Connection interrupted. Please try again.*' },
        ]);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const HistoryContent = () => (
    <div className="flex flex-col h-full bg-muted/30">
      <div className="p-4 border-b border-border bg-card">
        <Button onClick={startNewChat} className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
          <Plus className="w-4 h-4" />
          New Conversation
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm font-medium">No history yet</div>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => loadConversation(c.id)}
              className={cn(
                "group relative flex flex-col p-3 rounded-xl cursor-pointer transition-all border border-transparent",
                conversationId === c.id ? "bg-card border-border shadow-sm" : "hover:bg-muted/50"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-sm font-semibold truncate pr-6", conversationId === c.id ? "text-primary" : "text-foreground/80")}>
                  {c.title || 'Untitled Chat'}
                </span>
                <button
                  onClick={(e) => deleteConversation(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive text-muted-foreground transition-all absolute right-2 top-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-1 font-medium">
                {c.preview || 'No messages yet'}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const ContextContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-success/10 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-widest text-success">
              Confirmed Strategy
            </h4>
          </div>
          {confirmedStrategy.length === 0 ? (
            <p className="text-xs text-muted-foreground italic pl-8">No confirmed pillars yet.</p>
          ) : (
            <div className="space-y-3 pl-2">
              {confirmedStrategy.map((item, idx) => (
                <div key={idx} className="p-3 bg-card border border-success/10 rounded-xl shadow-sm text-sm font-medium leading-relaxed group hover:border-success/30 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                    <span className="text-foreground/90">{item.insight}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <h4 className="text-xs font-black uppercase tracking-widest text-primary">
              Emerging Observations
            </h4>
          </div>
          {emergingObservations.length === 0 ? (
            <p className="text-xs text-muted-foreground italic pl-8">No emerging signals detected.</p>
          ) : (
            <div className="space-y-3 pl-2">
              {emergingObservations.map((item, idx) => (
                <div key={idx} className="p-3 bg-muted/50 border border-border/50 rounded-xl text-sm font-medium leading-relaxed group hover:border-primary/30 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">{item.insight}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-6 bg-muted/20 border-t border-border">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          The Strategic Context is automatically derived from your conversations and Knowledge Vault data. It serves as the grounding layer for all AI-generated advice.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full border-x border-border bg-card shadow-sm h-full">
        {/* Desktop Sidebar (History) */}
        <aside className="hidden md:flex flex-col w-72 border-r border-border h-full overflow-hidden">
          <HistoryContent />
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Header */}
          <header className="border-b border-border p-4 flex items-center justify-between bg-card/80 backdrop-blur-xl sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-muted-foreground"
                onClick={() => setShowHistory(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div className="p-2 bg-primary/10 rounded-xl border border-primary/20 shadow-sm">
                <BrainCircuit className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground dark:text-white leading-tight">Strategy Room</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Neural Link Active</span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowContext(true)}
              className="gap-2 border-primary/20 hover:bg-primary/5 text-primary font-medium rounded-full transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Context
            </Button>
          </header>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:p-6 scroll-smooth" ref={scrollAreaRef}>
            <div className="max-w-3xl mx-auto space-y-8 pb-24">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Retrieving history...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="p-4 bg-card border border-border shadow-xl rounded-2xl">
                    <Bot className="w-10 h-10 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-medium text-foreground dark:text-white tracking-tight">Welcome to the Strategy Room</h3>
                    <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
                      Ask me about your market, analyze your business model, or architect your technical stack.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-4 group animate-in fade-in slide-in-from-bottom-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <Avatar className={`w-8 h-8 mt-1 border shadow-sm ${msg.role === 'user' ? 'border-primary/20' : 'border-border'}`}>
                      {msg.role === 'user' ? (
                        <div className="bg-primary w-full h-full flex items-center justify-center text-primary-foreground text-[10px] font-medium">U</div>
                      ) : (
                        <div className="bg-card w-full h-full flex items-center justify-center text-primary"><Bot className="w-4 h-4" /></div>
                      )}
                    </Avatar>

                    <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`px-5 py-4 rounded-2xl ${msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm shadow-md'
                        : 'bg-muted/50 text-foreground dark:text-white rounded-tl-sm border border-border shadow-sm'
                        }`}>
                        {msg.role === 'assistant' && !msg.content && loading ? (
                          <div className="flex space-x-1 h-5 items-center px-2">
                            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></div>
                          </div>
                        ) : (
                          <div className={`prose dark:prose-invert prose-sm sm:prose-base max-w-none break-words ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                            <ReactMarkdown
                              components={{
                                h1: ({ node, ...props }) => <h1 className="text-xl font-medium mb-4 mt-6 first:mt-0" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-lg font-medium mb-3 mt-5 first:mt-0" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-md font-semibold mb-2 mt-4" {...props} />,
                                ul: ({ node, ...props }) => <ul className="space-y-2 mb-6" {...props} />,
                                li: ({ node, ...props }) => {
                                  const rawText = extractText(props.children);
                                  const taskMatch = rawText.match(/^\[(DONE|TODO|IN_PROGRESS|BLOCKED)\]\s*(.*)$/i);
                                  
                                  if (taskMatch) {
                                    const status = taskMatch[1];
                                    let content = taskMatch[2];
                                    let priority: string | undefined = undefined;
                                    
                                    const pMatch = content.match(/\(Priority:\s*(\d+)\)/i);
                                    if (pMatch) {
                                      priority = pMatch[1];
                                      content = content.replace(/\(Priority:\s*(\d+)\)/i, '').trim();
                                    }
                                    
                                    return <TaskCardItem status={status} content={content} priority={priority} />;
                                  }
                                  return <li className="text-sm ml-4 list-disc mb-1" {...props} />;
                                },
                                code: ({ node, ...props }) => {
                                  const content = String(props.children).trim();
                                  if (content.startsWith('{') && content.includes('"tool"')) {
                                    try {
                                      const cleaned = content.replace(/,\s*([\]}])/g, '$1').trim();
                                      return <TaskCard task={JSON.parse(cleaned)} />;
                                    } catch (e) {}
                                  }
                                  return <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono" {...props} />;
                                },
                                p: ({ node, ...props }) => {
                                  const rawText = extractText(props.children);

                                  // 1. Detect and render System Execution Notes
                                  if (rawText.startsWith('[System:')) {
                                    return (
                                      <p className="text-[11px] font-medium text-success bg-success/5 px-2.5 py-1.5 rounded-lg border border-success/10 flex items-center gap-2 my-4 shadow-sm italic">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                        {rawText.slice(1, -1)}
                                      </p>
                                    );
                                  }

                                  // 2. Detect and render Epistemic Honesty Block
                                  if (rawText.includes('EPISTEMIC HONESTY:')) {
                                    const parts = rawText.split('EPISTEMIC HONESTY:');
                                    return (
                                      <div className="my-4">
                                        {parts[0].trim() && <p className="mb-4 leading-relaxed">{parts[0].trim()}</p>}
                                        <EpistemicHonestyCard content={parts[1].trim()} />
                                      </div>
                                    );
                                  }

                                  // 3. Robust Task Board Detection & Grouping
                                  const lines = rawText.split('\n');
                                  const hasTaskInPara = lines.some(l => /\[(DONE|TODO|IN_PROGRESS|BLOCKED)\]/i.test(l));
                                  const hasBoardHeader = lines.some(l => /Board:/i.test(l));

                                  if (hasTaskInPara || hasBoardHeader) {
                                    const elements: React.ReactNode[] = [];
                                    let currentBoard: any[] = [];

                                    const flushBoard = (key: number) => {
                                      if (currentBoard.length === 0) return null;
                                      const board = (
                                        <div key={`board-${key}`} className="my-6 border border-border/60 rounded-2xl overflow-hidden bg-card/50 shadow-sm border-l-4 border-l-primary">
                                          <div className="bg-muted/50 px-4 py-2 border-b border-border/50 flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Strategic Tactical Board</span>
                                            <Badge variant="outline" className="text-[9px] font-medium bg-card">{currentBoard.length} Operations</Badge>
                                          </div>
                                          <div className="p-3 space-y-2">
                                            {currentBoard.map((task, idx) => (
                                              <TaskCardItem key={idx} {...task} />
                                            ))}
                                          </div>
                                        </div>
                                      );
                                      currentBoard = [];
                                      return board;
                                    };

                                    lines.forEach((line, i) => {
                                      const trimmed = line.trim();
                                      const taskMatch = trimmed.match(/^(?:[-*]\s*)?\[(DONE|TODO|IN_PROGRESS|BLOCKED)\]\s*(.*)$/i);
                                      
                                      if (taskMatch) {
                                        let content = taskMatch[2];
                                        let priority: string | undefined = undefined;
                                        const pMatch = content.match(/\(Priority:\s*(\d+)\)/i);
                                        if (pMatch) {
                                          priority = pMatch[1];
                                          content = content.replace(/\(Priority:\s*(\d+)\)/i, '').trim();
                                        }
                                        currentBoard.push({ status: taskMatch[1], content, priority });
                                      } else if (/Board:/i.test(trimmed)) {
                                        if (currentBoard.length > 0) elements.push(flushBoard(i));
                                        elements.push(
                                          <div key={`head-${i}`} className="flex items-center gap-2 mb-4 mt-6">
                                            <div className="h-px flex-1 bg-border/50" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{trimmed.replace(':', '')}</span>
                                            <div className="h-px flex-1 bg-border/50" />
                                          </div>
                                        );
                                      } else if (trimmed) {
                                        if (currentBoard.length > 0) elements.push(flushBoard(i));
                                        elements.push(<p key={`text-${i}`} className="text-sm mb-3 leading-relaxed">{trimmed}</p>);
                                      }
                                    });

                                    if (currentBoard.length > 0) elements.push(flushBoard(999));
                                    return <div className="space-y-1">{elements}</div>;
                                  }

                                  // 4. Advanced Multi-Block Extractor (JSON tools)
                                  const jsonBlocks: { start: number; end: number; content: string }[] = [];
                                  const startRegex = /\{[\s\r\n]*"tool"/g;
                                  let startMatch;

                                  while ((startMatch = startRegex.exec(rawText)) !== null) {
                                    const actualStart = startMatch.index;
                                    let braceCount = 0;
                                    let foundEnd = false;
                                    for (let i = actualStart; i < rawText.length; i++) {
                                      if (rawText[i] === '{') braceCount++;
                                      if (rawText[i] === '}') braceCount--;
                                      if (braceCount === 0) {
                                        jsonBlocks.push({ start: actualStart, end: i + 1, content: rawText.substring(actualStart, i + 1) });
                                        startRegex.lastIndex = i + 1;
                                        foundEnd = true;
                                        break;
                                      }
                                    }
                                    if (!foundEnd) break;
                                  }

                                  if (jsonBlocks.length > 0) {
                                    const elements: React.ReactNode[] = [];
                                    let lastIndex = 0;

                                    jsonBlocks.forEach((block, i) => {
                                      const textBefore = rawText.substring(lastIndex, block.start).trim();
                                      if (textBefore) {
                                        elements.push(<span key={`text-${i}`} className="block mb-4 leading-relaxed">{textBefore}</span>);
                                      }

                                      try {
                                        const cleanedJson = block.content.replace(/,\s*([\]}])/g, '$1').trim();
                                        elements.push(<TaskCard key={`task-${i}`} task={JSON.parse(cleanedJson)} />);
                                      } catch (e) {
                                        elements.push(<pre key={`err-${i}`} className="text-[10px] bg-muted p-2 rounded mb-4 overflow-x-auto">{block.content}</pre>);
                                      }
                                      lastIndex = block.end;
                                    });

                                    const remainingText = rawText.substring(lastIndex).trim();
                                    if (remainingText) {
                                      elements.push(<span key="text-final" className="block mb-4 leading-relaxed">{remainingText}</span>);
                                    }

                                    return <div className="mb-4">{elements}</div>;
                                  }
                                  
                                  return <p className="mb-4 last:mb-0 leading-relaxed" {...props} />;
                                },
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

                      <div className={`flex items-center gap-2 mt-1.5 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                          {msg.role === 'user' ? 'Founder' : 'Assistant'}
                        </span>
                        {msg.role === 'assistant' && msg.content && (
                          <button
                            onClick={() => copyToClipboard(msg.content, msg.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                          >
                            {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 bg-card border-t border-border z-20">
            <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative flex items-end gap-2 bg-muted/50 border border-border rounded-2xl p-2 focus-within:border-primary/50 transition-all">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Type your strategic inquiry..."
                disabled={loading && !abortControllerRef.current}
                className="min-h-[48px] w-full resize-none bg-transparent border-0 focus-visible:ring-0 px-3 py-3 text-base scrollbar-thin text-foreground dark:text-white"
                rows={1}
              />
              <Button 
                type="submit" 
                disabled={!input.trim() || (loading && !abortControllerRef.current)} 
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-xl transition-all",
                  input.trim() ? "bg-primary hover:bg-primary/90 shadow-md text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        </main>
      </div>

      {/* History Drawer (Left) */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent side="left" className="p-0 w-80 bg-background border-r border-border">
          <SheetHeader className="p-4 border-b border-border text-left">
            <SheetTitle className="text-foreground">Chat History</SheetTitle>
          </SheetHeader>
          <HistoryContent />
        </SheetContent>
      </Sheet>

      {/* Context Drawer (Right) */}
      <Sheet open={showContext} onOpenChange={setShowContext}>
        <SheetContent side="right" className="p-0 w-96 bg-background border-l border-border">
          <SheetHeader className="p-4 border-b border-border text-left flex flex-row items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <SheetTitle className="text-foreground">Strategic Context</SheetTitle>
          </SheetHeader>
          <ContextContent />
        </SheetContent>
      </Sheet>

      <DeleteConfirmDialog 
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDeleteChat}
        title="Delete Conversation?"
        description="This will permanently remove this strategic session from your history. This action cannot be undone."
      />
    </>
  );
}
