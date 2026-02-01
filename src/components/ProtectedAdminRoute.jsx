import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';

function ProtectedAdminRoute({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setChecking(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['Admin', 'Super Admin'])
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setChecking(false);
    }
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center px-6">
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-[#D4AF37]/20 max-w-md text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-gray-400 mb-6">
            You need administrator privileges to access this page.
          </p>
          <button
            onClick={() => window.location.href = '/fans'}
            className="bg-gradient-to-r from-[#D4AF37] to-[#f4d03f] hover:from-[#f4d03f] hover:to-[#D4AF37] text-black font-bold px-6 py-3 rounded-lg transition-all duration-300"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedAdminRoute;
