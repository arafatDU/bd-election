'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AgentLogin() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (res.ok) {
        setStep('otp');
      } else {
        alert('Failed to send OTP');
      }
    } catch (err) {
      alert('Error sending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();

      if (data.success) {
        // Store agent info (insecurely in localStorage for demo)
        localStorage.setItem('agent_token', data.token);
        localStorage.setItem('agent_info', JSON.stringify(data.agent));
        router.push('/agent/dashboard');
      } else {
        alert('Invalid OTP');
      }
    } catch (err) {
      alert('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 font-bold text-xl">
            BD
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Agent Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Secure Login for Election Agents</p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-70"
            >
              {loading ? 'Sending...' : 'Send Passcode'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in slide-in-from-right-8 duration-300">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter Passcode</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="XXXX"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all tracking-widest text-center text-xl"
                required
              />
              <p className="text-xs text-gray-500 mt-2 text-center">Check the console for the OTP (Dev Mode)</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-70"
            >
              {loading ? 'Verifying...' : 'Login'}
            </button>
            <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-gray-500 text-sm py-2 hover:text-gray-800"
            >
                Back to Phone Number
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <Link href="/" className="text-sm text-green-600 font-medium hover:underline">Back to Map</Link>
        </div>
      </div>
    </div>
  );
}
