'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Rocket,
  Clock,
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
  ListTodo,
  Building2,
  Share2,
  MessageCircle,
  Mail,
  Copy,
  Check,
  MoreVertical,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

interface StartupProfile {
  name: string;
  stage: string;
  description: string;
  runway: number;
  fundingRaised?: number;
}

interface ExecutiveBriefing {
  content: string;
  date: string;
  analysis: {
    strategic_priority: string;
    risks: string[];
    opportunities: string[];
  };
}

interface MemoryRelation {
  type: string;
  target: {
    insight: string;
  };
}

interface StrategicMemory {
  id: string;
  insight: string;
  memoryType: 'DECISION' | 'HYPOTHESIS' | 'FACT';
  isConfirmed: boolean;
  strategyWeight: number;
  evidenceScore: number;
  createdAt: string;
  outgoingRelations: MemoryRelation[];
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
  priority: number;
  dueDate?: string;
  goal?: { title: string };
}

export default function DashboardPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<StartupProfile | null>(null);
  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null);
  const [ledger, setLedger] = useState<StrategicMemory[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await ApiClient.get('/startup/dashboard');
      
      setProfile(data.profile);
      setBriefing(data.briefing);
      setLedger(data.ledger || []);
      setTasks(data.tasks || []);

      if (!data.briefing) {
        fetchLatestBriefing();
      }
    } catch (error: any) {
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        router.push('/auth/onboarding');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestBriefing = async () => {
    try {
      const briefingData = await ApiClient.get('/startup/briefing');
      setBriefing(briefingData);
    } catch (e) {
      console.error('Failed to fetch on-the-fly briefing:', e);
    }
  };

  const handleVerify = async (id: string) => {
    setProcessingId(id);
    try {
      await ApiClient.patch(`/ledger/${id}/confirm`, { weight: 0.8 });
      const ledgerData = await ApiClient.get('/ledger');
      setLedger(ledgerData || []);
    } catch (e) {
      console.error('Failed to confirm memory:', e);
    } finally {
      setProcessingId(null);
    }
  };

  const handlePurge = async (id: string) => {
    setProcessingId(id);
    try {
      await ApiClient.delete(`/ledger/${id}`);
      setLedger((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.error('Failed to purge memory:', e);
    } finally {
      setProcessingId(null);
    }
  };

  const getStrategyHealth = () => {
    if (ledger.length === 0)
      return {
        text: 'Syncing',
        color: 'text-slate-400',
        bg: 'bg-slate-100',
        icon: Activity,
      };

    const avgEvidence =
      ledger.reduce((acc, curr) => acc + curr.evidenceScore, 0) / ledger.length;

    if (avgEvidence < 0.3)
      return {
        text: 'Risk Drift',
        color: 'text-rose-600',
        bg: 'bg-rose-50',
        icon: AlertCircle,
      };
    if (avgEvidence >= 0.7)
      return {
        text: 'Strongly Grounded',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        icon: CheckCircle2,
      };

    return {
      text: 'Strategizing',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      icon: Activity,
    };
  };

  const health = getStrategyHealth();
  const HealthIcon = health.icon;

  const getGreetingContext = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', icon: Sunrise, color: 'text-amber-500' };
    if (hour < 18) return { text: 'Good afternoon', icon: Sun, color: 'text-orange-500' };
    return { text: 'Good evening', icon: Moon, color: 'text-violet-400' };
  };

  const [isCopied, setIsCopied] = useState(false);

  const handleShare = (platform: 'whatsapp' | 'email' | 'copy') => {
    if (!briefing) return;
    
    const shareText = `*MindAll Daily Strategic Briefing - ${briefing.date}*\n\n${briefing.content}\n\n*Strategic Priority:* ${briefing.analysis?.strategic_priority}`;
    const encodedText = encodeURIComponent(shareText);

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    } else if (platform === 'email') {
      const subject = encodeURIComponent(`MindAll Strategic Briefing: ${briefing.date}`);
      window.open(`mailto:?subject=${subject}&body=${encodedText}`, '_self');
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(shareText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const getRunwayHealth = (months: number) => {
    if (months <= 6) return { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', text: 'Critical' };
    if (months <= 12) return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', text: 'Warning' };
    return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'Healthy' };
  };

  const greeting = getGreetingContext();
  const GreetingIcon = greeting.icon;

  const getColorForType = (type: string) => {
    switch (type) {
      case 'FACT':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'DECISION':
        return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
      case 'HYPOTHESIS':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    }
  };

  return (
    <>
      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 sm:py-10 animate-in fade-in duration-500">
        <div className="mx-auto max-w-6xl space-y-8">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                <GreetingIcon className={cn("w-8 h-8", greeting.color)} />
                {greeting.text}{profile?.name ? `, ${profile.name}` : ''}
              </h1>
              <p className="text-muted-foreground text-lg font-medium">Your AI strategic copilot is ready to assist.</p>
            </div>
            
            {!loading && (
              <div className={cn("flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all", health.bg, health.color, "border-current/10 shadow-sm")}>
                <HealthIcon className="w-5 h-5" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Strategy Health</span>
                  <span className="text-sm font-bold leading-tight">{health.text}</span>
                </div>
              </div>
            )}
          </div>

          {/* Top Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-border shadow-sm">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-32 mb-2" />
                      <Skeleton className="h-4 w-48" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : profile ? (
              <>
                <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Company
                    </CardTitle>
                    <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-violet-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-2xl font-bold text-foreground">{profile.name}</p>
                      <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted/80">
                        {profile.stage}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{profile.description}</p>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Runway
                    </CardTitle>
                    <div className="w-8 h-8 rounded-full bg-slate-500/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-foreground">{profile.runway}</p>
                      <p className="text-sm font-medium text-muted-foreground">months</p>
                    </div>
                    {(() => {
                      const health = getRunwayHealth(profile.runway);
                      return (
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border", health.bg, health.color, health.border)}>
                            {health.text}
                          </span>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Funding Raised
                    </CardTitle>
                    <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-violet-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(profile.fundingRaised || 0)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Total capital deployed</p>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>

          {/* Daily Strategic Briefing */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col border-l-[4px] border-l-violet-600">
            <div className="bg-slate-950 text-white p-6 sm:p-8 relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    <h2 className="text-xl font-semibold leading-none tracking-tight">Daily Strategic Briefing</h2>
                  </div>
                  <p className="text-slate-400 text-sm">
                    AI-generated insights based on your current trajectory and vault data.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="w-fit border-slate-800 text-slate-300 font-mono text-xs uppercase tracking-widest bg-slate-900/50">
                    {briefing?.date || new Date().toISOString().split('T')[0]}
                  </Badge>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-800 text-slate-200">
                      <DropdownMenuItem onClick={() => handleShare('whatsapp')} className="gap-2 cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white">
                        <MessageCircle className="w-4 h-4 text-emerald-500" />
                        Share via WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('email')} className="gap-2 cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white">
                        <Mail className="w-4 h-4 text-sky-500" />
                        Share via Email
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('copy')} className="gap-2 cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white">
                        {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                        {isCopied ? 'Copied!' : 'Copy to Clipboard'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-card">
              {loading ? (
                <div className="p-8 space-y-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : briefing ? (
                <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border/50">
                  <div className="lg:col-span-2 p-6 sm:p-8">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Bot className="w-4 h-4 text-violet-500" />
                      Executive Memo
                    </h3>
                    <div className="prose dark:prose-invert max-w-none text-foreground text-sm leading-relaxed">
                      <ReactMarkdown
                        components={{
                          h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-foreground mt-6 mb-3 first:mt-0" {...props} />,
                          p: ({ node, ...props }) => <p className="mb-4 last:mb-0 leading-relaxed" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
                        }}
                      >
                        {briefing.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div className="p-6 sm:p-8 bg-muted/30 space-y-8">
                    <div>
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Activity className="w-3 h-3" /> Today's Priority
                      </h4>
                      <div className="p-4 bg-card border border-violet-500/20 rounded-xl text-violet-500 text-sm font-semibold shadow-sm shadow-violet-500/5 leading-snug">
                        {briefing.analysis?.strategic_priority || 'Awaiting priority assignment'}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3" /> Key Risks
                      </h4>
                      <ul className="space-y-3">
                        {briefing.analysis?.risks?.map((risk: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500/50 mt-1.5 shrink-0" />
                            <span className="leading-snug">{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" /> Opportunities
                      </h4>
                      <ul className="space-y-3">
                        {briefing.analysis?.opportunities?.map((opt: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500/50 mt-1.5 shrink-0" />
                            <span className="leading-snug">{opt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-violet-500/10 rounded-full flex items-center justify-center mb-4 relative">
                    <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
                    <Sparkles className="w-6 h-6 text-violet-500 animate-pulse" />
                  </div>
                  <h4 className="text-foreground font-semibold text-lg mb-2">Analyzing your strategy</h4>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    Our AI agents are currently processing your vault data to generate today's executive briefing.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Execution Analytics Section (High Fidelity) */}
          {(() => {
            const done = tasks.filter(t => t.status === 'DONE').length;
            const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
            const todo = tasks.filter(t => t.status === 'TODO').length;
            const completionPct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
            const activeTask = tasks.find(t => t.status === 'IN_PROGRESS') || tasks.find(t => t.status === 'TODO');
            
            const chartData = [
              { stage: 'To Do', count: todo },
              { stage: 'In Progress', count: inProgress },
              { stage: 'Completed', count: done },
            ];

            const barColors = mounted ? [
              theme === 'dark' ? '#475569' : '#94a3b8', // To Do (Slate)
              '#8b5cf6', // In Progress (Violet)
              '#10b981', // Completed (Emerald)
            ] : ['#94a3b8', '#8b5cf6', '#10b981'];
            return (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-violet-500" />
                    <h2 className="text-xl font-bold text-foreground">Execution Analytics</h2>
                  </div>
                  <Button variant="outline" size="sm" className="text-muted-foreground hover:text-violet-500 gap-2 border-border" onClick={() => router.push('/tasks')}>
                    <ListTodo className="w-4 h-4" />
                    Execution Board <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                <Card className="glass-card overflow-hidden">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Chart */}
                      <div className="lg:col-span-2 surface-sunken rounded-lg p-4">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                          <Activity className="w-3 h-3" />
                          Operational Velocity (Task Progression)
                        </p>
                        {loading ? (
                          <Skeleton className="h-48 w-full rounded-xl" />
                        ) : tasks.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                            <Activity className="w-8 h-8 mb-2 opacity-40" />
                            <p className="text-sm">No execution data</p>
                          </div>
                        ) : (
                          <ChartContainer config={{ count: { label: 'Tasks' } }} className="h-48 w-full">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(var(--border))" opacity={0.5} />
                              <XAxis dataKey="stage" tick={{ fontSize: 11, fill: 'oklch(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11, fill: 'oklch(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                                {chartData.map((_, idx) => (
                                  <Cell key={idx} fill={barColors[idx]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ChartContainer>
                        )}
                      </div>

                      {/* Sidebar stats */}
                      <div className="space-y-4">
                        <div className="rounded-lg border border-border p-4 bg-background/40">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                            Strategic Completion
                          </p>
                          <div className="flex items-baseline justify-between mb-3">
                            <span className="text-3xl font-black tracking-tighter">{completionPct}%</span>
                            <Badge className="bg-violet-500/10 text-violet-600 border-violet-500/20 text-[10px] font-bold tracking-tight">ON TRACK</Badge>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted overflow-hidden shadow-inner">
                            <div
                              className="h-full bg-violet-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                              style={{ width: `${completionPct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-3 font-semibold uppercase tracking-wider">
                            {done} of {tasks.length} tactical milestones reached
                          </p>
                        </div>

                        <div className="rounded-lg border border-border p-4 bg-slate-950 text-white overflow-hidden relative group min-h-[120px] flex flex-col justify-center">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/20 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-violet-500/30 transition-colors duration-500" />
                          <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                              <Rocket className="w-3.5 h-3.5 text-violet-400" />
                              <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">
                                Active Priority
                              </p>
                            </div>
                            <p className="text-sm font-bold leading-snug line-clamp-2">
                              {activeTask ? activeTask.title : 'Strategy fully deployed. Refresh board.'}
                            </p>
                            {activeTask?.goal && (
                              <Badge variant="outline" className="text-[9px] mt-3 border-violet-500/30 text-violet-400 bg-violet-500/5 uppercase font-bold tracking-tighter truncate max-w-full">
                                {activeTask.goal.title}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })()}

          {/* Strategic Alignment Ledger */}
          <div className="grid lg:grid-cols-2 gap-8 pt-4">
            <Card className="border-border bg-card shadow-sm flex flex-col h-full">
              <CardHeader className="border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-violet-500" />
                    <CardTitle className="text-lg">Pending Alignment</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-violet-500/10 text-violet-500 hover:bg-violet-500/20">
                    {ledger.filter(m => !m.isConfirmed).length} New
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs mt-1">Review AI-extracted insights to align your Copilot's reasoning.</p>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-0 max-h-[400px] scrollbar-thin">
                {ledger.filter(m => !m.isConfirmed).length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center opacity-40">
                    <CheckCircle2 className="w-8 h-8 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">All insights aligned</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {ledger.filter(m => !m.isConfirmed).map((item) => (
                      <div key={item.id} className="p-5 hover:bg-muted/30 transition-colors group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn("text-[9px] font-bold uppercase tracking-tighter px-1.5 py-0 h-4", getColorForType(item.memoryType))}>
                                {item.memoryType}
                              </Badge>
                              <span className="text-[10px] font-medium text-muted-foreground">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-foreground leading-snug font-medium">{item.insight}</p>
                          </div>
                          <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              disabled={!!processingId}
                              onClick={() => handleVerify(item.id)}
                              className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 rounded-lg"
                            >
                              {processingId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              disabled={!!processingId}
                              onClick={() => handlePurge(item.id)}
                              className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50/10 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm flex flex-col h-full">
              <CardHeader className="border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-violet-500" />
                    <CardTitle className="text-lg">Active Strategy</CardTitle>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1">Confirmed decisions driving your AI's current strategic weighting.</p>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-0 max-h-[400px] scrollbar-thin">
                {ledger.filter(m => m.isConfirmed).length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center opacity-40">
                    <Activity className="w-8 h-8 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">No confirmed strategy yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {ledger.filter(m => m.isConfirmed).map((item) => (
                      <div key={item.id} className="p-5 hover:bg-muted/30 transition-colors">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge className={cn("text-[9px] font-bold px-1.5 h-4 border-none", getColorForType(item.memoryType))}>
                              {item.memoryType}
                            </Badge>
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-violet-500" 
                                  style={{ width: `${item.strategyWeight * 100}%` }}
                                />
                              </div>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase">Weight</span>
                            </div>
                          </div>
                          <p className="text-sm text-foreground leading-snug font-semibold">{item.insight}</p>
                          {item.outgoingRelations && item.outgoingRelations.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {item.outgoingRelations.map((rel, ri) => (
                                <div key={ri} className="flex items-center gap-1 px-2 py-0.5 bg-muted/50 rounded border border-border text-[10px] text-muted-foreground">
                                  <span className="font-bold text-violet-500">{rel.type}</span>
                                  <span className="truncate max-w-[100px]">{rel.target.insight}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid gap-4 md:grid-cols-3 pt-4 pb-10">
            <Link href="/chat" className="block group outline-none">
              <Card className="h-full border-border bg-card transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-1 hover:border-violet-500/30">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center transition-colors group-hover:bg-violet-500 group-hover:text-white">
                      <Bot className="w-6 h-6" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground transition-all duration-300 group-hover:text-violet-500 group-hover:translate-x-1" />
                  </div>
                  <CardTitle className="text-lg text-foreground group-hover:text-violet-500 transition-colors">Strategy Room</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Talk to your AI co-founder for immediate strategic advice.</p>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/vault" className="block group outline-none">
              <Card className="h-full border-border bg-card transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-1 hover:border-amber-500/30">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center transition-colors group-hover:bg-amber-500 group-hover:text-white">
                      <Activity className="w-6 h-6" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground transition-all duration-300 group-hover:text-amber-500 group-hover:translate-x-1" />
                  </div>
                  <CardTitle className="text-lg text-foreground group-hover:text-amber-500 transition-colors">Knowledge Vault</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Upload decks, financials, and company intelligence.</p>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/tasks" className="block group outline-none">
              <Card className="h-full border-border bg-card transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-1 hover:border-violet-500/30">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center transition-colors group-hover:bg-violet-500 group-hover:text-white">
                      <ListTodo className="w-6 h-6" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground transition-all duration-300 group-hover:text-violet-600 group-hover:translate-x-1" />
                  </div>
                  <CardTitle className="text-lg text-foreground group-hover:text-violet-500 transition-colors">Execution Board</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Manage and track your AI-generated tactical tasks and operations.</p>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/company" className="block group outline-none">
              <Card className="h-full border-border bg-card transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-1 hover:border-violet-500/30">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center transition-colors group-hover:bg-violet-500 group-hover:text-white">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground transition-all duration-300 group-hover:text-violet-500 group-hover:translate-x-1" />
                  </div>
                  <CardTitle className="text-lg text-foreground group-hover:text-violet-500 transition-colors">Company Profile</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Refine your business DNA, target market, and competitive edge.</p>
                </CardHeader>
              </Card>
            </Link>
          </div>

        </div>
      </main>
    </>
  );
}
