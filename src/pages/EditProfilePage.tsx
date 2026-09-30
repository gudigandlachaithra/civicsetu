import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Check, GraduationCap, Wheat, User } from 'lucide-react';

type Page = 'login' | 'onboarding' | 'schemes' | 'schemeDetail' | 'reportIssue' | 'myIssues' | 'officialDashboard' | 'notifications' | 'editProfile';

const STATES = ['Andhra Pradesh', 'Telangana', 'Karnataka', 'Tamil Nadu', 'Kerala', 'Maharashtra', 'Other'];
const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS'];
const EDUCATION_LEVELS = ['Class 9-10', '11-12', 'Diploma', 'UG', 'PG', 'PhD'];
const INSTITUTION_TYPES = ['Govt', 'Aided', 'Private'];
const GENDERS = ['male', 'female', 'other'];
const LANGUAGES = ['en', 'te'];

interface Props {
  navigate: (page: Page) => void;
}

export function EditProfilePage({ navigate }: Props) {
  const { t, i18n } = useTranslation();
  const { profile, refreshProfile } = useAuth();

  const [formData, setFormData] = useState({
    name: profile?.name || '',
    age: profile?.age?.toString() || '',
    gender: profile?.gender || '',
    state: profile?.state || '',
    district: profile?.district || '',
    preferred_language: profile?.preferred_language || i18n.language,
    // Student
    education_level: profile?.education_level || '',
    course: profile?.course || '',
    year_of_study: profile?.year_of_study || '',
    institution_type: profile?.institution_type || '',
    last_exam_percentage: profile?.last_exam_percentage?.toString() || '',
    annual_family_income: profile?.annual_family_income?.toString() || '',
    // Farmer
    land_acres: profile?.land_acres?.toString() || '',
    ownership_type: profile?.ownership_type || '',
    crop_type: profile?.crop_type || '',
    // General
    occupation: profile?.occupation || '',
    annual_income: profile?.annual_income?.toString() || '',
    // Shared
    category: profile?.category || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const citizenType = profile?.citizen_type;

  const update = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);

    const updateData: Record<string, unknown> = {
      name: formData.name,
      age: formData.age ? parseInt(formData.age) : null,
      gender: formData.gender || null,
      state: formData.state || null,
      district: formData.district || null,
      preferred_language: formData.preferred_language,
      category: formData.category || null,
    };

    if (citizenType === 'student') {
      updateData.education_level = formData.education_level || null;
      updateData.course = formData.course || null;
      updateData.year_of_study = formData.year_of_study || null;
      updateData.institution_type = formData.institution_type || null;
      updateData.last_exam_percentage = formData.last_exam_percentage
        ? parseFloat(formData.last_exam_percentage)
        : null;
      updateData.annual_family_income = formData.annual_family_income
        ? parseFloat(formData.annual_family_income)
        : null;
    } else if (citizenType === 'farmer') {
      updateData.land_acres = formData.land_acres ? parseFloat(formData.land_acres) : null;
      updateData.ownership_type = formData.ownership_type || null;
      updateData.crop_type = formData.crop_type || null;
      updateData.annual_income = formData.annual_income
        ? parseFloat(formData.annual_income)
        : null;
    } else {
      updateData.occupation = formData.occupation || null;
      updateData.annual_income = formData.annual_income
        ? parseFloat(formData.annual_income)
        : null;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profile.id);

    if (updateError) {
      setError(t('onboarding.error'));
    } else {
      // Update language if changed
      if (formData.preferred_language && formData.preferred_language !== i18n.language) {
        i18n.changeLanguage(formData.preferred_language);
      }
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
    setSaving(false);
  };

  if (!profile) return null;

  const citizenTypeLabel =
    citizenType === 'student'
      ? t('onboarding.student')
      : citizenType === 'farmer'
      ? t('onboarding.farmer')
      : t('onboarding.general');

  const CitizenIcon =
    citizenType === 'student'
      ? GraduationCap
      : citizenType === 'farmer'
      ? Wheat
      : User;

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
          <h1 className="text-2xl font-bold">{t('editProfile.title')}</h1>
          <p className="text-white/80 text-sm mt-1">{t('editProfile.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4">
        <div className="card fade-in">
          {/* Read-only citizen type + phone */}
          <div className="mb-6 space-y-3">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <CitizenIcon className="w-5 h-5 text-[#0A3D91]" />
              <div>
                <p className="text-xs text-gray-400">{t('onboarding.citizenType')}</p>
                <p className="text-sm font-semibold text-gray-700">{citizenTypeLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <span className="text-gray-400 text-sm">📞</span>
              <div>
                <p className="text-xs text-gray-400">{t('login.phoneLabel')}</p>
                <p className="text-sm font-semibold text-gray-700">{profile.phone}</p>
              </div>
            </div>
          </div>

          {/* Common fields */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#0A3D91] text-sm uppercase tracking-wide">
              {t('onboarding.common')}
            </h3>

            <Field label={t('onboarding.name')}>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => update('name', e.target.value)}
                className="input-field"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label={t('onboarding.age')}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.age}
                  onChange={(e) => update('age', e.target.value)}
                  className="input-field"
                />
              </Field>

              <Field label={t('onboarding.gender')}>
                <select
                  value={formData.gender}
                  onChange={(e) => update('gender', e.target.value)}
                  className="input-field"
                >
                  <option value="">--</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {t(`gender.${g}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label={t('onboarding.state')}>
                <select
                  value={formData.state}
                  onChange={(e) => update('state', e.target.value)}
                  className="input-field"
                >
                  <option value="">--</option>
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {t(`states.${s}`)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t('onboarding.district')}>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => update('district', e.target.value)}
                  className="input-field"
                />
              </Field>
            </div>

            <Field label={t('onboarding.preferredLanguage')}>
              <select
                value={formData.preferred_language}
                onChange={(e) => update('preferred_language', e.target.value)}
                className="input-field"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l === 'en' ? 'English' : 'తెలుగు'}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t('onboarding.category')}>
              <select
                value={formData.category}
                onChange={(e) => update('category', e.target.value)}
                className="input-field"
              >
                <option value="">--</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`category.${c}`)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Student fields */}
          {citizenType === 'student' && (
            <div className="space-y-4 mt-6 pt-6 border-t border-gray-100">
              <h3 className="font-semibold text-[#0A3D91] text-sm uppercase tracking-wide">
                {t('onboarding.studentFields')}
              </h3>

              <Field label={t('onboarding.educationLevel')}>
                <select
                  value={formData.education_level}
                  onChange={(e) => update('education_level', e.target.value)}
                  className="input-field"
                >
                  <option value="">--</option>
                  {EDUCATION_LEVELS.map((el) => (
                    <option key={el} value={el}>
                      {t(`educationLevel.${el}`)}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label={t('onboarding.course')}>
                  <input
                    type="text"
                    value={formData.course}
                    onChange={(e) => update('course', e.target.value)}
                    className="input-field"
                  />
                </Field>

                <Field label={t('onboarding.yearOfStudy')}>
                  <input
                    type="text"
                    value={formData.year_of_study}
                    onChange={(e) => update('year_of_study', e.target.value)}
                    className="input-field"
                  />
                </Field>
              </div>

              <Field label={t('onboarding.institutionType')}>
                <select
                  value={formData.institution_type}
                  onChange={(e) => update('institution_type', e.target.value)}
                  className="input-field"
                >
                  <option value="">--</option>
                  {INSTITUTION_TYPES.map((it) => (
                    <option key={it} value={it}>
                      {t(`institutionType.${it}`)}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label={t('onboarding.lastExamPercentage')}>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={formData.last_exam_percentage}
                    onChange={(e) => update('last_exam_percentage', e.target.value)}
                    className="input-field"
                    placeholder="75"
                  />
                </Field>

                <Field label={t('onboarding.annualFamilyIncome')}>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.annual_family_income}
                    onChange={(e) => update('annual_family_income', e.target.value)}
                    className="input-field"
                    placeholder="100000"
                  />
                </Field>
              </div>
            </div>
          )}

          {/* Farmer fields */}
          {citizenType === 'farmer' && (
            <div className="space-y-4 mt-6 pt-6 border-t border-gray-100">
              <h3 className="font-semibold text-[#0A3D91] text-sm uppercase tracking-wide">
                {t('onboarding.farmerFields')}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <Field label={t('onboarding.landAcres')}>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={formData.land_acres}
                    onChange={(e) => update('land_acres', e.target.value)}
                    className="input-field"
                    placeholder="2.5"
                  />
                </Field>

                <Field label={t('onboarding.ownershipType')}>
                  <select
                    value={formData.ownership_type}
                    onChange={(e) => update('ownership_type', e.target.value)}
                    className="input-field"
                  >
                    <option value="">--</option>
                    <option value="owned">{t('ownershipType.owned')}</option>
                    <option value="leased">{t('ownershipType.leased')}</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label={t('onboarding.cropType')}>
                  <input
                    type="text"
                    value={formData.crop_type}
                    onChange={(e) => update('crop_type', e.target.value)}
                    className="input-field"
                    placeholder="Rice / Cotton / etc."
                  />
                </Field>

                <Field label={t('onboarding.annualIncome')}>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.annual_income}
                    onChange={(e) => update('annual_income', e.target.value)}
                    className="input-field"
                    placeholder="80000"
                  />
                </Field>
              </div>
            </div>
          )}

          {/* General fields */}
          {citizenType === 'general' && (
            <div className="space-y-4 mt-6 pt-6 border-t border-gray-100">
              <h3 className="font-semibold text-[#0A3D91] text-sm uppercase tracking-wide">
                {t('onboarding.generalFields')}
              </h3>

              <Field label={t('onboarding.occupation')}>
                <input
                  type="text"
                  value={formData.occupation}
                  onChange={(e) => update('occupation', e.target.value)}
                  className="input-field"
                  placeholder="Shopkeeper / Driver / etc."
                />
              </Field>

              <Field label={t('onboarding.annualIncome')}>
                <input
                  type="number"
                  inputMode="numeric"
                  value={formData.annual_income}
                  onChange={(e) => update('annual_income', e.target.value)}
                  className="input-field"
                  placeholder="120000"
                />
              </Field>
            </div>
          )}

          {/* Error / Success */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-green-700 text-sm font-medium">{t('editProfile.success')}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={saving || !formData.name || !formData.age || !formData.gender || !formData.state || !formData.district || !formData.category}
            className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
          >
            {saving ? t('onboarding.saving') : t('editProfile.save')}
            {!saving && <Save className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
