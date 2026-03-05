import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { supabase } from './supabase';
import App from './App';
import AuthScreen from './AuthScreen';

function SplashCat() {
  return (
    <div style={{ fontFamily:"'DM Mono','Courier New',monospace", background:"#0e0e0e", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      <svg width="200" height="260" viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Baggy shorts */}
        <rect x="52" y="168" width="96" height="56" rx="8" fill="#2a2a2a" stroke="#3a3a3a" strokeWidth="1.5"/>
        <line x1="100" y1="168" x2="100" y2="224" stroke="#3a3a3a" strokeWidth="1.5"/>
        <rect x="52" y="220" width="38" height="22" rx="6" fill="#222" stroke="#3a3a3a" strokeWidth="1.5"/>
        <rect x="110" y="220" width="38" height="22" rx="6" fill="#222" stroke="#3a3a3a" strokeWidth="1.5"/>

        {/* Tall tee — oversized, long */}
        <rect x="44" y="110" width="112" height="72" rx="6" fill="#1e1e1e" stroke="#333" strokeWidth="1.5"/>
        {/* sleeves */}
        <rect x="20" y="110" width="30" height="34" rx="6" fill="#1e1e1e" stroke="#333" strokeWidth="1.5"/>
        <rect x="150" y="110" width="30" height="34" rx="6" fill="#1e1e1e" stroke="#333" strokeWidth="1.5"/>
        {/* tee hem drop */}
        <rect x="44" y="168" width="112" height="14" rx="4" fill="#1a1a1a" stroke="#333" strokeWidth="1.5"/>
        {/* subtle logo on tee */}
        <text x="100" y="152" textAnchor="middle" fontSize="10" fill="#333" fontFamily="'DM Mono',monospace" letterSpacing="0.15em">SUMMIT</text>

        {/* Neck */}
        <rect x="86" y="96" width="28" height="20" rx="6" fill="#2c2a28" stroke="#3a3836" strokeWidth="1"/>

        {/* Head — sphinx cat, tilted back slightly (looking up) */}
        <ellipse cx="100" cy="72" rx="40" ry="38" fill="#2c2a28" stroke="#3a3836" strokeWidth="1.5"/>

        {/* Wrinkle lines on forehead */}
        <path d="M82 54 Q100 50 118 54" stroke="#3a3836" strokeWidth="1" fill="none"/>
        <path d="M86 60 Q100 57 114 60" stroke="#3a3836" strokeWidth="1" fill="none"/>

        {/* Big ears */}
        <polygon points="64,46 52,18 82,38" fill="#2c2a28" stroke="#3a3836" strokeWidth="1.5"/>
        <polygon points="136,46 148,18 118,38" fill="#2c2a28" stroke="#3a3836" strokeWidth="1.5"/>
        {/* inner ear */}
        <polygon points="67,44 58,24 80,40" fill="#1e1616"/>
        <polygon points="133,44 142,24 120,40" fill="#1e1616"/>

        {/* Eyes — looking upward (pupils shifted up) */}
        <ellipse cx="84" cy="68" rx="9" ry="10" fill="#1a1a1a" stroke="#555" strokeWidth="1"/>
        <ellipse cx="116" cy="68" rx="9" ry="10" fill="#1a1a1a" stroke="#555" strokeWidth="1"/>
        {/* pupils up */}
        <ellipse cx="84" cy="64" rx="5" ry="6" fill="#f0ede8"/>
        <ellipse cx="116" cy="64" rx="5" ry="6" fill="#f0ede8"/>
        <ellipse cx="84" cy="63" rx="3" ry="4" fill="#111"/>
        <ellipse cx="116" cy="63" rx="3" ry="4" fill="#111"/>
        {/* eye shine */}
        <circle cx="86" cy="61" r="1" fill="#fff"/>
        <circle cx="118" cy="61" r="1" fill="#fff"/>

        {/* Nose */}
        <ellipse cx="100" cy="80" rx="5" ry="3" fill="#e08080" opacity="0.7"/>

        {/* Whiskers */}
        <line x1="60" y1="78" x2="88" y2="80" stroke="#555" strokeWidth="1"/>
        <line x1="60" y1="83" x2="88" y2="82" stroke="#555" strokeWidth="1"/>
        <line x1="112" y1="80" x2="140" y2="78" stroke="#555" strokeWidth="1"/>
        <line x1="112" y1="82" x2="140" y2="83" stroke="#555" strokeWidth="1"/>

        {/* Mouth */}
        <path d="M96 86 Q100 90 104 86" stroke="#555" strokeWidth="1" fill="none"/>

        {/* Tail curling around */}
        <path d="M148 200 Q175 210 178 190 Q182 168 160 165" stroke="#3a3836" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <path d="M148 200 Q175 210 178 190 Q182 168 160 165" stroke="#2c2a28" strokeWidth="5" fill="none" strokeLinecap="round"/>
      </svg>

      <div style={{ fontSize:22, fontWeight:700, letterSpacing:"0.15em", color:"#f0ede8", marginTop:8 }}>look up</div>
      <div style={{ fontSize:12, color:"#444", letterSpacing:"0.1em", marginTop:6 }}>loading...</div>
    </div>
  );
}

function Root() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) return <SplashCat />;

  return user
    ? <App user={user} onSignOut={handleSignOut} />
    : <AuthScreen />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><Root /></React.StrictMode>);
