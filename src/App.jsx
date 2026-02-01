import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import { Toaster } from '@/components/ui/toaster';
import FanEventHome from '@/pages/FanEventHome';
import FanEventResults from '@/pages/FanEventResults';
import FanEventDetails from '@/pages/FanEventDetails';
import EventSubmissionPage from '@/pages/EventSubmissionPage';
import AdminModerationQueue from '@/pages/AdminModerationQueue';
import ProtectedAdminRoute from '@/components/ProtectedAdminRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Changed root path to render FanEventHome directly */}
          <Route path="/" element={<FanEventHome />} />
          {/* Keeping /fans route as requested, though it now duplicates the root path */}
          <Route path="/fans" element={<FanEventHome />} /> 
          <Route path="/fans/results" element={<FanEventResults />} />
          <Route path="/fans/event/:id" element={<FanEventDetails />} />
          <Route path="/fans/submit" element={<EventSubmissionPage />} />
          <Route
            path="/fans/admin"
            element={
              <ProtectedAdminRoute>
                <AdminModerationQueue />
              </ProtectedAdminRoute>
            }
          />
          {/* Redirect any unmatched routes to the new default FanEventHome */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
