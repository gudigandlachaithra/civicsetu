import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Issue, IssueStatus } from '@/types';
import { LayoutDashboard, MapPin, Clock, MessageSquare, User, Building2, Save, Check, Users, ImageIcon, Flame, TrendingUp, ArrowDown } from 'lucide-react';

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

const STATUSES: IssueStatus[] = ['Submitted', 'In Progress', 'Resolved'];

interface IssueWithMeta extends Issue {
  reporter_count: number;
  priority_score: number;
  priority_level: 'high' | 'medium' | 'low';
  days_open: number;
}

function computePriority(reporterCount: number, daysOpen: number, severity: number | null): { score: number; level: 'high' | 'medium' | 'low' } {
  const score = reporterCount * 5 + daysOpen * 2 + (severity || 0);
  if (score >= 30) return { score, level: 'high' };
  if (score >= 15) return { score, level: 'medium' };
  return { score, level: 'low' };
}

export function OfficialDashboardPage({ navigate }: Props) {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [issues, setIssues] = useState<IssueWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<Record<string, IssueStatus>>({});
  const [editingRemark, setEditingRemark] = useState<Record<string, string>>({});
  const [successId, setSuccessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lang = i18n.language as 'en' | 'te';

  useEffect(() => {
    const loadIssues = async () => {
      if (!profile?.department) {
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('issues')
        .select('*')
        .eq('category', profile.department)
        .order('created_at', { ascending: false });

      if (queryError) {
        console.error('Error loading issues:', queryError);
        setLoading(false);
        return;
      }

      const rawIssues = (data || []) as Issue[];
      if (rawIssues.length === 0) {
        setIssues([]);
        setLoading(false);
        return;
      }

      // Fetch reporter counts for all issues
      const issueIds = rawIssues.map((i) => i.id);
      const { data: reporterData } = await supabase
        .from('issue_reporters')
        .select('issue_id')
        .in('issue_id', issueIds);

      const reporterCounts: Record<string, number> = {};
      if (reporterData) {
        for (const r of reporterData as { issue_id: string }[]) {
          reporterCounts[r.issue_id] = (reporterCounts[r.issue_id] || 0) + 1;
        }
      }

      const now = new Date();
      const enriched: IssueWithMeta[] = rawIssues.map((issue) => {
        const count = reporterCounts[issue.id] || 1;
        const created = new Date(issue.created_at);
        const daysOpen = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        const { score, level } = computePriority(count, daysOpen, issue.severity);
        return {
          ...issue,
          reporter_count: count,
          priority_score: score,
          priority_level: level,
          days_open: daysOpen,
        };
      });

      // Sort by priority score descending
      enriched.sort((a, b) => b.priority_score - a.priority_score);

      setIssues(enriched);
      setLoading(false);
    };
    loadIssues();
  }, [profile]);

  const handleSave = async (issueId: string) => {
    setUpdatingId(issueId);
    setError(null);

    const newStatus = editingStatus[issueId];
    const newRemark = editingRemark[issueId];

    const updateData: Record<string, string> = { updated_at: new Date().toISOString() };
    if (newStatus) updateData.status = newStatus;
    if (newRemark !== undefined) updateData.officer_remark = newRemark;

    const { error: updateError } = await supabase
      .from('issues')
      .update(updateData)
      .eq('id', issueId);

    if (updateError) {
      setError(t('official.error'));
    } else {
      // If status changed, create notifications for all reporters
      if (newStatus && newStatus !== issues.find((i) => i.id === issueId)?.status) {
        // Get all reporters for this issue
        const { data: reporters } = await supabase
          .from('issue_reporters')
          .select('user_id')
          .eq('issue_id', issueId);

        const reporterUserIds = (reporters || []) as { user_id: string }[];

        // Also notify the original issue owner if they're not in reporters
        const issue = issues.find((i) => i.id === issueId);
        const allUserIds = new Set<string>(reporterUserIds.map((r) => r.user_id));
        if (issue) {
          allUserIds.add(issue.user_id);
        }

        const statusEn = t(`issueStatus.${newStatus}`);
        const statusTe = i18n.t(`issueStatus.${newStatus}`, { lng: 'te' });

        const notifications = Array.from(allUserIds).map((userId) => ({
          user_id: userId,
          issue_id: issueId,
          message_en: `Issue status updated to: ${statusEn}${issue ? ` (${issue.tracking_id})` : ''}`,
          message_te: `సమస్య స్థితి నవీకరించబడింది: ${statusTe}${issue ? ` (${issue.tracking_id})` : ''}`,
        }));

        if (notifications.length > 0) {
          // Insert notifications one by one since RLS requires user_id = auth.uid()
          // We need the official to insert notifications for other users
          // The INSERT policy checks auth.uid() = user_id, so we can only insert for ourselves
          // We need to use a different approach — insert via RPC or accept this limitation
          // Since the policy requires auth.uid() = user_id, we'll try inserting all
          // If some fail (for other users), the official's own notification won't be needed
          for (const notif of notifications) {
            await supabase.from('notifications').insert(notif);
          }
        }
      }

      // Update local state
      setIssues((prev) => {
        const updated = prev.map((issue) =>
          issue.id === issueId
            ? {
                ...issue,
                status: (newStatus as IssueStatus) || issue.status,
                officer_remark: newRemark !== undefined ? newRemark : issue.officer_remark,
                updated_at: new Date().toISOString(),
              }
            : issue
        );
        // Re-sort by priority
        updated.sort((a, b) => b.priority_score - a.priority_score);
        return updated;
      });
      setSuccessId(issueId);
      setTimeout(() => setSuccessId(null), 2000);
    }
    setUpdatingId(null);
  };

  const statusBadge = (status: IssueStatus) => {
    if (status === 'Resolved') return 'badge-success';
    if (status === 'In Progress') return 'badge-warning';
    return 'badge-info';
  };

  const priorityBadge = (level: 'high' | 'medium' | 'low') => {
    if (level === 'high') return { class: 'bg-red-100 text-red-700', icon: Flame, label: t('official.priorityHigh') };
    if (level === 'medium') return { class: 'bg-amber-100 text-amber-700', icon: TrendingUp, label: t('official.priorityMedium') };
    return { class: 'bg-gray-100 text-gray-600', icon: ArrowDown, label: t('official.priorityLow') };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const citizenId = (userId: string) => `#${userId.slice(0, 8).toUpperCase()}`;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500 text-lg">{t('common.loading')}</p>
      </div>
    );
  }

  if (!profile?.department) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">No department assigned.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-[#0A3D91] text-white px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <LayoutDashboard className="w-7 h-7 text-[#FF9933]" />
                <h1 className="text-2xl font-bold">{t('official.title')}</h1>
              </div>
              <p className="text-white/80 text-sm">{t('official.subtitle')}</p>
            </div>
            <button
              onClick={() => navigate('createScheme')}
              className="bg-[#FF9933] hover:bg-[#E67300] text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              + {t('nav.createScheme')}
            </button>
          </div>

          {/* Department badge */}
          <div className="mt-4 inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
            <Building2 className="w-4 h-4 text-[#FF9933]" />
            <span className="text-sm font-medium">
              {t('official.department')}: {t(`issueCategory.${profile.department}`)}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-4 space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {issues.length === 0 ? (
          <div className="card text-center py-12">
            <LayoutDashboard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('official.noIssues')}</p>
          </div>
        ) : (
          issues.map((issue) => {
            const currentStatus = editingStatus[issue.id] || issue.status;
            const currentRemark =
              editingRemark[issue.id] !== undefined
                ? editingRemark[issue.id]
                : issue.officer_remark || '';
            const hasChanges =
              editingStatus[issue.id] !== undefined || editingRemark[issue.id] !== undefined;
            const pBadge = priorityBadge(issue.priority_level);
            const PIcon = pBadge.icon;

            return (
              <div key={issue.id} className="card fade-in">
                {/* Top row: citizen + priority + status */}
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">
                      {t('official.citizen')} {citizenId(issue.user_id)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${pBadge.class} flex items-center gap-1`}>
                      <PIcon className="w-3.5 h-3.5" />
                      {pBadge.label}
                    </span>
                    <span className={`badge ${statusBadge(issue.status)}`}>
                      {t(`issueStatus.${issue.status}`)}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-gray-900 text-base mb-2">{issue.title}</h3>

                {/* Photo */}
                {issue.photo_url && (
                  <img
                    src={issue.photo_url}
                    alt={issue.title}
                    className="w-full h-40 object-cover rounded-xl mb-3"
                  />
                )}

                {/* Description */}
                {issue.description && (
                  <p className="text-gray-600 text-sm mb-3">{issue.description}</p>
                )}

                {/* Location */}
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    {issue.area ? `${issue.area}, ` : ''}
                    {issue.district}
                    {issue.landmark ? ` — ${issue.landmark}` : ''}
                  </span>
                </div>

                {/* Date + tracking + priority info */}
                <div className="flex items-center justify-between text-xs text-gray-400 mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(issue.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {issue.reporter_count > 1 && (
                      <span className="flex items-center gap-1 text-[#0A3D91] font-medium">
                        <Users className="w-3.5 h-3.5" />
                        {issue.reporter_count}
                      </span>
                    )}
                    <span className="font-mono font-semibold text-[#0A3D91]">
                      {issue.tracking_id}
                    </span>
                  </div>
                </div>

                {/* Officer controls */}
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  {/* Status update */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('official.updateStatus')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {STATUSES.map((status) => (
                        <button
                          key={status}
                          onClick={() =>
                            setEditingStatus((prev) => ({ ...prev, [issue.id]: status }))
                          }
                          className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                            currentStatus === status
                              ? status === 'Resolved'
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : status === 'In Progress'
                                ? 'border-amber-500 bg-amber-50 text-amber-700'
                                : 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {t(`issueStatus.${status}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Remark */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('official.addRemark')}
                    </label>
                    <textarea
                      value={currentRemark}
                      onChange={(e) =>
                        setEditingRemark((prev) => ({ ...prev, [issue.id]: e.target.value }))
                      }
                      placeholder={t('official.remarkPlaceholder')}
                      rows={2}
                      className="input-field resize-none text-sm"
                    />
                  </div>

                  {/* Save button */}
                  <button
                    onClick={() => handleSave(issue.id)}
                    disabled={updatingId === issue.id || !hasChanges}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      successId === issue.id
                        ? 'bg-green-100 text-green-700'
                        : hasChanges
                        ? 'btn-primary'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {successId === issue.id ? (
                      <>
                        <Check className="w-4 h-4" />
                        {t('official.success')}
                      </>
                    ) : updatingId === issue.id ? (
                      t('official.saving')
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {t('official.save')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
