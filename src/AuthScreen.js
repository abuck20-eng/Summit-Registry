import { useState } from 'react';
import { supabase } from './supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
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
            <div style={S.sentSub}>we sent a link to {email}</div>
            <div style={S.sentSub2}>tap it to sign in — no password needed</div>
            <button style={S.resendBtn} onClick={() => setSent(false)}>use a different email</button>
          </div>
        ) : (
          <>
            <div style={S.prompt}>enter your email to get started</div>
            <input
              style={S.input}
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
              autoCapitalize="none"
            />
            {error && <div style={S.error}>{error}</div>}
            <button
              style={{ ...S.btn, opacity: email.trim() && !loading ? 1 : 0.35 }}
              onClick={handleLogin}
              disabled={!email.trim() || loading}
            >
              {loading ? 'sending...' : 'send link'}
            </button>
            <div style={S.note}>no password · no app store · just tap the link</div>
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
  tagline: { fontSize:12, color:"#444", letterSpacing:"0.08em", marginBottom:56 },
  prompt: { fontSize:16, color:"#888", marginBottom:20, letterSpacing:"0.02em" },
  input: { width:"100%", background:"#141414", border:"1px solid #222", borderRadius:4, padding:16, color:"#f0ede8", fontSize:16, fontFamily:"'DM Mono',monospace", outline:"none", boxSizing:"border-box", marginBottom:12 },
  error: { fontSize:12, color:"#e05555", marginBottom:12, letterSpacing:"0.04em" },
  btn: { width:"100%", padding:20, background:"#f0ede8", color:"#0e0e0e", border:"none", borderRadius:4, fontSize:14, fontWeight:700, letterSpacing:"0.15em", cursor:"pointer", fontFamily:"'DM Mono',monospace", marginBottom:16 },
  note: { fontSize:11, color:"#333", textAlign:"center", letterSpacing:"0.06em" },
  sentBox: { display:"flex", flexDirection:"column", alignItems:"center", gap:10, textAlign:"center" },
  sentIcon: { fontSize:48, marginBottom:8 },
  sentTitle: { fontSize:22, fontWeight:700, letterSpacing:"0.04em" },
  sentSub: { fontSize:14, color:"#888" },
  sentSub2: { fontSize:12, color:"#555", marginBottom:8 },
  resendBtn: { background:"none", border:"none", color:"#444", fontSize:12, cursor:"pointer", fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em", textDecoration:"underline", marginTop:8 },
};
