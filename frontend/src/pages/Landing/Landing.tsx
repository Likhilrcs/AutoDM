import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Lock,
  Instagram,
  MessageSquare,
  Clock,
  ChevronDown,
  Star,
  Check,
  TrendingUp,
  Layers,
  ArrowUpRight,
  Play,
  Mail,
  Send,
  Loader2,
} from 'lucide-react';

export const Landing: React.FC = () => {
  const [openFaqs, setOpenFaqs] = useState<number[]>([0]);
  const [simulatedComment, setSimulatedComment] = useState('LINK');

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactTopic, setContactTopic] = useState('Support');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      toast.error('Please fill in your name, email, and message.');
      return;
    }

    setContactSending(true);

    const payload = {
      name: contactName.trim(),
      email: contactEmail.trim(),
      topic: contactTopic,
      message: contactMessage.trim(),
      timestamp: new Date().toISOString(),
    };

    const SCRIPT_URL =
      import.meta.env.VITE_APP_SCRIPT_URL ||
      (import.meta.env as any).APP_SCRIPT ||
      'https://script.google.com/macros/s/AKfycbx4dru7MjmiB93yeCvNCuvzCrmqk5TMy8EIjgNof8qTJ_AGabGrphLI2fA5B7BBwfI/exec';

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      // Reset inputs on success
      setContactName('');
      setContactEmail('');
      setContactTopic('Support');
      setContactMessage('');
      setContactSent(true);
      toast.success('Thank you! Your message has been sent and recorded. We will get back to you shortly.');
      setTimeout(() => setContactSent(false), 7000);
    } catch (err) {
      console.error('Submission error:', err);
      toast.error('Failed to submit inquiry. Please try again or email us directly.');
    } finally {
      setContactSending(false);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaqs((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const faqs = [
    {
      q: 'Will my Instagram account get shadowbanned or restricted?',
      a: 'Never. AutoDM connects exclusively via the Official Meta Graph API v21.0 Webhooks and Messaging endpoints. We do NOT use browser scrapers, headless bots, or unofficial methods. Your account is 100% compliant with Instagram Developer Policies.',
    },
    {
      q: 'Do you ever ask for my Instagram password?',
      a: 'No, never. You authenticate through Meta’s official OAuth permission screen directly on Instagram or Facebook. AutoDM only receives temporary, encrypted API access tokens with granular permissions.',
    },
    {
      q: 'Does it work for both Instagram Reels and regular Feed posts?',
      a: 'Yes! You can configure automations for any specific Reel, video, carousel, or feed post — or enable an account-wide trigger that automatically replies to all incoming comments.',
    },
    {
      q: 'Can I send clickable links, lead magnets, and buttons in DMs?',
      a: 'Absolutely. You can send personalized direct messages with links to your course, newsletter, calendar booking link, Shopify store, or digital download.',
    },
    {
      q: 'What happens if someone comments the same keyword multiple times?',
      a: 'AutoDM comes with built-in deduplication and cooldown safeguards. We ensure the follower receives the DM once without being spammed, keeping your engagement professional.',
    },
    {
      q: 'Is there a free trial to test it out?',
      a: 'Yes, every creator gets 14 days of free access with full features. No credit card required. You can also sign up in seconds with Google 1-click login.',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Jenkins',
      handle: '@sarah.fitcoach',
      followers: '185k followers',
      role: 'Fitness Coach & Author',
      initials: 'SJ',
      avatarColor: 'from-pink-500 to-rose-500',
      stat: '+$24K Launch Revenue',
      quote:
        'I had a Reel blow up to 1.8M views. In the past, I would spend days manually messaging people. With AutoDM, 14,000+ people got my workout PDF in under 2 seconds. Made $24k in 4 days!',
    },
    {
      name: 'Marcus Vance',
      handle: '@marcus.scale',
      followers: '92k followers',
      role: 'SaaS Founder & Creator',
      initials: 'MV',
      avatarColor: 'from-indigo-500 to-blue-600',
      stat: '+310% Demo Bookings',
      quote:
        "Our inbound demo bookings tripled. We tell people 'Comment DEMO for our private VIP walkthrough link'. The automation responds instantly while their interest is at peak. Absolute game changer.",
    },
    {
      name: 'Elena Rostova',
      handle: '@elena.creative',
      followers: '340k followers',
      role: 'Digital Artist & Educator',
      initials: 'ER',
      avatarColor: 'from-purple-500 to-violet-600',
      stat: '1.2M Reel Reach',
      quote:
        'The public comment reply rotator is brilliant. It makes engagement look 100% natural and algorithmic reach went through the roof. Plus, zero risk of shadowbans because it uses official Meta APIs.',
    },
    {
      name: 'Liam O’Connor',
      handle: '@ecom.liam',
      followers: '65k followers',
      role: 'E-Commerce Founder',
      initials: 'LO',
      avatarColor: 'from-amber-500 to-orange-600',
      stat: '-42% Abandoned Carts',
      quote:
        "We run flash discount codes on Reels. Followers comment 'DISCOUNT' and receive their personalized coupon code in DMs immediately. Our cart abandonment dropped by 42% in the first month.",
    },
    {
      name: 'Priya Sharma',
      handle: '@priyacodes',
      followers: '210k followers',
      role: 'Tech Creator & Mentor',
      initials: 'PS',
      avatarColor: 'from-emerald-500 to-teal-600',
      stat: '18 hrs/wk Saved',
      quote:
        'The Google 1-click login and 2-minute setup blew me away. I connected my Instagram Business page and had my lead magnet automation running in under 3 minutes without touching a line of code.',
    },
    {
      name: 'Julian Rivera',
      handle: '@julian.realestate',
      followers: '125k followers',
      role: 'Real Estate Agency Director',
      initials: 'JR',
      avatarColor: 'from-blue-600 to-indigo-700',
      stat: '48 Leads / Week',
      quote:
        "Our property listing brochures are delivered instantly when prospective buyers comment 'INFO'. We went from losing leads in messy comments to closed transactions. It paid for itself on day one.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 selection:bg-[#d6f84c] selection:text-slate-950 font-sans antialiased">
      {/* ─── 1. NAVBAR (CLEAN PASTEL BLUR & LIME PILL BUTTON) ─── */}
      <header className="sticky top-0 z-50 bg-[#eef5ff]/80 backdrop-blur-md border-b border-slate-200/50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 fill-[#d6f84c] text-[#d6f84c]" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-950">
              AUTO<span className="text-indigo-600">DM</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#solutions" className="hover:text-slate-950 transition-colors">
              Solutions
            </a>
            <a href="#how-it-works" className="hover:text-slate-950 transition-colors">
              How We Connect
            </a>
            <a href="#demo" className="hover:text-slate-950 transition-colors">
              Live Demo
            </a>
            <a href="#about" className="hover:text-slate-950 transition-colors">
              About Us
            </a>
            <a href="#testimonials" className="hover:text-slate-950 transition-colors">
              Testimonials
            </a>
            <a href="#faq" className="hover:text-slate-950 transition-colors">
              FAQ
            </a>
            <a href="#contact" className="hover:text-slate-950 transition-colors">
              Contact
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-700 hover:text-slate-950 px-3.5 py-2 transition-colors whitespace-nowrap"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2.5 px-6 py-2.5 bg-[#d6f84c] hover:bg-[#c9ef3a] active:bg-[#bfe628] text-slate-950 rounded-full text-sm font-bold shadow-sm hover:shadow transition-all whitespace-nowrap shrink-0 group cursor-pointer"
            >
              <span>Get started</span>
              <div className="w-5 h-5 rounded-full bg-slate-950 text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="w-3 h-3 text-[#d6f84c]" />
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── 2. HERO SECTION (SOFT SKY ATMOSPHERE & SPLIT CREATOR SHOWCASE) ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#eef5ff] via-[#f4f7fe] to-[#fafbfc] pt-12 pb-20 sm:pt-16 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content (7 Cols) */}
            <div className="lg:col-span-7 space-y-7 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200/80 shadow-xs text-xs font-semibold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Official Meta Graph API v21.0 Certified</span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-[4.25rem] font-extrabold text-slate-950 tracking-tight leading-[1.08]">
                Smarter decisions. <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Stronger tomorrow.
                </span>
              </h1>

              <p className="max-w-xl text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                We help Instagram creators, educators, and brands turn comments into direct sales and high-intent leads through smart consulting and intelligent DM automation.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-3 px-7 py-3.5 bg-[#d6f84c] hover:bg-[#c9ef3a] text-slate-950 rounded-full text-sm sm:text-base font-bold shadow-md shadow-lime-900/10 hover:shadow-lg transition-all group cursor-pointer"
                >
                  <span>Explore solutions</span>
                  <div className="w-6 h-6 rounded-full bg-slate-950 text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="w-3.5 h-3.5 text-[#d6f84c]" />
                  </div>
                </Link>

                <a
                  href="#demo"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white/90 hover:bg-white text-slate-800 rounded-full text-sm sm:text-base font-semibold border border-slate-200/80 shadow-xs hover:shadow transition-all group"
                >
                  <span>Watch overview</span>
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 group-hover:scale-110 transition-transform">
                    <Play className="w-3 h-3 fill-slate-800 text-slate-800 ml-0.5" />
                  </div>
                </a>
              </div>

              {/* Creator Avatars & Star Ratings */}
              <div className="pt-4 flex items-center gap-4">
                <div className="flex -space-x-2.5 overflow-hidden">
                  <div className="w-9 h-9 rounded-full ring-2 ring-white bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-800">
                    JD
                  </div>
                  <div className="w-9 h-9 rounded-full ring-2 ring-white bg-gradient-to-tr from-rose-400 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                    SL
                  </div>
                  <div className="w-9 h-9 rounded-full ring-2 ring-white bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                    MV
                  </div>
                  <div className="w-9 h-9 rounded-full ring-2 ring-white bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-xs font-bold text-white">
                    ER
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900">
                    4.9/5 from 1,200+ clients
                  </p>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side Showcase Image + Floating Glass Card (5 Cols) */}
            <div className="lg:col-span-5 relative flex justify-center">
              {/* Creator Portrait Frame */}
              <div className="relative w-full max-w-[420px] aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-100 border-4 border-white bg-slate-100">
                <img
                  src="/images/creator_hero.jpg"
                  alt="AutoDM Creator"
                  className="w-full h-full object-cover object-top"
                />

                {/* Subtle soft gradient fade at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Floating Glassmorphic Growth Card */}
              <div className="absolute -bottom-6 -right-2 sm:-right-6 bg-white/85 backdrop-blur-xl rounded-3xl p-5 shadow-xl border border-white/80 max-w-[210px] space-y-2 animate-bounce-subtle">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Growth overview
                </p>
                <p className="text-2xl font-extrabold text-slate-950">
                  +38.4%
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  in this quarter
                </p>

                {/* Colorful Bar Chart Mockup */}
                <div className="flex items-end gap-1.5 h-10 pt-2">
                  <div className="w-2.5 h-4 rounded-full bg-blue-400" />
                  <div className="w-2.5 h-6 rounded-full bg-indigo-500" />
                  <div className="w-2.5 h-5 rounded-full bg-sky-400" />
                  <div className="w-2.5 h-7 rounded-full bg-purple-500" />
                  <div className="w-2.5 h-10 rounded-full bg-[#d6f84c]" />
                  <div className="w-2.5 h-8 rounded-full bg-pink-500" />
                </div>
              </div>
            </div>
          </div>

          {/* ─── 3. FIVE-CARD SIGNATURE FEATURE ROW (EXACT REFERENCE ROW) ─── */}
          <div id="solutions" className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: AI Strategy */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">AI Strategy</h3>
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1 mb-8">Roadmap to scale</p>
              {/* Graphic curve preview */}
              <div className="h-16 rounded-2xl bg-gradient-to-tr from-blue-500/10 to-indigo-500/20 flex items-center justify-center overflow-hidden">
                <div className="w-24 h-12 border-4 border-indigo-400 rounded-t-full rotate-12 opacity-80" />
              </div>
            </div>

            {/* Card 2: Data Intelligence */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Data intelligence</h3>
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1 mb-8">Turn data into actionable insights</p>
              {/* Graphic 3D sphere preview */}
              <div className="h-16 rounded-2xl bg-gradient-to-tr from-[#d6f84c]/20 to-emerald-500/20 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-[#d6f84c] border-2 border-slate-900/20 shadow-inner flex items-center justify-center text-slate-950 font-bold text-xs">
                  99%
                </div>
              </div>
            </div>

            {/* Card 3: Signature Dark Card ("Where comments meet strategy...") */}
            <div className="bg-[#0f172a] text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between group hover:border-slate-700 transition-all">
              <div>
                <div className="w-9 h-9 rounded-full bg-[#d6f84c] flex items-center justify-center mb-6">
                  <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
                </div>
                <h3 className="text-base font-bold text-slate-100 leading-snug">
                  Where data meets strategy,{' '}
                  <span className="text-[#d6f84c]">transformation happens.</span>
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-4">
                Automated Instagram lead generation
              </p>
            </div>

            {/* Card 4: Project Estimate / Campaign Budget */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Project estimate</p>
                <p className="text-2xl font-extrabold text-slate-950 mt-1">$42,800</p>
                <p className="text-[10px] text-slate-400 mb-4">Estimated creator ROI</p>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Discovery
                  </span>
                  <span className="font-bold text-slate-800">$4,500</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Analytics
                  </span>
                  <span className="font-bold text-slate-800">$10,000</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    Implementation
                  </span>
                  <span className="font-bold text-slate-800">$18,300</span>
                </div>
              </div>
            </div>

            {/* Card 5: Automation Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Automation</h3>
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1 mb-8">Smarter workflows, better outcomes</p>
              {/* Graphic flower/ring preview */}
              <div className="h-16 rounded-2xl bg-gradient-to-tr from-purple-500/10 to-pink-500/20 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. ABOUT SECTION (BENTO GRID FROM REFERENCE IMAGE) ─── */}
      <section id="about" className="py-24 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Tag & Split Heading */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
            <div className="lg:col-span-7 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                ABOUT US
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight leading-[1.15]">
                A global partner focused on building{' '}
                <span className="text-indigo-600">smarter</span> and more{' '}
                <span className="text-purple-600">adaptive</span> businesses.
              </h2>
            </div>

            <div className="lg:col-span-5 space-y-5 lg:pt-8">
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                We combine deep industry expertise with cutting-edge AI and analytics to help creators move faster, operate smarter, and grow with absolute confidence.
              </p>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors group"
              >
                <span>Learn more about us</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>

          {/* 4-Card Bento Grid (Matching Exact Reference Layout) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* Bento Card 1: Solutions 25+ */}
            <div className="bg-slate-50/70 rounded-3xl p-8 border border-slate-200/80 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-8">
                <Layers className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-semibold">Solutions</p>
                <p className="text-4xl font-extrabold text-slate-950">25+</p>
                <p className="text-xs text-slate-600 leading-relaxed pt-2">
                  End-to-end solutions tailored to your creator needs.
                </p>
              </div>
            </div>

            {/* Bento Card 2: Vibrant Neon Lime Card (98% Satisfaction) */}
            <div className="bg-[#d6f84c] rounded-3xl p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-2xl bg-slate-950 text-white flex items-center justify-center mb-8">
                <TrendingUp className="w-5 h-5 text-[#d6f84c]" />
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-900">Client satisfaction</p>
                <p className="text-4xl font-extrabold text-slate-950">98%</p>
                <p className="text-xs text-slate-800 leading-relaxed">
                  Average satisfaction across all live projects.
                </p>

                {/* Face pile inside lime card */}
                <div className="flex -space-x-2 pt-2">
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-[#d6f84c]">
                    A
                  </div>
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-[#d6f84c]">
                    B
                  </div>
                  <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-[#d6f84c]">
                    C
                  </div>
                  <div className="w-7 h-7 rounded-full bg-slate-600 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-[#d6f84c]">
                    D
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 3: Modern Architecture with 150+ Overlay */}
            <div className="relative rounded-3xl overflow-hidden min-h-[300px] border border-slate-200/80 shadow-xs group">
              <img
                src="/images/architecture_bento.jpg"
                alt="Architecture"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />

              {/* Blue floating pill badge */}
              <div className="absolute bottom-6 left-6 bg-blue-600 text-white rounded-2xl p-4 shadow-lg max-w-[140px]">
                <p className="text-2xl font-extrabold">150+</p>
                <p className="text-[10px] text-blue-100 font-medium leading-tight mt-0.5">
                  Successful transformations
                </p>
              </div>
            </div>

            {/* Bento Card 4: Years of Experience 12+ */}
            <div className="bg-slate-50/70 rounded-3xl p-8 border border-slate-200/80 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="w-11 h-11 rounded-2xl bg-slate-200/80 flex items-center justify-center text-slate-800 mb-8">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-semibold">Years of experience</p>
                <p className="text-4xl font-extrabold text-slate-950">12+</p>
                <p className="text-xs text-slate-600 leading-relaxed pt-2">
                  Helping creator businesses navigate change.
                </p>
              </div>
            </div>
          </div>

          {/* Partner Monochrome Logo Cloud */}
          <div className="mt-16 pt-12 border-t border-slate-100 flex flex-wrap items-center justify-between gap-8 text-slate-400 font-bold text-sm tracking-wider uppercase">
            <span className="flex items-center gap-2 hover:text-slate-600 transition-colors">
              ☁ Cloudix
            </span>
            <span className="flex items-center gap-2 hover:text-slate-600 transition-colors">
              ✔ Pulseway
            </span>
            <span className="flex items-center gap-2 hover:text-slate-600 transition-colors">
              ☍ DataVinci
            </span>
            <span className="flex items-center gap-2 hover:text-slate-600 transition-colors">
              ❉ SolidState
            </span>
            <span className="flex items-center gap-2 hover:text-slate-600 transition-colors">
              ⬡ Lightbox
            </span>
            <span className="flex items-center gap-2 hover:text-slate-600 transition-colors">
              ⚙ LayerOps
            </span>
          </div>
        </div>
      </section>

      {/* ─── 5. INTERACTIVE LIVE SIMULATOR (TRY TRIGGER IN REAL TIME) ─── */}
      <section id="demo" className="py-24 bg-[#f8fbff] border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
              Experience the Magic
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight">
              See How It Works In Real-Time
            </h2>
            <p className="text-slate-600 text-base">
              Click a trigger keyword below to simulate how your follower comments on a Reel,
              receives an automated reply, and instantly gets the DM!
            </p>
          </div>

          {/* Interactive Trigger Selector */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">
              Select Trigger Word:
            </span>
            {['LINK', 'GROWTH', 'EBOOK', 'DISCOUNT'].map((word) => (
              <button
                key={word}
                onClick={() => setSimulatedComment(word)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${simulatedComment === word
                    ? 'bg-slate-950 text-[#d6f84c] shadow-md scale-105'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
              >
                Comment "{word}"
              </button>
            ))}
          </div>

          {/* 2-Column Mockup: Post Comment vs Received DM */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
            {/* Left: Instagram Post & Comment */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5">
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs font-bold text-slate-800">
                        IG
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">@yourcreatorbrand</p>
                      <p className="text-xs text-slate-500">Instagram Reel • Original Audio</p>
                    </div>
                  </div>
                  <Instagram className="w-5 h-5 text-pink-600" />
                </div>

                {/* Post Caption */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                  "Want my free 2026 Creator Playbook? Drop <span className="font-bold text-indigo-600">'{simulatedComment}'</span> in the comments below and I'll send it straight to your DMs right now! 👇"
                </div>

                {/* Follower Comment */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                      JD
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl rounded-tl-none p-3 shadow-2xs max-w-[85%]">
                      <p className="text-xs font-semibold text-slate-900">@johndoe</p>
                      <p className="text-xs font-bold text-indigo-600 mt-0.5">{simulatedComment} please! 🙌</p>
                    </div>
                  </div>

                  {/* Automated Public Reply */}
                  <div className="flex items-start gap-2.5 pl-6">
                    <div className="w-6 h-6 rounded-full bg-slate-950 flex items-center justify-center text-[10px] font-bold text-white">
                      <Zap className="w-3.5 h-3.5 fill-[#d6f84c] text-[#d6f84c]" />
                    </div>
                    <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl rounded-tl-none p-2.5 text-xs text-indigo-950 max-w-[85%]">
                      <div className="flex items-center gap-1.5 font-bold text-[11px] text-indigo-700 mb-0.5">
                        <Check className="w-3 h-3 text-emerald-600" /> AutoDM Public Reply (0.8s)
                      </div>
                      Just sent the resource to your DMs! Check your message requests! 🚀
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 text-center">
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Meta Webhook Triggered Successfully
                </span>
              </div>
            </div>

            {/* Right: Instagram Direct Message Received */}
            <div className="bg-[#0f172a] text-white rounded-3xl p-6 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                      DM
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">@yourcreatorbrand</p>
                      <p className="text-xs text-indigo-200">Active Now • Direct Message</p>
                    </div>
                  </div>
                  <MessageSquare className="w-5 h-5 text-indigo-300" />
                </div>

                {/* Instant DM Bubble */}
                <div className="space-y-3 pt-2">
                  <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl rounded-tl-none p-4 shadow-sm space-y-3">
                    <p className="text-xs text-slate-100 leading-relaxed">
                      Hey John! Thanks for dropping by my post. Here is your promised resource for <span className="font-bold text-[#d6f84c]">"{simulatedComment}"</span>:
                    </p>

                    {/* Rich Link Card inside DM */}
                    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-white">2026 Creator Playbook PDF</p>
                        <p className="text-[10px] text-slate-400">Free Instant Access • 34 Pages</p>
                      </div>
                      <span className="px-3 py-1.5 bg-[#d6f84c] text-slate-950 text-[11px] font-bold rounded-full whitespace-nowrap shadow-xs">
                        Open Link ↗
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Let me know if you have any questions! 🙌
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-800 text-center">
                <span className="text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  Delivered in 1.4 seconds with 0 manual effort
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. HOW WE CONNECT (4-STEP TIMELINE) ─── */}
      <section id="how-it-works" className="py-24 bg-white border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d6f84c]" />
              HOW WE CONNECT
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight">
              Connect to Instagram in 4 Simple Steps
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              We connect exclusively through official Meta Graph API OAuth 2.0. No password sharing, no risky bots.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-slate-50/70 rounded-3xl p-7 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-950 font-extrabold flex items-center justify-center text-sm mb-6">
                  01
                </div>
                <h3 className="text-base font-bold text-slate-950 mb-2">1-Click Meta Login</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Click Connect in your dashboard. You are redirected to Meta's official login screen on instagram.com or facebook.com.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-200/60 text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Encrypted OAuth
              </div>
            </div>

            <div className="bg-slate-50/70 rounded-3xl p-7 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-950 font-extrabold flex items-center justify-center text-sm mb-6">
                  02
                </div>
                <h3 className="text-base font-bold text-slate-950 mb-2">Grant Permissions</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Select your Creator or Business profile. Meta issues scoped access tokens granting comment read and DM send access.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-200/60 text-[11px] font-bold text-purple-600 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Scoped Access
              </div>
            </div>

            <div className="bg-slate-50/70 rounded-3xl p-7 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-950 font-extrabold flex items-center justify-center text-sm mb-6">
                  03
                </div>
                <h3 className="text-base font-bold text-slate-950 mb-2">Webhooks Active</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Our FastAPI server automatically subscribes to real-time Instagram Webhooks so incoming comments trigger immediately.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-200/60 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Sub-Second Webhooks
              </div>
            </div>

            <div className="bg-slate-50/70 rounded-3xl p-7 border border-slate-200/80 hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-950 font-extrabold flex items-center justify-center text-sm mb-6">
                  04
                </div>
                <h3 className="text-base font-bold text-slate-950 mb-2">Launch Automation</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Select any Reel, set your trigger words like "LINK" or "GUIDE", write your message copy, and turn automation ON!
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-slate-200/60 text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Live in 2 Minutes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. TESTIMONIALS (INFINITE MARQUEE LEFT TO RIGHT) ─── */}
      <section id="testimonials" className="py-24 bg-[#f4f7fe] relative overflow-hidden border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d6f84c]" />
            TESTIMONIALS
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight">
            Loved by 2,000+ Creators Worldwide
          </h2>
          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto">
            See how creators, coaches, and businesses turn comments into automated revenue.
          </p>
        </div>

        {/* Marquee with left & right edge gradient masks */}
        <div className="relative w-full overflow-hidden py-4 before:absolute before:left-0 before:top-0 before:z-20 before:h-full before:w-16 sm:before:w-36 before:bg-gradient-to-r before:from-[#f4f7fe] before:to-transparent before:pointer-events-none after:absolute after:right-0 after:top-0 after:z-20 after:h-full after:w-16 sm:after:w-36 after:bg-gradient-to-l after:from-[#f4f7fe] after:to-transparent after:pointer-events-none">
          <div className="animate-marquee-ltr flex gap-6 items-stretch">
            {[...testimonials, ...testimonials].map((item, idx) => (
              <div
                key={idx}
                className="w-[340px] sm:w-[400px] shrink-0 bg-white rounded-3xl p-7 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#d6f84c]/50 text-slate-950 border border-lime-300 whitespace-nowrap">
                      {item.stat}
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed font-normal">
                    "{item.quote}"
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-tr ${item.avatarColor} text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs`}
                    >
                      {item.initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {item.name}
                        </p>
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      </div>
                      <p className="text-xs text-indigo-600 font-semibold truncate">
                        {item.handle}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {item.followers}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-10">
          <p className="text-xs font-semibold text-slate-400 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Hover over any card to pause • 100% Verified Instagram Creators
          </p>
        </div>
      </section>

      {/* ─── 8. FREQUENTLY ASKED QUESTIONS (2-COLUMN CARDS) ─── */}
      <section id="faq" className="py-24 bg-white border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d6f84c]" />
              FAQ
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              Everything you need to know about AutoDM and our Meta API integration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-start">
            {faqs.map((faq, index) => {
              const isOpen = openFaqs.includes(index);
              return (
                <div
                  key={index}
                  className={`rounded-3xl border transition-all duration-200 overflow-hidden ${isOpen
                      ? 'bg-white border-slate-900 shadow-md ring-1 ring-slate-900'
                      : 'bg-slate-50/70 border-slate-200/80 hover:border-slate-300 hover:bg-white'
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="w-full p-6 text-left flex items-start justify-between gap-4 font-bold text-slate-950 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-3.5">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors ${isOpen
                            ? 'bg-[#d6f84c] text-slate-950'
                            : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
                          }`}
                      >
                        {index + 1}
                      </span>
                      <span className="text-base font-bold text-slate-950 group-hover:text-indigo-600 transition-colors leading-snug">
                        {faq.q}
                      </span>
                    </div>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${isOpen
                          ? 'bg-slate-900 text-white rotate-180'
                          : 'bg-white border border-slate-200 text-slate-500 group-hover:border-slate-400'
                        }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pl-6 sm:pl-[4.25rem]">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 9. BOTTOM CALL TO ACTION ─── */}
      <section className="py-24 bg-[#0f172a] text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 text-[#d6f84c] text-xs font-semibold border border-slate-700">
            <Zap className="w-3.5 h-3.5 fill-[#d6f84c] text-[#d6f84c]" />
            <span>Setup Takes Less Than 2 Minutes</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Ready to turn your comments into <br className="hidden sm:inline" />
            <span className="text-[#d6f84c]">automated direct sales?</span>
          </h2>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300">
            Join thousands of creators who never miss a warm lead again. Connect your Instagram
            and launch your first automation today with a free 14-day trial.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-[#d6f84c] hover:bg-[#c9ef3a] text-slate-950 rounded-full text-base font-bold shadow-lg shadow-lime-900/20 hover:scale-105 transition-all group cursor-pointer"
            >
              <span>Get started free now</span>
              <div className="w-6 h-6 rounded-full bg-slate-950 text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="w-3.5 h-3.5 text-[#d6f84c]" />
              </div>
            </Link>
            <Link
              to="/login"
              className="px-7 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full text-base font-semibold border border-slate-700 transition-all"
            >
              Sign in to workspace
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 10. MODERN ENTERPRISE FOOTER WITH CONTACT US HUB ─── */}
      <footer id="contact" className="bg-slate-950 text-slate-400 pt-20 pb-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Contact Us Interactive Hero Section inside Footer */}
          <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 rounded-3xl p-8 sm:p-12 border border-slate-800 shadow-2xl mb-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-[#d6f84c]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start relative z-10">
              {/* Left Column: Direct Contact Channels & Support Promise */}
              <div className="lg:col-span-5 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-[#d6f84c] text-xs font-semibold">
                  <Mail className="w-3.5 h-3.5 text-[#d6f84c]" />
                  <span>24/7 Global Creator Support</span>
                </div>

                <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Have a question? <br />
                  <span className="text-[#d6f84c]">Let's talk to our team.</span>
                </h3>

                <p className="text-sm text-slate-300 leading-relaxed">
                  Whether you need help connecting your Instagram account, want a custom enterprise automation demo, or have questions about Meta compliance — our team is here to assist you.
                </p>

                {/* Direct Contact Methods */}
                <div className="space-y-4 pt-2">
                  <a
                    href="mailto:likhilbachanaboina219@gmail.com"
                    className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-950 transition-all group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Mail className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Direct Email Support</p>
                      <p className="text-sm font-bold text-white group-hover:text-[#d6f84c] transition-colors">
                        likhilbachanaboina219@gmail.com
                      </p>
                    </div>
                  </a>

                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
                    <div className="w-11 h-11 rounded-xl bg-[#d6f84c]/20 text-[#d6f84c] flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-[#d6f84c]" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Average Response Speed</p>
                      <p className="text-sm font-bold text-white">Under 2 hours • 7 days a week</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 text-xs text-emerald-400 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Support Engineers Online • Ready to Assist</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Contact Form */}
              <div className="lg:col-span-7 bg-slate-950/90 rounded-2xl p-6 sm:p-8 border border-slate-800/90 shadow-xl">
                <div className="mb-6 space-y-1">
                  <h4 className="text-lg font-bold text-white">Send Us a Direct Message</h4>
                  <p className="text-xs text-slate-400">
                    Fill out the form below and we will respond directly to your email inbox.
                  </p>
                </div>

                {contactSent ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h5 className="text-lg font-bold text-white">Message Sent Successfully!</h5>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Thank you for contacting us. A member of our support team will reach out to your email shortly.
                    </p>
                    <button
                      type="button"
                      onClick={() => setContactSent(false)}
                      className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contact-name" className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Your Name
                        </label>
                        <input
                          id="contact-name"
                          type="text"
                          required
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder="Maya Lin"
                          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#d6f84c] focus:ring-1 focus:ring-[#d6f84c] transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="contact-email" className="block text-xs font-semibold text-slate-300 mb-1.5">
                          Email Address
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          required
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="maya@creator.com"
                          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#d6f84c] focus:ring-1 focus:ring-[#d6f84c] transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="contact-topic" className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Inquiry Topic
                      </label>
                      <select
                        id="contact-topic"
                        value={contactTopic}
                        onChange={(e) => setContactTopic(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-[#d6f84c] focus:ring-1 focus:ring-[#d6f84c] transition-all cursor-pointer"
                      >
                        <option value="Support">Technical Support & Setup</option>
                        <option value="Instagram OAuth">Instagram & Meta Connection Help</option>
                        <option value="Feature Request">Feature Request / Feedback</option>
                        <option value="Enterprise">Enterprise & High-Volume Plans</option>
                        <option value="General">General Inquiry</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="contact-message" className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Your Message
                      </label>
                      <textarea
                        id="contact-message"
                        required
                        rows={3}
                        value={contactMessage}
                        onChange={(e) => setContactMessage(e.target.value)}
                        placeholder="Tell us what you need help with or any questions you have..."
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#d6f84c] focus:ring-1 focus:ring-[#d6f84c] transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={contactSending}
                      className="w-full py-3 px-6 bg-[#d6f84c] hover:bg-[#c9ef3a] active:bg-[#bfe628] text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {contactSending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending Message...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Message to Support</span>
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Multi-Column Nav Links */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-slate-900 text-xs">
            {/* Col 1: Brand Info */}
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white shadow-sm">
                  <Zap className="w-4 h-4 fill-[#d6f84c] text-[#d6f84c]" />
                </div>
                <span className="font-extrabold text-lg tracking-tight text-white">
                  AUTO<span className="text-[#d6f84c]">DM</span>
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed max-w-sm">
                Next-generation comment-to-DM automation for Instagram creators and brands. Powered exclusively by the official Meta Graph API v21.0.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <span className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                  v1.2.0 Production
                </span>
                <span className="text-emerald-400 flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  All Systems Operational
                </span>
              </div>
            </div>

            {/* Col 2: Solutions */}
            <div className="space-y-3">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Solutions</p>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#solutions" className="hover:text-white transition-colors">Reels Comment Triggers</a></li>
                <li><a href="#solutions" className="hover:text-white transition-colors">Automated Direct Messages</a></li>
                <li><a href="#solutions" className="hover:text-white transition-colors">Smart Comment Rotator</a></li>
                <li><a href="#solutions" className="hover:text-white transition-colors">Deduplication Safeguards</a></li>
              </ul>
            </div>

            {/* Col 3: Product */}
            <div className="space-y-3">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Product</p>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How We Connect</a></li>
                <li><a href="#demo" className="hover:text-white transition-colors">Interactive Live Simulator</a></li>
                <li><a href="#testimonials" className="hover:text-white transition-colors">Creator Testimonials</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">Frequently Asked Questions</a></li>
              </ul>
            </div>

            {/* Col 4: Contact & Access */}
            <div className="space-y-3">
              <p className="font-bold text-white uppercase tracking-wider text-[11px]">Contact & Support</p>
              <ul className="space-y-2 text-slate-400">
                <li><a href="mailto:likhilbachanaboina219@gmail.com" className="hover:text-[#d6f84c] transition-colors flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> likhilbachanaboina219@gmail.com</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Help Desk & Inquiry Form</a></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Sign In to Dashboard</Link></li>
                <li><Link to="/signup" className="hover:text-white transition-colors">Create Creator Account</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright and Disclosures */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} AutoDM. Powered by Official Meta Graph API v21.0.</p>
            <div className="flex items-center gap-4">
              <span className="hover:text-slate-400 transition-colors cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-slate-400 transition-colors cursor-pointer">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-slate-400 transition-colors cursor-pointer">Meta Platform Compliance</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
