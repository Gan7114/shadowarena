
import React, { useMemo, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GlitchText } from './GlitchText';

export const ShadowFighter: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fighterUrl = useMemo(() => {
    const configuredUrl = import.meta.env.VITE_SHADOW_FIGHTER_URL?.trim();
    return configuredUrl && configuredUrl.length > 0 ? configuredUrl : '';
  }, []);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <button
          onClick={() => navigate('/')}
          className="text-xl text-gray-400 uppercase tracking-widest hover:text-white transition-colors text-left"
        >
          {'<'} Return_To_Arena
        </button>

        {fighterUrl ? (
          <a
            href={fighterUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-cyber-yellow text-cyber-yellow uppercase tracking-wider hover:bg-cyber-yellow hover:text-black transition-colors"
          >
            <ExternalLink size={16} />
            Open_Standalone
          </a>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-gray-700 text-gray-500 uppercase tracking-wider">
            Shadowfighter_URL_Not_Set
          </div>
        )}
      </div>

      <header className="space-y-2">
        <h1 className="text-5xl md:text-6xl text-cyber-yellow tracking-widest uppercase">
          <GlitchText text="SHADOW FIGHTER" speed={24} />
        </h1>
        <p className="text-xl text-gray-400 uppercase tracking-wide">
          Live feed from the Shadowfighter server endpoint.
        </p>
      </header>

      <div className="relative border-4 border-cyber-yellow bg-black min-h-[72vh]">
        {!fighterUrl && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center z-20">
            <div className="space-y-3">
              <p className="text-cyber-yellow text-2xl uppercase">Shadowfighter endpoint is not configured.</p>
              <p className="text-gray-400 text-lg">
                Set <code>VITE_SHADOW_FIGHTER_URL</code> to your deployed Shadowfighter URL.
              </p>
            </div>
          </div>
        )}

        {loading && fighterUrl && (
          <div className="absolute inset-0 flex items-center justify-center gap-3 text-cyber-yellow bg-black/90 z-10">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-xl uppercase tracking-wider">Booting_Shadowfighter</span>
          </div>
        )}

        {hasError && fighterUrl && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center z-20">
            <div className="space-y-3">
              <p className="text-cyber-red text-2xl uppercase">Failed to load Shadowfighter.</p>
              <p className="text-gray-400 text-lg">
                Start the Shadowfighter server and retry, or open it in a new tab.
              </p>
            </div>
          </div>
        )}

        {fighterUrl && (
          <iframe
            title="Shadowfighter Game"
            src={fighterUrl}
            className="w-full h-[72vh] bg-black"
            onLoad={() => {
              setLoading(false);
              setHasError(false);
            }}
            onError={() => {
              setLoading(false);
              setHasError(true);
            }}
          />
        )}
      </div>
    </section>
  );
};
