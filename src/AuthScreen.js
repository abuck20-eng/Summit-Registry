import { useState } from 'react';
import { supabase } from './supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    if (!email.trim()) return;
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(), options: { emailRedirectTo: window.location.origin }
    });
    if (error) { setError(error.message); setLoading(false); }
    else { setSent(true); setLoading(false); }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: window.location.origin }
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  return (
    <div style={S.app}>
      <div style={S.container}>
        <div style={S.logo}>SUMMIT</div>
        <div style={S.tagline}>your climbing registry</div>

        {sent ? (
          <div style={S.sentBox}>
            <div style={S.sentIcon}>✉</div>
            <div style={S.sentTitle}>check your email</div>
            <div style={S.sentSub}>we sent a magic link to {email}</div>
            <div style={S.sentSub2}>tap it to sign in — no password needed</div>
            <button style={S.resendBtn} onClick={() => setSent(false)}>use a different email</button>
          </div>
        ) : (
          <>
            <div style={S.sectionLabel}>sign in with Google</div>
            <button style={{ ...S.googleBtn, opacity: googleLoading ? 0.6 : 1 }} onClick={handleGoogle} disabled={googleLoading}>
              <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink:0 }}>
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.8-2 13.3-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.3C9.7 35.7 16.3 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.2 5.2C37.1 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
              </svg>
              {googleLoading ? 'signing in...' : 'continue with Google'}
            </button>

            <div style={S.divider}><div style={S.dividerLine}/><span style={{ color:"#aaa", fontSize:12, letterSpacing:"0.1em", flexShrink:0 }}>or</span><div style={S.dividerLine}/></div>

            <div style={S.sectionLabel}>enter your email to use magic link</div>
            <input style={S.input} type="email" placeholder="your@email.com" value={email}
              onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && handleLogin()}
              autoCapitalize="none" />
            {error && <div style={S.error}>{error}</div>}
            <button style={{ ...S.btn, opacity: email.trim() && !loading ? 1 : 0.4 }} onClick={handleLogin} disabled={!email.trim() || loading}>
              {loading ? 'sending...' : 'send magic link'}
            </button>
            <div style={S.note}>no password · no app store · tap the link to sign in</div>
          </>
        )}
      </div>
    </div>
  );
}

const S = {
  app: { fontFamily:"'DM Mono','Courier New',monospace", background:"#0e0e0e", minHeight:"100vh", color:"#f0ede8", maxWidth:390, margin:"0 auto", display:"flex", alignItems:"center" },
  container: { padding:"0 24px", width:"100%", boxSizing:"border-box" },
  logo: { fontSize:40, fontWeight:700, letterSpacing:"0.15em", marginBottom:6 },
  tagline: { fontSize:16, color:"#ddd", letterSpacing:"0.08em", marginBottom:48 },
  sectionLabel: { fontSize:12, color:"#ccc", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:12 },
  googleBtn: { width:"100%", padding:"14px 20px", background:"#f0ede8", color:"#0e0e0e", border:"none", borderRadius:4, fontSize:15, fontWeight:700, letterSpacing:"0.08em", cursor:"pointer", fontFamily:"'DM Mono',monospace", marginBottom:24, display:"flex", alignItems:"center", justifyContent:"center", gap:12, boxSizing:"border-box" },
  divider: { display:"flex", alignItems:"center", gap:12, marginBottom:24 },
  dividerLine: { flex:1, height:1, background:"#2a2a2a" },
  input: { width:"100%", background:"#141414", border:"1px solid #333", borderRadius:4, padding:16, color:"#f0ede8", fontSize:16, fontFamily:"'DM Mono',monospace", outline:"none", boxSizing:"border-box", marginBottom:12 },
  error: { fontSize:13, color:"#e05555", marginBottom:12, letterSpacing:"0.04em" },
  btn: { width:"100%", padding:16, background:"transparent", color:"#f0ede8", border:"1px solid #444", borderRadius:4, fontSize:14, fontWeight:700, letterSpacing:"0.15em", cursor:"pointer", fontFamily:"'DM Mono',monospace", marginBottom:16, boxSizing:"border-box" },
  note: { fontSize:13, color:"#aaa", textAlign:"center", letterSpacing:"0.04em", lineHeight:1.6 },
  sentBox: { display:"flex", flexDirection:"column", alignItems:"center", gap:10, textAlign:"center" },
  sentIcon: { fontSize:48, marginBottom:8 },
  sentTitle: { fontSize:22, fontWeight:700, letterSpacing:"0.04em" },
  sentSub: { fontSize:15, color:"#ddd" },
  sentSub2: { fontSize:13, color:"#aaa", marginBottom:8 },
  resendBtn: { background:"none", border:"none", color:"#aaa", fontSize:13, cursor:"pointer", fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em", textDecoration:"underline", marginTop:8 },
};
