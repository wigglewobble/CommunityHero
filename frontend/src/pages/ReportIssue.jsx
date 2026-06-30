import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Upload, X, Loader, MapPin } from 'lucide-react';

const CATEGORIES = ['Pothole', 'Water Leakage', 'Streetlight', 'Garbage/Waste', 'Road Damage', 'Drainage', 'Encroachment', 'Vandalism', 'Other'];

export default function ReportIssue() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [form, setForm] = useState({ title: '', description: '', category: 'Other', severity: 'medium', address: '', latitude: '', longitude: '' });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const getCurrentLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        setGettingLocation(false);
        toast.success('Location detected');
      },
      () => { toast.error('Could not get location'); setGettingLocation(false); }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.latitude || !form.longitude) return toast.error('Enter latitude and longitude');

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (image) formData.append('image', image);

      const { data } = await api.post('/issues', formData, { headers: { 'Content-Type': 'multipart/form-data' } });

      toast.success('Issue reported. +10 points earned.');
      await refreshUser();
      navigate(`/issues/${data.issue.id}`);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to submit';
      const isModeration = err.response?.data?.moderationFailed;
      toast.error(errMsg, { duration: isModeration ? 6000 : 3000 });
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Report an Issue</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload a photo and Gemini AI will automatically categorize the issue.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Image upload */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Photo <span className="text-gray-400 font-normal text-xs ml-1">— AI will analyze it on submit</span>
          </label>
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full h-56 object-cover rounded-md" />
              <button
                type="button"
                onClick={() => { setImage(null); setImagePreview(null); }}
                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm border border-gray-200"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-md cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors">
              <Upload className="w-7 h-7 text-gray-300 mb-2" />
              <span className="text-sm text-gray-500">Click to upload photo</span>
              <span className="text-xs text-gray-400 mt-1">JPG, PNG up to 8MB</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          )}
        </div>

        {/* Issue details */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <h2 className="text-sm font-medium text-gray-700">Issue Details</h2>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Title <span className="text-gray-400">(optional — AI will suggest one)</span></label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-400"
              placeholder="e.g. Large pothole near school entrance"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-400 resize-none"
              placeholder="Describe the issue..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-400">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Severity</label>
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-400">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">Location</h2>
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              {gettingLocation ? <Loader className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
              Use my location
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Latitude</label>
              <input
                type="number"
                step="any"
                required
                value={form.latitude}
                onChange={e => setForm({ ...form, latitude: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-400"
                placeholder="e.g. 28.6139"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Longitude</label>
              <input
                type="number"
                step="any"
                required
                value={form.longitude}
                onChange={e => setForm({ ...form, longitude: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-400"
                placeholder="e.g. 77.2090"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Address <span className="text-gray-400">(optional)</span></label>
            <input
              type="text"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-400"
              placeholder="e.g. MG Road, near Metro Station, Bengaluru"
            />
          </div>
          <p className="text-xs text-gray-400">Tip: use "Use my location" button to auto-fill your current coordinates.</p>
        </div>

        {/* Points info */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 flex items-center justify-between text-xs text-gray-500">
          <span>Reporting earns you <strong className="text-gray-700">+10 points</strong> toward your badge</span>
          <span className="text-gray-400">AI analysis runs on submit</span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-md text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Issue'}
        </button>
      </form>
    </div>
  );
}
