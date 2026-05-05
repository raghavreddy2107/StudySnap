// src/pages/AuthCallback.jsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import toast from 'react-hot-toast';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { setToken, fetchUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Authentication failed. Please try again.');
      navigate('/');
      return;
    }

    if (token) {
      setToken(token);
      fetchUser().then(() => {
        navigate('/dashboard');
      });
    } else {
      navigate('/');
    }
  }, []);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted font-body">Signing you in…</p>
      </div>
    </div>
  );
}
