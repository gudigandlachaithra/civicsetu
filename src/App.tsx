import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { LoginPage } from '@/pages/LoginPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { SchemesPage } from '@/pages/SchemesPage';
import { SchemeDetailPage } from '@/pages/SchemeDetailPage';
import { ReportIssuePage } from '@/pages/ReportIssuePage';
import { MyIssuesPage } from '@/pages/MyIssuesPage';
import { OfficialDashboardPage } from '@/pages/OfficialDashboardPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { EditProfilePage } from '@/pages/EditProfilePage';
import { CreateSchemePage } from '@/pages/CreateSchemePage';

type Page =
  | 'login'
  | 'onboarding'
  | 'schemes'
  | 'schemeDetail'
  | 'reportIssue'
  | 'myIssues'
  | 'officialDashboard'
  | 'notifications'
  | 'editProfile'
  | 'createScheme';

function AppContent() {
  const { t, i18n } = useTranslation();
  const { user, profile, loading } = useAuth();
  const [page, setPage] = useState<Page>('login');
  const [schemeId, setSchemeId] = useState<string | null>(null);

  // Set language from profile preference
  useEffect(() => {
    if (profile?.preferred_language && profile.preferred_language !== i18n.language) {
      i18n.changeLanguage(profile.preferred_language);
    }
  }, [profile?.preferred_language]);

  const navigate = (newPage: Page, id?: string) => {
    if (id) setSchemeId(id);
    setPage(newPage);
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">{t('common.loading')}</p>
      </div>
    );
  }

  // Not logged in → login page
  if (!user) {
    return <LoginPage />;
  }

  // Logged in but profile still loading — show a brief loading state
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">{t('common.loading')}</p>
      </div>
    );
  }

  // Official → dashboard, createScheme or notifications
  if (profile.role === 'official') {
    return (
      <>
        <Navbar current={page} navigate={navigate} />
        {page === 'notifications' ? (
          <NotificationsPage navigate={navigate} />
        ) : page === 'createScheme' ? (
          <CreateSchemePage navigate={navigate} />
        ) : (
          <OfficialDashboardPage navigate={navigate} />
        )}
      </>
    );
  }

  // Citizen not onboarded → onboarding
  if (!profile.is_onboarded) {
    return (
      <>
        <Navbar current={page} navigate={navigate} />
        <OnboardingPage />
      </>
    );
  }

  // Citizen onboarded → show requested page
  return (
    <>
      <Navbar current={page} navigate={navigate} />
      {page === 'onboarding' && <OnboardingPage />}
      {page === 'schemes' && <SchemesPage navigate={navigate} />}
      {page === 'schemeDetail' && schemeId && (
        <SchemeDetailPage schemeId={schemeId} navigate={navigate} />
      )}
      {page === 'reportIssue' && <ReportIssuePage navigate={navigate} />}
      {page === 'myIssues' && <MyIssuesPage navigate={navigate} />}
      {page === 'notifications' && <NotificationsPage navigate={navigate} />}
      {page === 'editProfile' && <EditProfilePage navigate={navigate} />}
      {page === 'createScheme' && <CreateSchemePage navigate={navigate} />}
      {/* Default to schemes if on login page after auth */}
      {page === 'login' && <SchemesPage navigate={navigate} />}
      {page === 'officialDashboard' && <OfficialDashboardPage navigate={navigate} />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
