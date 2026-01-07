'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { LayoutDashboard, Map as MapIcon, LogOut, PieChart } from 'lucide-react';
import clsx from 'clsx';
import useSWR from 'swr';

// Dynamic import for Map to avoid SSR issues
const ElectionMap = dynamic(() => import('@/components/map/ElectionMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center">Loading Map...</div>
});

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'admin' | 'seat'>('seat');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  // Data Fetching
  const { data: voteResponse } = useSWR('/api/votes/live', fetcher, { refreshInterval: 5000 });
  const [seatsMeta, setSeatsMeta] = useState<any[]>([]);

  useEffect(() => {
      fetch('/data/bd-seats.json')
        .then(r => r.json())
        .then(data => setSeatsMeta(data))
        .catch(err => console.error("Failed to load seats", err));
  }, []);

  const voteData = voteResponse?.data || {};

  // Create Upazila -> Seat Map for quick lookup
  const upazilaToSeatMap = useMemo(() => {
      const map: Record<string, any> = {};
      seatsMeta.forEach(seat => {
          seat.upazilas.forEach((u: string) => {
              // Normalize for better matching: lowercase, trim
              // This is a basic normalization. In production, we'd need more robust fuzzy matching
              // as GeoJSON names and our generated names might differ slightly.
              const key = u.toLowerCase().replace(/upazila/g, '').replace(/sadar/g, '').trim();
              map[key] = seat;
              // Also map exact name just in case
              map[u] = seat;
          });
      });
      return map;
  }, [seatsMeta]);

  // Resolve Selected Location to Seat Data
  const selectedSeat = useMemo(() => {
      if (!selectedLocation) return null;

      // Try to find seat by Upazila name from properties
      // GeoJSON usually has NAME_4 or NAME_3 for Upazila
      const namesToCheck = [
          selectedLocation.NAME_4,
          selectedLocation.NAME_3,
          selectedLocation.name,
          selectedLocation.upazila
      ].filter(Boolean);

      for (const name of namesToCheck) {
          const norm = name.toLowerCase().replace(/upazila/g, '').replace(/sadar/g, '').replace(/\./g, '').trim();
          if (upazilaToSeatMap[norm]) return upazilaToSeatMap[norm];

          // Try loose match
          const found = Object.values(upazilaToSeatMap).find((s: any) =>
              s.upazilas.some((u: string) => u.toLowerCase().includes(norm) || norm.includes(u.toLowerCase()))
          );
          if (found) return found;
      }
      return null;
  }, [selectedLocation, upazilaToSeatMap]);

  // Get Vote Stats for Selected Seat
  const seatStats = useMemo(() => {
      if (!selectedSeat) return null;
      const votes = voteData[selectedSeat.id] || {};

      const total = Object.values(votes).reduce((a: any, b: any) => a + b, 0) as number;

      // Convert to array and sort
      const parties = Object.entries(votes)
        .map(([party, count]) => ({ party, count: count as number, percent: total ? Math.round(((count as number) / total) * 100) : 0 }))
        .sort((a, b) => b.count - a.count);

      return { total, parties };
  }, [selectedSeat, voteData]);


  const handleLocationSelect = (type: string, data: any) => {
      setSelectedLocation(data);
      if (!sidebarOpen) setSidebarOpen(true);
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">

      {/* Sidebar */}
      <aside className={clsx(
          "bg-white shadow-xl z-10 transition-all duration-300 flex flex-col border-r border-gray-200",
          sidebarOpen ? "w-80 translate-x-0" : "w-0 -translate-x-full opacity-0 overflow-hidden"
      )}>
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold">BD</div>
            <div>
                <h1 className="font-bold text-gray-800">Election '26</h1>
                <p className="text-xs text-gray-500">Live Analytics Dashboard</p>
            </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">

            {/* Controls */}
            <div className="mb-6">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">View Mode</label>
                <div className="grid grid-cols-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('seat')}
                        className={clsx("py-2 text-sm font-medium rounded-md transition-all", viewMode === 'seat' ? "bg-white shadow text-green-600" : "text-gray-500 hover:text-gray-700")}
                    >
                        Seats (300)
                    </button>
                    <button
                        onClick={() => setViewMode('admin')}
                        className={clsx("py-2 text-sm font-medium rounded-md transition-all", viewMode === 'admin' ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700")}
                    >
                        Admin Area
                    </button>
                </div>
            </div>

            {/* Selected Info */}
            {selectedLocation ? (
                <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                     <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <h2 className="text-lg font-bold text-blue-900 mb-1">
                            {selectedSeat ? selectedSeat.name : (selectedLocation.NAME_4 || selectedLocation.name || "Selected Area")}
                        </h2>
                        <p className="text-sm text-blue-600">
                            {selectedSeat ? `${selectedSeat.upazilas.join(', ')}` : "Region Details"}
                        </p>

                        {selectedSeat && seatStats ? (
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
                                    {seatStats.parties.length > 0 ? seatStats.parties.map((p) => (
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
                                    )) : (
                                        <div className="text-center text-sm text-gray-400 py-2">No votes cast yet</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 text-sm text-gray-500">
                                No election data mapped for this region.
                            </div>
                        )}
                     </div>
                </div>
            ) : (
                <div className="text-center py-10 text-gray-400">
                    <MapIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Select an area on the map to view detailed analytics.</p>
                </div>
            )}

            {/* Overall Stats (when nothing selected) */}
            {!selectedLocation && (
                <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-3">National Overview</h3>
                    <div className="grid grid-cols-2 gap-2">
                         <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-center">
                             <div className="text-2xl font-bold text-green-600">300</div>
                             <div className="text-xs text-gray-400 uppercase">Seats</div>
                         </div>
                         <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm text-center">
                             <div className="text-2xl font-bold text-blue-600">64</div>
                             <div className="text-xs text-gray-400 uppercase">Districts</div>
                         </div>
                    </div>
                </div>
            )}

        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
            <a href="/agent/login" className="flex items-center gap-3 text-sm font-medium text-gray-600 hover:text-green-600 transition-colors p-2 rounded-lg hover:bg-white">
                <LayoutDashboard className="w-4 h-4" />
                Agent Login
            </a>
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
            onSelectLocation={handleLocationSelect}
            viewMode={viewMode}
            voteData={voteData}
            seatsMeta={seatsMeta}
            upazilaToSeatMap={upazilaToSeatMap}
        />
      </main>
    </div>
  );
}
