import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Shield, MapPin, CheckCircle, Loader } from 'lucide-react';

const BADGE_ORDER = ['Citizen', 'Reporter', 'Activist', 'Guardian', 'Hero', 'Champion'];
const BADGE_PTS = { Citizen: 0, Reporter: 20, Activist: 50, Guardian: 100, Hero: 200, Champion: 500 };

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [myIssues, setMyIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [{ data: userData }, { data: issuesData }] = await Promise.all([
        api.get('/auth/me'),
        api.get('/issues')
      ]);
      setMyIssues(issuesData.filter(i => i.user?.id === userData.id));
    } catch { } finally { setLoading(false); }
  };

  if (!user) return null;

  const currentBadgeIndex = BADGE_ORDER.indexOf(user.badge);
  const nextBadge = BADGE_ORDER[currentBadgeIndex + 1];
  const currentPts = BADGE_PTS[user.badge] || 0;
  const nextPts = nextBadge ? BADGE_PTS[nextBadge] : null;
  const progress = nextPts ? Math.min(100, Math.round(((user.points - currentPts) / (nextPts - currentPts)) * 100)) : 100;

  const statusColors = {
    open: 'bg-blue-50 text-blue-700 border-blue-200',
    'in-progress': 'bg-violet-50 text-violet-700 border-violet-200',
    resolved: 'bg-green-50 text-green-700 border-green-200'
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-xl font-semibold text-gray-600">{user.name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">{user.name}</h1>
            <p className="text-sm text-gray-400">{user.email}</p>
            <span className="inline-block mt-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              {user.badge}
            </span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-gray-900">{user.points}</div>
            <div className="text-xs text-gray-400">points</div>
          </div>
        </div>

        {nextBadge && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>{user.badge}</span>
              <span>{nextBadge} at {nextPts} pts</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{nextPts - user.points} more points to reach {nextBadge}</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-xl font-semibold text-gray-900">{myIssues.length}</div>
          <div className="text-xs text-gray-400 mt-0.5">Reported</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-xl font-semibold text-green-600">{myIssues.filter(i => i.status === 'resolved').length}</div>
          <div className="text-xs text-gray-400 mt-0.5">Resolved</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-xl font-semibold text-blue-600">{user.points}</div>
          <div className="text-xs text-gray-400 mt-0.5">Total Points</div>
        </div>
      </div>

      {/* Badge progression */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-3">Badge Progression</h2>
        <div className="flex flex-wrap gap-2">
          {BADGE_ORDER.map(badge => {
            const unlocked = user.points >= BADGE_PTS[badge];
            const isCurrent = badge === user.badge;
            return (
              <div key={badge} className={`text-xs px-3 py-1.5 rounded border font-medium ${
                isCurrent ? 'bg-blue-600 text-white border-blue-600' :
                unlocked ? 'bg-gray-50 text-gray-700 border-gray-200' :
                'bg-gray-50 text-gray-300 border-gray-100'
              }`}>
                {badge} <span className="opacity-60 font-normal">({BADGE_PTS[badge]}+)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* How points work */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-3">How to Earn Points</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          {[['Report an issue', '+10'], ['Verify/upvote', '+2'], ['Add comment', '+1'], ['Issue resolved', '+25']].map(([action, pts]) => (
            <div key={action} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="font-semibold text-blue-600 text-sm mb-0.5">{pts}</div>
              <div className="text-gray-500">{action}</div>
            </div>
          ))}
        </div>
      </div>

      {/* My issues */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400" /> My Issues
          <span className="ml-auto text-xs text-gray-400 font-normal">{myIssues.length} total</span>
        </h2>

        {loading ? (
          <div className="text-center py-6"><Loader className="w-5 h-5 text-blue-400 animate-spin mx-auto" /></div>
        ) : myIssues.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
            <p className="text-sm text-gray-400">No issues reported yet.</p>
            <Link to="/report" className="mt-3 inline-block bg-blue-600 text-white text-sm px-4 py-2 rounded-md font-medium">
              Report your first issue
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {myIssues.map(issue => (
              <Link key={issue.id} to={`/issues/${issue.id}`} className="flex items-center gap-3 p-3 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
                {issue.imageUrl ? (
                  <img src={issue.imageUrl} alt={issue.title} className="w-11 h-11 rounded-md object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 bg-gray-100 rounded-md flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{issue.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{issue.category} · {issue.address || 'Location tagged'}</div>
                </div>
                <div className="shrink-0 text-right">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded border ${statusColors[issue.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {issue.status}
                  </span>
                  <div className="text-xs text-gray-400 mt-1">{issue.upvoteCount} verifications</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
