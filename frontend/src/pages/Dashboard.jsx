import { useState, useEffect } from 'react';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle, Users, Activity, Loader, RefreshCw } from 'lucide-react';

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#F97316', '#84CC16'];

const badgeColors = {
  'Champion': 'text-amber-700 bg-amber-50 border-amber-200',
  'Hero': 'text-violet-700 bg-violet-50 border-violet-200',
  'Guardian': 'text-blue-700 bg-blue-50 border-blue-200',
  'Activist': 'text-green-700 bg-green-50 border-green-200',
  'Reporter': 'text-gray-700 bg-gray-50 border-gray-200',
  'Citizen': 'text-gray-500 bg-gray-50 border-gray-100'
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [analyzedCount, setAnalyzedCount] = useState(0);
  const [insightsCached, setInsightsCached] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsFetched, setInsightsFetched] = useState(false);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const { data } = await api.get('/dashboard/stats');
      setStats(data);
    } catch { } finally { setLoadingStats(false); }
  };

  const fetchInsights = async (forceRefresh = false) => {
    setLoadingInsights(true);
    try {
      const { data } = await api.get('/dashboard/insights', {
        params: forceRefresh ? { refresh: 'true' } : {}
      });
      setInsights(data.insights);
      setAnalyzedCount(data.analyzedCount || 0);
      setInsightsCached(data.cached || false);
      setInsightsFetched(true);
    } catch { } finally { setLoadingInsights(false); }
  };

  if (loadingStats) return <div className="flex items-center justify-center py-20"><Loader className="w-6 h-6 text-blue-600 animate-spin" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Community issue analytics and AI insights</p>
        </div>
        <button onClick={fetchStats} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Issues', value: stats.summary.total, icon: <Activity className="w-4 h-4 text-gray-400" /> },
            { label: 'Open', value: stats.summary.open, icon: <AlertTriangle className="w-4 h-4 text-amber-400" />, val: 'text-amber-600' },
            { label: 'Resolved', value: stats.summary.resolved, icon: <CheckCircle className="w-4 h-4 text-green-500" />, val: 'text-green-600' },
            { label: 'Critical', value: stats.summary.critical, icon: <AlertTriangle className="w-4 h-4 text-red-400" />, val: 'text-red-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">{s.icon}<span className="text-xs text-gray-400">{s.label}</span></div>
              <div className={`text-2xl font-semibold ${s.val || 'text-gray-900'}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Resolution rate */}
      {stats && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Resolution Rate</span>
            <span className="text-sm font-semibold text-gray-900">{stats.resolutionRate}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${stats.resolutionRate}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1.5">
            <span>{stats.summary.resolved} resolved</span>
            <span>{stats.summary.open} still open</span>
          </div>
        </div>
      )}

      {/* Charts */}
      {stats?.categoryData?.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Issues by Category</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12 }} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="count" fill="#3B82F6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Category Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.categoryData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {stats.categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* AI Insights */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium text-gray-900">AI Insights</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Gemini analyzes all open issues and generates patterns, hotspots, and predictions
              {insightsFetched && analyzedCount > 0 && (
                <span className="ml-1">· <strong className="text-gray-600">{analyzedCount} issues analyzed</strong></span>
              )}
              {insightsCached && <span className="ml-1 text-gray-300">· cached</span>}
            </p>
          </div>
          {!insightsFetched ? (
            <button
              onClick={() => fetchInsights(false)}
              disabled={loadingInsights}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              {loadingInsights && <Loader className="w-4 h-4 animate-spin" />}
              {loadingInsights ? 'Analyzing...' : 'Run Analysis'}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              {insightsCached && (
                <button onClick={() => fetchInsights(true)} disabled={loadingInsights} className="text-xs text-gray-400 hover:text-gray-600">
                  Refresh
                </button>
              )}
              <button onClick={() => fetchInsights(false)} disabled={loadingInsights} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
                <RefreshCw className="w-3 h-3" /> Re-run
              </button>
            </div>
          )}
        </div>

        {!insightsFetched && !loadingInsights && (
          <div className="text-center py-10 border border-dashed border-gray-200 rounded-lg">
            <p className="text-sm text-gray-400">Click "Run Analysis" to generate AI insights from all open issues</p>
          </div>
        )}

        {loadingInsights && (
          <div className="text-center py-10">
            <Loader className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">Analyzing patterns across all issues...</p>
          </div>
        )}

        {insights && !loadingInsights && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <div className="text-2xl font-semibold text-gray-900">{insights.overallHealthScore}</div>
                <div className="text-xs text-gray-400 mt-0.5">Health Score</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <div className={`text-sm font-semibold mt-1 ${insights.weeklyTrend === 'improving' ? 'text-green-600' : insights.weeklyTrend === 'worsening' ? 'text-red-600' : 'text-amber-600'}`}>
                  {insights.weeklyTrend === 'improving' ? 'Improving' : insights.weeklyTrend === 'worsening' ? 'Worsening' : 'Stable'}
                </div>
                <div className="text-xs text-gray-400">Weekly Trend</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <div className="text-2xl font-semibold text-red-600">{insights.criticalAlerts?.length || 0}</div>
                <div className="text-xs text-gray-400 mt-0.5">Critical Alerts</div>
              </div>
            </div>

            {insights.criticalAlerts?.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-xs font-semibold text-red-700 mb-2">Critical Alerts</div>
                <ul className="space-y-1">{insights.criticalAlerts.map((a, i) => <li key={i} className="text-xs text-red-600">· {a}</li>)}</ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.hotspots?.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-xs font-semibold text-gray-700 mb-3">Issue Hotspots</h3>
                  <div className="space-y-2">
                    {insights.hotspots.slice(0, 4).map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div>
                          <div className="font-medium text-gray-700">{h.area}</div>
                          <div className="text-gray-400">{h.dominantCategory}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-700">{h.issueCount} issues</div>
                          <div className={h.urgency === 'high' ? 'text-red-500' : h.urgency === 'medium' ? 'text-amber-500' : 'text-green-500'}>{h.urgency}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.predictiveInsights?.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Predictions</h3>
                  <ul className="space-y-2">{insights.predictiveInsights.map((p, i) => <li key={i} className="text-xs text-gray-600 flex gap-1.5"><span className="text-gray-300 shrink-0">·</span>{p}</li>)}</ul>
                </div>
              )}
            </div>

            {insights.recommendations?.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="text-xs font-semibold text-gray-700 mb-3">Recommendations</h3>
                <ul className="space-y-2">{insights.recommendations.map((r, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                    <span className="w-4 h-4 bg-blue-100 text-blue-600 rounded text-xs font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                    {r}
                  </li>
                ))}</ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      {stats?.topReporters?.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" /> Leaderboard</h2>
          <div className="space-y-1">
            {stats.topReporters.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-gray-50">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{r.name}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded border ${badgeColors[r.badge] || 'bg-gray-50 text-gray-500 border-gray-100'}`}>{r.badge}</span>
                <div className="text-sm font-semibold text-blue-600 w-16 text-right">{r.points} pts</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats?.recentResolved?.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Recently Resolved</h2>
          <div className="space-y-2">
            {stats.recentResolved.map(issue => (
              <div key={issue.id} className="flex items-center gap-3 text-sm">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                <span className="text-gray-700 flex-1 truncate">{issue.title}</span>
                <span className="text-xs text-gray-400 shrink-0">{issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleDateString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
