export default function SummitLoader() {
  const DOT_COLORS = ["#4caf50", "#4a9fd4", "#2ab0a0"];
  return (
    <div style={{
      fontFamily:"'DM Mono','Courier New',monospace",
      background:"#0e0e0e", minHeight:"100vh",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      maxWidth:390, margin:"0 auto"
    }}>
      <style>{`
        @keyframes dotPulse { 0%,80%,100%{opacity:0.2;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }
        @keyframes catBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      `}</style>

      <div style={{ fontSize:11, color:"#555", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:20 }}>loading</div>

      {/* Cat SVG — looking down at hands with colored dots */}
      <svg width="200" height="270" viewBox="0 0 200 270" fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation:"catBob 2.4s ease-in-out infinite" }}>

        {/* Baggy shorts */}
        <rect x="52" y="168" width="96" height="56" rx="8" fill="#2a2a2a" stroke="#3a3a3a" strokeWidth="1.5"/>
        <line x1="100" y1="168" x2="100" y2="224" stroke="#3a3a3a" strokeWidth="1.5"/>
        <rect x="52" y="220" width="38" height="22" rx="6" fill="#222" stroke="#3a3a3a" strokeWidth="1.5"/>
        <rect x="110" y="220" width="38" height="22" rx="6" fill="#222" stroke="#3a3a3a" strokeWidth="1.5"/>

        {/* Tall tee */}
        <rect x="44" y="110" width="112" height="72" rx="6" fill="#1e1e1e" stroke="#333" strokeWidth="1.5"/>
        <rect x="20" y="110" width="30" height="34" rx="6" fill="#1e1e1e" stroke="#333" strokeWidth="1.5"/>
        <rect x="150" y="110" width="30" height="34" rx="6" fill="#1e1e1e" stroke="#333" strokeWidth="1.5"/>
        <rect x="44" y="168" width="112" height="14" rx="4" fill="#1a1a1a" stroke="#333" strokeWidth="1.5"/>
        <text x="100" y="152" textAnchor="middle" fontSize="10" fill="#333"
          fontFamily="'DM Mono',monospace" letterSpacing="0.15em">SUMMIT</text>

        {/* Arms bent down — looking at hands */}
        {/* Left arm bent toward center-low */}
        <path d="M44 128 Q28 150 38 172" stroke="#2c2a28" strokeWidth="14" strokeLinecap="round" fill="none"/>
        <path d="M44 128 Q28 150 38 172" stroke="#333" strokeWidth="10" strokeLinecap="round" fill="none"/>
        {/* Right arm bent toward center-low */}
        <path d="M156 128 Q172 150 162 172" stroke="#2c2a28" strokeWidth="14" strokeLinecap="round" fill="none"/>
        <path d="M156 128 Q172 150 162 172" stroke="#333" strokeWidth="10" strokeLinecap="round" fill="none"/>

        {/* Left hand / paw cupped */}
        <ellipse cx="38" cy="176" rx="12" ry="9" fill="#2c2a28" stroke="#3a3836" strokeWidth="1.5"/>
        {/* Right hand / paw cupped */}
        <ellipse cx="162" cy="176" rx="12" ry="9" fill="#2c2a28" stroke="#3a3836" strokeWidth="1.5"/>

        {/* Colored loading dots IN the hands */}
        {DOT_COLORS.map((color, i) => (
          <circle key={i}
            cx={38 + (i - 1) * 7}
            cy={174}
            r={3}
            fill={color}
            style={{ animation:`dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
        {/* Right hand dots mirrored */}
        {DOT_COLORS.map((color, i) => (
          <circle key={`r${i}`}
            cx={162 + (i - 1) * 7}
            cy={174}
            r={3}
            fill={color}
            style={{ animation:`dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}

        {/* Neck */}
        <rect x="86" y="96" width="28" height="20" rx="6" fill="#2c2a28" stroke="#3a3836" strokeWidth="1"/>

        {/* Head — tilted forward (looking down) */}
        <ellipse cx="100" cy="74" rx="40" ry="38" fill="#2c2a28" stroke="#3a3836" strokeWidth="1.5"/>

        {/* Forehead wrinkles */}
        <path d="M82 56 Q100 52 118 56" stroke="#3a3836" strokeWidth="1" fill="none"/>
        <path d="M86 62 Q100 59 114 62" stroke="#3a3836" strokeWidth="1" fill="none"/>

        {/* Big ears */}
        <polygon points="64,48 52,20 82,40" fill="#2c2a28" stroke="#3a3836" strokeWidth="1.5"/>
        <polygon points="136,48 148,20 118,40" fill="#2c2a28" stroke="#3a3836" strokeWidth="1.5"/>
        <polygon points="67,46 58,26 80,42" fill="#1e1616"/>
        <polygon points="133,46 142,26 120,42" fill="#1e1616"/>

        {/* Eyes — looking DOWN (pupils shifted down) */}
        <ellipse cx="84" cy="72" rx="9" ry="10" fill="#1a1a1a" stroke="#555" strokeWidth="1"/>
        <ellipse cx="116" cy="72" rx="9" ry="10" fill="#1a1a1a" stroke="#555" strokeWidth="1"/>
        <ellipse cx="84" cy="76" rx="5" ry="6" fill="#f0ede8"/>
        <ellipse cx="116" cy="76" rx="5" ry="6" fill="#f0ede8"/>
        <ellipse cx="84" cy="77" rx="3" ry="4" fill="#111"/>
        <ellipse cx="116" cy="77" rx="3" ry="4" fill="#111"/>
        <circle cx="86" cy="75" r="1" fill="#fff"/>
        <circle cx="118" cy="75" r="1" fill="#fff"/>

        {/* Nose */}
        <ellipse cx="100" cy="84" rx="5" ry="3" fill="#e08080" opacity="0.7"/>

        {/* Whiskers */}
        <line x1="60" y1="82" x2="88" y2="84" stroke="#555" strokeWidth="1"/>
        <line x1="60" y1="87" x2="88" y2="86" stroke="#555" strokeWidth="1"/>
        <line x1="112" y1="84" x2="140" y2="82" stroke="#555" strokeWidth="1"/>
        <line x1="112" y1="86" x2="140" y2="87" stroke="#555" strokeWidth="1"/>

        {/* Mouth */}
        <path d="M96 90 Q100 94 104 90" stroke="#555" strokeWidth="1" fill="none"/>

        {/* Tail curling around side */}
        <path d="M148 200 Q175 215 178 192 Q182 170 160 167" stroke="#3a3836" strokeWidth="8" fill="none" strokeLinecap="round"/>
        <path d="M148 200 Q175 215 178 192 Q182 170 160 167" stroke="#2c2a28" strokeWidth="5" fill="none" strokeLinecap="round"/>
      </svg>
    </div>
  );
}
