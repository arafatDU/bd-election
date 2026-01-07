'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AgentDashboard() {
  const router = useRouter();
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form State
  const [division, setDivision] = useState('');
  const [district, setDistrict] = useState('');
  const [upazila, setUpazila] = useState('');
  const [seatName, setSeatName] = useState('');
  const [pollingCenter, setPollingCenter] = useState('');

  const [counts, setCounts] = useState({
      'Awami League': 0,
      'BNP': 0,
      'Jatiya Party': 0,
      'Others': 0
  });

  useEffect(() => {
    const info = localStorage.getItem('agent_info');
    if (!info) {
      router.push('/agent/login');
      return;
    }
    const agentData = JSON.parse(info);
    setAgent(agentData);

    // Pre-fill if agent has assignment
    // For demo, we just auto-fill some defaults
    setDivision('Barishal');
    setDistrict('Barguna');
    setUpazila('Amtali');
    setSeatName('Seat-1');
    setPollingCenter(agentData.assignedCenterId);

  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
        const payload = {
            division,
            zilla: district,
            upazila,
            seat_name: seatName,
            polling_center_name: pollingCenter,
            polling_center_id: pollingCenter, // Using same for demo
            vote_status: counts,
            phone: agent.phone
        };

        const res = await fetch('/api/votes/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } else {
            alert('Failed to submit vote');
        }
    } catch (err) {
        alert('Error submitting');
    } finally {
        setLoading(false);
    }
  };

  const handleLogout = () => {
      localStorage.removeItem('agent_token');
      localStorage.removeItem('agent_info');
      router.push('/agent/login');
  };

  if (!agent) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm">
            <div>
                <h1 className="text-xl font-bold text-gray-800">Agent Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome, {agent.name}</p>
            </div>
            <button onClick={handleLogout} className="px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50 rounded-lg transition">
                Logout
            </button>
        </div>

        {/* Submission Form */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-green-600 p-6 text-white">
                <h2 className="text-lg font-bold">Submit Vote Count</h2>
                <p className="text-green-100 text-sm">Update the latest figures for your polling center</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">

                {/* Location Details (Read Only for Agent usually, but editable for demo flexibility) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Division</label>
                        <input type="text" value={division} onChange={e => setDivision(e.target.value)} className="w-full p-2 border rounded bg-gray-50" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">District (Zilla)</label>
                        <input type="text" value={district} onChange={e => setDistrict(e.target.value)} className="w-full p-2 border rounded bg-gray-50" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Upazila</label>
                        <input type="text" value={upazila} onChange={e => setUpazila(e.target.value)} className="w-full p-2 border rounded bg-gray-50" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Seat Name</label>
                        <input type="text" value={seatName} onChange={e => setSeatName(e.target.value)} className="w-full p-2 border rounded bg-gray-50" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Polling Center ID</label>
                    <input type="text" value={pollingCenter} onChange={e => setPollingCenter(e.target.value)} className="w-full p-2 border rounded bg-yellow-50 font-mono text-sm" />
                </div>

                <div className="border-t border-gray-100 pt-6">
                    <h3 className="font-bold text-gray-800 mb-4">Vote Counts</h3>
                    <div className="space-y-4">
                        {Object.keys(counts).map((party) => (
                            <div key={party} className="flex items-center gap-4">
                                <label className="w-32 font-medium text-gray-700">{party}</label>
                                <input
                                    type="number"
                                    value={counts[party as keyof typeof counts]}
                                    onChange={(e) => setCounts({...counts, [party]: parseInt(e.target.value) || 0})}
                                    className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-lg font-bold text-gray-800"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Submitting...' : 'Submit Vote Data'}
                    </button>
                    {success && (
                        <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-center font-medium animate-in fade-in">
                            Data submitted successfully!
                        </div>
                    )}
                </div>

            </form>
        </div>

      </div>
    </div>
  );
}
