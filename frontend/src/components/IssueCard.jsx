import { Link } from 'react-router-dom';
import { MapPin, ThumbsUp, MessageCircle, Clock } from 'lucide-react';

const severityColors = {
  low: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200'
};

const statusColors = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  'in-progress': 'bg-violet-50 text-violet-700 border-violet-200',
  resolved: 'bg-green-50 text-green-700 border-green-200'
};

const statusLabel = {
  open: 'Open',
  'in-progress': 'In Progress',
  resolved: 'Resolved'
};

export default function IssueCard({ issue }) {
  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Link to={`/issues/${issue.id}`} className="block group">
      <div className="bg-white rounded-lg border border-gray-200 group-hover:border-gray-300 group-hover:shadow-sm transition-all overflow-hidden">
        {issue.imageUrl ? (
          <img src={issue.imageUrl} alt={issue.title} className="w-full h-44 object-cover" />
        ) : (
          <div className="w-full h-20 bg-gray-50 flex items-center justify-center border-b border-gray-100">
            <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">{issue.category}</span>
          </div>
        )}
        <div className="p-4">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex gap-1.5">
              <span className={`text-xs font-medium px-2 py-0.5 rounded border ${severityColors[issue.severity] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                {issue.severity}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded border ${statusColors[issue.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                {statusLabel[issue.status] || issue.status}
              </span>
            </div>
            <span className="text-xs text-gray-400">{timeAgo(issue.createdAt)}</span>
          </div>

          <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2">{issue.title}</h3>
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{issue.description}</p>

          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[130px]">{issue.address || 'Location tagged'}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> {issue.upvoteCount}</span>
              <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {issue._count?.comments || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
