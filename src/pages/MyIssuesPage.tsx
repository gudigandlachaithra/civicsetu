import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Issue, IssueStatus } from '@/types';
import { Plus, FileText, MapPin, Clock, MessageSquare, Copy, Check, Users, ImageIcon } from 'lucide-react';

type Page = 'login' | 'onboarding' | 'schemes' | 'schemeDetail' | 'reportIssue' | 'myIssues' | 'officialDashboard' | 'notifications';

interface Props {
  navigate: (page: Page) => void;
}

interface IssueWithReporterCount extends Issue {
  reporter_count: number;
  is_joined: boolean;
}

export function MyIssuesPage({ navigate }: Props) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [issues, setIssues] = useState<IssueWithReporterCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const loadIssues = async () => {
      if (!profile) return;

      // Get issues the user reported directly
      const { data: ownedIssues, error: ownedError } = await supabase
        .from('issues')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (ownedError) {
        console.error('Error loading owned issues:', ownedError);
      }

      // Get issues the user joined via issue_reporters
      const { data: joinedReporters, error: joinedError } = await supabase
        .from('issue_reporters')
        .select('issue_id')
        .eq('user_id', profile.id);

      if (joinedError) {
        console.error('Error loading joined issues:', joinedError);
      }

      const ownedList = (ownedIssues || []) as Issue[];
      const joinedIds = (joinedReporters || []).map((r: { issue_id: string }) => r.issue_id);

      // Fetch joined issue details (excluding ones user owns directly)
      const joinedToFetch = joinedIds.filter(
        (id) => !ownedList.some((o) => o.id === id)
      );

      let joinedList: Issue[] = [];
      if (joinedToFetch.length > 0) {
        const { data: joinedIssues } = await supabase
          .from('issues')
          .select('*')
          .in('id', joinedToFetch)
          .order('created_at', { ascending: false });
        joinedList = (joinedIssues || []) as Issue[];
      }

      const allIssues = [...ownedList, ...joinedList];

      // Get reporter counts for all issues
      const allIds = allIssues.map((i) => i.id);
      let reporterCounts: Record<string, number> = {};
      if (allIds.length > 0) {
        const { data: counts } = await supabase
          .from('issue_reporters')
          .select('issue_id')
          .in('issue_id', allIds);

        if (counts) {
          reporterCounts = counts.reduce((acc, r: { issue_id: string }) => {
            acc[r.issue_id] = (acc[r.issue_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        }
      }

      const enriched = allIssues.map((issue) => ({
        ...issue,
        reporter_count: reporterCounts[issue.id] || 1,
        is_joined: !ownedList.some((o) => o.id === issue.id),
      }));

      // Sort by created_at desc
      enriched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setIssues(enriched);
      setLoading(false);
    };
    loadIssues();
  }, [profile]);

  const copyTracking = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const statusBadge = (status: IssueStatus) => {
    if (status === 'Resolved') return 'badge-success';
    if (status === 'In Progress') return 'badge-warning';
    return 'badge-info';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-500 text-lg">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-[#0A3D91] text-white px-4 py-8">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('issues.myIssuesTitle')}</h1>
            <p className="text-white/80 text-sm mt-1">{t('issues.myIssuesSubtitle')}</p>
          </div>
          <button
            onClick={() => navigate('reportIssue')}
            className="bg-[#FF9933] hover:bg-[#E67300] rounded-xl p-3 transition-all active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-3">
        {issues.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-6">{t('issues.noIssues')}</p>
            <button onClick={() => navigate('reportIssue')} className="btn-primary">
              {t('issues.reportNew')}
            </button>
          </div>
        ) : (
          issues.map((issue) => (
            <div key={issue.id} className="card fade-in">
              {/* Top row: category + status + joined badge */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    {t(`issueCategory.${issue.category}`)}
                  </span>
                  {issue.is_joined && (
                    <span className="badge badge-info text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {t('issues.joinIssue')}
                    </span>
                  )}
                </div>
                <span className={`badge ${statusBadge(issue.status)}`}>
                  {t(`issueStatus.${issue.status}`)}
                </span>
              </div>

              {/* Photo thumbnail */}
              {issue.photo_url && (
                <img
                  src={issue.photo_url}
                  alt={issue.title}
                  className="w-full h-36 object-cover rounded-xl mb-3"
                />
              )}

              {/* Title */}
              <h3 className="font-semibold text-gray-900 text-base mb-2">{issue.title}</h3>

              {/* Description */}
              {issue.description && (
                <p className="text-gray-500 text-sm line-clamp-2 mb-3">{issue.description}</p>
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

              {/* Date + reporter count */}
              <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDate(issue.created_at)}</span>
                </div>
                {issue.reporter_count > 1 && (
                  <span className="flex items-center gap-1 text-[#0A3D91] font-medium">
                    <Users className="w-3.5 h-3.5" />
                    {issue.reporter_count} {t('issues.reporters')}
                  </span>
                )}
              </div>

              {/* Tracking ID */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mb-3">
                <div>
                  <span className="text-xs text-gray-400">{t('issues.trackingId')}: </span>
                  <span className="font-mono font-semibold text-[#0A3D91] text-sm">
                    {issue.tracking_id}
                  </span>
                </div>
                <button
                  onClick={() => copyTracking(issue.tracking_id)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {copiedId === issue.tracking_id ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Officer remark */}
              {issue.officer_remark && (
                <div className="flex items-start gap-2 bg-blue-50 rounded-lg px-3 py-2">
                  <MessageSquare className="w-4 h-4 text-[#0A3D91] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-[#0A3D91]">{t('issues.officerRemark')}</p>
                    <p className="text-sm text-gray-700 mt-0.5">{issue.officer_remark}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
