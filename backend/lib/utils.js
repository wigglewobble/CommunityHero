function getBadge(points) {
  if (points >= 500) return 'Champion';
  if (points >= 200) return 'Hero';
  if (points >= 100) return 'Guardian';
  if (points >= 50) return 'Activist';
  if (points >= 20) return 'Reporter';
  return 'Citizen';
}

const VALID_CATEGORIES = ['Pothole', 'Water Leakage', 'Streetlight', 'Garbage/Waste', 'Road Damage', 'Drainage', 'Encroachment', 'Vandalism', 'Other'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];
const VALID_STATUSES = ['open', 'in-progress', 'resolved'];

module.exports = { getBadge, VALID_CATEGORIES, VALID_SEVERITIES, VALID_STATUSES };
