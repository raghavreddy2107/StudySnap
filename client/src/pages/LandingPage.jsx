// src/pages/LandingPage.jsx
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTheme } from '../hooks/useTheme.js';
import api from '../api/axiosInstance.js';
import { useAuth } from '../hooks/useAuth.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function LandingPage() {
  const [searchParams] = useSearchParams();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { setToken, fetchUser } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => {
    const e = email.trim();
    const p = password;
    const n = name.trim();
    if (!e || !p) return false;
    if (mode === 'signup' && !n) return false;
    return true;
  }, [email, password, name, mode]);

  useEffect(() => {
    if (searchParams.get('error')) {
      toast.error('Sign-in failed. Please try again.');
    }
  }, []);

  const handleGoogleSignIn = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const handleLocalAuth = async (e) => {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      const payload =
        mode === 'signup'
          ? { name: name.trim(), email: email.trim(), password }
          : { email: email.trim(), password };

      const { data } = await api.post(`/auth/${mode === 'signup' ? 'signup' : 'login'}`, payload);
      if (data?.accessToken) {
        setToken(data.accessToken);
        await fetchUser();
        navigate('/dashboard');
        toast.success(mode === 'signup' ? 'Account created' : 'Welcome back');
      } else {
        toast.error('Login failed. Please try again.');
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Authentication failed';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper overflow-x-hidden">
      {/* Noise texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.15'/%3E%3C/svg%3E")`,
          backgroundSize: '128px',
        }}
      />

      {/* Nav */}
      <header className="relative z-10 max-w-6xl mx-auto px-6 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-white font-display font-bold">S</span>
          </div>
          <span className="font-display font-bold text-xl text-ink">StudySnap</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="text-xs px-2.5 py-1.5 rounded-md border border-border text-muted hover:text-accent hover:border-accent transition-colors"
          >
            {isDark ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={handleGoogleSignIn}
            className="text-sm font-medium text-muted hover:text-accent transition-colors"
          >
            Sign in →
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-20 md:pt-36 md:pb-28">
        <div className="max-w-3xl">
          {/* Tag */}
          <div className="inline-flex items-center gap-2 bg-cream border border-border rounded-full px-4 py-1.5 mb-8 animate-fade-up">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse-soft" />
            <span className="text-xs font-medium text-muted uppercase tracking-widest">AI Study Tool</span>
          </div>

          <h1
            className="font-display text-5xl sm:text-6xl md:text-7xl font-black text-ink leading-[1.05] mb-6 animate-fade-up"
            style={{ animationDelay: '0.1s' }}
          >
            Turn any PDF into{' '}
            <span className="text-accent italic">exam-ready</span>{' '}
            notes.
          </h1>

          <p
            className="text-lg md:text-xl text-muted font-body leading-relaxed mb-10 max-w-xl animate-fade-up"
            style={{ animationDelay: '0.2s' }}
          >
            Upload your lecture slides or textbook chapter. Tell us when your exam is.
            Get a tailored summary in seconds — powered by Gemini AI.
          </p>

          <div className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={handleGoogleSignIn}
              className="inline-flex items-center gap-3 bg-ink text-paper px-7 py-4 rounded-xl font-display font-semibold text-lg hover:bg-accent transition-colors duration-200 shadow-lg hover:shadow-accent/20 group"
            >
              <GoogleIcon />
              Sign in with Google
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <p className="mt-3 text-xs text-muted">Free • 10 summaries/day • No credit card</p>

            {/* Manual auth */}
            <div className="mt-8 max-w-md">
              <div className="inline-flex rounded-xl border border-border bg-card-bg p-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                    mode === 'login' ? 'bg-paper text-ink shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                    mode === 'signup' ? 'bg-paper text-ink shadow-sm' : 'text-muted hover:text-ink'
                  }`}
                >
                  Create account
                </button>
              </div>

              <form onSubmit={handleLocalAuth} className="mt-4 bg-card-bg border border-border rounded-2xl p-5 shadow-sm">
                {mode === 'signup' && (
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-muted mb-1">Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-paper px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label className="block text-xs font-medium text-muted mb-1">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-border bg-paper px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="email"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-muted mb-1">Password</label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-border bg-paper px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                    placeholder="At least 8 characters"
                    type="password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  />
                </div>

                <button
                  disabled={!canSubmit || busy}
                  className="w-full inline-flex items-center justify-center gap-2 bg-accent text-white px-5 py-3 rounded-xl font-display font-semibold text-sm hover:bg-accent-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
                </button>

                <p className="mt-3 text-xs text-muted">
                  You can always use Google sign-in too.
                </p>
              </form>
            </div>
          </div>
        </div>

        {/* Decorative element */}
        <div className="absolute top-20 right-0 md:right-8 w-72 h-72 md:w-96 md:h-96 opacity-10 pointer-events-none">
          <div className="w-full h-full border-2 border-ink rounded-full" />
          <div className="absolute inset-8 border-2 border-accent rounded-full" />
          <div className="absolute inset-16 border-2 border-ink rounded-full" />
          <div className="absolute inset-24 bg-accent rounded-full" />
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 bg-cream border-y border-border py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="font-display text-3xl font-bold text-center mb-3">How it works</h2>
          <p className="text-muted text-center mb-14 font-body">Three steps between you and exam-ready notes.</p>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative bg-paper rounded-2xl p-7 border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-accent text-white font-display font-bold text-lg rounded-lg flex items-center justify-center mb-5">
                  {i + 1}
                </div>
                <h3 className="font-display font-bold text-xl mb-2">{step.title}</h3>
                <p className="text-muted font-body text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Exam time modes */}
      <section className="relative z-10 py-20 max-w-6xl mx-auto px-6">
        <h2 className="font-display text-3xl font-bold mb-3">Tuned to your timeline</h2>
        <p className="text-muted mb-12 font-body">Different summaries for different urgencies.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {examModes.map((mode) => (
            <div key={mode.time} className={`rounded-xl p-5 border ${mode.highlight ? 'border-accent bg-accent/5' : 'border-border bg-card-bg'}`}>
              <div className={`text-2xl mb-3`}>{mode.icon}</div>
              <div className={`font-display font-bold text-sm uppercase tracking-wide mb-1 ${mode.highlight ? 'text-accent' : 'text-muted'}`}>{mode.time}</div>
              <p className="text-ink font-body text-sm leading-relaxed">{mode.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 bg-ink text-paper py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-display text-4xl font-bold mb-4">Start studying smarter.</h2>
          <p className="text-paper/60 mb-8 font-body">Join students who snap their PDFs into focused study guides.</p>
          <button
            onClick={handleGoogleSignIn}
            className="inline-flex items-center gap-3 bg-accent text-white px-8 py-4 rounded-xl font-display font-semibold text-lg hover:bg-accent-dark transition-colors"
          >
            <GoogleIcon />
            Get started free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center">
        <p className="text-xs text-muted font-body">
          © {new Date().getFullYear()} StudySnap · Built for students
        </p>
      </footer>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

const steps = [
  {
    title: 'Upload your PDF',
    desc: 'Drag and drop any lecture notes, textbook chapter, or study material. Up to 10MB.',
  },
  {
    title: 'Tell us your situation',
    desc: 'Select when your exam is and what kind of summary you need — concise or comprehensive.',
  },
  {
    title: 'Get your summary',
    desc: 'Watch your AI-generated study guide stream in real time, formatted and ready to review.',
  },
];

const examModes = [
  {
    time: '1 hour away',
    icon: '🚨',
    desc: 'Only the most critical bullet points. Pure survival mode.',
    highlight: true,
  },
  {
    time: 'Tomorrow',
    icon: '⏰',
    desc: 'Structured summary with key concepts and likely exam topics.',
    highlight: false,
  },
  {
    time: '3–5 days',
    icon: '📚',
    desc: 'Well-organized study guide with headings, bullets, and definitions.',
    highlight: false,
  },
  {
    time: '1 week+',
    icon: '🎓',
    desc: 'Comprehensive notes with examples, connections, and practice questions.',
    highlight: false,
  },
];
