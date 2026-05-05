// src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import api from '../api/axiosInstance.js';
import { useAuth } from '../hooks/useAuth.jsx';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, logout } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/user/me')
      .then(({ data }) => setUserData(data))
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const usageCount = userData?.dailyRequestCount ?? 0;
  const limit = userData?.dailyLimit ?? 10;
  const usagePct = Math.min(100, (usageCount / limit) * 100);
  const remaining = limit - usageCount;

  const usageColor =
    usagePct >= 90 ? 'bg-red-500' :
    usagePct >= 70 ? 'bg-yellow-500' :
    'bg-accent';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl font-bold mb-8">Profile</h1>

      {/* User card */}
      <div className="bg-card-bg border border-border rounded-2xl p-6 mb-6">
        {loading ? (
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full shimmer-bg flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-5 shimmer-bg rounded w-40" />
              <div className="h-4 shimmer-bg rounded w-56" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-5">
            {userData?.avatarUrl ? (
              <img
                src={userData.avatarUrl}
                alt={userData.name}
                className="w-16 h-16 rounded-full border-2 border-border object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-white font-display font-bold text-2xl flex-shrink-0">
                {userData?.name?.[0] || '?'}
              </div>
            )}
            <div>
              <h2 className="font-display font-bold text-xl text-ink">{userData?.name}</h2>
              <p className="text-muted text-sm font-body">{userData?.email}</p>
              <p className="text-xs text-muted mt-1 font-body">
                Member since {userData?.createdAt
                  ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Daily usage */}
      <div className="bg-card-bg border border-border rounded-2xl p-6 mb-6">
        <h3 className="font-display font-bold text-lg mb-1">Today's Usage</h3>
        <p className="text-muted text-sm mb-5 font-body">Resets at midnight your local time</p>

        {loading ? (
          <div className="h-4 shimmer-bg rounded-full mb-2" />
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-ink font-body">
                <span className="font-display font-bold text-2xl">{usageCount}</span>
                <span className="text-muted"> / {limit} summaries</span>
              </span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                remaining === 0
                  ? 'bg-red-100 text-red-700'
                  : remaining <= 3
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {remaining === 0 ? 'Limit reached' : `${remaining} remaining`}
              </span>
            </div>

            <div className="h-3 bg-cream rounded-full overflow-hidden border border-border">
              <div
                className={`h-full rounded-full transition-all duration-500 ${usageColor}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>

            {remaining === 0 && (
              <p className="text-xs text-muted mt-3 font-body">
                ⏰ You've reached today's limit. Come back tomorrow for 10 more summaries.
              </p>
            )}
          </>
        )}
      </div>

      {/* Info cards */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-card-bg border border-border rounded-2xl p-5">
          <div className="text-2xl mb-2">🔒</div>
          <h4 className="font-display font-semibold mb-1">Secure Auth</h4>
          <p className="text-muted text-xs font-body leading-relaxed">Signed in via Google OAuth 2.0. We never store your password.</p>
        </div>
        <div className="bg-card-bg border border-border rounded-2xl p-5">
          <div className="text-2xl mb-2">📊</div>
          <h4 className="font-display font-semibold mb-1">Free Tier</h4>
          <p className="text-muted text-xs font-body leading-relaxed">5 AI-powered summaries per day, forever free.</p>
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="w-full border-2 border-border rounded-xl py-3 font-display font-semibold text-muted hover:border-red-400 hover:text-red-600 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}
