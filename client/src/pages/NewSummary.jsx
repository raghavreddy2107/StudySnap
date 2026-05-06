// src/pages/NewSummary.jsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../api/axiosInstance.js';
import { useSSEStream } from '../hooks/useSSEStream.js';
import toast from 'react-hot-toast';

const STEPS = ['Upload', 'Configure', 'Summary'];

const EXAM_OPTIONS = [
  { value: '1hour', label: '1 Hour', icon: '🚨', desc: 'Critical bullet points only' },
  { value: 'tomorrow', label: 'Tomorrow', icon: '⏰', desc: 'Structured key concepts' },
  { value: '3to5days', label: '3–5 Days', icon: '📚', desc: 'Full study guide' },
  { value: '1weekplus', label: '1 Week+', icon: '🎓', desc: 'Comprehensive notes + questions' },
];

const TYPE_OPTIONS = [
  { value: 'short', label: 'Short', desc: 'Under 300 words — fast review' },
  { value: 'balanced', label: 'Balanced', desc: 'Thorough but focused' },
  { value: 'long', label: 'Detailed', desc: 'Full depth and breadth' },
];

export default function NewSummary() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [examTime, setExamTime] = useState('tomorrow');
  const [summaryType, setSummaryType] = useState('balanced');
  const [focusTopic, setFocusTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [summaryId, setSummaryId] = useState(null);
  const [uiProgress, setUiProgress] = useState(8);
  const [streamPhaseIndex, setStreamPhaseIndex] = useState(0);
  const fileInputRef = useRef(null);
  const summaryContainerRef = useRef(null);

  const { streamedText, isStreaming, isDone, error, startStream, reset } = useSSEStream();

  // ---- Drag & Drop ----
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') {
      setFile(dropped);
    } else {
      toast.error('Only PDF files are accepted');
    }
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) setFile(f);
  };

  // ---- Submit ----
  const handleSubmit = async () => {
    if (!file) return;
    setSubmitting(true);

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('examTime', examTime);
    formData.append('summaryType', summaryType);
    if (focusTopic.trim()) formData.append('focusTopic', focusTopic.trim());

    try {
      const { data } = await api.post('/summarize', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSummaryId(data.summaryId);
      setStep(2);
      if (data.truncated) {
        toast('PDF was long — text was trimmed to 50,000 characters.', { icon: '⚠️' });
      }
      startStream(data.summaryId);
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(streamedText);
    toast.success('Copied to clipboard!');
  };

  const handleDownload = () => {
    const blob = new Blob([streamedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name?.replace('.pdf', '') || 'summary'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartOver = () => {
    reset();
    setFile(null);
    setExamTime('tomorrow');
    setSummaryType('balanced');
    setFocusTopic('');
    setSummaryId(null);
    setUiProgress(8);
    setStep(0);
  };

  useEffect(() => {
    if (step !== 2) return;
    if (isDone) {
      setUiProgress(100);
      return;
    }
    if (!isStreaming) {
      setUiProgress(8);
      return;
    }

    const t = setInterval(() => {
      setUiProgress((prev) => {
        if (prev >= 92) return prev;
        if (prev < 35) return prev + 3;
        if (prev < 70) return prev + 2;
        return prev + 1;
      });
    }, 700);

    return () => clearInterval(t);
  }, [isDone, isStreaming, step]);

  useEffect(() => {
    if (step !== 2 || !isStreaming || !streamedText) return;
    setUiProgress((prev) => Math.min(95, Math.max(prev, 45)));
  }, [streamedText, isStreaming, step]);

  const progressPct = step === 2 ? uiProgress : 0;
  const phaseMessages = [
    'Connecting to AI stream...',
    'Reading your PDF context...',
    'Drafting summary structure...',
    'Writing key points...',
    'Finalizing output...',
  ];

  useEffect(() => {
    if (step !== 2 || isDone || error || streamedText) return;
    const t = setInterval(() => {
      setStreamPhaseIndex((prev) => (prev + 1) % phaseMessages.length);
    }, 1400);
    return () => clearInterval(t);
  }, [step, isDone, error, streamedText, phaseMessages.length]);

  useEffect(() => {
    if (!summaryContainerRef.current) return;
    if (step !== 2 || !isStreaming) return;
    summaryContainerRef.current.scrollTop = summaryContainerRef.current.scrollHeight;
  }, [streamedText, isStreaming, step]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold transition-colors ${
              i < step ? 'bg-accent text-white' :
              i === step ? 'bg-ink text-paper' :
              'bg-cream text-muted border border-border'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-sm font-medium hidden sm:block ${i === step ? 'text-ink' : 'text-muted'}`}>{label}</span>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 sm:w-16 ${i < step ? 'bg-accent' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ---- STEP 0: Upload ---- */}
      {step === 0 && (
        <div className="animate-fade-up">
          <h2 className="font-display text-3xl font-bold mb-2">Upload your PDF</h2>
          <p className="text-muted mb-8 font-body">Lecture notes, textbook chapters, anything. Max 10MB.</p>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
              dragging
                ? 'border-accent bg-accent/5 scale-[1.01]'
                : file
                ? 'border-accent bg-accent/5'
                : 'border-border hover:border-accent/50 hover:bg-cream/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {file ? (
              <div>
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <p className="font-display font-bold text-ink text-lg">{file.name}</p>
                <p className="text-muted text-sm mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</p>
              </div>
            ) : (
              <div>
                <div className="w-14 h-14 bg-cream rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <p className="font-display font-semibold text-ink">Drop your PDF here</p>
                <p className="text-muted text-sm mt-1">or click to browse</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setStep(1)}
            disabled={!file}
            className="mt-6 w-full bg-accent text-white py-3.5 rounded-xl font-display font-semibold text-lg hover:bg-accent-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue →
          </button>
        </div>
      )}

      {/* ---- STEP 1: Configure ---- */}
      {step === 1 && (
        <div className="animate-fade-up">
          <button onClick={() => setStep(0)} className="text-muted text-sm mb-6 hover:text-accent transition-colors flex items-center gap-1">
            ← Back
          </button>

          <h2 className="font-display text-3xl font-bold mb-2">Configure your summary</h2>
          <p className="text-muted mb-8 font-body">Tell us about your exam situation.</p>

          {/* Exam time */}
          <div className="mb-8">
            <label className="block font-display font-semibold text-ink mb-3">When is your exam?</label>
            <div className="grid grid-cols-2 gap-3">
              {EXAM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setExamTime(opt.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    examTime === opt.value
                      ? 'border-accent bg-accent/5 ring-1 ring-accent'
                      : 'border-border hover:border-accent/50 bg-card-bg'
                  }`}
                >
                  <div className="text-xl mb-1">{opt.icon}</div>
                  <div className="font-display font-semibold text-sm text-ink">{opt.label}</div>
                  <div className="text-xs text-muted mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Summary type */}
          <div className="mb-8">
            <label className="block font-display font-semibold text-ink mb-3">Summary length</label>
            <div className="grid grid-cols-3 gap-3">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSummaryType(opt.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    summaryType === opt.value
                      ? 'border-accent bg-accent/5 ring-1 ring-accent'
                      : 'border-border hover:border-accent/50 bg-card-bg'
                  }`}
                >
                  <div className="font-display font-semibold text-sm text-ink">{opt.label}</div>
                  <div className="text-xs text-muted mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Focus topic */}
          <div className="mb-8">
            <label className="block font-display font-semibold text-ink mb-2">
              Focus topic <span className="font-normal text-muted text-sm">(optional)</span>
            </label>
            <input
              type="text"
              value={focusTopic}
              onChange={(e) => setFocusTopic(e.target.value)}
              placeholder="e.g. Krebs cycle, World War II causes..."
              className="w-full border border-border rounded-xl px-4 py-3 text-sm font-body bg-card-bg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors placeholder:text-muted/50"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full bg-accent text-white py-3.5 rounded-xl font-display font-semibold text-lg hover:bg-accent-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-3"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading & processing…
              </>
            ) : (
              '✨ Generate Summary'
            )}
          </button>
        </div>
      )}

      {/* ---- STEP 2: Streaming output ---- */}
      {step === 2 && (
        <div className="animate-fade-up">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display font-semibold text-sm">
                {isDone ? '✅ Summary complete!' : error ? '❌ Failed' : '⚡ Generating summary…'}
              </span>
              <span className="text-xs text-muted font-mono">{Math.round(progressPct)}%</span>
            </div>
            <div className="h-1.5 bg-cream rounded-full overflow-hidden border border-border">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* File meta */}
          <div className="flex items-center gap-2 mb-6 text-xs text-muted font-body">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            </svg>
            {file?.name}
            <span className="text-border">·</span>
            {EXAM_OPTIONS.find(o => o.value === examTime)?.label}
            <span className="text-border">·</span>
            {TYPE_OPTIONS.find(o => o.value === summaryType)?.label}
          </div>

          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm font-body">
              {error}
            </div>
          )}

          {/* Streaming text */}
          <div
            ref={summaryContainerRef}
            className="bg-card-bg border border-border rounded-2xl p-6 min-h-64 prose-studysnap overflow-auto max-h-[60vh] scrollbar-thin"
          >
            {streamedText ? (
              <>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamedText}</ReactMarkdown>
                {isStreaming && (
                  <span className="inline-block w-0.5 h-4 bg-accent animate-blink ml-0.5 align-middle" />
                )}
              </>
            ) : isDone ? (
              <div className="text-sm text-muted font-body">
                Summary generated successfully. Open <span className="font-semibold text-ink">View in Library</span> to read it.
              </div>
            ) : !error && (
              <div className="space-y-3">
                <div className="h-3 w-4/5 rounded bg-cream/70 animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-cream/70 animate-pulse" />
                <div className="h-3 w-3/5 rounded bg-cream/70 animate-pulse" />
                <div className="flex items-center gap-2 text-muted text-sm">
                <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
                {phaseMessages[streamPhaseIndex]}
                </div>
              </div>
            )}
          </div>

          {/* Actions after done */}
          {(isDone || error) && (
            <div className="flex flex-wrap gap-3 mt-6">
              {isDone && (
                <>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2.5 bg-ink text-paper rounded-xl text-sm font-display font-semibold hover:bg-accent transition-colors"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-display font-semibold hover:border-accent hover:text-accent transition-colors"
                  >
                    ⬇️ Download .txt
                  </button>
                  <button
                    onClick={() => navigate(`/summary/${summaryId}`)}
                    className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-display font-semibold hover:border-accent hover:text-accent transition-colors"
                  >
                    💾 View in Library
                  </button>
                </>
              )}
              <button
                onClick={handleStartOver}
                className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-display font-semibold hover:border-accent hover:text-accent transition-colors"
              >
                🔄 Start Over
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
