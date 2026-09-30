import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { checkEligibility } from '@/lib/eligibility';
import type { Scheme } from '@/types';
import { CheckCircle, XCircle, ArrowRight, GraduationCap, Wheat, Users, Sparkles } from 'lucide-react';

type Page = 'login' | 'onboarding' | 'schemes' | 'schemeDetail' | 'reportIssue' | 'myIssues' | 'officialDashboard';

interface Props {
  navigate: (page: Page, schemeId?: string) => void;
}

export function SchemesPage({ navigate }: Props) {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'eligible' | 'notEligible'>('all');

  const lang = i18n.language as 'en' | 'te';

  useEffect(() => {
    const loadSchemes = async () => {
      const { data, error } = await supabase.from('schemes').select('*').order('created_at');
      if (error) {
        console.error('Error loading schemes:', error);
      } else if (data) {
        setSchemes(data as Scheme[]);
      }
      setLoading(false);
    };
    loadSchemes();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500 text-lg">{t('common.loading')}</p>
      </div>
    );
  }

  if (!profile?.is_onboarded) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="card text-center">
          <Sparkles className="w-12 h-12 text-[#FF9933] mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-6">{t('schemes.completeProfile')}</p>
          <button onClick={() => navigate('onboarding')} className="btn-primary">
            {t('nav.onboarding')}
          </button>
        </div>
      </div>
    );
  }

  const targetGroupIcon = (group: string) => {
    if (group === 'student') return GraduationCap;
    if (group === 'farmer') return Wheat;
    return Users;
  };

  // Filter schemes by citizen type: show matching target_group + always show 'general'
  const schemesForType = schemes.filter(
    (scheme) =>
      scheme.target_group === 'general' ||
      scheme.target_group === profile.citizen_type
  );

  const evaluatedSchemes = schemesForType.map((scheme) => ({
    scheme,
    result: checkEligibility(profile, scheme.rules),
  }));

  const filtered = evaluatedSchemes.filter(({ result }) => {
    if (filter === 'eligible') return result.eligible;
    if (filter === 'notEligible') return !result.eligible;
    return true;
  });

  const eligibleCount = evaluatedSchemes.filter((s) => s.result.eligible).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-[#0A3D91] text-white px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold">{t('schemes.title')}</h1>
          <p className="text-white/80 text-sm mt-1">{t('schemes.subtitle')}</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
            <CheckCircle className="w-5 h-5 text-[#FF9933]" />
            <span className="text-sm font-medium">
              {eligibleCount} / {schemesForType.length} {t('schemes.eligible')}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm">
          {(['all', 'eligible', 'notEligible'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-[#0A3D91] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f === 'all' ? (lang === 'en' ? 'All' : 'అన్నీ') : f === 'eligible' ? t('schemes.eligible') : t('schemes.notEligible')}
            </button>
          ))}
        </div>

        {/* Scheme cards */}
        {filtered.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500">{t('schemes.noSchemes')}</p>
          </div>
        ) : (
          filtered.map(({ scheme, result }) => {
            const Icon = targetGroupIcon(scheme.target_group);
            const title = lang === 'te' ? scheme.title_te : scheme.title_en;
            const desc = lang === 'te' ? scheme.description_te : scheme.description_en;

            return (
              <div
                key={scheme.id}
                className="card fade-in cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate('schemeDetail', scheme.id)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                      scheme.target_group === 'student'
                        ? 'bg-blue-50 text-[#0A3D91]'
                        : scheme.target_group === 'farmer'
                        ? 'bg-green-50 text-green-600'
                        : 'bg-amber-50 text-[#FF9933]'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-base leading-snug">
                      {title}
                    </h3>
                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">{desc}</p>

                    <div className="mt-3 flex items-center justify-between">
                      {result.eligible ? (
                        <span className="badge badge-success">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {t('schemes.eligible')}
                        </span>
                      ) : (
                        <span className="badge badge-error">
                          <XCircle className="w-4 h-4 mr-1" />
                          {t('schemes.notEligible')}
                        </span>
                      )}
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>

                    {!result.eligible && result.reasons.length > 0 && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                        {result.reasons[0]}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
