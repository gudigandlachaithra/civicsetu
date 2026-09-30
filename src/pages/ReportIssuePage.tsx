import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { IssueCategory } from '@/types';
import { ArrowLeft, Send, Check, AlertCircle, Copy, Camera, MapPin, X, Users, Loader2, Mic, Sparkles } from 'lucide-react';

type Page = 'login' | 'onboarding' | 'schemes' | 'schemeDetail' | 'reportIssue' | 'myIssues' | 'officialDashboard' | 'notifications' | 'editProfile';

interface Props {
  navigate: (page: Page) => void;
}

const CATEGORIES: IssueCategory[] = ['Roads', 'Water', 'Sanitation', 'Electricity', 'Health', 'Other'];

function generateTrackingId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'CS';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

interface DuplicateIssue {
  id: string;
  tracking_id: string;
  title: string;
  status: string;
  reporter_count: number;
}

export function ReportIssuePage({ navigate }: Props) {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '' as IssueCategory | '',
    district: profile?.district || '',
    area: '',
    landmark: '',
    severity: '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationFound, setLocationFound] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [reportingForOther, setReportingForOther] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateIssue | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  // AI Classification & Voice Input state
  const [isListening, setIsListening] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isManualCategory, setIsManualCategory] = useState(false);
  const [aiSuggestedCategory, setAiSuggestedCategory] = useState<IssueCategory | null>(null);
  const recognitionRef = useRef<any>(null);

  const update = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setDuplicate(null);
  };

  const handleCategorySelect = (cat: IssueCategory) => {
    update('category', cat);
    setIsManualCategory(true);
  };

  const toggleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(t('issues.speechNotSupported'));
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping speech recognition:', e);
        }
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = i18n.language?.startsWith('te') ? 'te-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0]?.transcript || '')
          .join('')
          .trim();
        if (transcript) {
          setFormData((prev) => ({
            ...prev,
            description: prev.description
              ? `${prev.description} ${transcript}`.trim()
              : transcript,
          }));
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const classifyIssueWithAI = async (
    title: string,
    description: string
  ): Promise<{ category: IssueCategory; severity: number } | null> => {
    if (!title && !description) return null;
    setIsClassifying(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('classify-issue', {
        body: { title, description },
      });

      if (fnError || !data || !data.department) {
        console.warn('classify-issue edge function returned error:', fnError || data);
        return null;
      }

      const validCategories: IssueCategory[] = ['Roads', 'Water', 'Sanitation', 'Electricity', 'Health', 'Other'];
      const dept = validCategories.includes(data.department) ? (data.department as IssueCategory) : 'Other';
      const sev = typeof data.severity === 'number' ? Math.min(Math.max(data.severity, 1), 5) : 3;

      return { category: dept, severity: sev };
    } catch (err) {
      console.warn('Error invoking classify-issue edge function:', err);
      return null;
    } finally {
      setIsClassifying(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  const handleUseLocation = () => {
    setLocating(true);
    setError(null);
    if (!navigator.geolocation) {
      setError(t('issues.locationError'));
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationFound(true);
        setLocating(false);
      },
      () => {
        setError(t('issues.locationError'));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleJoinIssue = async () => {
    if (!duplicate || !profile) return;
    setJoining(true);
    setError(null);

    const { error: insertError } = await supabase.from('issue_reporters').insert({
      issue_id: duplicate.id,
      user_id: profile.id,
    });

    if (insertError) {
      setError(t('issues.joinError'));
    } else {
      setJoined(true);
      setTimeout(() => navigate('myIssues'), 2000);
    }
    setJoining(false);
  };

  const handleSubmit = async () => {
    if (!profile) return;
    if (!formData.title || !formData.district) {
      setError(t('issues.error'));
      return;
    }

    setSubmitting(true);
    setError(null);
    setDuplicate(null);

    let finalCategory = formData.category;
    let finalSeverity = formData.severity;

    // Call Supabase Edge Function classify-issue to classify category and severity
    const aiResult = await classifyIssueWithAI(formData.title, formData.description);

    if (aiResult) {
      setAiSuggestedCategory(aiResult.category);
      // Pre-fill / override category dropdown with returned department, unless user manually selected one
      if (!isManualCategory || !finalCategory) {
        finalCategory = aiResult.category;
        setFormData((prev) => ({ ...prev, category: aiResult.category }));
      }
      // Pre-fill severity slider (1-5 scaled to 0-10) if not set
      if (!finalSeverity) {
        finalSeverity = (aiResult.severity * 2).toString();
        setFormData((prev) => ({ ...prev, severity: finalSeverity }));
      }
    } else {
      // If Edge Function fails, fall back to existing keyword-based category picked manually
      if (!finalCategory) {
        setError(t('issues.error'));
        setSubmitting(false);
        return;
      }
    }

    // Check for duplicates with finalCategory
    if (finalCategory && formData.district && formData.area) {
      const { data: dupData, error: queryError } = await supabase
        .from('issues')
        .select('id, tracking_id, title, status, user_id')
        .eq('category', finalCategory)
        .eq('district', formData.district)
        .eq('area', formData.area)
        .neq('status', 'Resolved');

      if (!queryError && dupData && dupData.length > 0) {
        const issue = dupData[0];
        const { count } = await supabase
          .from('issue_reporters')
          .select('*', { count: 'exact', head: true })
          .eq('issue_id', issue.id);

        setDuplicate({
          id: issue.id,
          tracking_id: issue.tracking_id,
          title: issue.title,
          status: issue.status,
          reporter_count: (count || 0) + 1,
        });
        setSubmitting(false);
        return;
      }
    }

    let photoUrl: string | null = null;

    // Upload photo if selected
    if (photo) {
      setPhotoUploading(true);
      const fileExt = photo.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('issue-photos')
        .upload(fileName, photo);

      if (uploadError) {
        setError(t('issues.photoError'));
        setPhotoUploading(false);
        setSubmitting(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('issue-photos')
        .getPublicUrl(fileName);
      photoUrl = urlData.publicUrl;
      setPhotoUploading(false);
    }

    const newTrackingId = generateTrackingId();
    const severityVal = finalSeverity ? parseInt(finalSeverity) : 0;

    const { data: insertData, error: insertError } = await supabase
      .from('issues')
      .insert({
        tracking_id: newTrackingId,
        user_id: profile.id,
        title: formData.title,
        description: formData.description,
        category: finalCategory,
        district: formData.district,
        area: formData.area,
        landmark: formData.landmark,
        status: 'Submitted',
        photo_url: photoUrl,
        latitude: coords?.lat || null,
        longitude: coords?.lng || null,
        severity: severityVal,
      })
      .select('id')
      .maybeSingle();

    if (insertError || !insertData) {
      setError(t('issues.error'));
    } else {
      // Add the reporter as the first entry in issue_reporters
      await supabase.from('issue_reporters').insert({
        issue_id: insertData.id,
        user_id: profile.id,
      });
      setTrackingId(newTrackingId);
    }
    setSubmitting(false);
  };

  const copyTrackingId = () => {
    if (trackingId) {
      navigator.clipboard.writeText(trackingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setTrackingId(null);
    setJoined(false);
    setDuplicate(null);
    setPhoto(null);
    setPhotoPreview(null);
    setCoords(null);
    setLocationFound(false);
    setIsManualCategory(false);
    setAiSuggestedCategory(null);
    setFormData({
      title: '',
      description: '',
      category: '',
      district: profile?.district || '',
      area: '',
      landmark: '',
      severity: '',
    });
  };

  // Success screen after joining
  if (joined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center fade-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('issues.joined')}</h2>
          <button onClick={() => navigate('myIssues')} className="btn-primary mt-4">
            {t('issues.myIssuesTitle')}
          </button>
        </div>
      </div>
    );
  }

  // Success screen after new report
  if (trackingId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="card max-w-md w-full text-center fade-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('issues.success')}</h2>

          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-4 mt-4">
            <p className="text-sm text-gray-500 mb-1">{t('issues.trackingId')}</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-2xl font-bold text-[#0A3D91] tracking-wider font-mono">
                {trackingId}
              </p>
              <button
                onClick={copyTrackingId}
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
            {copied && (
              <p className="text-xs text-green-600 mt-1">{t('issues.copied')}</p>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => navigate('myIssues')} className="btn-primary flex-1">
              {t('issues.myIssuesTitle')}
            </button>
            <button onClick={resetForm} className="btn-outline flex-1">
              {t('issues.reportNew')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Duplicate found screen
  const canSubmit = Boolean(formData.title && formData.district && (formData.category || formData.description));

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-[#0A3D91] text-white px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('myIssues')}
            className="flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </button>
          <h1 className="text-2xl font-bold">{t('issues.title')}</h1>
          <p className="text-white/80 text-sm mt-1">{t('issues.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4">
        <div className="card fade-in space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('issues.titleLabel')}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder={t('issues.titlePlaceholder')}
              className="input-field"
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">
                {t('issues.descLabel')}
              </label>
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  isListening
                    ? 'bg-red-100 text-red-700 animate-pulse ring-2 ring-red-400'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={isListening ? t('issues.stopVoice') : t('issues.startVoice')}
              >
                <Mic className={`w-3.5 h-3.5 ${isListening ? 'text-red-600' : 'text-gray-600'}`} />
                <span>{isListening ? t('issues.listening') : t('issues.voiceInput')}</span>
              </button>
            </div>
            <textarea
              value={formData.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder={t('issues.descPlaceholder')}
              rows={4}
              className="input-field resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">
                {t('issues.categoryLabel')}
              </label>
              {isClassifying ? (
                <div className="flex items-center gap-1 text-xs text-[#0A3D91]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('issues.aiClassifying')}</span>
                </div>
              ) : aiSuggestedCategory && !isManualCategory ? (
                <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>{t('issues.aiCategorySuggested')}: {t(`issueCategory.${aiSuggestedCategory}`)}</span>
                </div>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategorySelect(cat)}
                  className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    formData.category === cat
                      ? 'border-[#0A3D91] bg-[#0A3D91]/5 text-[#0A3D91] ring-2 ring-[#0A3D91]/20'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t(`issueCategory.${cat}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Photo upload */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('issues.photoLabel')}
            </label>
            <p className="text-xs text-gray-400 mb-3">{t('issues.photoHint')}</p>

            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover" />
                <button
                  onClick={removePhoto}
                  className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-lg hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl py-6 cursor-pointer hover:border-[#0A3D91] transition-colors">
                <Camera className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">{t('issues.photoLabel')}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Location section */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#0A3D91] text-sm uppercase tracking-wide">
                {t('official.location')}
              </h3>
              {/* Reporting for someone else toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-gray-500">{t('issues.reportingForSomeone')}</span>
                <button
                  onClick={() => setReportingForOther(!reportingForOther)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    reportingForOther ? 'bg-[#0A3D91]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      reportingForOther ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </label>
            </div>

            {/* Use my location button */}
            <button
              onClick={handleUseLocation}
              disabled={locating}
              className="w-full flex items-center justify-center gap-2 py-2.5 mb-3 rounded-xl border-2 border-[#0A3D91]/20 text-[#0A3D91] text-sm font-medium hover:bg-[#0A3D91]/5 transition-colors disabled:opacity-50"
            >
              {locating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('issues.locating')}
                </>
              ) : locationFound ? (
                <>
                  <MapPin className="w-4 h-4 text-green-600" />
                  {t('issues.locationFound')}
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4" />
                  {t('issues.useMyLocation')}
                </>
              )}
            </button>

            {/* Manual location fields (always visible) */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('issues.districtLabel')}
                </label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => update('district', e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('issues.areaLabel')}
                  </label>
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) => update('area', e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('issues.landmarkLabel')}
                  </label>
                  <input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => update('landmark', e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Severity (optional) */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('issues.severity')}
            </label>
            <p className="text-xs text-gray-400 mb-2">{t('issues.severityHint')}</p>
            <input
              type="range"
              min="0"
              max="10"
              value={formData.severity || '0'}
              onChange={(e) => update('severity', e.target.value)}
              className="w-full accent-[#0A3D91]"
            />
            <span className="text-sm font-semibold text-[#0A3D91]">{formData.severity || '0'}</span>
          </div>

          {/* Duplicate alert */}
          {duplicate && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 fade-in">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-800">{t('issues.duplicateFound')}</p>
                  <p className="text-sm text-amber-700 mt-1">{t('issues.duplicateDesc')}</p>
                  <div className="mt-3 bg-white rounded-lg p-3">
                    <p className="text-sm font-medium text-gray-900">{duplicate.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('issues.trackingId')}: {duplicate.tracking_id} · {duplicate.reporter_count} {t('issues.reporters')}
                    </p>
                  </div>
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={handleJoinIssue}
                      disabled={joining}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      {joining ? t('common.loading') : (
                        <>
                          <Users className="w-4 h-4" />
                          {t('issues.joinIssue')}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setDuplicate(null)}
                      className="btn-outline flex-1"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || isClassifying || photoUploading || !canSubmit}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
          >
            {photoUploading
              ? t('issues.photoUploading')
              : isClassifying
              ? t('issues.aiClassifying')
              : submitting
              ? t('issues.submitting')
              : t('issues.submit')}
            {!submitting && !isClassifying && !photoUploading && <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
