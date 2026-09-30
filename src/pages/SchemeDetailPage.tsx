import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { checkEligibility } from '@/lib/eligibility';
import type { Scheme } from '@/types';
import { ArrowLeft, CheckCircle, XCircle, FileText, Check } from 'lucide-react';

type Page = 'login' | 'onboarding' | 'schemes' | 'schemeDetail' | 'reportIssue' | 'myIssues' | 'officialDashboard';

interface Props {
  schemeId: string;
  navigate: (page: Page) => void;
}

export function SchemeDetailPage({ schemeId, navigate }: Props) {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [scheme, setScheme] = useState<Scheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedDocs, setCheckedDocs] = useState<number[]>([]);

  const lang = i18n.language as 'en' | 'te';

  useEffect(() => {
    const loadScheme = async () => {
      const { data, error } = await supabase
        .from('schemes')
        .select('*')
        .eq('id', schemeId)
        .maybeSingle();

      if (error) {
        console.error('Error loading scheme:', error);
      } else if (data) {
        setScheme(data as Scheme);
      }
      setLoading(false);
    };
    loadScheme();
  }, [schemeId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500 text-lg">{t('common.loading')}</p>
      </div>
    );
  }

  if (!scheme || !profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Scheme not found.</p>
        <button onClick={() => navigate('schemes')} className="btn-primary mt-4">
          {t('schemes.title')}
        </button>
      </div>
    );
  }

  const result = checkEligibility(profile, scheme.rules);
  const title = lang === 'te' ? scheme.title_te : scheme.title_en;
  const desc = lang === 'te' ? scheme.description_te : scheme.description_en;
  const progress = scheme.documents.length > 0
    ? Math.round((checkedDocs.length / scheme.documents.length) * 100)
    : 0;

  const toggleDoc = (index: number) => {
    setCheckedDocs((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-[#0A3D91] text-white px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('schemes')}
            className="flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </button>
          <h1 className="text-xl font-bold leading-snug">{title}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4">
        {/* Description + eligibility */}
        <div className="card fade-in">
          <p className="text-gray-700 text-sm leading-relaxed">{desc}</p>

          <div className="mt-4">
            {result.eligible ? (
              <div className="flex items-center gap-2 bg-green-50 rounded-xl px-4 py-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-green-700 font-medium">{t('schemes.eligible')}</span>
              </div>
            ) : (
              <div className="bg-red-50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span className="text-red-700 font-medium">{t('schemes.notEligible')}</span>
                </div>
                <ul className="text-sm text-red-600 space-y-1 ml-7">
                  {result.reasons.map((reason, i) => (
                    <li key={i}>• {reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Documents checklist */}
        <div className="card fade-in">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-[#0A3D91]" />
            <h3 className="font-semibold text-gray-900">{t('schemes.requiredDocuments')}</h3>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">{t('schemes.documentsProgress')}</span>
              <span className="font-semibold text-[#0A3D91]">
                {checkedDocs.length} / {scheme.documents.length} ({progress}%)
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0A3D91] to-[#1B5BBF] rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Document checklist */}
          <div className="space-y-2">
            {scheme.documents.map((doc, index) => {
              const isChecked = checkedDocs.includes(index);
              const docName = lang === 'te' ? doc.te : doc.en;

              return (
                <button
                  key={index}
                  onClick={() => toggleDoc(index)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    isChecked
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                      isChecked ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  >
                    {isChecked && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      isChecked ? 'text-green-700' : 'text-gray-700'
                    }`}
                  >
                    {docName}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 mt-4 text-center">
            {t('schemes.markAsReady')}
          </p>
        </div>
      </div>
    </div>
  );
}
