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
      // Logic for checking if profile exists
      if (!useStrategicStore.getState().profile) {
        // Double check after fetch
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
      // Refresh global store
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
      // Refresh global store
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
        text: 'Risk Drift',
        color: 'text-destructive',
        bg: 'bg-destructive/10',
        icon: AlertCircle,
      };
    if (avgEvidence >= 0.7)
      return {
        text: 'Strongly Grounded',
        color: 'text-primary',
        bg: 'bg-primary/10',
        icon: CheckCircle2,
      };

    return {
      text: 'Strategizing',
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
    if (months <= 6) return { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', text: 'Critical' };
    if (months <= 12) return { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'Warning' };
    return { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', text: 'Healthy' };
  };

  const greeting = getGreetingContext();
  const GreetingIcon = greeting.icon;

  const getColorForType = (type: string) => {
    switch (type) {
      case 'FACT':
        return 'bg-success/10 text-success border-success/20 shadow-[0_0_5px_rgba(0,230,118,0.2)]';
      case 'DECISION':
        return 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_5px_rgba(47,211,255,0.2)]';
      case 'HYPOTHESIS':
        return 'bg-warning/10 text-warning border-warning/20 shadow-[0_0_5px_rgba(255,214,0,0.1)]';
      default:
        return 'bg-muted/50 text-muted-foreground border-border/50';
    }
  };

  return (
    <>
      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 sm:py-10 animate-in fade-in duration-500 relative bg-background">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/4 w-[50%] h-[50%] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="mx-auto max-w-6xl space-y-10 relative z-10">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl font-medium tracking-tight text-foreground dark:text-white flex items-center gap-4">
                <GreetingIcon className={cn("w-10 h-10 drop-shadow-[0_0_8px_rgba(47,211,255,0.4)]", greeting.color)} />
                {greeting.text}{profile?.name ? `, ${profile.name}` : ''}
              </h1>
              <p className="text-muted-foreground text-lg font-medium opacity-80 italic">The OS is calibrated and monitoring your business trajectory.</p>
            </div>
            
            {!loading && (
              <div className={cn("flex items-center gap-4 px-6 py-3 rounded-2xl border backdrop-blur-md transition-all", health.bg, health.color, "border-current/20 shadow-glow-soft")}>
                <HealthIcon className="w-6 h-6 animate-pulse" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium uppercase tracking-widest opacity-60">System Alignment</span>
                  <span className="text-base font-medium leading-tight tracking-tight uppercase">{health.text}</span>
                </div>
              </div>
            )}
          </div>

          {/* Top Metrics Grid */}
          <div className="grid gap-6 md:grid-cols-3">
            {loading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border-border/50 bg-card/50">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <Skeleton className="h-5 w-24 bg-border/50" />
                      <Skeleton className="h-8 w-8 rounded-full bg-border/50" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-32 mb-2 bg-border/50" />
                      <Skeleton className="h-4 w-48 bg-border/50" />
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : profile ? (
              <>
                <Card glass className="border-border/50 hover:border-primary/30 transition-all hover:shadow-glow-soft group">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em] opacity-70">
                      Company
                    </CardTitle>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-2xl font-medium text-foreground dark:text-white tracking-tight">{profile.name}</p>
                      <Badge variant="secondary" className="bg-background/60 text-primary border-primary/20 font-medium px-2 py-0">
                        {profile.stage}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1 opacity-80">{profile.description}</p>
                  </CardContent>
                </Card>

                <Card glass className="border-border/50 hover:border-soft-accent/30 transition-all hover:shadow-glow-soft group">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em] opacity-70">
                      Runway
                    </CardTitle>
                    <div className="w-10 h-10 rounded-xl bg-soft-accent/10 flex items-center justify-center transition-colors group-hover:bg-soft-accent/20">
                      <Clock className="w-5 h-5 text-soft-accent" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2 mb-2">
                      <p className="text-3xl font-medium text-foreground dark:text-white tracking-tighter">{profile.runway}</p>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest opacity-60">Months</p>
                    </div>
                    {(() => {
                      const health = getRunwayHealth(profile.runway);
                      return (
                        <div className="flex items-center gap-1.5">
                          <span className={cn("px-3 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-[0.15em] border", health.bg, health.color, health.border)}>
                            {health.text}
                          </span>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                <Card glass className="border-border/50 hover:border-success/30 transition-all hover:shadow-glow-soft group">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-[0.2em] opacity-70">
                      Deployment
                    </CardTitle>
                    <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center transition-colors group-hover:bg-success/20">
                      <TrendingUp className="w-5 h-5 text-success" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-medium text-foreground dark:text-white tracking-tighter mb-1">
                      {formatCurrency(profile.fundingRaised || 0)}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest opacity-60">Capital Deployed</p>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>

          {/* Daily Strategic Briefing */}
          <div className="rounded-2xl border border-primary/20 bg-card/60 backdrop-blur-md shadow-glow-soft overflow-hidden flex flex-col border-l-[6px] border-l-primary transition-all hover:border-primary/30">
            <div className="bg-background/40 text-foreground dark:text-white p-8 relative border-b border-border/30">
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-1.5 bg-primary/20 rounded-lg">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-medium tracking-tight">Daily Strategic Briefing</h2>
                  </div>
                  <p className="text-muted-foreground text-base max-w-2xl opacity-80">
                    Intelligence extraction from your current business trajectory and knowledge vault.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="px-4 py-1.5 border-primary/20 text-primary font-mono text-sm font-medium tracking-[0.2em] bg-primary/5 rounded-lg shadow-sm">
                    {briefing?.date || new Date().toISOString().split('T')[0]}
                  </Badge>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground dark:text-white hover:bg-white/5 rounded-xl transition-all">
                        <Share2 className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-card border-border/50 backdrop-blur-xl">
                      <DropdownMenuItem onClick={() => handleShare('whatsapp')} className="gap-3 p-3 cursor-pointer hover:bg-primary/5 focus:bg-primary/5 transition-colors">
                        <MessageCircle className="w-4 h-4 text-emerald-500" />
                        <span className="font-semibold">Share via WhatsApp</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('email')} className="gap-3 p-3 cursor-pointer hover:bg-primary/5 focus:bg-primary/5 transition-colors">
                        <Mail className="w-4 h-4 text-sky-500" />
                        <span className="font-semibold">Share via Email</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare('copy')} className="gap-3 p-3 cursor-pointer hover:bg-primary/5 focus:bg-primary/5 transition-colors">
                        {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-primary" />}
                        <span className="font-semibold">{isCopied ? 'Copied!' : 'Copy to Clipboard'}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            <div className="flex-1">
              {loading ? (
                <div className="p-8 space-y-4">
                  <Skeleton className="h-4 w-3/4 bg-border/50" />
                  <Skeleton className="h-4 w-full bg-border/50" />
                  <Skeleton className="h-4 w-5/6 bg-border/50" />
                </div>
              ) : briefing ? (
                <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border/30">
                  <div className="lg:col-span-2 p-8 sm:p-10">
                    <h3 className="text-xs font-medium text-primary uppercase tracking-[0.25em] mb-6 flex items-center gap-3">
                      <Bot className="w-5 h-5" />
                      Executive Intelligence Memo
                    </h3>
                    <div className="prose dark:prose-invert max-w-none text-foreground text-base leading-relaxed">
                      <ReactMarkdown
                        components={{
                          h3: ({ node, ...props }) => <h3 className="text-xl font-medium text-foreground dark:text-white mt-8 mb-4 first:mt-0 tracking-tight" {...props} />,
                          p: ({ node, ...props }) => <p className="mb-5 last:mb-0 leading-relaxed opacity-90" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-medium text-primary" {...props} />,
                        }}
                      >
                        {briefing.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <div className="p-8 sm:p-10 bg-background/30 space-y-10">
                    <div>
                      <h4 className="text-[11px] font-medium text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" /> High-Priority Directive
                      </h4>
                      <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl text-primary text-sm font-medium shadow-glow-soft leading-snug">
                        {briefing.analysis?.strategic_priority || 'Recalibrating priority matrix...'}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-medium text-destructive uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5" /> Detected Friction
                      </h4>
                      <ul className="space-y-4">
                        {briefing.analysis?.risks?.map((risk: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-3">
                            <span className="w-2 h-2 rounded-full bg-destructive mt-1.5 shrink-0 shadow-[0_0_5px_#FF4B4B]" />
                            <span className="leading-snug opacity-90">{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-medium text-soft-accent uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Growth Vectors
                      </h4>
                      <ul className="space-y-4">
                        {briefing.analysis?.opportunities?.map((opt: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-3">
                            <span className="w-2 h-2 rounded-full bg-soft-accent mt-1.5 shrink-0 shadow-[0_0_5px_#7ED6F5]" />
                            <span className="leading-snug opacity-90">{opt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-24 px-8 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin" />
                    <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                  <h4 className="text-foreground dark:text-white font-medium text-2xl mb-3 tracking-tight">Syncing Neural Pathways</h4>
                  <p className="text-muted-foreground text-base max-w-sm opacity-80">
                    The OS is processing your strategic nodes to generate a real-time executive brief.
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

            const barColors = [
              '#1E4C6D', // To Do (Secondary Space)
              '#2FD3FF', // In Progress (Primary Neon)
              '#19B6D2', // Completed (Secondary Accent)
            ];
            return (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-primary drop-shadow-[0_0_5px_rgba(47,211,255,0.4)]" />
                    <h2 className="text-2xl font-medium text-foreground dark:text-white tracking-tight">Execution Analytics</h2>
                  </div>
                  <Button variant="outline" size="sm" className="bg-card/50 text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground font-medium rounded-xl transition-all" onClick={() => router.push('/tasks')}>
                    <ListTodo className="w-4 h-4 mr-2" />
                    Task Matrix <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>

                <Card glass className="overflow-hidden border-border/50">
                  <CardContent className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      {/* Chart */}
                      <div className="lg:col-span-2 bg-background/40 rounded-2xl p-6 border border-border/30">
                        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-3">
                          <Activity className="w-4 h-4" />
                          Operational Flow Velocity
                        </p>
                        {loading ? (
                          <Skeleton className="h-56 w-full rounded-xl bg-border/30" />
                        ) : tasks.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-56 text-muted-foreground">
                            <Activity className="w-10 h-10 mb-4 opacity-30" />
                            <p className="text-base font-medium uppercase tracking-widest opacity-50">Empty Execution Stack</p>
                          </div>
                        ) : (
                          <ChartContainer config={{ count: { label: 'Tasks' } }} className="h-56 w-full">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(47,211,255,0.1)" />
                              <XAxis dataKey="stage" tick={{ fontSize: 11, fontWeight: 700, fill: 'rgba(255,255,255,0.5)' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: 'rgba(255,255,255,0.5)' }} axisLine={false} tickLine={false} />
                              <ChartTooltip content={<ChartTooltipContent className="bg-card border-primary/20" />} />
                              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={50}>
                                {chartData.map((_, idx) => (
                                  <Cell key={idx} fill={barColors[idx]} className="shadow-glow-soft" />
                                ))}
                              </Bar>
                            </BarChart>
                          </ChartContainer>
                        )}
                      </div>

                      {/* Sidebar stats */}
                      <div className="space-y-6">
                        <div className="rounded-2xl border border-primary/20 p-6 bg-primary/5 shadow-glow-soft backdrop-blur-sm">
                          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary mb-4">
                            Deployment Progress
                          </p>
                          <div className="flex items-baseline justify-between mb-4">
                            <span className="text-4xl font-medium tracking-tighter text-foreground dark:text-white">{completionPct}%</span>
                            <Badge className="bg-primary text-primary-foreground font-medium text-[10px] tracking-widest border-none px-3">ACTIVE</Badge>
                          </div>
                          <div className="w-full h-3 rounded-full bg-background overflow-hidden p-0.5 border border-primary/10">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_#2FD3FF]"
                              style={{ width: `${completionPct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-4 font-medium uppercase tracking-[0.15em] opacity-60">
                            {done} of {tasks.length} strategic milestones reach
                          </p>
                        </div>

                        <div className="rounded-2xl border border-border/50 p-6 bg-card text-foreground dark:text-white overflow-hidden relative group flex flex-col justify-center min-h-[140px] transition-all hover:border-primary/40">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-all duration-700" />
                          <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-3">
                              <Rocket className="w-4 h-4 text-primary" />
                              <p className="text-[11px] font-medium text-primary uppercase tracking-[0.25em]">
                                Priority Vector
                              </p>
                            </div>
                            <p className="text-base font-medium leading-snug line-clamp-2 tracking-tight">
                              {activeTask ? activeTask.title : 'All tactical protocols deployed.'}
                            </p>
                            {activeTask?.goal && (
                              <div className="mt-4 flex">
                                <Badge variant="outline" className="text-[9px] border-primary/30 text-primary bg-primary/5 uppercase font-medium tracking-[0.1em] px-2 py-0.5">
                                  {activeTask.goal.title}
                                </Badge>
                              </div>
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
          <div className="grid lg:grid-cols-2 gap-10 pt-4">
            <Card glass className="flex flex-col h-full border-border/50 overflow-hidden">
              <CardHeader className="border-b border-border/30 bg-background/20 p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BrainCircuit className="w-6 h-6 text-primary" />
                    <CardTitle className="text-xl font-medium tracking-tight text-foreground dark:text-white">Pending Alignment</CardTitle>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 font-medium px-3">
                    {ledger.filter(m => !m.isConfirmed).length} Unverified
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm mt-2 opacity-80">Verify AI intelligence extractions to weight your neural model.</p>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-0 max-h-[450px] scrollbar-thin">
                {ledger.filter(m => !m.isConfirmed).length === 0 ? (
                  <div className="p-20 text-center flex flex-col items-center justify-center opacity-30">
                    <CheckCircle2 className="w-12 h-12 text-primary mb-4" />
                    <p className="text-base font-medium uppercase tracking-widest">Model fully calibrated</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {ledger.filter(m => !m.isConfirmed).map((item) => (
                      <div key={item.id} className="p-6 hover:bg-primary/5 transition-all group">
                        <div className="flex items-start justify-between gap-6">
                          <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className={cn("text-[9px] font-medium uppercase tracking-widest px-2 py-0 h-4", getColorForType(item.memoryType))}>
                                {item.memoryType}
                              </Badge>
                              <span className="text-[10px] font-medium text-muted-foreground uppercase opacity-60">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-base text-foreground dark:text-white leading-snug font-medium tracking-tight">{item.insight}</p>
                          </div>
                          <div className="flex items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              disabled={!!processingId}
                              onClick={() => handleVerify(item.id)}
                              className="h-10 w-10 text-primary hover:bg-primary/10 rounded-xl"
                            >
                              {processingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              disabled={!!processingId}
                              onClick={() => handlePurge(item.id)}
                              className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl"
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card glass className="flex flex-col h-full border-border/50 overflow-hidden">
              <CardHeader className="border-b border-border/30 bg-background/20 p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Activity className="w-6 h-6 text-primary" />
                    <CardTitle className="text-xl font-medium tracking-tight text-foreground dark:text-white">Active DNA</CardTitle>
                  </div>
                  <p className="text-muted-foreground text-sm mt-2 opacity-80">Core strategic patterns driving autonomous execution.</p>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto p-0 max-h-[450px] scrollbar-thin">
                {ledger.filter(m => m.isConfirmed).length === 0 ? (
                  <div className="p-20 text-center flex flex-col items-center justify-center opacity-30">
                    <Activity className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-base font-medium uppercase tracking-widest">Awaiting strategy mapping</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {ledger.filter(m => m.isConfirmed).map((item) => (
                      <div key={item.id} className="p-6 hover:bg-accent/5 transition-all">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Badge className={cn("text-[9px] font-medium px-2 h-4 border-none tracking-widest", getColorForType(item.memoryType))}>
                              {item.memoryType}
                            </Badge>
                            <div className="flex items-center gap-3">
                              <div className="w-20 h-1.5 bg-background rounded-full overflow-hidden p-0.5 border border-border/30">
                                <div 
                                  className="h-full bg-primary rounded-full shadow-[0_0_5px_#2FD3FF]" 
                                  style={{ width: `${item.strategyWeight * 100}%` }}
                                />
                              </div>
                              <span className="text-[9px] font-medium text-primary uppercase tracking-widest">Weight</span>
                            </div>
                          </div>
                          <p className="text-base text-foreground dark:text-white leading-snug font-medium tracking-tight">{item.insight}</p>
                          {item.outgoingRelations && item.outgoingRelations.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {item.outgoingRelations.map((rel, ri) => (
                                <div key={ri} className="flex items-center gap-2 px-3 py-1 bg-primary/5 rounded-lg border border-primary/20 text-[10px] text-primary/80">
                                  <span className="font-medium text-primary uppercase tracking-tighter">{rel.type}</span>
                                  <ArrowRight className="w-2.5 h-2.5 opacity-50" />
                                  <span className="truncate max-w-[120px] font-medium">{rel.target.insight}</span>
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
          <div className="grid gap-6 md:grid-cols-4 pt-6 pb-20">
            <Link href="/chat" className="block group outline-none">
              <Card glass className="h-full border-border/50 transition-all duration-500 hover:shadow-glow-soft hover:-translate-y-2 hover:border-primary/40 p-2">
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center transition-all duration-500 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-glow-primary">
                      <Bot className="w-7 h-7" />
                    </div>
                    <ArrowRight className="w-6 h-6 text-muted-foreground transition-all duration-500 group-hover:text-primary group-hover:translate-x-2" />
                  </div>
                  <CardTitle className="text-xl font-medium text-foreground dark:text-white group-hover:text-primary transition-colors tracking-tight">Strategy Room</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed opacity-70">Synthesize strategy with your AI co-founder.</p>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/vault" className="block group outline-none">
              <Card glass className="h-full border-border/50 transition-all duration-500 hover:shadow-glow-soft hover:-translate-y-2 hover:border-soft-accent/40 p-2">
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-soft-accent/10 text-soft-accent flex items-center justify-center transition-all duration-500 group-hover:bg-soft-accent group-hover:text-background group-hover:shadow-glow-soft">
                      <Activity className="w-7 h-7" />
                    </div>
                    <ArrowRight className="w-6 h-6 text-muted-foreground transition-all duration-500 group-hover:text-soft-accent group-hover:translate-x-2" />
                  </div>
                  <CardTitle className="text-xl font-medium text-foreground dark:text-white group-hover:text-soft-accent transition-colors tracking-tight">Intelligence Vault</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed opacity-70">Ingest documents for strategic extraction.</p>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/tasks" className="block group outline-none">
              <Card glass className="h-full border-border/50 transition-all duration-500 hover:shadow-glow-soft hover:-translate-y-2 hover:border-primary/40 p-2">
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center transition-all duration-500 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-glow-primary">
                      <ListTodo className="w-7 h-7" />
                    </div>
                    <ArrowRight className="w-6 h-6 text-muted-foreground transition-all duration-500 group-hover:text-primary group-hover:translate-x-2" />
                  </div>
                  <CardTitle className="text-xl font-medium text-foreground dark:text-white group-hover:text-primary transition-colors tracking-tight">Execution Matrix</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed opacity-70">Monitor and deploy tactical operations.</p>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/company" className="block group outline-none">
              <Card glass className="h-full border-border/50 transition-all duration-500 hover:shadow-glow-soft hover:-translate-y-2 hover:border-primary/40 p-2">
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center transition-all duration-500 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-glow-primary">
                      <Building2 className="w-7 h-7" />
                    </div>
                    <ArrowRight className="w-6 h-6 text-muted-foreground transition-all duration-500 group-hover:text-primary group-hover:translate-x-2" />
                  </div>
                  <CardTitle className="text-xl font-medium text-foreground dark:text-white group-hover:text-primary transition-colors tracking-tight">Company DNA</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed opacity-70">Refine the foundational vision of the OS.</p>
                </CardHeader>
              </Card>
            </Link>
          </div>

        </div>
      </main>
    </>
  );
}
