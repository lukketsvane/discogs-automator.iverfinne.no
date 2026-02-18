import React, { useState } from 'react';
import { ExternalLink, ArrowRight, CheckCircle2, X, Loader2, User, AlertCircle } from 'lucide-react';
import { DiscogsProfile } from '../types';
import { useSwipeDown } from '../hooks/useSwipe';

interface ConnectDiscogsProps {
  onConnect: (token: string, profile: DiscogsProfile) => void;
  onSkip: () => void;
  onClose: () => void;
}

const ConnectDiscogs: React.FC<ConnectDiscogsProps> = ({ onConnect, onSkip, onClose }) => {
  const [step, setStep] = useState<'intro' | 'token' | 'verifying' | 'success' | 'error'>('intro');
  const [token, setToken] = useState('');
  const [profile, setProfile] = useState<DiscogsProfile | null>(null);
  const [error, setError] = useState('');
  const swipe = useSwipeDown(onClose);

  const verifyToken = async () => {
    if (!token.trim()) return;
    setStep('verifying');
    setError('');

    try {
      const identityRes = await fetch('https://api.discogs.com/oauth/identity', {
        headers: {
          'Authorization': `Discogs token=${token.trim()}`,
          'User-Agent': 'discogs.iverfinne.no/1.0',
        },
      });

      if (!identityRes.ok) throw new Error('Invalid token');

      const identity = await identityRes.json();

      const profileRes = await fetch(`https://api.discogs.com/users/${identity.username}`, {
        headers: {
          'Authorization': `Discogs token=${token.trim()}`,
          'User-Agent': 'discogs.iverfinne.no/1.0',
        },
      });

      if (!profileRes.ok) throw new Error('Could not fetch profile');

      const profileData = await profileRes.json();
      setProfile(profileData);
      setStep('success');
    } catch (e: any) {
      setError(e.message || 'Verification failed');
      setStep('error');
    }
  };

  const handleComplete = () => {
    if (profile) {
      onConnect(token.trim(), profile);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in sheet-overlay" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#0a0a0a] border border-[#1a1a1a] sm:rounded-2xl rounded-t-2xl overflow-hidden animate-sheet-up shadow-2xl sheet-content"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={swipe.onTouchStart}
        onTouchMove={swipe.onTouchMove}
        onTouchEnd={swipe.onTouchEnd}
      >

        {/* Drag handle */}
        <div className="flex items-center justify-between px-5 pt-3 pb-0">
          <div className="w-10 h-1 bg-[#333] rounded-full mx-auto sm:hidden" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-[#666] hover:text-white transition-colors p-1 hidden sm:block"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-8 pt-4">

          {/* ─── Intro Step ─── */}
          {step === 'intro' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-[#222] flex items-center justify-center mx-auto">
                  <svg viewBox="0 0 100 100" className="w-8 h-8">
                    <circle cx="50" cy="50" r="48" fill="none" stroke="#666" strokeWidth="2"/>
                    <circle cx="50" cy="50" r="20" fill="none" stroke="#666" strokeWidth="2"/>
                    <circle cx="50" cy="50" r="6" fill="#666"/>
                    <circle cx="50" cy="50" r="35" fill="none" stroke="#333" strokeWidth="1" strokeDasharray="4 4"/>
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white">Connect Discogs</h2>
                <p className="text-sm text-[#888] leading-relaxed max-w-xs mx-auto">
                  Link your Discogs account to add identified records directly to your collection.
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex gap-3 items-start p-3 rounded-lg bg-white/[0.02] border border-[#1a1a1a]">
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs text-[#888] font-mono">1</span>
                  </div>
                  <p className="text-[#aaa]">Generate a Personal Access Token from your Discogs account settings</p>
                </div>
                <div className="flex gap-3 items-start p-3 rounded-lg bg-white/[0.02] border border-[#1a1a1a]">
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs text-[#888] font-mono">2</span>
                  </div>
                  <p className="text-[#aaa]">Paste the token here to connect your account</p>
                </div>
                <div className="flex gap-3 items-start p-3 rounded-lg bg-white/[0.02] border border-[#1a1a1a]">
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs text-[#888] font-mono">3</span>
                  </div>
                  <p className="text-[#aaa]">Add records to your collection and wantlist directly</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => setStep('token')}
                  className="w-full py-3 bg-white text-black font-medium text-sm rounded-xl hover:bg-[#e0e0e0] transition-colors press-scale flex items-center justify-center gap-2"
                >
                  Get Started <ArrowRight size={16} />
                </button>
                <button
                  onClick={onSkip}
                  className="w-full py-3 text-[#666] font-medium text-sm rounded-xl hover:text-[#999] transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* ─── Token Input Step ─── */}
          {step === 'token' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold text-white">Enter your token</h2>
                <p className="text-sm text-[#888]">
                  Generate one at Discogs Developer Settings
                </p>
              </div>

              <a
                href="https://www.discogs.com/settings/developers"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-[#1a1a1a] hover:border-[#333] transition-colors group"
              >
                <span className="text-sm text-[#aaa] group-hover:text-white transition-colors">
                  discogs.com/settings/developers
                </span>
                <ExternalLink size={14} className="text-[#666]" />
              </a>

              <div className="space-y-2">
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && verifyToken()}
                  placeholder="Paste your personal access token..."
                  autoFocus
                  className="w-full bg-black border border-[#222] rounded-xl px-4 py-3 text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#555] transition-colors font-mono"
                />
              </div>

              <div className="space-y-3">
                <button
                  onClick={verifyToken}
                  disabled={!token.trim()}
                  className="w-full py-3 bg-white text-black font-medium text-sm rounded-xl hover:bg-[#e0e0e0] disabled:opacity-30 disabled:cursor-not-allowed transition-all press-scale flex items-center justify-center gap-2"
                >
                  Verify & Connect
                </button>
                <button
                  onClick={() => setStep('intro')}
                  className="w-full py-2 text-[#666] text-sm hover:text-[#999] transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* ─── Verifying Step ─── */}
          {step === 'verifying' && (
            <div className="space-y-6 animate-fade-in py-8">
              <div className="text-center space-y-4">
                <Loader2 size={32} className="mx-auto animate-spin text-[#888]" />
                <div>
                  <p className="text-sm text-white font-medium">Verifying token...</p>
                  <p className="text-xs text-[#666] mt-1">Connecting to Discogs API</p>
                </div>
              </div>
            </div>
          )}

          {/* ─── Success Step ─── */}
          {step === 'success' && profile && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-4">
                <div className="relative mx-auto w-fit">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="w-20 h-20 rounded-full border-2 border-[#222]"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#111] border-2 border-[#222] flex items-center justify-center">
                      <User size={32} className="text-[#555]" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#0a0a0a]">
                    <CheckCircle2 size={14} className="text-white" />
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-white">Connected!</h2>
                  <p className="text-sm text-[#888]">@{profile.username}</p>
                </div>

                <div className="flex justify-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="text-white font-semibold">{profile.num_collection}</div>
                    <div className="text-[#666] text-xs">Collection</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-semibold">{profile.num_wantlist}</div>
                    <div className="text-[#666] text-xs">Wantlist</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleComplete}
                className="w-full py-3 bg-white text-black font-medium text-sm rounded-xl hover:bg-[#e0e0e0] transition-colors press-scale"
              >
                Continue
              </button>
            </div>
          )}

          {/* ─── Error Step ─── */}
          {step === 'error' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-red-950/30 flex items-center justify-center mx-auto">
                  <AlertCircle size={24} className="text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Connection failed</h2>
                <p className="text-sm text-[#888]">{error}</p>
                <p className="text-xs text-[#555]">Make sure you copied the full token from Discogs.</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => { setStep('token'); setError(''); }}
                  className="w-full py-3 bg-white text-black font-medium text-sm rounded-xl hover:bg-[#e0e0e0] transition-colors press-scale"
                >
                  Try Again
                </button>
                <button
                  onClick={onSkip}
                  className="w-full py-2 text-[#666] text-sm hover:text-[#999] transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectDiscogs;
