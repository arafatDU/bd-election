'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { LayoutDashboard, Map as MapIcon, LogOut, PieChart, ChevronDown, Filter } from 'lucide-react';
import clsx from 'clsx';

// Dynamic import for Map to avoid SSR issues
const ElectionMap = dynamic(() => import('@/components/map/ElectionMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center">Loading Map...</div>
});

// Helper to calculate bounds from GeoJSON features
const calculateBounds = (features: any[]) => {
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

    features.forEach(f => {
        const processCoords = (coords: any) => {
             // GeoJSON coordinates can be deeply nested arrays
             if (typeof coords[0] === 'number') {
                 const [lng, lat] = coords;
                 if (lat < minLat) minLat = lat;
                 if (lat > maxLat) maxLat = lat;
                 if (lng < minLng) minLng = lng;
                 if (lng > maxLng) maxLng = lng;
             } else {
                 coords.forEach(processCoords);
             }
        };
        processCoords(f.geometry.coordinates);
    });

    // Return Leaflet friendly bounds: [[south, west], [north, east]]
    return [[minLat, minLng], [maxLat, maxLng]];
};

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'division' | 'district' | 'upazila' | 'seat'>('seat');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  // Data State
  const [divisions, setDivisions] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [upazilas, setUpazilas] = useState<any[]>([]);
  const [seatsMeta, setSeatsMeta] = useState<any[]>([]);
  const [pollingCenters, setPollingCenters] = useState<any[]>([]);
  const [geoData, setGeoData] = useState<any>(null);

  // Selection State
  const [selDivision, setSelDivision] = useState<string>('');
  const [selDistrict, setSelDistrict] = useState<string>('');
  const [selUpazila, setSelUpazila] = useState<string>('');
  const [selSeat, setSelSeat] = useState<string>('');

  const [activeBounds, setActiveBounds] = useState<any>(null);

  // Load Initial Data
  useEffect(() => {
      const loadData = async () => {
          try {
              const [divs, dists, upas, seats, centers, geo] = await Promise.all([
                  fetch('/data/bd-divisions.json').then(r => r.json()),
                  fetch('/data/bd-districts.json').then(r => r.json()),
                  fetch('/data/bd-upazilas.json').then(r => r.json()),
                  fetch('/data/bd-seats.json').then(r => r.json()),
                  fetch('/data/bd-polling-centers.json').then(r => r.json()),
                  fetch('/data/bangladesh.geojson').then(r => r.json())
              ]);

              setDivisions(divs.divisions);
              setDistricts(dists.districts);
              setUpazilas(upas.upazilas);
              setSeatsMeta(seats);
              setPollingCenters(centers);
              setGeoData(geo);
          } catch (e) {
              console.error("Error loading data", e);
          }
      };
      loadData();
  }, []);

  // Aggregate Votes from Polling Centers (Static Dummy Data)
  const voteData = useMemo(() => {
      const seatVotes: Record<string, Record<string, number>> = {};

      pollingCenters.forEach(pc => {
          const sId = pc.seatId;
          if (!seatVotes[sId]) seatVotes[sId] = {};

          if (pc.voteStatus) {
              Object.entries(pc.voteStatus).forEach(([party, count]) => {
                  seatVotes[sId][party] = (seatVotes[sId][party] || 0) + (count as number);
              });
          }
      });
      return seatVotes;
  }, [pollingCenters]);

  // Derived Dropdown Options
  const filteredDistricts = useMemo(() => {
      if (!selDivision) return districts;
      return districts.filter(d => d.division_id === selDivision);
  }, [districts, selDivision]);

  const filteredUpazilas = useMemo(() => {
      if (!selDistrict) return upazilas;
      return upazilas.filter(u => u.district_id === selDistrict);
  }, [upazilas, selDistrict]);

  const filteredSeats = useMemo(() => {
      // Filter seats based on District selection (Seat JSON has 'district' name, but we have ID in selection)
      // We need to map ID to Name
      if (!selDistrict) return seatsMeta;
      const distName = districts.find(d => d.id === selDistrict)?.name;
      return seatsMeta.filter(s => s.district === distName);
  }, [seatsMeta, selDistrict, districts]);


  // Handlers for Dropdowns (Auto Zoom Logic)
  const handleDivisionChange = (id: string) => {
      setSelDivision(id);
      setSelDistrict('');
      setSelUpazila('');
      setSelSeat('');

      // Zoom
      if (geoData && id) {
          // ID_1 in GeoJSON usually matches Division ID
          const features = geoData.features.filter((f: any) => String(f.properties.ID_1) === String(id));
          if (features.length > 0) {
              setActiveBounds(calculateBounds(features));
          }
      }
      setViewMode('division');
  };

  const handleDistrictChange = (id: string) => {
      setSelDistrict(id);
      setSelUpazila('');
      setSelSeat('');

      if (geoData && id) {
           const features = geoData.features.filter((f: any) => String(f.properties.ID_2) === String(id));
           if (features.length > 0) {
              setActiveBounds(calculateBounds(features));
          }
      }
      setViewMode('district');
  };

  const handleUpazilaChange = (name: string) => {
      setSelUpazila(name);

      // Upazila selection by name (GeoJSON uses NAME_3 or NAME_4)
      if (geoData && name) {
           const features = geoData.features.filter((f: any) =>
               (f.properties.NAME_3 && f.properties.NAME_3.toLowerCase() === name.toLowerCase()) ||
               (f.properties.NAME_4 && f.properties.NAME_4.toLowerCase() === name.toLowerCase()) ||
               (f.properties.name && f.properties.name.toLowerCase() === name.toLowerCase())
           );
           if (features.length > 0) {
              setActiveBounds(calculateBounds(features));
          }
      }
      setViewMode('upazila');
  };

  const handleSeatChange = (seatId: string) => {
      setSelSeat(seatId);
      const seat = seatsMeta.find(s => s.id === seatId);
      if (seat && geoData) {
          // Find features for all upazilas in this seat
          const features = geoData.features.filter((f: any) => {
             const name = f.properties.NAME_3 || f.properties.NAME_4 || f.properties.name;
             if (!name) return false;
             // Loose match
             return seat.upazilas.some((u: any) => name.toLowerCase().includes(u.toLowerCase()) || u.toLowerCase().includes(name.toLowerCase()));
          });

          if (features.length > 0) {
              setActiveBounds(calculateBounds(features));
          }
          // Set detail view
          setSelectedLocation({ name: seat.name, ...seat });
      }
      setViewMode('seat');
  };


  // Create Upazila -> Seat Map for quick lookup (passed to Map)
  const upazilaToSeatMap = useMemo(() => {
      const map: Record<string, any> = {};
      seatsMeta.forEach(seat => {
          seat.upazilas.forEach((u: string) => {
              const key = u.toLowerCase().replace(/upazila/g, '').replace(/sadar/g, '').trim();
              map[key] = seat;
              map[u] = seat;
          });
      });
      return map;
  }, [seatsMeta]);

  // Selected Seat Stats
  const seatStats = useMemo(() => {
       // Logic to show stats for whatever is selected (Seat, or if clicking map)
       // If selSeat is set, show that. If selectedLocation is set from map click, show that.
       const targetId = selSeat || (selectedLocation?.id); // If selectedLocation is a seat object

       if (!targetId) return null;
       // If selectedLocation is a GeoJSON feature, we need to find the seat first
       // (This logic is handled in Map's onSelectLocation usually, but here we can try)

       const votes = voteData[targetId] || {};
       const total = Object.values(votes).reduce((a: any, b: any) => a + b, 0) as number;
       const parties = Object.entries(votes)
        .map(([party, count]) => ({ party, count: count as number, percent: total ? Math.round(((count as number) / total) * 100) : 0 }))
        .sort((a, b) => b.count - a.count);

      return { total, parties, name: targetId };
  }, [selSeat, selectedLocation, voteData]);


  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">

      {/* Sidebar */}
      <aside className={clsx(
          "bg-white shadow-xl z-10 transition-all duration-300 flex flex-col border-r border-gray-200",
          sidebarOpen ? "w-96 translate-x-0" : "w-0 -translate-x-full opacity-0 overflow-hidden"
      )}>
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">BD</div>
            <div>
                <h1 className="font-bold text-gray-800">Election '26</h1>
                <p className="text-xs text-gray-500">Visualization Dashboard</p>
            </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-6">

            {/* View Mode Controls */}
            <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">View Mode</label>
                <div className="grid grid-cols-2 gap-2">
                    {['division', 'district', 'upazila', 'seat'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode as any)}
                            className={clsx(
                                "py-2 text-sm font-medium rounded-md transition-all capitalize border",
                                viewMode === mode
                                    ? "bg-green-50 border-green-200 text-green-700 shadow-sm"
                                    : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"
                            )}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters / Dropdowns */}
            <div className="space-y-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <Filter className="w-4 h-4" />
                    Filters & Navigation
                </div>

                {/* Division */}
                <div>
                    <select
                        value={selDivision}
                        onChange={(e) => handleDivisionChange(e.target.value)}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    >
                        <option value="">Select Division</option>
                        {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>

                {/* District */}
                <div>
                     <select
                        value={selDistrict}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        disabled={!selDivision}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none disabled:opacity-50"
                    >
                        <option value="">Select District</option>
                        {filteredDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>

                 {/* Upazila */}
                 <div>
                     <select
                        value={selUpazila}
                        onChange={(e) => handleUpazilaChange(e.target.value)}
                        disabled={!selDistrict}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none disabled:opacity-50"
                    >
                        <option value="">Select Upazila</option>
                        {filteredUpazilas.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                    </select>
                </div>

                {/* Seat Selector (Independent or Filtered) */}
                <div className="pt-2 border-t border-gray-200">
                     <select
                        value={selSeat}
                        onChange={(e) => handleSeatChange(e.target.value)}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">Select Parliament Seat</option>
                        {filteredSeats.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                    </select>
                </div>
            </div>

            {/* Selected Info & Stats */}
            {(selectedLocation || selSeat) && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                     <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <h2 className="text-lg font-bold text-blue-900 mb-1">
                            {seatsMeta.find(s => s.id === selSeat)?.name || selectedLocation?.name || "Result Area"}
                        </h2>

                        {seatStats && seatStats.parties.length > 0 ? (
                            <div className="mt-4 space-y-3">
                                <div className="bg-white p-3 rounded-lg shadow-sm">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-600">Total Votes</span>
                                        <span className="font-bold">{seatStats.total.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                        <div className="bg-blue-500 h-full" style={{ width: '100%' }}></div>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    {seatStats.parties.map((p) => (
                                        <div key={p.party} className="flex justify-between text-sm items-center">
                                            <span className="flex items-center gap-2">
                                                <div className={clsx("w-2 h-2 rounded-full", {
                                                    'bg-green-500': p.party === 'Awami League',
                                                    'bg-gray-800': p.party === 'BNP',
                                                    'bg-yellow-500': p.party === 'Jatiya Party',
                                                    'bg-blue-400': p.party === 'Others'
                                                })}></div>
                                                {p.party}
                                            </span>
                                            <div className="text-right">
                                                <span className="font-bold text-gray-700 block">{p.percent}%</span>
                                                <span className="text-xs text-gray-400">{p.count} votes</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 text-sm text-gray-500 text-center py-4">
                                Select a specific Seat to view vote counts.
                            </div>
                        )}
                     </div>
                </div>
            )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
             <div className="text-xs text-gray-400 text-center mb-2">
                 Data based on static polling center reports.
             </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative">
        <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-4 left-4 z-[400] bg-white shadow-lg p-2 rounded-lg text-gray-600 hover:text-gray-900"
        >
            {sidebarOpen ? <MapIcon className="w-5 h-5" /> : <PieChart className="w-5 h-5" />}
        </button>

        <ElectionMap
            onSelectLocation={setSelectedLocation}
            viewMode={viewMode}
            voteData={voteData}
            seatsMeta={seatsMeta}
            upazilaToSeatMap={upazilaToSeatMap}
            activeBounds={activeBounds}
        />
      </main>
    </div>
  );
}
