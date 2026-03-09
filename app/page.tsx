"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, useTransform, useMotionValue, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Zap, 
  GitBranch, 
  Target, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  Cpu, 
  Globe,
  ChevronRight,
  Database,
  Search,
  Lock,
  LineChart,
  ShieldAlert,
  Fingerprint
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Link from 'next/link';
import Image from 'next/image';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const NeuralNetwork = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    opacity: number;
  }[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const nodeCount = 60;
    nodesRef.current = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.2,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const nodes = nodesRef.current;

      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            const opacity = (1 - dist / 200) * 0.15;
            const gradient = ctx.createLinearGradient(
              nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y
            );
            gradient.addColorStop(0, `rgba(60, 198, 231, ${opacity})`);
            gradient.addColorStop(1, `rgba(79, 163, 255, ${opacity})`);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      for (const node of nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(60, 198, 231, ${node.opacity})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 3, 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(
          node.x, node.y, 0, node.x, node.y, node.radius * 3
        );
        glow.addColorStop(0, `rgba(60, 198, 231, ${node.opacity * 0.3})`);
        glow.addColorStop(1, "rgba(60, 198, 231, 0)");
        ctx.fillStyle = glow;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <div className="absolute inset-0 bg-[#081A2E]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(60,198,231,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />
      <canvas ref={canvasRef} className="absolute inset-0" style={{ opacity: 0.6 }} />
    </div>
  );
};

const GlowCard = ({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [5, -5]);
  const rotateY = useTransform(x, [-100, 100], [-5, 5]);

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct * 200);
    y.set(yPct * 200);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative group rounded-2xl border border-white/10 bg-[#0f2540]/40 backdrop-blur-xl overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 opacity-0 group-hover:opacity-20 blur transition duration-500" />
      <div className="relative h-full p-6 flex flex-col">
        {children}
      </div>
    </motion.div>
  );
};

const Header = () => (
  <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-1 border-b border-white/5 bg-[#081A2E]/80 backdrop-blur-md">
    <div className="flex items-center">
      <div className="relative flex items-center overflow-hidden">
        <Image src="/MindAll%20logo.png" alt="MindAll Logo" width={100} height={60} className="object-contain" />
      </div>
    </div>
    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
      <a href="#showcase" className="hover:text-cyan-400 transition-colors">Showcase</a>
      <a href="#ledger" className="hover:text-cyan-400 transition-colors">Ledger</a>
      <a href="#roadmap" className="hover:text-cyan-400 transition-colors">Roadmap</a>
      <a href="#security" className="hover:text-cyan-400 transition-colors">Security</a>
    </nav>
    <div className="flex items-center gap-4">
      <Link href="/auth/login" className="hidden md:block text-sm font-medium text-slate-300 hover:text-white transition-colors">
        Sign In
      </Link>
      <Link href="/auth/register" className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full hover:shadow-[0_0_20px_rgba(60,198,231,0.5)] transition-all text-center">
        Get Started
      </Link>
    </div>
  </header>
);

const HeroSection = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="relative min-h-[80vh] flex flex-col items-center justify-center pt-24 pb-4 overflow-hidden">
      <NeuralNetwork />
      <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative mb-8 mt-2"
          style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
        >
          <motion.div 
            className="relative w-48 h-48 md:w-64 md:h-64"
            animate={{ rotateY: [-10, 10, -10], rotateX: [5, -5, 5], y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full opacity-80 shadow-[0_0_80px_rgba(60,198,231,0.5)]" />
            <div className="absolute inset-1.5 bg-[#081A2E] rounded-full flex items-center justify-center border border-white/10 overflow-hidden">
              <Image src="/logo2.png" alt="MindAll Core Intelligence" width={256} height={256} className="w-full h-full object-cover scale-110" />
            </div>
            
            <div className="absolute inset-0" style={{ transform: "rotateX(75deg) rotateY(-10deg)", transformStyle: "preserve-3d" }}>
              {['Data Moat', 'Briefings', 'Live Web', 'Ledger'].map((item, i) => {
                const angle = (i / 4) * 360;
                return (
                  <motion.div
                    key={item}
                    className="absolute top-1/2 left-1/2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, ease: "linear", repeat: Infinity }}
                    style={{ transformOrigin: "0px 0px", transformStyle: "preserve-3d" }}
                  >
                    <div
                      className="absolute flex flex-col items-center gap-2"
                      style={{
                        transform: `rotate(${angle}deg) translateX(220px) rotate(-${angle}deg) rotateX(-75deg) rotateY(10deg)`,
                        transformStyle: "preserve-3d"
                      }}
                    >
                      <motion.div
                        className="w-4 h-4 rounded-full bg-cyan-300"
                        animate={{ scale: [1, 1.5, 1], boxShadow: ["0 0 10px #22d3ee", "0 0 25px #22d3ee", "0 0 10px #22d3ee"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <span className="text-[12px] whitespace-nowrap uppercase tracking-[0.2em] text-cyan-100 font-bold bg-[#081A2E]/80 border border-cyan-500/30 px-3 py-1 rounded-full backdrop-blur-md shadow-lg">
                        {item}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>

        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight"
        >
          Your AI <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-200">
            Strategic Co-Founder
          </span>
        </motion.h1>

        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10"
        >
          The first AI Business Operating System (BOS) with Level 3.5 Intelligence. Ground your strategy in proprietary data, real-time market facts, and an immutable strategic ledger.
        </motion.p>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link href="/auth/register" className="group relative px-8 py-4 bg-white text-[#081A2E] rounded-full font-bold text-lg hover:scale-105 transition-transform overflow-hidden text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-200 to-blue-200 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative flex items-center justify-center gap-2">
              Initialize Operating System <ArrowRight className="w-5 h-5" />
            </span>
          </Link>
          <a href="#showcase" className="px-8 py-4 rounded-full font-medium text-lg text-white border border-white/20 hover:bg-white/5 transition-colors backdrop-blur-sm text-center">
            View Strategic Interface
          </a>
        </motion.div>
      </div>

      <motion.div
        className="pointer-events-none fixed top-0 left-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] z-0"
        animate={{ x: mousePosition.x - 250, y: mousePosition.y - 250 }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
      />
    </section>
  );
};

const ProductShowcase = () => {
  return (
    <section id="showcase" className="py-4 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-8 relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-2 text-center">The Strategic Intelligence Engine</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">Not a chatbot. A production-grade engine leveraging multi-source RAG and real-time retrieval to guide your venture through the Valley of Death.</p>
        </div>

        <div className="relative group flex justify-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-cyan-500/10 rounded-full blur-[120px] opacity-50 group-hover:opacity-80 transition duration-1000" />
          <div className="relative w-full max-w-5xl">
            <div className="relative aspect-video w-full [mask-image:radial-gradient(ellipse_at_center,white_30%,transparent_85%)]">
              <img src="/human&Ai_Collab.png" alt="MindAll Strategic Interface" className="w-full h-full object-cover scale-105 group-hover:scale-110 transition duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#081A2E] via-transparent to-[#081A2E] opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#081A2E] via-transparent to-[#081A2E] opacity-40" />
            </div>
            
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 text-center z-20">
              <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 backdrop-blur-md">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                <span className="text-cyan-400 text-[10px] font-mono uppercase tracking-widest">Multi-Source RAG Active</span>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Hybrid Intelligence Core</h3>
              <p className="text-slate-300 text-sm md:text-base leading-relaxed">MindAll automatically routes requests between internal proprietary memory and live web facts using the Tavily API, ensuring every response is grounded in reality.</p>
              
              <div className="flex justify-center gap-4 mt-4">
                <div className="px-4 py-2 bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 text-white text-xs font-medium">
                  Google Gemini Flash Powered
                </div>
                <div className="px-4 py-2 bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 text-white text-xs font-medium">
                  Local Vector Embeddings
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const StrategicLedger = () => {
  const points = [
    { label: "Interactive Memory Alignment", desc: "Verify, purge, or weight AI-extracted insights to ensure the engine remains perfectly aligned with your vision.", icon: <ShieldCheck className="w-5 h-5 text-green-400" /> },
    { label: "Strategic Drift Detection", desc: "AI-powered identification of contradictions between your current actions and confirmed company DNA.", icon: <Sparkles className="w-5 h-5 text-cyan-400" /> },
    { label: "Knowledge Lineage Tracking", desc: "Trace how strategic insights evolve through SUPPORTS, CONTRADICTS, and REFINES relationships.", icon: <Globe className="w-5 h-5 text-blue-400" /> },
  ];

  return (
    <section id="ledger" className="py-4 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">The Level 3.5 <br /><span className="text-cyan-400">Strategic Ledger</span></h2>
            <p className="text-slate-400 mb-6 text-lg">Ephemeral chat is for hobbies. Professional ventures require a permanent record of truth. Verify your startup's DNA and ensure zero strategic drift.</p>
            
            <div className="space-y-4">
              {points.map((p, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-colors">
                  <div className="mt-1">{p.icon}</div>
                  <div>
                    <h4 className="text-white font-bold mb-1">{p.label}</h4>
                    <p className="text-slate-400 text-sm">{p.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition" />
            <div className="relative bg-[#0f2540] border border-white/10 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                <span className="text-xs font-mono text-cyan-400">STRATEGY_HEALTH_SCORE: 94%</span>
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-[10px] rounded uppercase font-bold tracking-widest">Active Alignment</span>
              </div>
              
              <div className="space-y-4">
                {[
                  { time: "Observed", event: "Pivot to Enterprise B2B", type: "SUPPORTS", status: "VERIFIED" },
                  { time: "Analyzed", event: "Validated SaaS Market Gap", type: "REFINES", status: "VERIFIED" },
                  { time: "Detected", event: "Strategic Drift in Pricing", type: "CONTRADICTS", status: "PENDING" },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-xs font-mono text-slate-500">{item.time}</div>
                      <div className="text-sm text-slate-200 font-medium">{item.event}</div>
                    </div>
                    <div className={cn("text-[9px] font-mono px-2 py-0.5 rounded", item.status === "VERIFIED" ? "text-green-400 bg-green-500/10 border border-green-500/20" : "text-yellow-400 bg-yellow-500/10 border border-yellow-500/20")}>
                      <span className="opacity-60 mr-1">{item.type}</span> | {item.status}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 flex justify-center">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-ping" />
                  <ShieldCheck className="w-8 h-8 text-cyan-400 relative z-10" />
                </div>
              </div>
              <p className="text-center mt-2 text-xs font-mono text-slate-500 uppercase tracking-widest">Active Identity DNA Grounding</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const StrategicRoadmap = () => {
  const levels = [
    { level: "Level 1", title: "Deep Data Moat", status: "Deployed", desc: "Knowledge Vault for PDF/Markdown ingestion and semantic memory storage." },
    { level: "Level 2", title: "Proactive Agency", status: "Active", desc: "Daily Executive Briefings generated by background agents monitoring your startup." },
    { level: "Level 3", title: "Real-Time Intelligence", status: "Active", desc: "Automated routing between internal memory and live web facts (Tavily API)." },
    { level: "Level 4", title: "Execution Layer", status: "Roadmap", desc: "Direct integration with Linear, Notion, and Slack to execute strategic plans." },
  ];

  return (
    <section id="roadmap" className="py-4 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-2 text-center">Intelligence Evolution</h2>
          <p className="text-slate-400 max-w-xl mx-auto">Our roadmap to the first complete AI Business Operating System.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {levels.map((l, i) => (
            <div key={i} className={cn(
              "p-6 rounded-2xl border transition-all duration-500",
              l.status === "Roadmap" ? "bg-white/5 border-white/5 opacity-60" : "bg-[#0f2540] border-white/10 hover:border-cyan-500/30"
            )}>
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">{l.level}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                  l.status === "Deployed" ? "bg-green-500/20 text-green-400" : 
                  l.status === "Active" ? "bg-cyan-500/20 text-cyan-400" : "bg-white/10 text-slate-400"
                )}>{l.status}</span>
              </div>
              <h4 className="text-white font-bold mb-2">{l.title}</h4>
              <p className="text-slate-400 text-xs leading-relaxed">{l.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const SecuritySection = () => {
  return (
    <section id="security" className="py-4 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 relative">
            <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-[100px]" />
            <div className="relative grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-[#0f2540] border border-purple-500/20 flex flex-col items-center text-center">
                <Lock className="w-8 h-8 text-purple-400 mb-4" />
                <h4 className="text-white font-bold text-sm mb-2">BAM Protocol</h4>
                <p className="text-slate-400 text-[10px]">Backend Authority Model prevents data cross-contamination.</p>
              </div>
              <div className="p-6 rounded-2xl bg-[#0f2540] border border-cyan-500/20 flex flex-col items-center text-center mt-8">
                <ShieldAlert className="w-8 h-8 text-cyan-400 mb-4" />
                <h4 className="text-white font-bold text-sm mb-2">XML Isolation</h4>
                <p className="text-slate-400 text-[10px]">Strict data wrapping prevents adversarial prompt injection.</p>
              </div>
              <div className="p-6 rounded-2xl bg-[#0f2540] border border-blue-500/20 flex flex-col items-center text-center">
                <Fingerprint className="w-8 h-8 text-blue-400 mb-4" />
                <h4 className="text-white font-bold text-sm mb-2">Tenant Hygiene</h4>
                <p className="text-slate-400 text-[10px]">Force-injected JWT derived tenant mapping at the tool layer.</p>
              </div>
              <div className="p-6 rounded-2xl bg-[#0f2540] border border-green-500/20 flex flex-col items-center text-center mt-8">
                <Database className="w-8 h-8 text-green-400 mb-4" />
                <h4 className="text-white font-bold text-sm mb-2">pgvector Guard</h4>
                <p className="text-slate-400 text-[10px]">Encrypted semantic memory with strict RLS policies.</p>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Hardened <span className="text-purple-400">Security Core</span></h2>
            <p className="text-slate-400 mb-8 text-lg">Your business data is your most valuable asset. MindAll is built with a "Zero Trust" backend model, ensuring that proprietary DNA never leaks between ventures.</p>
            <ul className="space-y-4">
              {[
                "Strict context isolation using hardened XML boundaries",
                "Backend-enforced tenant authority for all tool executions",
                "Automated detection of strategic drift and data anomalies",
                "Enterprise-grade encryption for the entire Knowledge Vault"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-300">
                  <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

const FeaturesGrid = () => {
  const features = [
    {
      icon: <Database className="w-6 h-6 text-cyan-400" />,
      title: "Knowledge Vault",
      desc: "Elite RAG engine with semantic chunking and local vector memory. Build a proprietary data moat for your venture."
    },
    {
      icon: <Zap className="w-6 h-6 text-yellow-400" />,
      title: "Proactive Agency",
      desc: "Daily morning briefings and executive memos generated by background agents monitoring your startup's trajectory."
    },
    {
      icon: <Search className="w-6 h-6 text-blue-400" />,
      title: "Intelligence Router",
      desc: "Automated strategic routing between internal deep memory and live web intelligence via Tavily API."
    },
    {
      icon: <Lock className="w-6 h-6 text-purple-400" />,
      title: "Hardened BAM Security",
      desc: "Backend Authority Model (BAM) ensures complete tenant isolation and prevents cross-company data leakage."
    }
  ];

  return (
    <section id="intelligence" className="py-4 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-2 text-left">Production-Grade Intelligence</h2>
          <p className="text-slate-400 max-w-xl">A battle-hardened stack designed for founders who require more than just creative text.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <GlowCard key={i} delay={i * 0.1} className="min-h-[240px]">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 border border-white/10">{f.icon}</div>
              <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
              <p className="text-slate-400 leading-relaxed">{f.desc}</p>
            </GlowCard>
          ))}
        </div>
      </div>
    </section>
  );
};

const WorkflowDiagram = () => {
  const steps = [
    { label: "Identity DNA", icon: <Database className="w-5 h-5" /> },
    { label: "Intelligence Router", icon: <Cpu className="w-5 h-5" /> },
    { label: "Strategic Ledger", icon: <ShieldCheck className="w-5 h-5" /> },
    { label: "90-Day Blueprint", icon: <LineChart className="w-5 h-5" /> },
    { label: "Tactical Execution", icon: <Zap className="w-5 h-5" /> },
  ];

  return (
    <section id="workflow" className="py-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-900/10 to-transparent" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-2 text-center">The Strategic Pipeline</h2>
          <p className="text-slate-400 text-center">From raw data to tactical deployment in a self-reinforcing intelligence loop.</p>
        </div>
        <div className="relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -translate-y-1/2 hidden md:block" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {steps.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.2 }} className="relative flex flex-col items-center text-center group">
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-[#0f2540] border border-white/10 flex items-center justify-center mb-6 group-hover:border-cyan-500/50 group-hover:shadow-[0_0_30px_rgba(60,198,231,0.3)] transition-all duration-500">
                  <div className="text-slate-300 group-hover:text-cyan-400 transition-colors">{step.icon}</div>
                  {i === 1 && <div className="absolute inset-0 rounded-2xl bg-cyan-500/20 animate-ping" />}
                </div>
                <h4 className="text-white font-medium mb-2">{step.label}</h4>
                <div className="h-1 w-8 bg-cyan-500/50 rounded-full" />
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-full text-slate-600">
                    <ChevronRight className="w-6 h-6 animate-pulse" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const FinalCTA = () => (
  <section className="py-4 relative">
    <div className="max-w-4xl mx-auto px-6 text-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="relative p-12 rounded-3xl overflow-hidden border border-white/10 bg-[#0f2540]">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10" />
        <div className="relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 text-center">Initialize Your <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Strategic Core</span></h2>
          <p className="text-lg text-slate-300 mb-6 max-w-2xl mx-auto">Join the new generation of founders building with grounded intelligence. Deploy your Strategic Co-Founder today.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/auth/register" className="px-8 py-4 bg-white text-[#081A2E] rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)] text-center">Initialize Operating System</Link>
            <Link href="/auth/login" className="px-8 py-4 bg-transparent border border-white/20 text-white rounded-full font-medium text-lg hover:bg-white/5 transition-colors text-center">Contact Sales</Link>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="border-t border-white/5 bg-[#081A2E] pt-16 pb-8 relative overflow-hidden">
    {/* Subtle Neural Background for Footer */}
    <div className="absolute inset-0 opacity-10 pointer-events-none">
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-cyan-500/20 to-transparent" />
    </div>

    <div className="max-w-7xl mx-auto px-6 relative z-10">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
        {/* Brand Column */}
        <div className="col-span-2 lg:col-span-2">
          <div className="relative w-32 h-16 mb-6">
            <Image src="/MindAll%20logo.png" alt="MindAll Logo" width={128} height={64} className="object-contain" />
          </div>
          <p className="text-slate-400 text-sm max-w-xs mb-8 leading-relaxed">
            The first AI Business Operating System (BOS) designed to bridge the gap between abstract strategy and tactical execution. Built for Level 3.5 Intelligence.
          </p>
          <div className="flex items-center gap-4 text-slate-500">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-green-400">All Systems Operational</span>
            </div>
          </div>
        </div>

        {/* Intelligence Links */}
        <div>
          <h4 className="text-white font-bold text-sm mb-6 uppercase tracking-wider">Intelligence</h4>
          <ul className="space-y-4 text-slate-400 text-sm">
            <li><a href="#showcase" className="hover:text-cyan-400 transition-colors">Strategy Room</a></li>
            <li><a href="#ledger" className="hover:text-cyan-400 transition-colors">Strategic Ledger</a></li>
            <li><a href="#roadmap" className="hover:text-cyan-400 transition-colors">Roadmap Architect</a></li>
            <li><a href="#security" className="hover:text-cyan-400 transition-colors">Knowledge Vault</a></li>
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h4 className="text-white font-bold text-sm mb-6 uppercase tracking-wider">Resources</h4>
          <ul className="space-y-4 text-slate-400 text-sm">
            <li><a href="#" className="hover:text-cyan-400 transition-colors">Documentation</a></li>
            <li><a href="#" className="hover:text-cyan-400 transition-colors">BAM Security Whitepaper</a></li>
            <li><a href="#" className="hover:text-cyan-400 transition-colors">API Reference</a></li>
            <li><a href="#" className="hover:text-cyan-400 transition-colors">Strategic Frameworks</a></li>
          </ul>
        </div>

        {/* Legal/Social */}
        <div>
          <h4 className="text-white font-bold text-sm mb-6 uppercase tracking-wider">Connect</h4>
          <ul className="space-y-4 text-slate-400 text-sm">
            <li><a href="#" className="hover:text-cyan-400 transition-colors">Twitter (X)</a></li>
            <li><a href="#" className="hover:text-cyan-400 transition-colors">LinkedIn</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-slate-500 text-xs font-mono uppercase tracking-tighter">
          © 2024 MINDALL SYSTEMS INC. | GROUNDED IN PROPRIETARY TRUTH.
        </div>
        <div className="flex items-center gap-6">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-slate-800 border-2 border-[#081A2E] flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-cyan-500" />
              </div>
            ))}
          </div>
          <span className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">Active Hybrid Nodes</span>
        </div>
      </div>
    </div>
  </footer>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#081A2E] text-slate-200 selection:bg-cyan-500/30 font-sans">
      <Header />
      <main>
        <HeroSection />
        <ProductShowcase />
        <StrategicLedger />
        <StrategicRoadmap />
        <SecuritySection />
        <FeaturesGrid />
        <WorkflowDiagram />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
