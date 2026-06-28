import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Shield, CheckCircle, AlertTriangle, Activity } from 'lucide-react';
import api from '../lib/api';
import IssueCard from '../components/IssueCard';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['all', 'Pothole', 'Water Leakage', 'Streetlight', 'Garbage/Waste', 'Road Damage', 'Drainage', 'Encroachment', 'Vandalism', 'Other'];
const SEVERITIES = ['all', 'critical', 'high', 'medium', 'low'];
const STATUSES = ['all', 'open', 'in-progress', 'resolved'];

export default function Home() {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');
  const [stats, setStats] = useState(null);

  useEffect(() => { fetchIssues(); fetchStats(); }, [category, severity, status]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/issues', { params: { category, severity, status, search } });
      setIssues(data);
    } catch { } finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/dashboard/stats');
      setStats(data);
    } catch { }
  };

  const handleSearch = (e) => { e.preventDefault(); fetchIssues(); };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Community Issues</h1>
            <p className="text-sm text-gray-500 mt-0.5">Report, verify, and track civic problems in your area.</p>
          </div>
          <Link
            to={user ? '/report' : '/login'}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors self-start"
          >
            <Plus className="w-4 h-4" /> Report Issue
          </Link>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-3">
              <Activity className="w-4 h-4 text-gray-400" />
              <div>
                <div className="text-lg font-semibold text-gray-900">{stats.summary.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-lg font-semibold text-gray-900">{stats.summary.open}</div>
                <div className="text-xs text-gray-500">Open</div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-lg font-semibold text-gray-900">{stats.summary.resolved}</div>
                <div className="text-xs text-gray-500">Resolved</div>
              </div>
            </div>
          </div>
        )}

        {/* Search + filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search issues..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <button type="submit" className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800">Search</button>
          </form>
          <div className="flex flex-wrap gap-2">
            <select value={category} onChange={e => setCategory(e.target.value)} className="text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-400 text-gray-600">
              {CATEGORIES.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
            </select>
            <select value={severity} onChange={e => setSeverity(e.target.value)} className="text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-400 text-gray-600">
              {SEVERITIES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Severities' : s}</option>)}
            </select>
            <select value={status} onChange={e => setStatus(e.target.value)} className="text-xs border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-400 text-gray-600">
              {STATUSES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 h-60 animate-pulse">
              <div className="h-44 bg-gray-100 rounded-t-lg" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-16">
          <Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-gray-500 font-medium text-sm">No issues found</h3>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or be the first to report an issue.</p>
          <Link to="/report" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium">
            Report Issue
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {issues.map(issue => <IssueCard key={issue.id} issue={issue} />)}
        </div>
      )}
    </div>
  );
}
