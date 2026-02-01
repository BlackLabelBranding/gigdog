import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "@/contexts/SupabaseAuthContext";
import { Toaster } from "@/components/ui/toaster";

import FanEventHome from "@/pages/FanEventHome";
import FanEventResults from "@/pages/FanEventResults";
import FanEventDetails from "@/pages/FanEventDetails";
import EventSubmissionPage from "@/pages/EventSubmissionPage";
import AdminModerationQueue from "@/pages/AdminModerationQueue";

import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public fan experience */}
          <Route path="/" element={<FanEventHome />} />
          <Route path="/fans" element={<FanEventHome />} />
          <Route path="/fans/results" element={<FanEventResults />} />
          <Route path="/fans/event/:id" element={<FanEventDetails />} />
          <Route path="/fans/submit" element={<EventSubmissionPage />} />

          {/* Admin */}
          <Route
            path="/fans/admin"
            element={
              <ProtectedAdminRoute>
                <AdminModerationQueue />
              </ProtectedAdminRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}
