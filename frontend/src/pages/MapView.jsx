import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { MapPin, Loader, AlertTriangle, X } from 'lucide-react';

const severityColors = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  low: '#22C55E'
};

const statusIcons = {
  open: '🔴',
  'in-progress': '🟡',
  resolved: '🟢'
};

export default function MapView() {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMapData();

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!apiKey) { setMapLoaded(false); return; }
    if (window.google?.maps) { setMapLoaded(true); return; }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  const fetchMapData = async () => {
    try {
      const { data } = await api.get('/dashboard/map');
      setIssues(data);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || googleMapRef.current) return;

    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 20.5937, lng: 78.9629 },
      zoom: 5,
      mapTypeControl: false,
      streetViewControl: false
    });

    infoWindowRef.current = new window.google.maps.InfoWindow();
  }, [mapLoaded]);

  useEffect(() => {
    if (!googleMapRef.current || !issues.length) return;
    placeMarkers();
  }, [issues, filter, googleMapRef.current]);

  const placeMarkers = () => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const filtered = filter === 'all' ? issues : issues.filter(i => i.status === filter);

    filtered.forEach(issue => {
      const marker = new window.google.maps.Marker({
        position: { lat: issue.latitude, lng: issue.longitude },
        map: googleMapRef.current,
        title: issue.title,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: issue.severity === 'critical' ? 12 : issue.severity === 'high' ? 10 : 8,
          fillColor: severityColors[issue.severity] || '#3B82F6',
          fillOpacity: 0.9,
          strokeColor: '#fff',
          strokeWeight: 2
        }
      });

      marker.addListener('click', () => {
        setSelectedIssue(issue);
        googleMapRef.current.panTo({ lat: issue.latitude, lng: issue.longitude });
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if many issues
    if (filtered.length > 1) {
      const bounds = new window.google.maps.LatLngBounds();
      filtered.forEach(i => bounds.extend({ lat: i.latitude, lng: i.longitude }));
      googleMapRef.current.fitBounds(bounds);
    }
  };

  if (!import.meta.env.VITE_GOOGLE_MAPS_KEY) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Map View</h2>
        <p className="text-gray-500">Add <code className="bg-gray-100 px-1 rounded">VITE_GOOGLE_MAPS_KEY</code> to your frontend .env to enable the interactive map.</p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto">
          {issues.map(i => (
            <Link key={i.id} to={`/issues/${i.id}`} className="bg-white rounded-lg border border-gray-200 p-3 hover:border-blue-300 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs">{statusIcons[i.status]}</span>
                <span className="text-xs font-medium text-gray-600">{i.category}</span>
              </div>
              <p className="text-sm font-medium text-gray-800 line-clamp-1">{i.title}</p>
              <p className="text-xs text-gray-400 mt-1">{i.address}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Filter bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 shrink-0">
        <MapPin className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-700">Filter:</span>
        {['all', 'open', 'in-progress', 'resolved'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              filter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> Critical</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span> High</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span> Medium</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span> Low</span>
        </div>
      </div>

      {/* Map container */}
      <div className="relative flex-1">
        <div ref={mapRef} className="w-full h-full" />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Issue popup */}
        {selectedIssue && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-10">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">{selectedIssue.title}</h3>
              <button onClick={() => setSelectedIssue(null)} className="text-gray-400 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            {selectedIssue.imageUrl && (
              <img src={selectedIssue.imageUrl} alt={selectedIssue.title} className="w-full h-32 object-cover rounded-lg mb-2" />
            )}
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{selectedIssue.category}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                selectedIssue.severity === 'critical' ? 'bg-red-100 text-red-700' :
                selectedIssue.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>{selectedIssue.severity}</span>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{selectedIssue.status}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
              <MapPin className="w-3 h-3" />
              <span className="line-clamp-1">{selectedIssue.address}</span>
            </div>
            <Link
              to={`/issues/${selectedIssue.id}`}
              className="block w-full text-center bg-blue-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Full Details →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
