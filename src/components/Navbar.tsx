import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { Globe, LogOut, Menu, X, Landmark, FileText, CheckCircle, AlertCircle, LayoutDashboard, UserCog, Bell, PlusCircle } from 'lucide-react';
import { useState } from 'react';

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

interface NavbarProps {
  current: Page;
  navigate: (page: Page) => void;
}

export function Navbar({ current, navigate }: NavbarProps) {
  const { t, i18n } = useTranslation();
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isOfficial = profile?.role === 'official';
  const isOnboarded = profile?.is_onboarded;

  const toggleLang = () => {
    const newLang = i18n.language === 'en' ? 'te' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleNav = (page: Page) => {
    navigate(page);
    setMenuOpen(false);
  };

  if (!profile) return null;

  const citizenLinks: { page: Page; label: string; icon: typeof FileText }[] = [
    { page: 'schemes', label: t('nav.eligibleSchemes'), icon: CheckCircle },
    { page: 'reportIssue', label: t('nav.reportIssue'), icon: AlertCircle },
    { page: 'myIssues', label: t('nav.myIssues'), icon: FileText },
    { page: 'editProfile', label: t('nav.editProfile'), icon: UserCog },
    { page: 'notifications', label: t('nav.notifications'), icon: Bell },
  ];

  const officialLinks: { page: Page; label: string; icon: typeof FileText }[] = [
    { page: 'officialDashboard', label: t('nav.officialDashboard'), icon: LayoutDashboard },
    { page: 'createScheme', label: t('nav.createScheme'), icon: PlusCircle },
    { page: 'notifications', label: t('nav.notifications'), icon: Bell },
  ];

  const links = isOfficial ? officialLinks : citizenLinks;
  const showOnboarding = !isOfficial && !isOnboarded;

  return (
    <nav className="bg-[#0A3D91] text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => navigate(isOfficial ? 'officialDashboard' : isOnboarded ? 'schemes' : 'onboarding')}
            className="flex items-center gap-2 font-bold text-lg"
          >
            <Landmark className="w-6 h-6 text-[#FF9933]" />
            <span>{t('app.name')}</span>
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {showOnboarding && (
              <button
                onClick={() => handleNav('onboarding')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  current === 'onboarding' ? 'bg-white/15' : 'hover:bg-white/10'
                }`}
              >
                <UserCog className="w-4 h-4 inline mr-1" />
                {t('nav.onboarding')}
              </button>
            )}
            {!showOnboarding &&
              links.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.page}
                    onClick={() => handleNav(link.page)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      current === link.page ? 'bg-white/15' : 'hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4 inline mr-1" />
                    {link.label}
                  </button>
                );
              })}

            {/* Language switcher */}
            <button
              onClick={toggleLang}
              className="ml-2 px-3 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1"
            >
              <Globe className="w-4 h-4" />
              {i18n.language === 'en' ? 'EN' : 'TE'}
            </button>

            {/* Logout */}
            <button
              onClick={signOut}
              className="ml-1 px-3 py-2 rounded-lg text-sm font-medium bg-[#FF9933] hover:bg-[#E67300] transition-colors flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" />
              {t('nav.logout')}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleLang}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-white/10 transition-colors flex items-center gap-1"
            >
              <Globe className="w-4 h-4" />
              {i18n.language === 'en' ? 'EN' : 'TE'}
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-3 space-y-1">
            {showOnboarding && (
              <button
                onClick={() => handleNav('onboarding')}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  current === 'onboarding' ? 'bg-white/15' : 'hover:bg-white/10'
                }`}
              >
                <UserCog className="w-4 h-4 inline mr-2" />
                {t('nav.onboarding')}
              </button>
            )}
            {!showOnboarding &&
              links.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.page}
                    onClick={() => handleNav(link.page)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      current === link.page ? 'bg-white/15' : 'hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4 inline mr-2" />
                    {link.label}
                  </button>
                );
              })}
            <button
              onClick={() => {
                signOut();
                setMenuOpen(false);
              }}
              className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium bg-[#FF9933] hover:bg-[#E67300] transition-colors"
            >
              <LogOut className="w-4 h-4 inline mr-2" />
              {t('nav.logout')}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
