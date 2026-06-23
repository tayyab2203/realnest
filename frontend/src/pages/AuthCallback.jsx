import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Verifying your email...');

  useEffect(() => {
    const handleCallback = async () => {
      const { error } = await supabase.auth.getSession();

      if (error) {
        setStatus('Verification failed. Please try again.');
        toast.error('Email verification failed');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      await supabase.auth.signOut();
      setStatus('Email verified! Redirecting to sign in...');
      toast.success('Email verified! Please sign in.');
      setTimeout(() => navigate('/login'), 1500);
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">{status}</p>
      </div>
    </div>
  );
}
