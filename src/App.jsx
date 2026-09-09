import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { InboxPage } from './pages/InboxPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { DataDeletionPage } from './pages/DataDeletionPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas Públicas de Cliente y Compliance Meta */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/politica-de-privacidad" element={<PrivacyPage />} />
          <Route path="/politica-de-privacidad.html" element={<Navigate to="/politica-de-privacidad" replace />} />
          <Route path="/terminos-de-servicio" element={<TermsPage />} />
          <Route path="/terminos-de-servicio.html" element={<Navigate to="/terminos-de-servicio" replace />} />
          <Route path="/eliminacion-de-datos" element={<DataDeletionPage />} />
          <Route path="/eliminacion-de-datos.html" element={<Navigate to="/eliminacion-de-datos" replace />} />

          {/* Portal de Acceso / Login */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/login.html" element={<Navigate to="/login" replace />} />

          {/* Rutas Privadas para Operadores y Equipo */}
          <Route
            path="/inbox"
            element={
              <ProtectedRoute>
                <InboxPage />
              </ProtectedRoute>
            }
          />
          <Route path="/inbox.html" element={<Navigate to="/inbox" replace />} />

          {/* Ruta Exclusiva de Administración */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute requireAdmin={true}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/settings.html" element={<Navigate to="/settings" replace />} />

          {/* Fallback a inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
