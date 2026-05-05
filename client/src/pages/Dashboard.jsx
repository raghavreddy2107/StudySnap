// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosInstance.js';
import { useAuth } from '../hooks/useAuth.jsx';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  PENDING: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  PROCESSING: 'bg-blue-100 text-blue-800 border border-blue-200',
  DONE: 'bg-green-100 text-green-700 border border-green-200',
  FAILED: 'bg-red-100 text-red-700 border border-red-200',
};

const EXAM_LABELS = {
  '1hour': '1 Hour',
  tomorrow: 'Tomorrow',
  '3to5days': '3–5 Days',
  '1weekplus': '1 Week+',
};

function SummaryCard({ summary, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!confirm('Delete this summary?')) return;
    setDeleting(true);
    try {
      await api.delete(`/summary/${summary.id}`);
      toast.success('Summary deleted');
      onDelete(summary.id);
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Link
      to={`/summary/${summary.id}`}
      className="group block bg-card-bg border border-border rounded-2xl p-5 hover:border-accent hover:shadow-md transition-all duration-200 relative"
    >
      {/* File icon + name */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-cream rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-accent/10 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold text-ink truncate text-sm">{summary.fileName}</p>
          <p className="text-xs text-muted mt-0.5">
            {new Date(summary.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[summary.status]}`}>
          {summary.status === 'PROCESSING' && <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse mr-1" />}
          {summary.status}
        </span>
        <span className="text-xs bg-cream text-muted px-2 py-0.5 rounded-full border border-border">
          ⏱ {EXAM_LABELS[summary.examTime] || summary.examTime}
        </span>
        <span className="text-xs bg-cream text-muted px-2 py-0.5 rounded-full border border-border capitalize">
          {summary.summaryType}
        </span>
      </div>

      {summary.focusTopic && (
        <p className="text-xs text-muted italic truncate">Focus: {summary.focusTopic}</p>
      )}

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-100 text-muted hover:text-red-600 transition-all"
        title="Delete"
      >
        {deleting ? (
          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        )}
      </button>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card-bg border border-border rounded-2xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg shimmer-bg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 shimmer-bg rounded w-3/4" />
          <div className="h-3 shimmer-bg rounded w-1/3" />
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        <div className="h-5 shimmer-bg rounded-full w-14" />
        <div className="h-5 shimmer-bg rounded-full w-20" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/summaries')
      .then(({ data }) => setSummaries(data))
      .catch(() => toast.error('Failed to load summaries'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = (id) => {
    setSummaries((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">
            Hey, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted mt-1 font-body text-sm">
            {summaries.length > 0
              ? `${summaries.length} summar${summaries.length === 1 ? 'y' : 'ies'} in your library`
              : 'Your summaries will appear here'}
          </p>
        </div>
        <Link
          to="/new"
          className="flex items-center gap-2 bg-accent text-white px-4 py-2.5 rounded-xl font-display font-semibold text-sm hover:bg-accent-dark transition-colors"
        >
          <span>+</span> New Summary
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : summaries.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-border rounded-3xl">
          <div className="w-16 h-16 bg-cream rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </div>
          <h3 className="font-display font-bold text-xl mb-2">No summaries yet</h3>
          <p className="text-muted text-sm mb-6 font-body">Upload your first PDF to get started</p>
          <Link
            to="/new"
            className="inline-flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-xl font-display font-semibold hover:bg-accent-dark transition-colors"
          >
            Create your first summary
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {summaries.map((s) => (
            <SummaryCard key={s.id} summary={s} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
