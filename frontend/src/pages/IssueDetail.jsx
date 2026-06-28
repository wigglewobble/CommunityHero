import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { MapPin, ThumbsUp, MessageCircle, Clock, ArrowLeft, Send, Loader, CheckCircle, Building, ChevronRight } from 'lucide-react';

const statusColors = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  'in-progress': 'bg-violet-50 text-violet-700 border-violet-200',
  resolved: 'bg-green-50 text-green-700 border-green-200'
};

const severityColors = {
  low: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200'
};

export default function IssueDetail() {
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upvoting, setUpvoting] = useState(false);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [comment, setComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => { fetchIssue(); if (user) checkUpvoted(); }, [id, user]);

  const fetchIssue = async () => {
    try {
      const { data } = await api.get(`/issues/${id}`);
      setIssue(data);
    } catch { toast.error('Issue not found'); navigate('/'); }
    finally { setLoading(false); }
  };

  const checkUpvoted = async () => {
    try {
      const { data } = await api.get(`/issues/${id}/upvoted`);
      setHasUpvoted(data.upvoted);
    } catch { }
  };

  const handleUpvote = async () => {
    if (!user) return toast.error('Login to verify this issue');
    if (hasUpvoted) return;
    setUpvoting(true);
    try {
      const { data } = await api.post(`/issues/${id}/upvote`);
      setIssue(i => ({ ...i, upvoteCount: data.upvoteCount }));
      setHasUpvoted(true);
      toast.success('+2 points earned for verifying');
      if (data.verification?.escalate) toast.error('AI escalated to critical: ' + data.verification.reason);
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    } finally { setUpvoting(false); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommenting(true);
    try {
      const { data } = await api.post(`/issues/${id}/comments`, { text: comment });
      setIssue(i => ({ ...i, comments: [data, ...(i.comments || [])] }));
      setComment('');
      refreshUser();
    } catch { toast.error('Failed to post comment'); }
    finally { setCommenting(false); }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await api.patch(`/issues/${id}/status`, { status: newStatus });
      setIssue(i => ({ ...i, status: newStatus }));
      toast.success(newStatus === 'resolved' ? 'Marked as resolved. +25 points.' : `Status updated to ${newStatus}`);
      refreshUser();
    } catch { toast.error('Failed to update status'); }
    finally { setUpdatingStatus(false); }
  };

  const timeAgo = (date) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader className="w-6 h-6 text-blue-600 animate-spin" /></div>;
  if (!issue) return null;

  const isOwner = user && user.id === issue.userId;
  const statusSteps = ['open', 'in-progress', 'resolved'];
  const currentStep = statusSteps.indexOf(issue.status);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          {issue.imageUrl && (
            <img src={issue.imageUrl} alt={issue.title} className="w-full h-72 object-cover rounded-lg" />
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded border ${statusColors[issue.status]}`}>{issue.status}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded border ${severityColors[issue.severity]}`}>{issue.severity} severity</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-600">{issue.category}</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">{issue.title}</h1>
            <p className="text-sm text-gray-600 leading-relaxed">{issue.description}</p>
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(issue.createdAt)}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {issue.address || 'Location tagged'}</span>
              <span>Reported by <strong className="text-gray-600">{issue.user?.name}</strong> · {issue.user?.badge}</span>
            </div>
          </div>

          {/* AI Analysis */}
          {issue.aiAnalysis && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">AI</span>
                </div>
                <h2 className="font-semibold text-gray-800 text-sm">Gemini Analysis</h2>
                {issue.aiAnalysis.confidence && (
                  <span className="ml-auto text-xs text-gray-400">{issue.aiAnalysis.confidence}% confidence</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="text-xs text-gray-400 mb-1">Category Detected</div>
                  <div className="font-medium text-gray-800">{issue.aiAnalysis.category}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="text-xs text-gray-400 mb-1">Estimated Fix Time</div>
                  <div className="font-medium text-gray-800">{issue.aiAnalysis.estimatedFixTime}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Building className="w-3 h-3" /> Department</div>
                  <div className="font-medium text-gray-800">{issue.aiAnalysis.department}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-md">
                  <div className="text-xs text-gray-400 mb-1">Immediate Risk</div>
                  <div className={`font-medium ${issue.aiAnalysis.immediateRisk === 'yes' ? 'text-red-600' : 'text-green-600'}`}>
                    {issue.aiAnalysis.immediateRisk === 'yes' ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
              {issue.aiAnalysis.actionRequired && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <div className="text-xs text-gray-400 mb-1">Recommended Action</div>
                  <p className="text-sm text-gray-700">{issue.aiAnalysis.actionRequired}</p>
                </div>
              )}
              {issue.aiAnalysis.verification && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
                  <div className="font-medium text-amber-800 text-xs mb-1">AI Verification</div>
                  <div className="text-amber-700 text-xs">{issue.aiAnalysis.verification.reason}</div>
                  <div className="text-xs text-amber-500 mt-1">Urgency: {issue.aiAnalysis.verification.urgencyScore}/100</div>
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 text-sm mb-4">
              Comments <span className="text-gray-400 font-normal">({issue.comments?.length || 0})</span>
            </h2>
            {user && (
              <form onSubmit={handleComment} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Add a comment or update..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-400"
                />
                <button type="submit" disabled={commenting} className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors">
                  {commenting ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            )}
            <div className="space-y-3">
              {(issue.comments || []).map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-gray-600">{c.user?.name?.[0]}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-gray-700">{c.user?.name}</span>
                      <span className="text-xs text-gray-400">{c.user?.badge}</span>
                      <span className="text-xs text-gray-300 ml-auto">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600">{c.text}</p>
                  </div>
                </div>
              ))}
              {(!issue.comments || issue.comments.length === 0) && (
                <p className="text-sm text-gray-400 py-3">No comments yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Upvote */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <button
              onClick={handleUpvote}
              disabled={upvoting || hasUpvoted}
              className={`w-full py-2.5 rounded-md font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                hasUpvoted ? 'bg-blue-50 text-blue-600 border border-blue-200 cursor-default' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {upvoting ? <Loader className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
              {hasUpvoted ? 'Verified' : 'Verify Issue'}
            </button>
            <div className="mt-3">
              <div className="text-2xl font-semibold text-gray-900">{issue.upvoteCount}</div>
              <div className="text-xs text-gray-400 mt-0.5">verifications from community</div>
            </div>
            {issue.upvoteCount >= 10 && (
              <div className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                High community concern
              </div>
            )}
          </div>

          {/* Progress tracker */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Progress</h3>
            <div className="space-y-2.5">
              {[['open', 'Reported'], ['in-progress', 'In Progress'], ['resolved', 'Resolved']].map(([s, label], i) => (
                <div key={s} className="flex items-center gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    i < currentStep ? 'bg-green-500 text-white' :
                    i === currentStep ? 'bg-blue-600 text-white' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {i < currentStep ? <CheckCircle className="w-3 h-3" /> : <span>{i + 1}</span>}
                  </div>
                  <span className={`text-sm ${i === currentStep ? 'font-medium text-gray-900' : i < currentStep ? 'text-gray-500' : 'text-gray-300'}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {isOwner && issue.status !== 'resolved' && (
              <div className="mt-4 space-y-2 pt-3 border-t border-gray-100">
                {issue.status === 'open' && (
                  <button
                    onClick={() => handleStatusChange('in-progress')}
                    disabled={updatingStatus}
                    className="w-full text-xs py-2 border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 transition-colors font-medium"
                  >
                    Mark In Progress
                  </button>
                )}
                <button
                  onClick={() => handleStatusChange('resolved')}
                  disabled={updatingStatus}
                  className="w-full text-xs py-2 border border-green-200 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors font-medium flex items-center justify-center gap-1"
                >
                  <CheckCircle className="w-3 h-3" /> Mark Resolved (+25 pts)
                </button>
              </div>
            )}
          </div>

          {/* Department */}
          {issue.department && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Building className="w-3 h-3" /> Assigned To</div>
              <div className="text-sm font-medium text-gray-800">{issue.department}</div>
            </div>
          )}

          {/* Location */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</div>
            <div className="text-sm text-gray-700 mb-2">{issue.address || 'Location tagged'}</div>
            <div className="text-xs text-gray-400 mb-2">{issue.latitude}, {issue.longitude}</div>
            <a
              href={`https://www.google.com/maps?q=${issue.latitude},${issue.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              Open in Google Maps <ChevronRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
