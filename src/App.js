import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";

const BOULDER_GRADES = ["VB","V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10","V11","V12","V13","V14","V15","V16"];
const ROUTE_GRADES = ["5.6","5.7","5.8","5.9","5.10a","5.10b","5.10c","5.10d","5.11a","5.11b","5.11c","5.11d","5.12a","5.12b","5.12c","5.12d","5.13a","5.13b","5.13c","5.13d","5.14a","5.14b","5.14c","5.14d"];
const BOULDER_SORT = Object.fromEntries(BOULDER_GRADES.map((g,i) => [g, i+1]));
const ROUTE_SORT   = Object.fromEntries(ROUTE_GRADES.map((g,i)  => [g, i+1]));
const ANGLES = ["Slab","Vert","Overhang","Roof"];
const STYLES = ["Crimps","Pinches","Pockets","Slopers","Compression","Dynos","Heel hook","Lockoff","Smear","Power Endurance","Endurance"];
const NOTE_WINDOW_MS = 7000;
const DOUBLE_TAP_MS  = 300;

const displayName = (log) => log.name || (log.is_gym ? "Plastic" : "unnamed");
const gradeSort = (grade, discipline) => discipline === "route" ? (ROUTE_SORT[grade]||0) : (BOULDER_SORT[grade]||0);

function GradeSlider({ grades, value, onChange }) {
  const [localIdx, setLocalIdx] = useState(Math.floor(grades.length / 2));
  const trackRef = useRef(null);
  const dragging = useRef(false);
  const localIdxRef = useRef(localIdx);
  useEffect(() => { if (!value) setLocalIdx(Math.floor(grades.length / 2)); }, [value, grades]);
  const getIdx = (clientX) => { const rect = trackRef.current.getBoundingClientRect(); return Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * (grades.length - 1)); };
  const onDown = (e) => { dragging.current = true; trackRef.current.setPointerCapture(e.pointerId); const i = getIdx(e.clientX); localIdxRef.current = i; setLocalIdx(i); onChange(grades[i]); };
  const onMove = (e) => { if (!dragging.current) return; const i = getIdx(e.clientX); if (i !== localIdxRef.current) { localIdxRef.current = i; setLocalIdx(i); onChange(grades[i]); } };
  const onUp = () => { dragging.current = false; };
  const di = value ? grades.indexOf(value) : localIdx;
  const pct = (di / (grades.length - 1)) * 100;
  return (
    <div style={{ padding:"0 24px", userSelect:"none" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <span style={{ fontSize:11, color:"#3a3a3a", letterSpacing:"0.1em" }}>{grades[0]}</span>
        <span style={{ fontSize:34, fontWeight:700, color: value ? "#f0ede8" : "#2e2e2e", transition:"color 0.12s" }}>{value || "—"}</span>
        <span style={{ fontSize:11, color:"#3a3a3a", letterSpacing:"0.1em" }}>{grades[grades.length-1]}</span>
      </div>
      <div ref={trackRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
        style={{ position:"relative", height:52, display:"flex", alignItems:"center", cursor:"pointer", touchAction:"none" }}>
        <div style={{ position:"absolute", left:0, right:0, height:2, background:"#1c1c1c", borderRadius:1 }} />
        <div style={{ position:"absolute", left:0, width:`${pct}%`, height:2, background:value?"#f0ede8":"#282828", borderRadius:1 }} />
        {grades.map((_,i) => (<div key={i} style={{ position:"absolute", left:`${(i/(grades.length-1))*100}%`, transform:"translateX(-50%)", width:i===di?2:1, height:i===di?12:5, background:i===di?"#f0ede8":"#252525", bottom:10, borderRadius:1 }} />))}
        <div style={{ position:"absolute", left:`${pct}%`, transform:"translateX(-50%)", width:26, height:26, borderRadius:"50%", background:value?"#f0ede8":"#1c1c1c", border:`2px solid ${value?"#f0ede8":"#2e2e2e"}`, boxShadow:value?"0 0 0 5px rgba(240,237,232,0.08)":"none", transition:"background 0.12s, border-color 0.12s" }} />
      </div>
    </div>
  );
}

function Chip({ label, selected, onToggle, accent }) {
  return (
    <button onClick={onToggle} style={{ padding:"7px 14px", borderRadius:20, fontSize:12, fontWeight:600, letterSpacing:"0.04em", cursor:"pointer", fontFamily:"'DM Mono',monospace", border:"none", transition:"all 0.12s", flexShrink:0, background: selected ? (accent || "#f0ede8") : "#1e1e1e", color: selected ? (accent ? "#fff" : "#0e0e0e") : "#484848" }}>{label}</button>
  );
}

function ZapOverlay({ active }) {
  if (!active) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:999, pointerEvents:"none", background:"rgba(255,220,50,0.12)", animation:"zap 0.35s ease-out forwards" }}>
      <style>{`@keyframes zap { 0%{opacity:0} 15%{opacity:1} 35%{opacity:0.6} 55%{opacity:1} 100%{opacity:0} }`}</style>
    </div>
  );
}

function SentButton({ disabled, onSent, onFirstGo }) {
  const lastTap = useRef(0);
  const tapTimer = useRef(null);
  const [armed, setArmed] = useState(false);
  const handlePress = () => {
    if (disabled) return;
    const now = Date.now(); const gap = now - lastTap.current; lastTap.current = now;
    if (gap < DOUBLE_TAP_MS && gap > 0) { clearTimeout(tapTimer.current); setArmed(false); onFirstGo(); }
    else { setArmed(true); tapTimer.current = setTimeout(() => { setArmed(false); onSent(); }, DOUBLE_TAP_MS); }
  };
  useEffect(() => () => clearTimeout(tapTimer.current), []);
  return (
    <button onClick={handlePress} style={{ ...S.outcomeBtn, background: armed ? "#7ecf82" : "#4caf50", color:"#fff", opacity: disabled ? 0.2 : 1, transform: armed ? "scale(0.97)" : "scale(1)", position:"relative", overflow:"hidden", transition:"background 0.1s, opacity 0.12s, transform 0.08s" }}>
      {armed ? "⚡ ?" : "SENT"}
      {armed && <span style={{ position:"absolute", bottom:6, left:0, right:0, fontSize:9, color:"rgba(255,255,255,0.6)", letterSpacing:"0.1em", textAlign:"center" }}>tap again for first go</span>}
    </button>
  );
}

// ── Location input with autocomplete ─────────────────────────────────────────
function LocationInput({ value, onChange, placeholder, pastLocations }) {
  const [open, setOpen] = useState(false);
  const matches = value.length > 0 ? pastLocations.filter(l => l.toLowerCase().includes(value.toLowerCase()) && l.toLowerCase() !== value.toLowerCase()) : [];
  return (
    <div style={{ position:"relative" }}>
      <input style={S.locationInput} placeholder={placeholder} value={value} autoFocus autoCapitalize="words"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <div style={S.suggestions}>
          {matches.map(loc => (
            <div key={loc} style={S.suggestionItem} onMouseDown={() => { onChange(loc); setOpen(false); }}>{loc}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detail Sheet — editable name, grade, delete ───────────────────────────────
function DetailSheet({ entry, discipline, onSave, onDismiss, onDelete, saving }) {
  const [name, setName]         = useState(entry.name || "");
  const [editingName, setEditingName] = useState(false);
  const [grade, setGrade]       = useState(entry.grade || "");
  const [editingGrade, setEditingGrade] = useState(false);
  const [note, setNote]         = useState(entry.note || "");
  const [angles, setAngles]     = useState(entry.angles || []);
  const [styles, setStyles]     = useState(entry.styles || []);
  const [firstGo, setFirstGo]   = useState(entry.first_go || false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const grades = discipline === "route" ? ROUTE_GRADES : BOULDER_GRADES;
  const toggleAngle = (a) => setAngles(p => p.includes(a) ? p.filter(x=>x!==a) : [...p,a]);
  const toggleStyle = (s) => setStyles(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s]);
  const isSent = entry.outcome === "sent";

  if (confirmDelete) return (
    <div style={S.overlay} onClick={() => setConfirmDelete(false)}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>
        <div style={S.sheetHandle} />
        <div style={{ textAlign:"center", padding:"12px 0 8px" }}>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>delete this climb?</div>
          <div style={{ fontSize:13, color:"#555", marginBottom:24 }}>{displayName(entry)} · {entry.grade}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <button style={S.btnSecondary} onClick={() => setConfirmDelete(false)}>cancel</button>
            <button style={{ ...S.btnPrimary, background:"#c0392b" }} onClick={onDelete}>delete</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.overlay} onClick={onDismiss}>
      <div style={{ ...S.sheet, position:"relative" }} onClick={e => e.stopPropagation()}>
        <div style={S.sheetHandle} />

        {/* Header row: outcome icon + editable name + editable grade */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
          <span style={{ color: isSent ? "#4caf50" : "#e07820", fontSize:16, flexShrink:0 }}>{isSent ? "✓" : "◎"}</span>

          <div style={{ flex:1, minWidth:0 }}>
            {editingName ? (
              <input autoFocus style={S.sheetNameInput}
                value={name} onChange={e => setName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={e => e.key==="Enter" && setEditingName(false)}
                placeholder={entry.is_gym ? "Plastic" : "climb name"}
              />
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={S.sheetTitle}>{name || (entry.is_gym ? "Plastic" : <em style={{color:"#555",fontStyle:"italic"}}>unnamed</em>)}</span>
                <button onClick={() => setEditingName(true)} style={S.iconBtn} title="edit name">✎</button>
              </div>
            )}
          </div>

          {editingGrade ? (
            <div style={{ position:"absolute", inset:0, background:"#131313", borderRadius:"16px 16px 0 0", padding:"20px 24px", zIndex:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:600, letterSpacing:"0.08em" }}>change grade</div>
                <button onClick={() => setEditingGrade(false)} style={{ background:"none", border:"none", color:"#555", fontSize:20, cursor:"pointer", fontFamily:"inherit" }}>✕</button>
              </div>
              <GradeSlider grades={grades} value={grade} onChange={setGrade} />
              <button style={{...S.btnPrimary, width:"100%", marginTop:20}} onClick={() => setEditingGrade(false)}>done</button>
            </div>
          ) : (
            <button onClick={() => setEditingGrade(true)} style={S.gradeEditBtn}>{grade}</button>
          )}
        </div>

        {isSent && (
          <div style={S.tagSection}>
            <div style={S.chipRow}><Chip label={firstGo ? "⚡ First go" : "⚡ First go?"} selected={firstGo} onToggle={() => setFirstGo(p=>!p)} accent="#a06010" /></div>
            <div style={{ fontSize:11, color:"#2a2a2a", marginTop:8 }}>{firstGo ? "tap to remove" : "tap to mark as first go"}</div>
          </div>
        )}

        <div style={S.tagSection}>
          <div style={S.tagLabel}>angle</div>
          <div style={S.chipRow}>{ANGLES.map(a => <Chip key={a} label={a} selected={angles.includes(a)} onToggle={() => toggleAngle(a)} />)}</div>
        </div>
        <div style={S.tagSection}>
          <div style={S.tagLabel}>style</div>
          <div style={S.chipRow}>{STYLES.map(s => <Chip key={s} label={s} selected={styles.includes(s)} onToggle={() => toggleStyle(s)} />)}</div>
        </div>
        <div style={S.tagSection}>
          <div style={S.tagLabel}>note</div>
          <textarea style={S.noteInput} placeholder="what clicked, what to try next..." value={note} onChange={e=>setNote(e.target.value)} rows={3} />
        </div>

        <div style={S.sheetBtns}>
          <button style={{ ...S.btnSecondary, color:"#c0392b", borderColor:"#2a1515" }} onClick={() => setConfirmDelete(true)}>delete</button>
          <button style={{ ...S.btnPrimary, flex:2, opacity: saving ? 0.6 : 1 }} onClick={() => onSave({ name: name.trim()||null, grade, note, angles, styles, first_go: firstGo })} disabled={saving}>
            {saving ? "saving..." : "save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LiveLogRow({ log, isNoteWindow, onTap }) {
  const [progress, setProgress] = useState(100);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  useEffect(() => {
    if (!isNoteWindow) { cancelAnimationFrame(rafRef.current); setProgress(0); return; }
    startRef.current = performance.now();
    const tick = (now) => { const pct = Math.max(0, 100 - ((now - startRef.current) / NOTE_WINDOW_MS) * 100); setProgress(pct); if (pct > 0) rafRef.current = requestAnimationFrame(tick); else setProgress(0); };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isNoteWindow]);
  const hasTags = log.angles?.length > 0 || log.styles?.length > 0;
  const hasAnything = hasTags || log.note || log.first_go;
  const showWindow = isNoteWindow && !hasAnything;
  const isSent = log.outcome === "sent";
  return (
    <div style={S.logRowWrap}>
      <div style={S.logRow} onClick={onTap}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:10, flex:1, minWidth:0 }}>
          {/* sent = solid green, project = amber outline circle */}
          <span style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, marginTop:5, display:"inline-block", background: isSent ? "#4caf50" : "transparent", border: isSent ? "none" : "2px solid #e07820" }} />
          <div style={{ minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={S.logName}>{displayName(log)}</span>
              {log.first_go && <span style={{ fontSize:12, color:"#c07820" }}>⚡</span>}
            </div>
            {log.note ? <div style={S.logMeta}>✎ {log.note.slice(0,42)}{log.note.length>42?"…":""}</div>
              : hasTags ? <div style={S.logMeta}>{[...(log.angles||[]),...(log.styles||[])].join(" · ")}</div>
              : showWindow ? <div style={S.addPromptActive}>+ add details · tap</div>
              : <div style={S.addPromptFaded}>+ add details</div>}
          </div>
        </div>
        <span style={S.logGrade}>{log.grade}</span>
      </div>
      {showWindow && <div style={{ height:2, background:"#181818", borderRadius:1 }}><div style={{ width:`${progress}%`, height:"100%", background:"#2e2e2e", borderRadius:1, transition:"width 0.08s linear" }} /></div>}
    </div>
  );
}

function LogDetailRow({ log, onTap }) {
  const hasTags = log.angles?.length > 0 || log.styles?.length > 0;
  const isSent = log.outcome === "sent";
  return (
    <div style={S.detailRow} onClick={onTap}>
      <div style={S.detailTop}>
        <span style={{ color: isSent ? "#4caf50" : "#e07820", fontSize:15, width:18, textAlign:"center", flexShrink:0 }}>{isSent ? "✓" : "◎"}</span>
        <span style={S.detailName}>{displayName(log)}{log.first_go && <span style={{ fontSize:10, color:"#a06010", marginLeft:6 }}>⚡</span>}</span>
        <span style={S.detailGrade}>{log.grade}</span>
      </div>
      {hasTags && <div style={S.tagPills}>{[...(log.angles||[]),...(log.styles||[])].map(t => <span key={t} style={S.pill}>{t}</span>)}</div>}
      {log.note ? <div style={S.noteChip}>✎ {log.note}</div> : null}
      {!hasTags && !log.note && !log.first_go && <div style={S.addChip}>+ add details</div>}
    </div>
  );
}

export default function App({ user, onSignOut }) {
  const [screen, setScreen] = useState("home");
  const [activeSession, setActiveSession] = useState(null);
  const [logs, setLogs] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [viewingSession, setViewingSession] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [pastLocations, setPastLocations] = useState([]);
  const [setupStep, setSetupStep] = useState(0);
  const [environment, setEnvironment] = useState(null);
  const [discipline, setDiscipline] = useState(null);
  const [location, setLocation] = useState("");
  const [climbName, setClimbName] = useState("");
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [justLogged, setJustLogged] = useState(null);
  const [noteWindowId, setNoteWindowId] = useState(null);
  const [sheetEntry, setSheetEntry] = useState(null);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [zapActive, setZapActive] = useState(false);
  const [hintSeen, setHintSeen] = useState(false);
  const noteTimerRef = useRef(null);

  const grades = discipline === "route" ? ROUTE_GRADES : BOULDER_GRADES;
  const isOutdoor = environment === "outdoor";
  const nameRequired = isOutdoor;
  const canLog = selectedGrade && (!nameRequired || climbName.trim());

  useEffect(() => { loadSessions(); }, []);

  const loadSessions = async () => {
    setLoadingSessions(true);
    const { data: sessions, error } = await supabase.from('sessions').select('*').order('started_at', { ascending: false });
    if (error) { console.error(error); setLoadingSessions(false); return; }
    const sessionsWithClimbs = await Promise.all(sessions.map(async (s) => {
      const { data: climbs } = await supabase.from('climbs').select('*').eq('session_id', s.id).order('logged_at', { ascending: false });
      return { ...s, logs: climbs || [] };
    }));
    setAllSessions(sessionsWithClimbs);
    setPastLocations([...new Set(sessionsWithClimbs.map(s => s.location).filter(Boolean))]);
    setLoadingSessions(false);
  };

  const createSession = async (loc, env, disc) => {
    const { data, error } = await supabase.from('sessions').insert({ user_id: user.id, location: loc, environment: env, discipline: disc }).select().single();
    if (error) { console.error(error); return null; }
    return data;
  };

  const finalizeSession = async (sessionId) => {
    await supabase.from('sessions').update({ ended_at: new Date().toISOString() }).eq('id', sessionId);
  };

  const saveClimbToDb = async (sessionId, climbData) => {
    const { data, error } = await supabase.from('climbs').insert({
      session_id: sessionId, user_id: user.id, name: climbData.name, grade: climbData.grade,
      grade_sort: gradeSort(climbData.grade, discipline), outcome: climbData.outcome,
      first_go: climbData.first_go, angles: climbData.angles, styles: climbData.styles,
      note: climbData.note, is_gym: environment === "gym",
    }).select().single();
    if (error) { console.error(error); return null; }
    return data;
  };

  const updateClimbInDb = async (climbId, updates) => {
    const { error } = await supabase.from('climbs').update(updates).eq('id', climbId);
    if (error) console.error(error);
  };

  const deleteClimbFromDb = async (climbId) => {
    await supabase.from('climbs').delete().eq('id', climbId);
  };

  const commitLog = async (outcome, firstGo = false) => {
    if (!canLog || !activeSession) return;
    const climbData = { name: climbName.trim()||null, grade: selectedGrade, outcome, first_go: firstGo, angles:[], styles:[], note:"", is_gym: environment==="gym" };
    const tempEntry = { id:`temp-${Date.now()}`, ...climbData, logged_at: new Date().toISOString() };
    setLogs(prev => [tempEntry,...prev]);
    setJustLogged(tempEntry);
    setClimbName(""); setSelectedGrade(null);
    setTimeout(() => setJustLogged(null), 1800);
    clearTimeout(noteTimerRef.current);
    setNoteWindowId(tempEntry.id);
    noteTimerRef.current = setTimeout(() => setNoteWindowId(null), NOTE_WINDOW_MS);
    const saved = await saveClimbToDb(activeSession.id, climbData);
    if (saved) { setLogs(prev => prev.map(l => l.id===tempEntry.id ? {...saved, is_gym: environment==="gym"} : l)); setNoteWindowId(saved.id); }
  };

  const handleSent = () => commitLog("sent", false);
  const handleFirstGo = () => { setZapActive(true); setTimeout(() => setZapActive(false), 400); commitLog("sent", true); setHintSeen(true); };
  const openSheet = (entry) => { clearTimeout(noteTimerRef.current); setNoteWindowId(null); setSheetEntry(entry); };

  const saveDetail = async ({ name, grade, note, angles, styles, first_go }) => {
    setSheetSaving(true);
    const disc = discipline || "boulder";
    const updates = { name: name||null, grade, grade_sort: gradeSort(grade, disc), note, angles, styles, first_go };
    const updateLog = l => l.id===sheetEntry.id ? {...l,...updates} : l;
    setLogs(prev => prev.map(updateLog));
    if (viewingSession) {
      const updated = {...viewingSession, logs: viewingSession.logs.map(updateLog)};
      setViewingSession(updated);
      setAllSessions(prev => prev.map(s => s.id===viewingSession.id ? updated : s));
    }
    if (!String(sheetEntry.id).startsWith('temp-')) await updateClimbInDb(sheetEntry.id, updates);
    setSheetSaving(false); setSheetEntry(null);
  };

  const deleteClimb = async () => {
    const id = sheetEntry.id;
    setSheetEntry(null);
    setLogs(prev => prev.filter(l => l.id !== id));
    if (viewingSession) {
      const updated = {...viewingSession, logs: viewingSession.logs.filter(l => l.id !== id)};
      setViewingSession(updated);
      setAllSessions(prev => prev.map(s => s.id===viewingSession.id ? updated : s));
    }
    if (!String(id).startsWith('temp-')) await deleteClimbFromDb(id);
  };

  const startSetup = () => { setSetupStep(0); setEnvironment(null); setDiscipline(null); setLocation(""); setScreen("setup"); };
  const pick = (c) => { if (setupStep===0){setEnvironment(c);setSetupStep(1);}else{setDiscipline(c);setSetupStep(2);} };

  const startSession = async () => {
    const loc = location.trim()||"Unknown";
    const saved = await createSession(loc, environment, discipline);
    if (!saved) return;
    setActiveSession({...saved, startTime: saved.started_at});
    setLogs([]); setClimbName(""); setSelectedGrade(null); setNoteWindowId(null);
    setScreen("logging");
  };

  const endSession = async () => {
    clearTimeout(noteTimerRef.current); setNoteWindowId(null);
    await finalizeSession(activeSession.id);
    const done = {...activeSession, logs, ended_at: new Date().toISOString()};
    setAllSessions(prev => [done,...prev.filter(s => s.id!==activeSession.id)]);
    setViewingSession(done); setScreen("summary");
  };

  const sends   = logs.filter(l => l.outcome==="sent");
  const flashes = logs.filter(l => l.first_go===true);
  const Sheet = () => sheetEntry ? <DetailSheet entry={sheetEntry} discipline={discipline||"boulder"} onSave={saveDetail} onDismiss={() => setSheetEntry(null)} onDelete={deleteClimb} saving={sheetSaving} /> : null;

  // HOME
  if (screen==="home") return (
    <div style={S.app}><Sheet />
      <div style={S.homeContainer}>
        <div style={S.homeTop}><div style={S.logo}>SUMMIT</div><div style={S.tagline}>your climbing registry</div></div>
        {loadingSessions ? <div style={S.emptyState}><div style={{color:"#333",fontSize:12,letterSpacing:"0.1em"}}>loading...</div></div>
        : allSessions.length > 0 ? (
          <div style={S.sessionList}>
            <div style={S.sectionLabel}>sessions</div>
            {allSessions.map(s => (
              <div key={s.id} style={S.sessionCard} onClick={() => {setViewingSession(s);setScreen("sessionDetail");}}>
                <div><div style={S.sessionCardLocation}>{s.location}</div><div style={S.sessionCardMeta}>{s.discipline} · {(s.logs||[]).filter(l=>l.outcome==="sent").length} sends · {(s.logs||[]).length} climbs</div></div>
                <div style={{display:"flex",alignItems:"center",gap:10}}><div style={S.sessionCardDate}>{new Date(s.started_at).toLocaleDateString([],{month:"short",day:"numeric"})}</div><span style={{color:"#2a2a2a",fontSize:18}}>›</span></div>
              </div>
            ))}
          </div>
        ) : <div style={S.emptyState}><div style={S.emptyIcon}>⬡</div><div style={S.emptyText}>no sessions yet</div></div>}
        <div style={{marginTop:"auto",paddingTop:24}}>
          <button style={S.startBtn} onClick={startSetup}>START SESSION</button>
          <button style={S.signOutBtn} onClick={onSignOut}>sign out</button>
        </div>
      </div>
    </div>
  );

  // SESSION DETAIL
  if (screen==="sessionDetail" && viewingSession) {
    const s = viewingSession;
    const sf = (s.logs||[]).filter(l=>l.first_go===true);
    return (
      <div style={S.app}><Sheet />
        <div style={S.pageContainer}>
          <button style={S.backBtn} onClick={() => {setViewingSession(null);setScreen("home");}}>←</button>
          <div style={S.pageTitle}>{s.location}</div>
          <div style={S.pageSubtitle}>{new Date(s.started_at).toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"})}</div>
          <div style={S.statsRow}>
            <div style={S.statBox}><div style={S.statNum}>{(s.logs||[]).length}</div><div style={S.statLabel}>climbs</div></div>
            <div style={S.statBox}><div style={S.statNum}>{(s.logs||[]).filter(l=>l.outcome==="sent").length}</div><div style={S.statLabel}>sends</div></div>
            <div style={S.statBox}><div style={S.statNum}>{sf.length}</div><div style={S.statLabel}>⚡ first go</div></div>
          </div>
          <div style={S.sectionLabel}>climbs</div>
          {(s.logs||[]).map(l => <LogDetailRow key={l.id} log={l} onTap={() => openSheet(l)} />)}
        </div>
      </div>
    );
  }

  // SETUP
  if (screen==="setup") return (
    <div style={S.app}>
      <div style={S.pageContainer}>
        <button style={S.backBtn} onClick={() => setupStep===0?setScreen("home"):setSetupStep(s=>s-1)}>←</button>
        {setupStep===0 && <><div style={S.setupQ}>where are you?</div><div style={S.setupGrid}><button style={S.setupBtn} onClick={() => pick("outdoor")}><span style={S.setupIcon}>⛰</span>Outdoor</button><button style={S.setupBtn} onClick={() => pick("gym")}><span style={S.setupIcon}>🏟</span>Gym</button></div></>}
        {setupStep===1 && <><div style={S.setupQ}>what are you climbing?</div><div style={S.setupGrid}><button style={S.setupBtn} onClick={() => pick("boulder")}><span style={S.setupIcon}>◈</span>Boulder</button><button style={S.setupBtn} onClick={() => pick("route")}><span style={S.setupIcon}>↑</span>Route</button></div></>}
        {setupStep===2 && <>
          <div style={S.setupQ}>{environment==="gym"?"which gym?":"where at?"}</div>
          <LocationInput value={location} onChange={setLocation} placeholder={environment==="gym"?"e.g. Movement RiNo":"e.g. Red Rock Canyon"} pastLocations={pastLocations} />
          <button style={{...S.startBtn,marginTop:32,opacity:location.trim()?1:0.35}} onClick={location.trim()?startSession:undefined}>LET'S CLIMB</button>
        </>}
      </div>
    </div>
  );

  // LOGGING
  if (screen==="logging") return (
    <div style={S.app}>
      <ZapOverlay active={zapActive} /><Sheet />
      {!hintSeen && logs.length===0 && <div style={S.hint}>double tap SENT for a first go ⚡</div>}
      {justLogged && (
        <div style={{...S.flash, background:justLogged.first_go?"#fff8e0":justLogged.outcome==="sent"?"#c8f5c8":"#1e1e1e", color:justLogged.first_go?"#a06010":justLogged.outcome==="sent"?"#1a5c1a":"#777", border:justLogged.outcome==="project"?"1px solid #2a2a2a":"none"}}>
          {justLogged.first_go?"⚡ first go!":justLogged.outcome==="sent"?"✓ sent":"◎ project"} {justLogged.grade}
        </div>
      )}
      <div style={S.sessionHeader}>
        <div><div style={S.sessionLocation}>{activeSession?.location}</div><div style={S.sessionMeta}>{logs.length} logged · {sends.length} sends{flashes.length>0?` · ${flashes.length} ⚡`:""}</div></div>
        <button style={S.endBtn} onClick={endSession}>END</button>
      </div>

      <div style={S.nameSection}>
        <input
          style={{ ...S.nameInput, borderBottomColor: isOutdoor ? (climbName.trim() ? "#3a3a3a" : "#2a2020") : "#1e1e1e" }}
          placeholder={isOutdoor ? "climb name (required)" : "climb name (optional)"}
          value={climbName}
          onChange={e => setClimbName(e.target.value)}
        />
        {isOutdoor && !climbName.trim() && selectedGrade && (
          <div style={{ fontSize:10, color:"#5a3030", letterSpacing:"0.08em", marginTop:5 }}>add a name to log</div>
        )}
      </div>

      <div style={S.gradeSection}>
        <div style={S.gradeLabel}>grade</div>
        <GradeSlider grades={grades} value={selectedGrade} onChange={setSelectedGrade} />
      </div>

      <div style={S.outcomeSection}>
        <SentButton disabled={!canLog} onSent={handleSent} onFirstGo={handleFirstGo} />
        <button
          style={{ ...S.outcomeBtn, background:"#150f00", color: canLog ? "#e07820" : "#3a2a10", border:`1px solid ${canLog?"#3a2010":"#1e1608"}`, transition:"all 0.12s" }}
          onClick={() => canLog && commitLog("project")}
        >PROJECT</button>
      </div>

      {logs.length > 0 && (
        <div style={S.recentLogs}>
          {logs.slice(0,6).map(l => <LiveLogRow key={l.id} log={l} isNoteWindow={noteWindowId===l.id} onTap={() => openSheet(l)} />)}
        </div>
      )}
    </div>
  );

  // SUMMARY
  if (screen==="summary" && viewingSession) {
    const vs = viewingSession;
    const vSends   = vs.logs.filter(l=>l.outcome==="sent");
    const vFlashes = vs.logs.filter(l=>l.first_go===true);
    return (
      <div style={S.app}><Sheet />
        <div style={S.pageContainer}>
          <div style={{fontSize:44,color:"#4caf50",marginBottom:14}}>✓</div>
          <div style={S.pageTitle}>{vs.location}</div>
          <div style={S.pageSubtitle}>{new Date(vs.started_at||vs.startTime).toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"})}</div>
          <div style={S.statsRow}>
            <div style={S.statBox}><div style={S.statNum}>{vs.logs.length}</div><div style={S.statLabel}>climbs</div></div>
            <div style={S.statBox}><div style={S.statNum}>{vSends.length}</div><div style={S.statLabel}>sends</div></div>
            <div style={S.statBox}><div style={S.statNum}>{vFlashes.length}</div><div style={S.statLabel}>⚡ first go</div></div>
          </div>
          <div style={S.sectionLabel}>climbs</div>
          {vs.logs.map(l => <LogDetailRow key={l.id} log={l} onTap={() => openSheet(l)} />)}
          <button style={{...S.startBtn,marginTop:32}} onClick={() => {setViewingSession(null);setScreen("home");loadSessions();}}>DONE</button>
        </div>
      </div>
    );
  }
}

const S = {
  app:{ fontFamily:"'DM Mono','Courier New',monospace", background:"#0e0e0e", minHeight:"100vh", color:"#f0ede8", maxWidth:390, margin:"0 auto", position:"relative", overflowX:"hidden" },
  homeContainer:{ padding:"56px 24px 40px", display:"flex", flexDirection:"column", minHeight:"100vh" },
  homeTop:{ marginBottom:48 },
  logo:{ fontSize:40, fontWeight:700, letterSpacing:"0.15em" },
  tagline:{ fontSize:12, color:"#444", letterSpacing:"0.08em", marginTop:4 },
  emptyState:{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, color:"#2a2a2a" },
  emptyIcon:{ fontSize:52 }, emptyText:{ fontSize:13, letterSpacing:"0.12em" },
  sectionLabel:{ fontSize:10, color:"#333", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:4, paddingTop:4 },
  sessionList:{ flex:1, marginBottom:16, overflowY:"auto" },
  sessionCard:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 0", borderBottom:"1px solid #161616", cursor:"pointer" },
  sessionCardLocation:{ fontSize:16, fontWeight:600 }, sessionCardMeta:{ fontSize:12, color:"#555", marginTop:3 }, sessionCardDate:{ fontSize:12, color:"#404040" },
  startBtn:{ width:"100%", padding:20, background:"#f0ede8", color:"#0e0e0e", border:"none", borderRadius:4, fontSize:14, fontWeight:700, letterSpacing:"0.15em", cursor:"pointer", fontFamily:"'DM Mono',monospace", display:"block" },
  signOutBtn:{ width:"100%", padding:10, background:"transparent", color:"#2a2a2a", border:"none", fontSize:11, cursor:"pointer", fontFamily:"'DM Mono',monospace", letterSpacing:"0.1em", marginTop:8 },
  pageContainer:{ padding:"52px 24px 48px", minHeight:"100vh", display:"flex", flexDirection:"column" },
  backBtn:{ background:"none", border:"none", color:"#444", fontSize:22, cursor:"pointer", padding:0, marginBottom:40, fontFamily:"'DM Mono',monospace", alignSelf:"flex-start" },
  pageTitle:{ fontSize:26, fontWeight:700, letterSpacing:"0.04em", marginBottom:4 },
  pageSubtitle:{ fontSize:12, color:"#484848", letterSpacing:"0.05em", marginBottom:28 },
  statsRow:{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:2, marginBottom:28 },
  statBox:{ background:"#141414", padding:"18px 12px", textAlign:"center", borderRadius:4 },
  statNum:{ fontSize:30, fontWeight:700 }, statLabel:{ fontSize:10, color:"#484848", letterSpacing:"0.08em", marginTop:3, textTransform:"uppercase" },
  detailRow:{ borderBottom:"1px solid #131313", paddingBottom:10, marginBottom:2, cursor:"pointer" },
  detailTop:{ display:"flex", alignItems:"center", gap:12, paddingTop:10 },
  detailName:{ flex:1, color:"#bbb", fontSize:14 }, detailGrade:{ fontSize:12, color:"#484848", fontWeight:600 },
  tagPills:{ display:"flex", flexWrap:"wrap", gap:6, marginLeft:30, marginTop:6 },
  pill:{ fontSize:10, color:"#555", background:"#181818", padding:"3px 8px", borderRadius:10, letterSpacing:"0.04em" },
  noteChip:{ marginLeft:30, marginTop:5, fontSize:12, color:"#555", lineHeight:1.5 },
  addChip:{ marginLeft:30, marginTop:5, fontSize:11, color:"#252525", letterSpacing:"0.06em" },
  setupQ:{ fontSize:26, fontWeight:600, marginBottom:36, lineHeight:1.3 },
  setupGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  setupBtn:{ background:"#141414", border:"1px solid #222", borderRadius:8, padding:"28px 16px", color:"#f0ede8", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"'DM Mono',monospace", letterSpacing:"0.05em", display:"flex", flexDirection:"column", alignItems:"center", gap:14 },
  setupIcon:{ fontSize:30 },
  locationInput:{ width:"100%", background:"#141414", border:"1px solid #222", borderRadius:4, padding:16, color:"#f0ede8", fontSize:16, fontFamily:"'DM Mono',monospace", outline:"none", boxSizing:"border-box" },
  suggestions:{ position:"absolute", top:"100%", left:0, right:0, background:"#161616", border:"1px solid #222", borderTop:"none", borderRadius:"0 0 4px 4px", zIndex:10 },
  suggestionItem:{ padding:"12px 16px", fontSize:14, color:"#bbb", cursor:"pointer", borderBottom:"1px solid #1e1e1e" },
  hint:{ position:"fixed", top:0, left:"50%", transform:"translateX(-50%)", padding:"10px 20px", background:"#1a1a1a", border:"1px solid #2a2a2a", borderTop:"none", borderRadius:"0 0 8px 8px", fontSize:11, color:"#555", letterSpacing:"0.06em", zIndex:50, maxWidth:390, width:"100%", textAlign:"center", fontFamily:"'DM Mono',monospace" },
  flash:{ position:"fixed", top:0, left:"50%", transform:"translateX(-50%)", padding:"11px 24px", borderRadius:"0 0 8px 8px", fontSize:13, fontWeight:600, letterSpacing:"0.06em", zIndex:100, fontFamily:"'DM Mono',monospace", maxWidth:390, width:"100%", textAlign:"center" },
  sessionHeader:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"18px 24px 14px", borderBottom:"1px solid #161616" },
  sessionLocation:{ fontSize:17, fontWeight:700, letterSpacing:"0.04em" }, sessionMeta:{ fontSize:12, color:"#444", marginTop:3 },
  endBtn:{ background:"none", border:"1px solid #222", color:"#555", padding:"7px 14px", borderRadius:4, fontSize:11, fontWeight:700, letterSpacing:"0.12em", cursor:"pointer", fontFamily:"'DM Mono',monospace", flexShrink:0 },
  nameSection:{ padding:"22px 24px 0" },
  nameInput:{ width:"100%", background:"transparent", border:"none", borderBottom:"1px solid #1e1e1e", padding:"0 0 12px", color:"#f0ede8", fontSize:21, fontFamily:"'DM Mono',monospace", outline:"none", boxSizing:"border-box", caretColor:"#f0ede8" },
  gradeSection:{ padding:"24px 0 0" },
  gradeLabel:{ fontSize:10, color:"#333", letterSpacing:"0.2em", marginBottom:12, textTransform:"uppercase", paddingLeft:24 },
  outcomeSection:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"22px 24px 0" },
  outcomeBtn:{ padding:"20px 16px", border:"none", borderRadius:6, fontSize:14, fontWeight:700, letterSpacing:"0.12em", cursor:"pointer", fontFamily:"'DM Mono',monospace", transition:"opacity 0.12s" },
  recentLogs:{ padding:"18px 24px 0" },
  logRowWrap:{ borderBottom:"1px solid #131313" },
  logRow:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"9px 0 7px", cursor:"pointer" },
  logName:{ fontSize:13, color:"#bbb" }, logMeta:{ fontSize:11, color:"#484848", marginTop:2 },
  addPromptActive:{ fontSize:11, color:"#3a6a3a", marginTop:2, letterSpacing:"0.05em" },
  addPromptFaded:{ fontSize:11, color:"#222", marginTop:2, letterSpacing:"0.05em" },
  logGrade:{ fontSize:12, color:"#484848", fontWeight:600, flexShrink:0, marginLeft:8 },
  overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", display:"flex", alignItems:"flex-end", zIndex:200 },
  sheet:{ background:"#131313", borderTop:"1px solid #222", borderRadius:"16px 16px 0 0", padding:"20px 24px 48px", width:"100%", maxWidth:390, margin:"0 auto", boxSizing:"border-box", maxHeight:"88vh", overflowY:"auto" },
  sheetHandle:{ width:36, height:3, background:"#2a2a2a", borderRadius:2, margin:"0 auto 20px" },
  sheetTitle:{ fontSize:18, fontWeight:700 },
  sheetNameInput:{ width:"100%", background:"transparent", border:"none", borderBottom:"1px solid #3a3a3a", color:"#f0ede8", fontSize:18, fontWeight:700, fontFamily:"'DM Mono',monospace", outline:"none", padding:"0 0 4px", caretColor:"#f0ede8", boxSizing:"border-box" },
  gradeEditBtn:{ fontSize:13, color:"#888", fontWeight:600, background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:4, padding:"4px 10px", cursor:"pointer", fontFamily:"'DM Mono',monospace", flexShrink:0, whiteSpace:"nowrap" },
  iconBtn:{ background:"none", border:"none", color:"#333", fontSize:13, cursor:"pointer", padding:"0 4px", fontFamily:"'DM Mono',monospace", flexShrink:0 },
  tagSection:{ marginTop:20 }, tagLabel:{ fontSize:10, color:"#383838", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:10 },
  chipRow:{ display:"flex", flexWrap:"wrap", gap:8 },
  noteInput:{ width:"100%", background:"#1a1a1a", border:"1px solid #252525", borderRadius:4, padding:"12px 14px", color:"#f0ede8", fontSize:13, fontFamily:"'DM Mono',monospace", outline:"none", resize:"none", boxSizing:"border-box", lineHeight:1.7, marginTop:4 },
  sheetBtns:{ display:"flex", gap:10, marginTop:20 },
  btnSecondary:{ flex:1, padding:14, background:"transparent", border:"1px solid #222", borderRadius:4, color:"#484848", fontSize:12, fontWeight:600, letterSpacing:"0.1em", cursor:"pointer", fontFamily:"'DM Mono',monospace" },
  btnPrimary:{ flex:2, padding:14, background:"#f0ede8", border:"none", borderRadius:4, color:"#0e0e0e", fontSize:12, fontWeight:700, letterSpacing:"0.1em", cursor:"pointer", fontFamily:"'DM Mono',monospace" },
};
