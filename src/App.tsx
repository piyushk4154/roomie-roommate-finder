import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GuestRoute } from './components/GuestRoute';
import { ProfileGateRoute } from './components/ProfileGateRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ChatPage } from './pages/ChatPage';
import { LandingPage } from './pages/LandingPage';
import { ListingDetailPage } from './pages/ListingDetailPage';
import { LoginPage } from './pages/LoginPage';
import { MatchesPage } from './pages/MatchesPage';
import { MatchingTestPage } from './pages/MatchingTestPage';
import { MyProfilePage } from './pages/MyProfilePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OwnerListingFormPage } from './pages/OwnerListingFormPage';
import { OwnerListingsPage } from './pages/OwnerListingsPage';
import { OwnerProfilePage } from './pages/OwnerProfilePage';
import { ProfileDetailPage } from './pages/ProfileDetailPage';
import { ProfileSetupPage } from './pages/ProfileSetupPage';
import { RequestsPage } from './pages/RequestsPage';
import { RoomsPage } from './pages/RoomsPage';
import { SignUpPage } from './pages/SignUpPage';
import { AuthProvider } from './services/AuthContext';
import { ThemeProvider } from './services/ThemeContext';
import { ToastProvider } from './services/ToastContext';
import { UnsavedChangesProvider } from './services/UnsavedChangesContext';

const isDevModeEnabled = import.meta.env.DEV;

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <UnsavedChangesProvider>
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

                  {/* Student Routes */}
                  <Route
                    path="/profile-setup"
                    element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <ProfileSetupPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <ProfileGateRoute>
                          <MatchesPage />
                        </ProfileGateRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/matches"
                    element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <ProfileGateRoute>
                          <MatchesPage />
                        </ProfileGateRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/rooms"
                    element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <ProfileGateRoute>
                          <RoomsPage />
                        </ProfileGateRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/rooms/:listingId"
                    element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <ProfileGateRoute>
                          <ListingDetailPage />
                        </ProfileGateRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/requests"
                    element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <ProfileGateRoute>
                          <RequestsPage portal="student" />
                        </ProfileGateRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/chat"
                    element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <ProfileGateRoute>
                          <ChatPage portal="student" />
                        </ProfileGateRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/profile"
                    element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <ProfileGateRoute>
                          <MyProfilePage />
                        </ProfileGateRoute>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/profile/:userId"
                    element={
                      <ProtectedRoute allowedRoles={['student']}>
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
                        <ProtectedRoute allowedRoles={['student']}>
                          <ProfileGateRoute>
                            <MatchingTestPage />
                          </ProfileGateRoute>
                        </ProtectedRoute>
                      }
                    />
                  )}

                  {/* Property Owner Routes */}
                  <Route
                    path="/owner"
                    element={
                      <ProtectedRoute allowedRoles={['owner']}>
                        <OwnerListingsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/owner/listings/new"
                    element={
                      <ProtectedRoute allowedRoles={['owner']}>
                        <OwnerListingFormPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/owner/listings/:listingId/edit"
                    element={
                      <ProtectedRoute allowedRoles={['owner']}>
                        <OwnerListingFormPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/owner/requests"
                    element={
                      <ProtectedRoute allowedRoles={['owner']}>
                        <RequestsPage portal="owner" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/owner/chat"
                    element={
                      <ProtectedRoute allowedRoles={['owner']}>
                        <ChatPage portal="owner" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/owner/profile"
                    element={
                      <ProtectedRoute allowedRoles={['owner']}>
                        <OwnerProfilePage />
                      </ProtectedRoute>
                    }
                  />

                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </UnsavedChangesProvider>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
