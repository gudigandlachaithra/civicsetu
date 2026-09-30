import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { checkEligibility } from '@/lib/eligibility';
import type { CitizenType, Profile, SchemeRules, SchemeDocument } from '@/types';
import { ArrowLeft, Save, Plus, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

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

interface Props {
  navigate: (page: Page) => void;
}

const ALL_CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS'];
const ALL_EDUCATION_LEVELS = ['Class 9-10', '11-12', 'Diploma', 'UG', 'PG', 'PhD'];

export function CreateSchemePage({ navigate }: Props) {
  const { t } = useTranslation();

  // Basic Scheme Details
  const [titleEn, setTitleEn] = useState('');
  const [titleTe, setTitleTe] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descTe, setDescTe] = useState('');
  const [targetGroup, setTargetGroup] = useState<CitizenType>('general');

  // Rules Form Fields
  const [maxIncome, setMaxIncome] = useState<string>('');
  const [minAge, setMinAge] = useState<string>('');
  const [maxAge, setMaxAge] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [allowedCategories, setAllowedCategories] = useState<string[]>([]);
  const [minLandAcres, setMinLandAcres] = useState<string>('');
  const [maxLandAcres, setMaxLandAcres] = useState<string>('');
  const [allowedEduLevels, setAllowedEduLevels] = useState<string[]>([]);
  const [minPercentage, setMinPercentage] = useState<string>('');

  // Required Documents List
  const [documents, setDocuments] = useState<SchemeDocument[]>([
    { en: 'Aadhaar Card', te: 'ఆధార్ కార్డ్' },
  ]);
  const [newDocEn, setNewDocEn] = useState('');
  const [newDocTe, setNewDocTe] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toggleCategory = (cat: string) => {
    setAllowedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleEduLevel = (edu: string) => {
    setAllowedEduLevels((prev) =>
      prev.includes(edu) ? prev.filter((e) => e !== edu) : [...prev, edu]
    );
  };

  const addDocument = () => {
    if (!newDocEn.trim()) return;
    setDocuments((prev) => [
      ...prev,
      { en: newDocEn.trim(), te: newDocTe.trim() || newDocEn.trim() },
    ]);
    setNewDocEn('');
    setNewDocTe('');
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn.trim() || !titleTe.trim() || !descEn.trim() || !descTe.trim()) {
      setError('Please fill in both English and Telugu titles and descriptions.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    // Build SchemeRules object
    const rules: SchemeRules = {};
    if (maxIncome !== '') rules.max_income = Number(maxIncome);
    if (minAge !== '') rules.min_age = Number(minAge);
    if (maxAge !== '') rules.max_age = Number(maxAge);
    if (gender !== '') rules.gender = gender;
    if (allowedCategories.length > 0) rules.allowed_categories = allowedCategories;
    if (minLandAcres !== '') rules.min_land_acres = Number(minLandAcres);
    if (maxLandAcres !== '') rules.max_land_acres = Number(maxLandAcres);
    if (allowedEduLevels.length > 0) rules.allowed_education_levels = allowedEduLevels;
    if (minPercentage !== '') rules.min_percentage = Number(minPercentage);

    try {
      // 1. Insert Scheme
      const { data: newScheme, error: insertError } = await supabase
        .from('schemes')
        .insert({
          title_en: titleEn.trim(),
          title_te: titleTe.trim(),
          description_en: descEn.trim(),
          description_te: descTe.trim(),
          target_group: targetGroup,
          documents,
          rules,
        })
        .select()
        .single();

      if (insertError || !newScheme) {
        throw new Error(insertError?.message || 'Failed to insert scheme');
      }

      // 2. Fetch all citizen profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'citizen');

      if (profilesError) {
        console.error('Error fetching citizen profiles:', profilesError);
      } else if (profiles && profiles.length > 0) {
        // 3. Run eligibility check for each citizen
        const docListEn = documents.map((d) => d.en).join(', ');
        const docListTe = documents.map((d) => d.te).join(', ');

        const notificationsToInsert = [];

        for (const profile of profiles as Profile[]) {
          // Filter by target group
          if (targetGroup !== 'general' && profile.citizen_type && profile.citizen_type !== targetGroup) {
            continue;
          }

          const eligibility = checkEligibility(profile, rules);
          if (eligibility.eligible) {
            notificationsToInsert.push({
              user_id: profile.id,
              issue_id: null,
              message_en: `New Eligible Scheme: "${titleEn}". Required documents: ${docListEn || 'None'}`,
              message_te: `కొత్త అర్హత పథకం: "${titleTe}". అవసరమైన పత్రాలు: ${docListTe || 'ఏవీ లేవు'}`,
            });
          }
        }

        // 4. Insert Notifications for all matching users
        if (notificationsToInsert.length > 0) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notificationsToInsert);

          if (notifError) {
            console.error('Error inserting notifications for eligible citizens:', notifError);
          }
        }
      }

      setSuccess(`Scheme "${titleEn}" created successfully! Notifications sent to eligible citizens.`);
      setTimeout(() => {
        navigate('schemes');
      }, 2000);
    } catch (err: any) {
      console.error('Error creating scheme:', err);
      setError(err?.message || 'Could not create scheme. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-[#0A3D91] text-white px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate('officialDashboard')}
            className="flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </button>
          <h1 className="text-2xl font-bold">Admin: Create New Scheme</h1>
          <p className="text-white/80 text-sm mt-1">
            Add a scheme with bilingual titles, eligibility rules, and required documents.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-4">
        <form onSubmit={handleSaveScheme} className="card fade-in space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-green-700 text-sm font-medium">{success}</p>
            </div>
          )}

          {/* Section 1: Basic Scheme Info */}
          <div>
            <h2 className="text-base font-bold text-[#0A3D91] mb-3 pb-2 border-b border-gray-100">
              1. Basic Information (Bilingual)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Title (English) *
                </label>
                <input
                  type="text"
                  required
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder="e.g. Rythu Bharosa Scheme"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Title (Telugu) *
                </label>
                <input
                  type="text"
                  required
                  value={titleTe}
                  onChange={(e) => setTitleTe(e.target.value)}
                  placeholder="ఉదా: రైతు భరోసా పథకం"
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description (English) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={descEn}
                  onChange={(e) => setDescEn(e.target.value)}
                  placeholder="Detailed explanation of the scheme benefits..."
                  className="input-field resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description (Telugu) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={descTe}
                  onChange={(e) => setDescTe(e.target.value)}
                  placeholder="పథకం ప్రయోజనాల వివరణ..."
                  className="input-field resize-none"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Target Citizen Group *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'general', label: 'General / All Citizens' },
                  { id: 'student', label: 'Students' },
                  { id: 'farmer', label: 'Farmers' },
                ].map((tg) => (
                  <button
                    key={tg.id}
                    type="button"
                    onClick={() => setTargetGroup(tg.id as CitizenType)}
                    className={`py-2.5 px-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                      targetGroup === tg.id
                        ? 'border-[#0A3D91] bg-[#0A3D91]/5 text-[#0A3D91]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {tg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Eligibility Rules */}
          <div>
            <h2 className="text-base font-bold text-[#0A3D91] mb-3 pb-2 border-b border-gray-100">
              2. Eligibility Rules (JSON Parameters)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Max Annual Income (₹)
                </label>
                <input
                  type="number"
                  value={maxIncome}
                  onChange={(e) => setMaxIncome(e.target.value)}
                  placeholder="e.g. 250000"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Minimum Age
                </label>
                <input
                  type="number"
                  value={minAge}
                  onChange={(e) => setMinAge(e.target.value)}
                  placeholder="e.g. 18"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Maximum Age
                </label>
                <input
                  type="number"
                  value={maxAge}
                  onChange={(e) => setMaxAge(e.target.value)}
                  placeholder="e.g. 60"
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Gender Requirement
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="input-field"
                >
                  <option value="">Any / No restriction</option>
                  <option value="Male">Male only</option>
                  <option value="Female">Female only</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Allowed Categories
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {ALL_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        allowedCategories.includes(cat)
                          ? 'border-[#0A3D91] bg-[#0A3D91] text-white'
                          : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Target-specific rules */}
            {targetGroup === 'farmer' && (
              <div className="grid grid-cols-2 gap-4 mt-4 bg-amber-50/50 p-3 rounded-xl border border-amber-200">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Min Land (Acres)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={minLandAcres}
                    onChange={(e) => setMinLandAcres(e.target.value)}
                    placeholder="e.g. 0.5"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Max Land (Acres)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={maxLandAcres}
                    onChange={(e) => setMaxLandAcres(e.target.value)}
                    placeholder="e.g. 5.0"
                    className="input-field"
                  />
                </div>
              </div>
            )}

            {targetGroup === 'student' && (
              <div className="space-y-3 mt-4 bg-blue-50/50 p-3 rounded-xl border border-blue-200">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Allowed Education Levels
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {ALL_EDUCATION_LEVELS.map((edu) => (
                      <button
                        key={edu}
                        type="button"
                        onClick={() => toggleEduLevel(edu)}
                        className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
                          allowedEduLevels.includes(edu)
                            ? 'border-[#0A3D91] bg-[#0A3D91] text-white'
                            : 'border-gray-200 text-gray-600 bg-white'
                        }`}
                      >
                        {edu}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Min Exam Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={minPercentage}
                    onChange={(e) => setMinPercentage(e.target.value)}
                    placeholder="e.g. 60"
                    className="input-field"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Required Documents List */}
          <div>
            <h2 className="text-base font-bold text-[#0A3D91] mb-3 pb-2 border-b border-gray-100">
              3. Required Documents List
            </h2>

            <div className="space-y-2 mb-3">
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-semibold text-gray-800">{doc.en}</span>
                    <span className="text-gray-400 mx-2">|</span>
                    <span className="text-gray-600 font-medium">{doc.te}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDocument(idx)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new document row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={newDocEn}
                onChange={(e) => setNewDocEn(e.target.value)}
                placeholder="Doc name in English (e.g. Ration Card)"
                className="input-field text-xs"
              />
              <input
                type="text"
                value={newDocTe}
                onChange={(e) => setNewDocTe(e.target.value)}
                placeholder="Doc name in Telugu (e.g. రేషన్ కార్డ్)"
                className="input-field text-xs"
              />
            </div>
            <button
              type="button"
              onClick={addDocument}
              className="btn-outline text-xs px-3 py-2 mt-2 inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Required Document
            </button>
          </div>

          {/* Save Action */}
          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold mt-4"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving Scheme & Notifying Citizens...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Scheme & Notify Eligible Citizens
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
