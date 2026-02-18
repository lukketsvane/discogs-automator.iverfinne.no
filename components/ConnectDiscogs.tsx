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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md animate-fade-in sheet-overlay" onClick={onClose}>
      <div
        className="w-full bg-[#0a0a0a] border-t border-[#1a1a1a] rounded-t-2xl overflow-hidden animate-sheet-up shadow-2xl sheet-content"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={swipe.onTouchStart}
        onTouchMove={swipe.onTouchMove}
        onTouchEnd={swipe.onTouchEnd}
      >

        {/* Drag handle */}
        <div className="flex justify-center pt-2.5">
          <div className="w-9 h-1 bg-[#333] rounded-full" />
        </div>

        <div className="px-5 pb-8 pt-4">

          {/* ─── Intro Step ─── */}
          {step === 'intro' && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center space-y-2.5">
                <div className="w-14 h-14 rounded-xl bg-white/5 border border-[#222] flex items-center justify-center mx-auto">
                  <svg viewBox="0 0 100 100" className="w-7 h-7">
                    <circle cx="50" cy="50" r="48" fill="none" stroke="#666" strokeWidth="2"/>
                    <circle cx="50" cy="50" r="20" fill="none" stroke="#666" strokeWidth="2"/>
                    <circle cx="50" cy="50" r="6" fill="#666"/>
                    <circle cx="50" cy="50" r="35" fill="none" stroke="#333" strokeWidth="1" strokeDasharray="4 4"/>
                  </svg>
                </div>
                <h2 className="text-[18px] font-semibold text-white">Connect Discogs</h2>
                <p className="text-[13px] text-[#888] leading-relaxed max-w-xs mx-auto">
                  Link your Discogs account to manage your collection directly.
                </p>
              </div>

              <div className="space-y-2 text-[13px]">
                {['Generate a Personal Access Token', 'Paste the token here', 'Manage your collection'].map((text, i) => (
                  <div key={i} className="flex gap-2.5 items-start p-2.5 rounded-lg bg-white/[0.02] border border-[#1a1a1a]">
                    <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] text-[#888] font-mono">{i + 1}</span>
                    </div>
                    <p className="text-[#aaa]">{text}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  onClick={() => setStep('token')}
                  className="w-full py-3 bg-white text-black font-medium text-[14px] rounded-xl press-scale flex items-center justify-center gap-2"
                >
                  Get Started <ArrowRight size={15} />
                </button>
                <button
                  onClick={onSkip}
                  className="w-full py-2.5 text-[#666] font-medium text-[13px] rounded-xl"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* ─── Token Input Step ─── */}
          {step === 'token' && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center space-y-1.5">
                <h2 className="text-[16px] font-semibold text-white">Enter your token</h2>
                <p className="text-[13px] text-[#888]">From Discogs Developer Settings</p>
              </div>

              <a
                href="https://www.discogs.com/settings/developers"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-[#1a1a1a] group"
              >
                <span className="text-[13px] text-[#aaa] group-active:text-white transition-colors">
                  discogs.com/settings/developers
                </span>
                <ExternalLink size={13} className="text-[#666]" />
              </a>

              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyToken()}
                placeholder="Paste your personal access token..."
                autoFocus
                className="w-full bg-black border border-[#222] rounded-xl px-3.5 py-3 text-[13px] text-white placeholder-[#444] focus:outline-none focus:border-[#555] transition-colors font-mono"
              />

              <div className="space-y-2.5">
                <button
                  onClick={verifyToken}
                  disabled={!token.trim()}
                  className="w-full py-3 bg-white text-black font-medium text-[14px] rounded-xl disabled:opacity-30 transition-all press-scale"
                >
                  Verify & Connect
                </button>
                <button
                  onClick={() => setStep('intro')}
                  className="w-full py-2 text-[#666] text-[13px]"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* ─── Verifying Step ─── */}
          {step === 'verifying' && (
            <div className="space-y-5 animate-fade-in py-8">
              <div className="text-center space-y-3">
                <Loader2 size={28} className="mx-auto animate-spin text-[#888]" />
                <div>
                  <p className="text-[14px] text-white font-medium">Verifying token...</p>
                  <p className="text-[12px] text-[#666] mt-0.5">Connecting to Discogs</p>
                </div>
              </div>
            </div>
          )}

          {/* ─── Success Step ─── */}
          {step === 'success' && profile && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center space-y-3">
                <div className="relative mx-auto w-fit">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.username} className="w-16 h-16 rounded-full border-2 border-[#222]" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#111] border-2 border-[#222] flex items-center justify-center">
                      <User size={24} className="text-[#555]" />
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#0a0a0a]">
                    <CheckCircle2 size={12} className="text-white" />
                  </div>
                </div>

                <div>
                  <h2 className="text-[16px] font-semibold text-white">Connected!</h2>
                  <p className="text-[13px] text-[#888]">@{profile.username}</p>
                </div>

                <div className="flex justify-center gap-6 text-[13px]">
                  <div className="text-center">
                    <div className="text-white font-semibold">{profile.num_collection}</div>
                    <div className="text-[#666] text-[11px]">Collection</div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-semibold">{profile.num_wantlist}</div>
                    <div className="text-[#666] text-[11px]">Wantlist</div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleComplete}
                className="w-full py-3 bg-white text-black font-medium text-[14px] rounded-xl press-scale"
              >
                Continue
              </button>
            </div>
          )}

          {/* ─── Error Step ─── */}
          {step === 'error' && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-red-950/30 flex items-center justify-center mx-auto">
                  <AlertCircle size={22} className="text-red-400" />
                </div>
                <h2 className="text-[16px] font-semibold text-white">Connection failed</h2>
                <p className="text-[13px] text-[#888]">{error}</p>
                <p className="text-[11px] text-[#555]">Make sure you copied the full token.</p>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={() => { setStep('token'); setError(''); }}
                  className="w-full py-3 bg-white text-black font-medium text-[14px] rounded-xl press-scale"
                >
                  Try Again
                </button>
                <button
                  onClick={onSkip}
                  className="w-full py-2 text-[#666] text-[13px]"
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
