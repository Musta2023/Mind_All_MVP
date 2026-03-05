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

import { useStrategicStore } from '@/lib/store/use-strategic-store';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ExecutiveBriefing {
  content: string;
  date: string;
  analysis: {
    strategic_priority: string;
    risks: string[];
    opportunities: string[];
  };
}

export default function DashboardPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const router = useRouter();

  // Zustand Store
  const { 
    profile, 
    confirmedStrategy, 
    emergingObservations, 
    tasks, 
    loading, 
    fetchDashboardData 
  } = useStrategicStore();

  const ledger = [...confirmedStrategy, ...emergingObservations];

  useEffect(() => {
    setMounted(true);
    fetchDashboardData().then(() => {
      if (!useStrategicStore.getState().profile) {
        setTimeout(() => {
          if (!useStrategicStore.getState().profile && !useStrategicStore.getState().loading) {
            router.push('/auth/onboarding');
          }
        }, 1000);
      }
    });
  }, []);

  useEffect(() => {
    if (!loading && profile && !briefing) {
      fetchLatestBriefing();
    }
  }, [loading, profile]);

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
      await fetchDashboardData();
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
      await fetchDashboardData();
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
        color: 'text-muted-foreground',
        bg: 'bg-card/30',
        icon: Activity,
      };

    const avgEvidence =
      ledger.reduce((acc, curr) => acc + curr.evidenceScore, 0) / ledger.length;

    if (avgEvidence < 0.3)
      return {
        text: 'Action Gap',
        color: 'text-destructive',
        bg: 'bg-destructive/10',
        icon: AlertCircle,
      };
    if (avgEvidence >= 0.7)
      return {
        text: 'In Sync',
        color: 'text-primary',
        bg: 'bg-primary/10',
        icon: CheckCircle2,
      };

    return {
      text: 'Calibrating',
      color: 'text-soft-accent',
      bg: 'bg-soft-accent/10',
      icon: Activity,
    };
  };

  const health = getStrategyHealth();
  const HealthIcon = health.icon;

  const getGreetingContext = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', icon: Sunrise, color: 'text-primary' };
    if (hour < 18) return { text: 'Good afternoon', icon: Sun, color: 'text-soft-accent' };
    return { text: 'Good evening', icon: Moon, color: 'text-accent' };
  };

  const [isCopied, setIsCopied] = useState(false);

  const handleShare = (platform: 'whatsapp' | 'email' | 'copy') => {
    if (!briefing) return;
    const shareText = `*MindAll Strategic Briefing - ${briefing.date}*\n\n${briefing.content}`;
    const encodedText = encodeURIComponent(shareText);
    if (platform === 'whatsapp') window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    else if (platform === 'email') window.open(`mailto:?subject=MindAll Briefing&body=${encodedText}`, '_self');
    else if (platform === 'copy') {
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
    if (months <= 6) return { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', text: 'Critical' };
    if (months <= 12) return { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'Warning' };
    return { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', text: 'Stable' };
  };

  const greeting = getGreetingContext();
  const GreetingIcon = greeting.icon;

  const getColorForType = (type: string) => {
    switch (type) {
      case 'FACT': return 'bg-success/10 text-success border-success/20 shadow-[0_0_5px_rgba(0,230,118,0.2)]';
      case 'DECISION': return 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_5px_rgba(47,211,255,0.2)]';
      case 'HYPOTHESIS': return 'bg-warning/10 text-warning border-warning/20 shadow-[0_0_5px_rgba(255,214,0,0.1)]';
      default: return 'bg-muted/50 text-muted-foreground border-border/50';
    }
  };

  return (
    <>
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 animate-in fade-in duration-500 relative bg-background">
        <div className="absolute top-0 left-1/4 w-[50%] h-[50%] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="mx-auto max-w-6xl space-y-6 relative z-10">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-medium tracking-tight text-foreground dark:text-white flex items-center gap-3">
                <GreetingIcon className={cn("w-7 h-7 drop-shadow-[0_0_8px_rgba(47,211,255,0.4)]", greeting.color)} />
                {greeting.text}{profile?.name ? `, ${profile.name}` : ''}
              </h1>
              <p className="text-muted-foreground text-base opacity-70 italic font-medium">The OS is auditing your business alignment in real-time.</p>
            </div>
            
            {!loading && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn("flex items-center gap-3 px-4 py-2 rounded-xl border backdrop-blur-md transition-all cursor-help", health.bg, health.color, "border-current/20 shadow-glow-soft")}>
                      <HealthIcon className="w-5 h-5" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-medium uppercase tracking-widest opacity-60 leading-none">Strategy Health</span>
                        <span className="text-sm font-medium tracking-tight uppercase leading-tight">{health.text}</span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="w-80 p-4 bg-card border-border shadow-xl">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-foreground dark:text-white">What is Strategy Health?</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        This metric measures how well your current tactical actions (tasks) align with your confirmed strategic pillars.
                      </p>
                      <div className="space-y-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <p className="text-[10px] font-medium text-foreground dark:text-white"><span className="text-primary">In Sync:</span> Your operations perfectly reflect your vision.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-soft-accent" />
                          <p className="text-[10px] font-medium text-foreground dark:text-white"><span className="text-soft-accent">Calibrating:</span> Strategy is evolving; some tasks may need realignment.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-destructive" />
                          <p className="text-[10px] font-medium text-foreground dark:text-white"><span className="text-destructive">Action Gap:</span> Significant drift detected between goals and daily work.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                          <p className="text-[10px] font-medium text-foreground dark:text-white"><span className="text-muted-foreground">Syncing:</span> The AI is currently recalculating your business graph.</p>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {loading ? (
              [1, 2, 3].map((i) => (
                <Card key={i} className="border-border/50 bg-card/50">
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-20 mb-4 bg-border/50" />
                    <Skeleton className="h-8 w-32 mb-2 bg-border/50" />
                  </CardContent>
                </Card>
              ))
            ) : profile ? (
              <>
                <Card glass className="border-border/50 hover:border-primary/30 transition-all hover:shadow-glow-soft group">
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.2em] opacity-70">Business Foundation</CardTitle>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-lg font-medium text-foreground dark:text-white tracking-tight truncate">{profile.name}</p>
                      <Badge variant="secondary" className="bg-background/60 text-primary border-primary/20 font-medium px-1.5 py-0 text-[10px]">
                        {profile.stage}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 opacity-80">The core DNA and growth stage of your venture.</p>
                  </CardContent>
                </Card>

                <Card glass className="border-border/50 hover:border-soft-accent/30 transition-all hover:shadow-glow-soft group">
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.2em] opacity-70">Financial Lifeline</CardTitle>
                    <div className="w-8 h-8 rounded-lg bg-soft-accent/10 flex items-center justify-center transition-colors group-hover:bg-soft-accent/20">
                      <Clock className="w-4 h-4 text-soft-accent" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <p className="text-2xl font-medium text-foreground dark:text-white tracking-tighter">{profile.runway}</p>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest opacity-60">Months</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-medium uppercase tracking-[0.1em] border", getRunwayHealth(profile.runway).bg, getRunwayHealth(profile.runway).color, getRunwayHealth(profile.runway).border)}>
                        {getRunwayHealth(profile.runway).text}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card glass className="border-border/50 hover:border-success/30 transition-all hover:shadow-glow-soft group">
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.2em] opacity-70">Resource Allocation</CardTitle>
                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center transition-colors group-hover:bg-success/20">
                      <TrendingUp className="w-4 h-4 text-success" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-2xl font-medium text-foreground dark:text-white tracking-tighter mb-1">
                      {formatCurrency(profile.fundingRaised || 0)}
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest opacity-60">Total Capital Injected</p>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>

          <div className="rounded-2xl border border-primary/20 bg-card/60 backdrop-blur-md shadow-glow-soft overflow-hidden flex flex-col border-l-[6px] border-l-primary transition-all hover:border-primary/30">
            <div className="bg-background/40 text-foreground dark:text-white p-6 relative border-b border-border/30">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-24 -mt-24 pointer-events-none" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <div className="p-1.5 bg-primary/20 rounded-lg">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-medium tracking-tight">The Daily Executive Memo Breifing</h2>
                  </div>
                  <p className="text-muted-foreground text-sm max-w-2xl opacity-70 leading-snug">
                    AI-generated summary of your business trajectory, priority shifts, and emerging risks in 24h period.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="px-3 py-1 border-primary/20 text-primary font-mono text-xs font-medium tracking-widest bg-primary/5 rounded-lg">
                    {briefing?.date || new Date().toISOString().split('T')[0]}
                  </Badge>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground dark:text-white hover:bg-white/5 rounded-xl transition-all">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-card border-border/50 backdrop-blur-xl">
                      <DropdownMenuItem onClick={() => handleShare('whatsapp')} className="gap-3 p-3 cursor-pointer hover:bg-primary/5 focus:bg-primary/5 transition-colors">
                        <MessageCircle className="w-4 h-4 text-emerald-500" />
                        <span className="font-medium">Share via WhatsApp</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('email')} className="gap-3 p-3 cursor-pointer hover:bg-primary/5 focus:bg-primary/5 transition-colors">
                        <Mail className="w-4 h-4 text-sky-500" />
                        <span className="font-medium">Share via Email</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('copy')} className="gap-3 p-3 cursor-pointer hover:bg-primary/5 focus:bg-primary/5 transition-colors">
                        {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-primary" />}
                        <span className="font-medium">{isCopied ? 'Copied!' : 'Copy to Clipboard'}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            <div className="flex-1">
              {loading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-4 w-3/4 bg-border/50" />
                  <Skeleton className="h-4 w-full bg-border/50" />
                </div>
              ) : briefing ? (
                <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border/30">
                  <div className="lg:col-span-2 p-6 sm:p-8">
                    <h3 className="text-[10px] font-medium text-primary uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                      <Bot className="w-4 h-4" /> Strategy Extraction
                    </h3>
                    <div className="prose dark:prose-invert max-w-none text-foreground dark:text-white text-sm leading-relaxed">
                      <ReactMarkdown
                        components={{
                          h3: ({ node, ...props }) => <h3 className="text-lg font-medium text-foreground dark:text-white mt-6 mb-3 first:mt-0 tracking-tight" {...props} />,
                          p: ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed opacity-90" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-medium text-primary" {...props} />,
                        }}
                      >
                        {briefing.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div className="p-6 sm:p-8 bg-background/30 space-y-8">
                    <div>
                      <h4 className="text-[10px] font-medium text-primary uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" /> High-Priority Focus
                      </h4>
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-primary text-xs font-medium shadow-glow-soft leading-snug">
                        {briefing.analysis?.strategic_priority || 'Analyzing primary focus...'}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-medium text-destructive uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5" /> Identified Friction
                      </h4>
                      <ul className="space-y-3">
                        {briefing.analysis?.risks?.map((risk: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0 shadow-[0_0_5px_#FF4B4B]" />
                            <span className="leading-snug opacity-90">{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-medium text-soft-accent uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Value Opportunities
                      </h4>
                      <ul className="space-y-3">
                        {briefing.analysis?.opportunities?.map((opt: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-soft-accent mt-1.5 shrink-0 shadow-[0_0_5px_#7ED6F5]" />
                            <span className="leading-snug opacity-90">{opt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-16 px-8 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-4 relative">
                    <div className="absolute inset-0 rounded-xl border-2 border-primary/20 border-t-primary animate-spin" />
                    <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                  </div>
                  <h4 className="text-foreground dark:text-white font-medium text-lg mb-2 tracking-tight">Synthesizing Briefing</h4>
                  <p className="text-muted-foreground text-xs max-w-sm opacity-70">
                    Extracting strategic context from your knowledge vault and latest decisions.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Execution Analytics */}
          {(() => {
            const done = tasks.filter(t => t.status === 'DONE').length;
            const completionPct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
            const activeTask = tasks.find(t => t.status === 'IN_PROGRESS') || tasks.find(t => t.status === 'TODO');
            const chartData = [
              { stage: 'Planned', count: tasks.filter(t => t.status === 'TODO').length },
              { stage: 'Active', count: tasks.filter(t => t.status === 'IN_PROGRESS').length },
              { stage: 'Completed', count: done },
            ];
            const barColors = ['#1E4C6D', '#2FD3FF', '#19B6D2'];
            return (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="w-5 h-5 text-primary drop-shadow-[0_0_5px_rgba(47,211,255,0.4)]" />
                    <h2 className="text-lg font-medium text-foreground dark:text-white tracking-tight">Execution Momentum</h2>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 bg-card/50 text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground font-medium rounded-lg text-xs" onClick={() => router.push('/tasks')}>
                    Command Board <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>

                <Card glass className="border-border/50">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 bg-background/40 rounded-xl p-5 border border-border/30">
                        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary mb-5 flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5" /> Operational Velocity
                        </p>
                        {loading ? (
                          <Skeleton className="h-48 w-full rounded-xl bg-border/30" />
                        ) : tasks.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground opacity-40">
                            <Activity className="w-8 h-8 mb-2" />
                            <p className="text-[10px] font-medium uppercase tracking-widest">No Active Operations</p>
                          </div>
                        ) : (
                          <ChartContainer config={{ count: { label: 'Tasks' } }} className="h-48 w-full">
                            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(47,211,255,0.05)" />
                              <XAxis dataKey="stage" tick={{ fontSize: 10, fontWeight: 500, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 10, fontWeight: 500, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                              <ChartTooltip content={<ChartTooltipContent className="bg-card border-primary/20" />} />
                              <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                                {chartData.map((_, idx) => <Cell key={idx} fill={barColors[idx]} />)}
                              </Bar>
                            </BarChart>
                          </ChartContainer>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-xl border border-primary/20 p-5 bg-primary/5 shadow-glow-soft backdrop-blur-sm">
                          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary mb-3">Overall Completion</p>
                          <div className="flex items-baseline justify-between mb-3">
                            <span className="text-2xl font-medium tracking-tighter text-foreground dark:text-white">{completionPct}%</span>
                            <Badge className="bg-primary text-primary-foreground font-medium text-[9px] tracking-widest border-none px-2 h-4">ON TRACK</Badge>
                          </div>
                          <div className="w-full h-2 rounded-full bg-background overflow-hidden p-0.5 border border-primary/10">
                            <div className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_15px_#2FD3FF]" style={{ width: `${completionPct}%` }} />
                          </div>
                        </div>

                        <div className="rounded-xl border border-border/50 p-5 bg-card text-foreground dark:text-white overflow-hidden relative group flex flex-col justify-center min-h-[110px] transition-all hover:border-primary/40">
                          <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                              <Rocket className="w-3.5 h-3.5 text-primary" />
                              <p className="text-[10px] font-medium text-primary uppercase tracking-[0.25em]">Next Priority</p>
                            </div>
                            <p className="text-sm font-medium leading-snug line-clamp-2 tracking-tight">
                              {activeTask ? activeTask.title : 'All strategic actions finalized.'}
                            </p>
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
          <div className="grid lg:grid-cols-2 gap-6">
            <Card glass className="flex flex-col border-border/50 overflow-hidden">
              <CardHeader className="border-b border-border/30 bg-background/20 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <BrainCircuit className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base font-medium tracking-tight text-foreground dark:text-white">Intelligence Filter</CardTitle>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-medium px-2.5 h-5 text-[10px]">
                    {ledger.filter(m => !m.isConfirmed).length} Unverified
                  </Badge>
                </div>
                <p className="text-muted-foreground text-[11px] mt-1.5 opacity-70 leading-snug">Review new signals the AI has extracted. Confirm them to train the model.</p>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-0 max-h-[450px] scrollbar-thin">
                {ledger.filter(m => !m.isConfirmed).length === 0 ? (
                  <div className="p-16 text-center flex flex-col items-center justify-center opacity-20">
                    <CheckCircle2 className="w-10 h-10 text-primary mb-3" />
                    <p className="text-xs font-medium uppercase tracking-widest">Model Synchronized</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {ledger.filter(m => !m.isConfirmed).map((item) => (
                      <div key={item.id} className="p-4 hover:bg-primary/5 transition-all group">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <Badge variant="outline" className={cn("text-[9px] font-medium uppercase tracking-widest px-1.5 h-4", getColorForType(item.memoryType))}>
                              {item.memoryType}
                            </Badge>
                            <p className="text-sm text-foreground dark:text-white leading-snug font-medium tracking-tight">{item.insight}</p>
                          </div>
                          <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all">
                            <Button variant="ghost" size="icon" disabled={!!processingId} onClick={() => handleVerify(item.id)} className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg">
                              {processingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" disabled={!!processingId} onClick={() => handlePurge(item.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg">
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

            <Card glass className="flex flex-col border-border/50 overflow-hidden">
              <CardHeader className="border-b border-border/30 bg-background/20 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base font-medium tracking-tight text-foreground dark:text-white">The Strategic Core</CardTitle>
                  </div>
                </div>
                <p className="text-muted-foreground text-[11px] mt-1.5 opacity-70 leading-snug">Confirmed facts and decisions that form the permanent brain of your venture.</p>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-0 max-h-[450px] scrollbar-thin">
                {ledger.filter(m => m.isConfirmed).length === 0 ? (
                  <div className="p-16 text-center flex flex-col items-center justify-center opacity-20">
                    <Activity className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-xs font-medium uppercase tracking-widest">Awaiting Vision Mapping</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {ledger.filter(m => m.isConfirmed).map((item) => (
                      <div key={item.id} className="p-4 hover:bg-accent/5 transition-all">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge className={cn("text-[9px] font-medium px-1.5 h-4 border-none tracking-widest", getColorForType(item.memoryType))}>
                              {item.memoryType}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1 bg-background rounded-full overflow-hidden p-0.5 border border-border/30">
                                <div 
                                  className="h-full bg-primary rounded-full shadow-[0_0_5px_#2FD3FF]" 
                                  style={{ width: `${item.strategyWeight * 100}%` }}
                                />
                              </div>
                              <span className="text-[9px] font-medium text-primary uppercase tracking-widest">Weight</span>
                            </div>
                          </div>
                          <p className="text-sm text-foreground dark:text-white leading-snug font-medium tracking-tight">{item.insight}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-4 pt-2 pb-12">
            {[
              { href: '/chat', icon: Bot, label: 'Strategy Room', desc: 'AI Co-Founder sync.', color: 'primary' },
              { href: '/vault', icon: Activity, label: 'Knowledge Vault', desc: 'Secure data ingestion.', color: 'primary' },
              { href: '/tasks', icon: ListTodo, label: 'Action Board', desc: 'Tactical deployment.', color: 'primary' },
              { href: '/company', icon: Building2, label: 'Identity DNA', desc: 'Refine vision.', color: 'primary' }
            ].map((action, i) => (
              <Link key={i} href={action.href} className="block group outline-none">
                <Card glass className="h-full border-border/50 transition-all duration-300 hover:shadow-glow-soft hover:-translate-y-1 hover:border-primary/40">
                  <CardHeader className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300", 
                        action.color === 'primary' ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground' : 'bg-soft-accent/10 text-soft-accent group-hover:bg-soft-accent group-hover:text-background'
                      )}>
                        <action.icon className="w-5 h-5" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground transition-all group-hover:text-primary group-hover:translate-x-1" />
                    </div>
                    <CardTitle className="text-sm font-medium text-foreground dark:text-white group-hover:text-primary transition-colors tracking-tight">{action.label}</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight opacity-70">{action.desc}</p>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>

        </div>
      </main>
    </>
  );
}
