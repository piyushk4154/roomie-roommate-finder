import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GuestRoute } from './components/GuestRoute';
import { ProfileGateRoute } from './components/ProfileGateRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ChatPage } from './pages/ChatPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { MatchesPage } from './pages/MatchesPage';
import { MatchingTestPage } from './pages/MatchingTestPage';
import { MyProfilePage } from './pages/MyProfilePage';
import { ProfileDetailPage } from './pages/ProfileDetailPage';
import { ProfileSetupPage } from './pages/ProfileSetupPage';
import { RequestsPage } from './pages/RequestsPage';
import { SignUpPage } from './pages/SignUpPage';
import { AuthProvider } from './services/AuthContext';
import { ToastProvider } from './services/ToastContext';

const isDevModeEnabled = import.meta.env.DEV;

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route
                path="/signup"
                element={
                  <GuestRoute>
                    <SignUpPage />
                  </GuestRoute>
                }
              />
              <Route
                path="/login"
                element={
                  <GuestRoute>
                    <LoginPage />
                  </GuestRoute>
                }
              />
              <Route
                path="/profile-setup"
                element={
                  <ProtectedRoute>
                    <ProfileSetupPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <ProfileGateRoute>
                      <MatchesPage />
                    </ProfileGateRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/matches"
                element={
                  <ProtectedRoute>
                    <ProfileGateRoute>
                      <MatchesPage />
                    </ProfileGateRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/requests"
                element={
                  <ProtectedRoute>
                    <ProfileGateRoute>
                      <RequestsPage />
                    </ProfileGateRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/chat"
                element={
                  <ProtectedRoute>
                    <ProfileGateRoute>
                      <ChatPage />
                    </ProfileGateRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/profile"
                element={
                  <ProtectedRoute>
                    <ProfileGateRoute>
                      <MyProfilePage />
                    </ProfileGateRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/profile/:userId"
                element={
                  <ProtectedRoute>
                    <ProfileGateRoute>
                      <ProfileDetailPage />
                    </ProfileGateRoute>
                  </ProtectedRoute>
                }
              />
              {isDevModeEnabled && (
                <Route
                  path="/dashboard/matching-test"
                  element={
                    <ProtectedRoute>
                      <ProfileGateRoute>
                        <MatchingTestPage />
                      </ProfileGateRoute>
                    </ProtectedRoute>
                  }
                />
              )}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
