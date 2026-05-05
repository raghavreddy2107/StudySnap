// src/pages/SummaryDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../api/axiosInstance.js';
import toast from 'react-hot-toast';

const EXAM_LABELS = {
  '1hour': '🚨 1 Hour',
  tomorrow: '⏰ Tomorrow',
  '3to5days': '📚 3–5 Days',
  '1weekplus': '🎓 1 Week+',
};

const STATUS_STYLES = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  DONE: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function SummaryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get(`/summary/${id}`)
      .then(({ data }) => setSummary(data))
      .catch(() => {
        toast.error('Summary not found');
        navigate('/dashboard');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(summary.summaryText);
    toast.success('Copied to clipboard!');
  };

  const handleDownload = () => {
    const blob = new Blob([summary.summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${summary.fileName?.replace('.pdf', '') || 'summary'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!confirm('Permanently delete this summary?')) return;
    setDeleting(true);
    try {
      await api.delete(`/summary/${id}`);
      toast.success('Summary deleted');
      navigate('/dashboard');
    } catch {
      toast.error('Failed to delete');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="h-8 shimmer-bg rounded w-48 mb-4" />
        <div className="h-4 shimmer-bg rounded w-full mb-2" />
        <div className="h-4 shimmer-bg rounded w-5/6 mb-2" />
        <div className="h-4 shimmer-bg rounded w-4/6" />
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Back */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-muted text-sm hover:text-accent transition-colors mb-6"
      >
        ← Back to Dashboard
      </Link>

      {/* Header card */}
      <div className="bg-card-bg border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[summary.status]}`}>
                {summary.status}
              </span>
              <span className="text-xs bg-cream text-muted px-2 py-0.5 rounded-full border border-border">
                {EXAM_LABELS[summary.examTime] || summary.examTime}
              </span>
              <span className="text-xs bg-cream text-muted px-2 py-0.5 rounded-full border border-border capitalize">
                {summary.summaryType}
              </span>
            </div>
            <h1 className="font-display font-bold text-xl text-ink">{summary.fileName}</h1>
            <p className="text-muted text-sm mt-1 font-body">
              Created {new Date(summary.createdAt).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </p>
            {summary.focusTopic && (
              <p className="text-xs text-muted mt-2 italic">Focus: {summary.focusTopic}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {summary.status === 'DONE' && (
              <>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg border border-border hover:border-accent hover:text-accent transition-colors text-muted"
                  title="Copy"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 rounded-lg border border-border hover:border-accent hover:text-accent transition-colors text-muted"
                  title="Download"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
              </>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 rounded-lg border border-border hover:border-red-400 hover:text-red-600 transition-colors text-muted"
              title="Delete"
            >
              {deleting ? (
                <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Summary content */}
      {summary.status === 'DONE' && summary.summaryText ? (
        <div className="bg-card-bg border border-border rounded-2xl p-6 sm:p-8 prose-studysnap">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary.summaryText}</ReactMarkdown>
        </div>
      ) : summary.status === 'FAILED' ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 font-body">
          <p className="font-semibold mb-1">Summary generation failed</p>
          <p className="text-sm">{summary.errorMsg || 'An unexpected error occurred.'}</p>
          <Link to="/new" className="inline-block mt-4 text-sm text-accent font-semibold hover:underline">
            Try again →
          </Link>
        </div>
      ) : (
        <div className="bg-card-bg border border-border rounded-2xl p-8 text-center">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-display font-semibold">Summary is being generated…</p>
          <p className="text-muted text-sm mt-1 font-body">This usually takes 10–30 seconds</p>
          <Link to="/new" className="inline-block mt-4 text-sm text-accent font-semibold hover:underline">
            Stream live output →
          </Link>
        </div>
      )}
    </div>
  );
}
