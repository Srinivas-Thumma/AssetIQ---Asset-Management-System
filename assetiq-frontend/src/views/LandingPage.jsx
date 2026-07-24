import React from 'react';
import { 
  ShieldCheck, LayoutDashboard, MapPin, Wrench, Shield, 
  QrCode, UserCheck, BarChart2, Cpu, CheckCircle2, ChevronRight,
  Globe, User, Award, ShieldAlert
} from 'lucide-react';

export default function LandingPage({ onNavigateToLogin, onNavigateToRegister }) {
  
  const features = [
    {
      icon: MapPin,
      title: 'Location Hierarchy',
      desc: 'Map spatial relationships through Branch → Building → Floor → Room nesting schemas.'
    },
    {
      icon: Wrench,
      title: 'Maintenance Log sweeps',
      desc: 'Schedule routine preventives, report breakdown damage, and log technician findings.'
    },
    {
      icon: Shield,
      title: 'Warranty Ledger',
      desc: 'Track supplier coverage terms, time-remaining counts, and receive automated expiration warnings.'
    },
    {
      icon: QrCode,
      title: 'QR Code Deep-Linking',
      desc: 'Generate scan-ready base64 PNG tags for every asset to immediately trace custody and status logs.'
    },
    {
      icon: UserCheck,
      title: 'Immutable Handover logs',
      desc: 'Maintain a chronological audit log of asset custody. Track who assigned, when, and when returned.'
    },
    {
      icon: BarChart2,
      title: 'Cost Aggregations',
      desc: 'Visualize cost distributions, category loading, and monthly repair spending charts.'
    }
  ];

  const roles = [
    {
      role: 'Super Admin',
      color: 'border-purple-500/20 text-purple-600 bg-purple-50',
      badge: 'bg-purple-600',
      desc: 'Platform-level administrator managing the SaaS infrastructure.',
      perms: ['Create & suspend tenant orgs', 'View platform global metrics', 'Manage system plan quotas']
    },
    {
      role: 'Org Admin',
      color: 'border-blue-500/20 text-blue-600 bg-blue-50',
      badge: 'bg-blue-600',
      desc: 'Organization-level manager in charge of corporate settings.',
      perms: ['Configure branch/room trees', 'Manage lookups & employees', 'Full asset register access', 'Track billing reports']
    },
    {
      role: 'Asset Manager',
      color: 'border-emerald-500/20 text-emerald-600 bg-emerald-50',
      badge: 'bg-emerald-600',
      desc: 'Operations specialist coordinating field inventories.',
      perms: ['Register & edit assets', 'Assign/return hardware', 'Schedule repair tickets', 'Download QR code tags']
    },
    {
      role: 'Employee',
      color: 'border-slate-500/20 text-slate-600 bg-slate-50',
      badge: 'bg-slate-900',
      desc: 'Regular staff member accessing assigned physical hardware.',
      perms: ['View assigned custodianship', 'Inspect active warranty status', 'File corrective damage reports']
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Sticky Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center max-w-7xl mx-auto rounded-b-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-lg shadow-sm">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">AssetIQ</span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-semibold text-slate-500">
          <a href="#features" className="hover:text-slate-950 transition-colors">Features</a>
          <a href="#ai" className="hover:text-slate-950 transition-colors">AI Diagnostics</a>
          <a href="#roles" className="hover:text-slate-950 transition-colors">RBAC Matrix</a>
          <a href="#pricing" className="hover:text-slate-950 transition-colors">Plans</a>
        </nav>
        <div className="flex items-center gap-3">
          <button 
            onClick={onNavigateToLogin}
            className="text-sm font-bold text-slate-600 hover:text-slate-950 px-4 py-2 cursor-pointer transition-colors"
          >
            Sign In
          </button>
          <button 
            onClick={onNavigateToRegister}
            className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-sm cursor-pointer transition-all active:scale-[0.98]"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-20 text-center relative">
        <div className="max-w-3xl mx-auto space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-semibold text-blue-600">
            <Cpu className="h-3.5 w-3.5" />
            Explainable AI Local-First Architecture
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Local-First Asset Tracking <br />
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Infused with Explainable AI
            </span>
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed">
            Banish spreadsheets. Map office locations, enforce plan asset limits, automate warranty checks, and run predictive maintenance audits using local LLMs on your own machine.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <button 
              onClick={onNavigateToRegister}
              className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-500/20 cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Get Started Free
              <ChevronRight className="h-5 w-5" />
            </button>
            <button 
              onClick={onNavigateToLogin}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-3 px-8 rounded-xl shadow-xs cursor-pointer active:scale-[0.98] transition-all"
            >
              Access Demo Accounts
            </button>
          </div>
        </div>

        {/* Dashboard Mockup Representation */}
        <div className="mt-16 bg-slate-900 rounded-2xl p-4 md:p-6 shadow-2xl border border-slate-800 max-w-5xl mx-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-40" />
          
          {/* Mock Header */}
          <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-slate-500 text-xs font-semibold ml-2 font-mono">Workspace: Acme Corp</span>
            </div>
            <div className="h-2 w-32 bg-slate-800 rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {/* Stat Cards */}
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Inventory</span>
              <div className="text-2xl font-extrabold text-white">42 Active Assets</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-blue-500 h-full w-[80%]" />
              </div>
            </div>
            
            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">AI Mean Health</span>
              <div className="text-2xl font-extrabold text-emerald-400">94.2% Stability</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-400 h-full w-[94%]" />
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active servicing</span>
              <div className="text-2xl font-extrabold text-amber-400">3 Tickets Open</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-amber-400 h-full w-[30%]" />
              </div>
            </div>
          </div>

          {/* AI Alert Mock Box */}
          <div className="mt-4 bg-blue-950/50 border border-blue-900/60 rounded-xl p-4 text-left flex gap-3 items-start">
            <ShieldAlert className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-bold text-blue-300 uppercase tracking-wide">LLM FAILURE RISK ALERT</span>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                <span className="font-semibold text-white">Asset HVAC-AC-09:</span> Failure probability 85%. Cumulative maintenance cost exceeds 50% of acquisition value ($2,400). Recommendation: replace compressor unit before peak seasonal cooling demands.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Section */}
      <section id="features" className="bg-white border-y border-slate-100 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Full-Lifecycle Asset Infrastructure</h2>
            <p className="text-slate-500">Every tool necessary to register hardware, track custody, audit servicing, and optimize budgets.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div key={idx} className="bg-slate-50 border border-slate-100 p-6 rounded-2xl hover:shadow-md transition-all space-y-3">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl inline-block shadow-2xs">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Dark AI Diagnostics Section */}
      <section id="ai" className="bg-slate-950 text-white py-20 relative overflow-hidden">
        <div className="absolute top-[-30%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
              Explainable Inference Layer
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              Reasoning over hardware logs, not guessing parameters.
            </h2>
            <p className="text-slate-400 leading-relaxed">
              Supervised machine learning models are built on historical failure data, which solo businesses rarely possess. 
              AssetIQ leverages local Large Language Models (LLMs) to reason over the asset profile and maintenance history, calculating a transparent health score accompanied by natural language diagnostics.
            </p>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-300"><span className="font-semibold text-white">Local-First Privacy</span>: All LLM reasoning occurs inside your localhost via Ollama. No API keys, no external bandwidth calls.</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-300"><span className="font-semibold text-white">Caching Gate Architecture</span>: Scores are stored directly in the database. Re-computation occurs nightly or on-demand to keep dashboards responsive.</p>
              </div>
            </div>
          </div>

          {/* Diagnostic Prompt Mockup */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Ollama prompt context</span>
            <div className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-slate-300 border border-slate-900 space-y-2 overflow-x-auto">
              <div><span className="text-blue-400">"asset"</span>: "Laptop MacBook Pro 16"</div>
              <div><span className="text-blue-400">"age"</span>: "3.2 Years"</div>
              <div><span className="text-blue-400">"repairs"</span>: 4, <span className="text-blue-400">"totalCost"</span>: "$950"</div>
              <div><span className="text-blue-400">"lastEvent"</span>: "Display flickering. Screen replaced."</div>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
              <Cpu className="h-4 w-4 animate-pulse" />
              <span>Inference analysis...</span>
            </div>

            <div className="bg-blue-950/40 border border-blue-900/60 rounded-xl p-4 text-left">
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">Structured JSON Output</div>
              <div className="text-xs font-mono text-slate-200 space-y-1">
                <div>{'{'}</div>
                <div className="pl-4">"healthScore": <span className="text-emerald-400">68</span>,</div>
                <div className="pl-4">"insights": [</div>
                <div className="pl-8">"High frequency of screen/display repairs.",</div>
                <div className="pl-8">"Total repair cost exceeds 45% of purchase value."</div>
                <div className="pl-4">]</div>
                <div>{'}'}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Role-Based Access Control (RBAC) */}
      <section id="roles" className="bg-white border-b border-slate-100 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Structured RBAC Matrix</h2>
            <p className="text-slate-500">Secure guards verifying user roles on both the client interface and API routing layers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {roles.map((r, idx) => (
              <div key={idx} className="border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col space-y-4 hover:shadow-md transition-all">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold w-fit ${r.color}`}>
                  {r.role}
                </span>
                <p className="text-xs text-slate-500 leading-relaxed flex-1">{r.desc}</p>
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scope Boundaries</span>
                  {r.perms.map((p, pIdx) => (
                    <div key={pIdx} className="flex gap-2 text-xs text-slate-700 font-medium">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${r.badge}`} />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Pricing Plans */}
      <section id="pricing" className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Flexible SaaS Subscription Plans</h2>
            <p className="text-slate-500">Plan checking logic automatically counts active assets to block registry exceeding quotes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Free */}
            <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-xs space-y-6 flex flex-col relative overflow-hidden">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Free Tier</h3>
                <span className="text-3xl font-black text-slate-900 block mt-3">$0</span>
                <span className="text-xs text-slate-400">Single Local Instance</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-600 flex-1">
                <li className="flex gap-2 items-center"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> 10 Assets Limit</li>
                <li className="flex gap-2 items-center"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Standard Location Hierarchy</li>
                <li className="flex gap-2 items-center"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Local Mock AI Fallback</li>
              </ul>
              <button 
                onClick={onNavigateToRegister}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer transition-colors"
              >
                Sign Up
              </button>
            </div>

            {/* Pro */}
            <div className="bg-white border-2 border-blue-500 rounded-2xl p-8 shadow-md space-y-6 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-bold uppercase tracking-wider py-1 px-4 rounded-bl-lg">
                Popular
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Professional</h3>
                <span className="text-3xl font-black text-slate-900 block mt-3">$49<span className="text-sm font-semibold text-slate-400">/mo</span></span>
                <span className="text-xs text-slate-400">Small Business Management</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-600 flex-1">
                <li className="flex gap-2 items-center"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> 500 Assets Limit</li>
                <li className="flex gap-2 items-center"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Full Local Ollama LLM integration</li>
                <li className="flex gap-2 items-center"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Standard QR & Custody logs</li>
                <li className="flex gap-2 items-center"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Financial Reporting suites</li>
              </ul>
              <button 
                onClick={onNavigateToRegister}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer shadow-md shadow-blue-500/10 transition-colors"
              >
                Launch Pro Workspace
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-xs space-y-6 flex flex-col relative overflow-hidden">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Enterprise</h3>
                <span className="text-3xl font-black text-slate-900 block mt-3">$199<span className="text-sm font-semibold text-slate-400">/mo</span></span>
                <span className="text-xs text-slate-400">Platform Quota Expansion</span>
              </div>
              <ul className="space-y-3 text-xs text-slate-600 flex-1">
                <li className="flex gap-2 items-center"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Unlimited Assets</li>
                <li className="flex gap-2 items-center"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Multitenant Cluster controls</li>
                <li className="flex gap-2 items-center"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Custom LLM prompt weights</li>
              </ul>
              <button 
                onClick={onNavigateToRegister}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer transition-colors"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Footer CTA */}
      <section className="bg-slate-900 text-white py-16 text-center px-6 relative overflow-hidden">
        <div className="max-w-2xl mx-auto space-y-6 relative">
          <h2 className="text-3xl font-extrabold tracking-tight">Boost your Hardware Oversight Efficiency Today</h2>
          <p className="text-slate-400 text-sm">Create an organization workspace in seconds. Seed defaults automatically to test boundaries immediately.</p>
          <div className="flex justify-center gap-4 pt-2">
            <button 
              onClick={onNavigateToRegister}
              className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-white font-bold py-3 px-8 rounded-xl cursor-pointer shadow-lg transition-all active:scale-[0.98]"
            >
              Get Started Now
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-s py-8 text-center  max-w-screen mx-auto border-t border-slate-400">
        <p>© 2026 AssetIQ Systems. Built for solo offline deployment and explainable reviews. All rights reserved.</p>
      </footer>
    </div>
  );
}
