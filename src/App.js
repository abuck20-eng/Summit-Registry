import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabase";

const BOULDER_GRADES = ["VB","V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10","V11","V12","V13","V14","V15","V16"];
const ROUTE_GRADES = ["5.6","5.7","5.8","5.9","5.10a","5.10b","5.10c","5.10d","5.11a","5.11b","5.11c","5.11d","5.12a","5.12b","5.12c","5.12d","5.13a","5.13b","5.13c","5.13d","5.14a","5.14b","5.14c","5.14d"];
const BOULDER_SORT = Object.fromEntries(BOULDER_GRADES.map((g,i) => [g, i+1]));
const ROUTE_SORT   = Object.fromEntries(ROUTE_GRADES.map((g,i) => [g, i+1]));
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
        <span style={{ fontSize:11, color:"#888", letterSpacing:"0.1em" }}>{grades[0]}</span>
        <span style={{ fontSize:34, fontWeight:700, color: value ? "#f0ede8" : "#555", transition:"color 0.12s" }}>{value || "—"}</span>
        <span style={{ fontSize:11, color:"#888", letterSpacing:"0.1em" }}>{grades[grades.length-1]}</span>
      </div>
      <div ref={trackRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
        style={{ position:"relative", height:52, display:"flex", alignItems:"center", cursor:"pointer", touchAction:"none" }}>
        <div style={{ position:"absolute", left:0, right:0, height:2, background:"#1c1c1c", borderRadius:1 }} />
        <div style={{ position:"absolute", left:0, width:`${pct}%`, height:2, background:value?"#f0ede8":"#2a2a2a", borderRadius:1 }} />
        {grades.map((_,i) => (<div key={i} style={{ position:"absolute", left:`${(i/(grades.length-1))*100}%`, transform:"translateX(-50%)", width:i===di?2:1, height:i===di?12:5, background:i===di?"#f0ede8":"#252525", bottom:10, borderRadius:1 }} />))}
        <div style={{ position:"absolute", left:`${pct}%`, transform:"translateX(-50%)", width:26, height:26, borderRadius:"50%", background:value?"#f0ede8":"#1c1c1c", border:`2px solid ${value?"#f0ede8":"#333"}`, boxShadow:value?"0 0 0 5px rgba(240,237,232,0.08)":"none", transition:"background 0.12s, border-color 0.12s" }} />
      </div>
    </div>
  );
}

function Chip({ label, selected, onToggle, accent }) {
  return (
    <button onClick={onToggle} style={{ padding:"7px 14px", borderRadius:20, fontSize:12, fontWeight:600, letterSpacing:"0.04em", cursor:"pointer", fontFamily:"'DM Mono',monospace", border:"none", transition:"all 0.12s", flexShrink:0, background: selected ? (accent || "#f0ede8") : "#1e1e1e", color: selected ? (accent ? "#fff" : "#0e0e0e") : "#888" }}>{label}</button>
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
    <button onClick={handlePress} style={{ ...S.outcomeBtn, background: armed ? "#7ecf82" : "#4caf50", color:"#fff", opacity: disabled ? 0.25 : 1, transform: armed ? "scale(0.97)" : "scale(1)", position:"relative", overflow:"hidden", transition:"background 0.1s, opacity 0.12s, transform 0.08s" }}>
      {armed ? "⚡ ?" : "SENT"}
      {armed && <span style={{ position:"absolute", bottom:6, left:0, right:0, fontSize:9, color:"rgba(255,255,255,0.6)", letterSpacing:"0.1em", textAlign:"center" }}>tap again for first go</span>}
    </button>
  );
}

function LocationInput({ value, onChange, placeholder, pastLocations }) {
  const [open, setOpen] = useState(false);
  const suggestions = value.length > 0
    ? pastLocations.filter(l => l.toLowerCase().includes(value.toLowerCase()) && l.toLowerCase() !== value.toLowerCase())
    : pastLocations.slice(0, 3);
  return (
    <div style={{ position:"relative" }}>
      <input style={S.locationInput} placeholder={placeholder} value={value} autoFocus autoCapitalize="words"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && suggestions.length > 0 && (
        <div style={S.suggestions}>
          {suggestions.map(loc => (
            <div key={loc} style={S.suggestionItem} onMouseDown={() => { onChange(loc); setOpen(false); }}>{loc}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailSheet({ entry, discipline, onSave, onDismiss, onDelete, saving }) {
  const [name, setName]         = useState(entry.name || "");
  const [editingName, setEditingName] = useState(false);
  const [grade, setGrade]       = useState(entry.grade || "");
  const [editingGrade, setEditingGrade] = useState(false);
  const [outcome, setOutcome]   = useState(entry.outcome || "sent");
  const [note, setNote]         = useState(entry.note || "");
  const [angles, setAngles]     = useState(entry.angles || []);
  const [styles, setStyles]     = useState(entry.styles || []);
  const [firstGo, setFirstGo]   = useState(entry.first_go || false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const grades = discipline === "route" ? ROUTE_GRADES : BOULDER_GRADES;
  const toggleAngle = (a) => setAngles(p => p.includes(a) ? p.filter(x=>x!==a) : [...p,a]);
  const toggleStyle = (s) => setStyles(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s]);

  if (confirmDelete) return (
    <div style={S.overlay} onClick={() => setConfirmDelete(false)}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>
        <div style={S.sheetHandle} />
        <div style={{ textAlign:"center", padding:"12px 0 8px" }}>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>delete this climb?</div>
          <div style={{ fontSize:13, color:"#666", marginBottom:24 }}>{displayName(entry)} · {entry.grade}</div>
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
        {/* Outcome toggle */}
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          {["sent","project","repeat"].map(o => (
            <button key={o} onClick={() => setOutcome(o)} style={{
              flex:1, padding:"10px 4px", borderRadius:6, fontSize:11, fontWeight:700, letterSpacing:"0.08em",
              cursor:"pointer", fontFamily:"'DM Mono',monospace", transition:"all 0.12s",
              background: outcome===o ? (o==="sent"?"#4caf50":o==="project"?"#1a1208":"#0a1a2a") : "#161616",
              color: outcome===o ? (o==="sent"?"#fff":o==="project"?"#e07820":"#4a9fd4") : "#444",
              border: outcome===o ? (o==="sent"?"1px solid #4caf50":o==="project"?"1px solid #3a2010":"1px solid #1a4a6a") : "1px solid #1e1e1e",
            }}>{o.toUpperCase()}</button>
          ))}
        </div>

        {/* Name row — pencil right next to the name */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
          <div style={{ flex:1, minWidth:0 }}>
            {editingName ? (
              <input autoFocus style={S.sheetNameInput} value={name} onChange={e => setName(e.target.value)}
                onBlur={() => setEditingName(false)} onKeyDown={e => e.key==="Enter" && setEditingName(false)}
                placeholder={entry.is_gym ? "Plastic" : "climb name"} />
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <span style={S.sheetTitle}>{name || (entry.is_gym ? "Plastic" : <em style={{color:"#555",fontStyle:"italic"}}>unnamed</em>)}</span>
                <button onClick={() => setEditingName(true)} style={{ background:"none", border:"none", color:"#555", fontSize:14, cursor:"pointer", padding:"0 2px", fontFamily:"'DM Mono',monospace", lineHeight:1 }}>✎</button>
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

        {outcome === "sent" && (
          <div style={S.tagSection}>
            <div style={S.chipRow}><Chip label={firstGo ? "⚡ First go" : "⚡ First go?"} selected={firstGo} onToggle={() => setFirstGo(p=>!p)} accent="#a06010" /></div>
            <div style={{ fontSize:11, color:"#333", marginTop:8 }}>{firstGo ? "tap to remove" : "tap to mark as first go"}</div>
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
          <button style={{ ...S.btnPrimary, flex:2, opacity: saving ? 0.6 : 1 }} onClick={() => onSave({ name: name.trim()||null, grade, outcome, note, angles, styles, first_go: outcome==="sent" ? firstGo : false })} disabled={saving}>
            {saving ? "saving..." : "save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Live Log Row — bright add details, pulsing new entry ──────────────────────
function LiveLogRow({ log, isNoteWindow, onTap, isNew }) {
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
  const isRepeat = log.outcome === "repeat";

  return (
    <div style={{ ...S.logRowWrap, animation: isNew ? "pulseRow 0.5s ease-out" : "none" }}>
      <style>{`@keyframes pulseRow { 0%{background:#1a2a1a} 100%{background:transparent} }`}</style>
      <div style={S.logRow} onClick={onTap}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:10, flex:1, minWidth:0 }}>
          <span style={{ width:9, height:9, borderRadius:"50%", flexShrink:0, marginTop:5, display:"inline-block",
            background: isSent ? "#4caf50" : "transparent",
            border: isSent ? "none" : isRepeat ? "2px solid #4a9fd4" : "2px solid #e07820" }} />
          <div style={{ minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={S.logName}>{displayName(log)}</span>
              {log.first_go && <span style={{ fontSize:12, color:"#c07820" }}>⚡</span>}
            </div>
            {log.note
              ? <div style={S.logMeta}>✎ {log.note.slice(0,42)}{log.note.length>42?"…":""}</div>
              : hasTags
                ? <div style={S.logMeta}>{[...(log.angles||[]),...(log.styles||[])].join(" · ")}</div>
                : showWindow
                  ? <div style={S.addPromptActive}>+ add details</div>
                  : <div style={S.addPromptFaded}>+ add details</div>
            }
          </div>
        </div>
        <span style={S.logGrade}>{log.grade}</span>
      </div>
      {/* Progress bar — bright and obvious when window is open */}
      {showWindow && (
        <div style={{ height:3, background:"#1a1a1a", borderRadius:2, margin:"0 0 2px" }}>
          <div style={{ width:`${progress}%`, height:"100%", background:"#4caf50", borderRadius:2, transition:"width 0.08s linear", opacity:0.7 }} />
        </div>
      )}
    </div>
  );
}

function LogDetailRow({ log, onTap }) {
  const hasTags = log.angles?.length > 0 || log.styles?.length > 0;
  const isSent = log.outcome === "sent";
  const isRepeat = log.outcome === "repeat";
  const outcomeColor = isSent ? "#4caf50" : isRepeat ? "#4a9fd4" : "#e07820";
  const outcomeIcon = isSent ? "✓" : isRepeat ? "↺" : "◎";
  return (
    <div style={S.detailRow} onClick={onTap}>
      <div style={S.detailTop}>
        <span style={{ color: outcomeColor, fontSize:15, width:18, textAlign:"center", flexShrink:0 }}>{outcomeIcon}</span>
        <span style={S.detailName}>{displayName(log)}{log.first_go && <span style={{ fontSize:10, color:"#a06010", marginLeft:6 }}>⚡</span>}</span>
        <span style={S.detailGrade}>{log.grade}</span>
      </div>
      {hasTags && <div style={S.tagPills}>{[...(log.angles||[]),...(log.styles||[])].map(t => <span key={t} style={S.pill}>{t}</span>)}</div>}
      {log.note ? <div style={S.noteChip}>✎ {log.note}</div> : null}
      {!hasTags && !log.note && !log.first_go && <div style={S.addChipDetail}>+ add details</div>}
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
  const [gymLocations, setGymLocations] = useState([]);
  const [outdoorLocations, setOutdoorLocations] = useState([]);
  const [setupStep, setSetupStep] = useState(0);
  const [environment, setEnvironment] = useState(null);
  const [discipline, setDiscipline] = useState(null);
  const [location, setLocation] = useState("");
  const [climbName, setClimbName] = useState("");
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [justLoggedId, setJustLoggedId] = useState(null);
  const [justLogged, setJustLogged] = useState(null);
  const [noteWindowId, setNoteWindowId] = useState(null);
  const [sheetEntry, setSheetEntry] = useState(null);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [zapActive, setZapActive] = useState(false);
  const [deleteSessionTarget, setDeleteSessionTarget] = useState(null);
  const [editingLocation, setEditingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const noteTimerRef = useRef(null);

  const grades = discipline === "route" ? ROUTE_GRADES : BOULDER_GRADES;
  const isOutdoor = environment === "outdoor";
  const isGym = environment === "gym";
  const canLog = selectedGrade && (!isOutdoor || climbName.trim());
  const pastLocations = isGym ? gymLocations : outdoorLocations;

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
    setGymLocations([...new Set(sessionsWithClimbs.filter(s=>s.environment==="gym").map(s=>s.location).filter(Boolean))]);
    setOutdoorLocations([...new Set(sessionsWithClimbs.filter(s=>s.environment==="outdoor").map(s=>s.location).filter(Boolean))]);
    const active = sessionsWithClimbs.find(s => !s.ended_at);
    if (active) { setActiveSession(active); setLogs(active.logs); setEnvironment(active.environment); setDiscipline(active.discipline); }
    setLoadingSessions(false);
  };

  const createSession = async (loc, env, disc) => {
    const { data, error } = await supabase.from('sessions').insert({ user_id: user.id, location: loc, environment: env, discipline: disc }).select().single();
    if (error) { console.error(error); return null; }
    return data;
  };

  const saveClimbToDb = async (sessionId, climbData) => {
    const { data, error } = await supabase.from('climbs').insert({
      session_id: sessionId, user_id: user.id, name: climbData.name, grade: climbData.grade,
      grade_sort: gradeSort(climbData.grade, discipline), outcome: climbData.outcome,
      first_go: climbData.first_go, angles: climbData.angles, styles: climbData.styles,
      note: climbData.note, is_gym: isGym,
    }).select().single();
    if (error) { console.error(error); return null; }
    return data;
  };

  const updateClimbInDb = async (climbId, updates) => {
    const { error } = await supabase.from('climbs').update(updates).eq('id', climbId);
    if (error) console.error(error);
  };

  const deleteClimbFromDb = async (climbId) => { await supabase.from('climbs').delete().eq('id', climbId); };

  const deleteSession = async (sessionId) => {
    await supabase.from('climbs').delete().eq('session_id', sessionId);
    await supabase.from('sessions').delete().eq('id', sessionId);
    setAllSessions(prev => prev.filter(s => s.id !== sessionId));
    setDeleteSessionTarget(null);
    if (activeSession?.id === sessionId) { setActiveSession(null); setLogs([]); }
  };

  const renameLocation = async () => {
    if (!newLocation.trim() || !activeSession) return;
    await supabase.from('sessions').update({ location: newLocation.trim() }).eq('id', activeSession.id);
    setActiveSession(prev => ({...prev, location: newLocation.trim()}));
    setEditingLocation(false);
  };

  const commitLog = async (outcome, firstGo = false) => {
    if (!canLog || !activeSession) return;
    const climbData = { name: climbName.trim()||null, grade: selectedGrade, outcome, first_go: firstGo, angles:[], styles:[], note:"", is_gym: isGym };
    const tempId = `temp-${Date.now()}`;
    const tempEntry = { id: tempId, ...climbData, logged_at: new Date().toISOString() };
    setLogs(prev => [tempEntry,...prev]);
    setJustLogged(tempEntry);
    setJustLoggedId(tempId);
    setClimbName(""); setSelectedGrade(null);
    setTimeout(() => { setJustLogged(null); setJustLoggedId(null); }, 1800);
    clearTimeout(noteTimerRef.current);
    setNoteWindowId(tempId);
    noteTimerRef.current = setTimeout(() => setNoteWindowId(null), NOTE_WINDOW_MS);
    const saved = await saveClimbToDb(activeSession.id, climbData);
    if (saved) {
      setLogs(prev => prev.map(l => l.id===tempId ? {...saved, is_gym: isGym} : l));
      setNoteWindowId(saved.id);
    }
  };

  const handleSent = () => commitLog("sent", false);
  const handleFirstGo = () => { setZapActive(true); setTimeout(() => setZapActive(false), 400); commitLog("sent", true); };
  const openSheet = (entry) => { clearTimeout(noteTimerRef.current); setNoteWindowId(null); setSheetEntry(entry); };

  const saveDetail = async ({ name, grade, outcome, note, angles, styles, first_go }) => {
    setSheetSaving(true);
    const disc = discipline || "boulder";
    const updates = { name: name||null, grade, grade_sort: gradeSort(grade, disc), outcome, note, angles, styles, first_go };
    const updateLog = l => l.id===sheetEntry.id ? {...l,...updates} : l;
    setLogs(prev => prev.map(updateLog));
    if (viewingSession) {
      const updated = {...viewingSession, logs: viewingSession.logs.map(updateLog)};
      setViewingSession(updated); setAllSessions(prev => prev.map(s => s.id===viewingSession.id ? updated : s));
    }
    if (!String(sheetEntry.id).startsWith('temp-')) await updateClimbInDb(sheetEntry.id, updates);
    setSheetSaving(false); setSheetEntry(null);
  };

  const deleteClimb = async () => {
    const id = sheetEntry.id; setSheetEntry(null);
    setLogs(prev => prev.filter(l => l.id !== id));
    if (viewingSession) {
      const updated = {...viewingSession, logs: viewingSession.logs.filter(l => l.id !== id)};
      setViewingSession(updated); setAllSessions(prev => prev.map(s => s.id===viewingSession.id ? updated : s));
    }
    if (!String(id).startsWith('temp-')) await deleteClimbFromDb(id);
  };

  const reopenSession = async (session) => {
    // If a different session is already active, warn first
    if (activeSession && activeSession.id !== session.id) {
      const confirmed = window.confirm(`You have an active session at ${activeSession.location}. Switch to ${session.location} instead?`);
      if (!confirmed) return;
      // Close the current active session first
      await supabase.from('sessions').update({ ended_at: new Date().toISOString() }).eq('id', activeSession.id);
      const closedSession = {...activeSession, logs, ended_at: new Date().toISOString()};
      setAllSessions(prev => prev.map(s => s.id===activeSession.id ? closedSession : s));
    }
    // Reopen: clear ended_at so it becomes active again
    await supabase.from('sessions').update({ ended_at: null }).eq('id', session.id);
    const { data: climbs } = await supabase.from('climbs').select('*').eq('session_id', session.id).order('logged_at', { ascending: false });
    const reopened = {...session, ended_at: null, logs: climbs || []};
    setActiveSession(reopened);
    setLogs(climbs || []);
    setEnvironment(session.environment);
    setDiscipline(session.discipline);
    setClimbName(""); setSelectedGrade(null); setNoteWindowId(null);
    setAllSessions(prev => prev.map(s => s.id===session.id ? reopened : s));
    setViewingSession(null);
    setScreen("logging");
  };

  const startSetup = () => { setSetupStep(0); setEnvironment(null); setDiscipline(null); setLocation(""); setScreen("setup"); };

  const pick = (c) => {
    if (setupStep === 0) { setEnvironment(c); setDiscipline(null); setLocation(""); setSetupStep(1); }
    else { setDiscipline(c); setLocation(""); setSetupStep(2); }
  };

  const goBackSetup = () => {
    if (setupStep === 0) setScreen("home");
    else if (setupStep === 1) { setEnvironment(null); setLocation(""); setSetupStep(0); }
    else { setDiscipline(null); setLocation(""); setSetupStep(1); }
  };

  const startSession = async () => {
    const loc = location.trim()||"Unknown";
    const { data, error } = await supabase.from('sessions').insert({ user_id: user.id, location: loc, environment, discipline }).select().single();
    if (error || !data) return;
    setActiveSession(data); setLogs([]); setClimbName(""); setSelectedGrade(null); setNoteWindowId(null);
    setScreen("logging");
  };

  const [sessionRating, setSessionRating] = useState(null);
  const [sessionNote, setSessionNote] = useState("");
  const [ratingSource, setRatingSource] = useState("logging"); // "logging" | "summary"

  const endSession = async () => {
    if (logs.length === 0) {
      const confirmed = window.confirm("No climbs logged — end session anyway? It won't be saved.");
      if (!confirmed) return;
      await supabase.from('sessions').delete().eq('id', activeSession.id);
      setActiveSession(null); setLogs([]);
      setAllSessions(prev => prev.filter(s => s.id !== activeSession.id));
      setScreen("home"); return;
    }
    clearTimeout(noteTimerRef.current); setNoteWindowId(null);
    // Go to rating screen first, finalize after rating
    setSessionRating(null); setSessionNote("");
    setRatingSource("logging");
    setScreen("rating");
  };

  const finalizeSession = async (rating, note) => {
    await supabase.from('sessions').update({
      ended_at: new Date().toISOString(),
      session_rating: rating || null,
      session_note: note?.trim() || null,
    }).eq('id', activeSession.id);
    const done = {...activeSession, logs, ended_at: new Date().toISOString(), session_rating: rating, session_note: note};
    setAllSessions(prev => [done,...prev.filter(s => s.id!==activeSession.id)]);
    setActiveSession(null); setViewingSession(done); setScreen("summary");
  };

  const handleSeeSummary = async () => {
    if (ratingSource === "summary") {
      await supabase.from('sessions').update({
        session_rating: sessionRating || null,
        session_note: sessionNote?.trim() || null,
      }).eq('id', viewingSession.id);
      setViewingSession(prev => ({...prev, session_rating: sessionRating, session_note: sessionNote}));
      setAllSessions(prev => prev.map(s => s.id===viewingSession.id ? {...s, session_rating: sessionRating, session_note: sessionNote} : s));
      setScreen("summary");
    } else {
      finalizeSession(sessionRating, sessionNote);
    }
  };

  const sends   = logs.filter(l => l.outcome==="sent");
  const repeats = logs.filter(l => l.outcome==="repeat");
  const flashes = logs.filter(l => l.first_go===true);

  const Sheet = () => sheetEntry ? <DetailSheet entry={sheetEntry} discipline={discipline||"boulder"} onSave={saveDetail} onDismiss={() => setSheetEntry(null)} onDelete={deleteClimb} saving={sheetSaving} /> : null;

  const DeleteSessionModal = () => !deleteSessionTarget ? null : (
    <div style={S.overlay} onClick={() => setDeleteSessionTarget(null)}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>
        <div style={S.sheetHandle} />
        <div style={{ textAlign:"center", padding:"12px 0 8px" }}>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>delete this session?</div>
          <div style={{ fontSize:13, color:"#777", marginBottom:4 }}>{deleteSessionTarget.location}</div>
          <div style={{ fontSize:12, color:"#555", marginBottom:24 }}>{deleteSessionTarget.logs?.length || 0} climbs will be permanently deleted</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <button style={S.btnSecondary} onClick={() => setDeleteSessionTarget(null)}>cancel</button>
            <button style={{ ...S.btnPrimary, background:"#c0392b" }} onClick={() => deleteSession(deleteSessionTarget.id)}>delete</button>
          </div>
        </div>
      </div>
    </div>
  );

  // HOME
  if (screen==="home") {
    const pastSessions = allSessions.filter(s => s.ended_at);
    const latestSession = allSessions[0]; // most recent started_at (sorted desc)
    const latestIsActive = latestSession && !latestSession.ended_at;
    const latestIsEnded = latestSession && !!latestSession.ended_at;
    return (
      <div style={S.app}>
        <Sheet /><DeleteSessionModal />
        <div style={S.homeContainer}>
          <div style={S.homeTop}><div style={S.logo}>SUMMIT</div><div style={S.tagline}>your climbing registry</div></div>

          {/* Active session card — only if active is NOT the latest (i.e. it's a reopened old one) */}
          {activeSession && latestSession && activeSession.id !== latestSession.id && (
            <div style={{...S.activeCard, marginBottom:12}} onClick={() => setScreen("logging")}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div>
                  <div style={{ fontSize:11, color:"#4caf50", letterSpacing:"0.15em", marginBottom:6 }}>● IN PROGRESS</div>
                  <div style={{ fontSize:18, fontWeight:700, color:"#f0ede8" }}>{activeSession.location}</div>
                  <div style={{ fontSize:12, color:"#bbb", marginTop:3, fontWeight:600 }}>{new Date(activeSession.started_at).toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"})}</div>
                  <div style={{ fontSize:12, color:"#aaa", marginTop:3 }}>{activeSession.discipline} · {logs.length} logged · {sends.length} sends</div>
                </div>
                <button style={S.endBtnSmall} onClick={e => { e.stopPropagation(); endSession(); }}>END</button>
              </div>
            </div>
          )}

          {/* Latest Session card — always pinned */}
          {latestSession && (
            <div style={latestIsActive ? S.activeCard : S.latestCard}
              onClick={() => latestIsActive ? setScreen("logging") : (setViewingSession(latestSession), setScreen("sessionDetail"))}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, letterSpacing:"0.15em", marginBottom:6, color: latestIsActive ? "#4caf50" : "#888" }}>
                    {latestIsActive ? "● IN PROGRESS" : "LAST SESSION"}
                  </div>
                  <div style={{ fontSize:20, fontWeight:700, color:"#f0ede8" }}>{latestSession.location}</div>
                  <div style={{ fontSize:12, color:"#bbb", marginTop:3, fontWeight:600 }}>
                    {new Date(latestSession.started_at).toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"})}
                  </div>
                  <div style={{ fontSize:13, color:"#aaa", marginTop:3 }}>
                    {latestSession.discipline} · {latestIsActive ? `${logs.length} logged · ${sends.length} sends${flashes.length>0?` · ${flashes.length} ⚡`:""}` : `${(latestSession.logs||[]).filter(l=>l.outcome==="sent").length} sends · ${(latestSession.logs||[]).length} climbs`}
                  </div>
                </div>
                {latestIsActive
                  ? <button style={S.endBtnSmall} onClick={e => { e.stopPropagation(); endSession(); }}>END</button>
                  : <div style={{ fontSize:22, color:"#444", alignSelf:"center" }}>›</div>
                }
              </div>
            </div>
          )}

          {loadingSessions ? (
            <div style={S.emptyState}><div style={{color:"#666",fontSize:12,letterSpacing:"0.1em"}}>loading...</div></div>
          ) : pastSessions.length > 0 ? (
            <div style={S.sessionList}>
              <div style={S.sectionLabel}>sessions</div>
              {pastSessions.filter(s => s.id !== latestSession?.id).map(s => (
                <div key={s.id} style={S.sessionCard}>
                  <div style={{ flex:1 }} onClick={() => {setViewingSession(s);setScreen("sessionDetail");}}>
                    <div style={S.sessionCardLocation}>{s.location}</div>
                    <div style={S.sessionCardMeta}>{s.discipline} · {(s.logs||[]).filter(l=>l.outcome==="sent").length} sends · {(s.logs||[]).length} climbs</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={S.sessionCardDate}>{new Date(s.started_at).toLocaleDateString([],{month:"short",day:"numeric"})}</div>
                    <button style={S.trashBtn} onClick={() => setDeleteSessionTarget(s)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          ) : !latestSession && (
            <div style={S.emptyState}>
              <div style={{ fontSize:48, marginBottom:8 }}>⬡</div>
              <div style={{ fontSize:16, fontWeight:700, color:"#f0ede8", letterSpacing:"0.04em" }}>no sessions yet</div>
              <div style={{ fontSize:13, color:"#666", textAlign:"center", lineHeight:1.6, maxWidth:240, marginTop:4 }}>start your first session to begin tracking your climbing</div>
            </div>
          )}
        </div>
        <div style={S.floatingBtn}>
          {!activeSession && <button style={S.startBtn} onClick={startSetup}>START SESSION</button>}
          <button style={S.signOutBtn} onClick={onSignOut}>sign out</button>
        </div>
      </div>
    );
  }

  // SESSION DETAIL
  if (screen==="sessionDetail" && viewingSession) {
    const s = viewingSession;
    const sf = (s.logs||[]).filter(l=>l.first_go===true);
    const isThisActive = activeSession?.id === s.id;
    const RATING_LABELS = {1:"Drained", 2:"Fatigued", 3:"Felt Good", 4:"Fresh", 5:"Locked In"};
    const RATING_COLORS = {1:"#c0392b", 2:"#e07820", 3:"#888", 4:"#4caf50", 5:"#7eb8f0"};
    return (
      <div style={S.app}><Sheet /><DeleteSessionModal />
        <div style={S.pageContainer}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:40 }}>
            <button style={S.backBtn} onClick={() => {setViewingSession(null);setScreen("home");}}>←</button>
            <button style={{ ...S.trashBtn, color:"#c0392b", fontSize:12 }} onClick={() => setDeleteSessionTarget(s)}>✕ delete session</button>
          </div>
          <div style={S.pageTitle}>{s.location}</div>
          <div style={S.pageSubtitle}>{new Date(s.started_at).toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"})}</div>
          <div style={S.statsRow}>
            <div style={S.statBox}><div style={S.statNum}>{(s.logs||[]).length}</div><div style={S.statLabel}>climbs</div></div>
            <div style={S.statBox}><div style={S.statNum}>{(s.logs||[]).filter(l=>l.outcome==="sent").length}</div><div style={S.statLabel}>sends</div></div>
            <div style={S.statBox}><div style={S.statNum}>{sf.length}</div><div style={S.statLabel}>⚡ first go</div></div>
          </div>

          {/* Rating and note if present */}
          {(s.session_rating || s.session_note) && (
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:24 }}>
              {s.session_rating && (
                <div style={{ display:"flex", alignItems:"center", gap:10, background:"#141414", border:`1px solid ${RATING_COLORS[s.session_rating]}`, borderRadius:6, padding:"10px 16px" }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background: RATING_COLORS[s.session_rating], flexShrink:0 }} />
                  <div style={{ fontSize:13, fontWeight:700, color: RATING_COLORS[s.session_rating] }}>{RATING_LABELS[s.session_rating]}</div>
                </div>
              )}
              {s.session_note && (
                <div style={{ background:"#141414", border:"1px solid #222", borderRadius:6, padding:"10px 16px", fontSize:13, color:"#aaa", lineHeight:1.6 }}>
                  ✎ {s.session_note}
                </div>
              )}
            </div>
          )}

          <button style={S.addClimbBtn} onClick={() => reopenSession(s)}>
            {isThisActive ? "● continue logging" : "+ add climb"}
          </button>
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
        <button style={S.backBtn} onClick={goBackSetup}>←</button>
        {setupStep===0 && <><div style={S.setupQ}>where are you?</div><div style={S.setupGrid}><button style={S.setupBtn} onClick={() => pick("outdoor")}><span style={S.setupIcon}>⛰</span>Outdoor</button><button style={S.setupBtn} onClick={() => pick("gym")}><span style={S.setupIcon}>🏟</span>Gym</button></div></>}
        {setupStep===1 && <><div style={S.setupQ}>what are you climbing?</div><div style={S.setupGrid}><button style={S.setupBtn} onClick={() => pick("boulder")}><span style={S.setupIcon}>◈</span>Boulder</button><button style={S.setupBtn} onClick={() => pick("route")}><span style={S.setupIcon}>↑</span>Route</button></div></>}
        {setupStep===2 && <>
          <div style={S.setupQ}>{isGym?"which gym?":"where at?"}</div>
          <LocationInput value={location} onChange={setLocation} placeholder={isGym?"e.g. Movement RiNo":"e.g. Red Rock Canyon"} pastLocations={pastLocations} />
          <button style={{...S.startBtn, marginTop:32, opacity:location.trim()?1:0.35}} onClick={location.trim()?startSession:undefined}>BEGIN SESSION</button>
        </>}
      </div>
    </div>
  );

  // LOGGING
  if (screen==="logging") {
    if (editingLocation) return (
      <div style={S.app}>
        <div style={S.pageContainer}>
          <button style={S.backBtn} onClick={() => setEditingLocation(false)}>←</button>
          <div style={S.setupQ}>rename location</div>
          <input style={S.locationInput} autoFocus value={newLocation} onChange={e => setNewLocation(e.target.value)}
            placeholder={activeSession?.location} onKeyDown={e => e.key==="Enter" && renameLocation()} />
          <button style={{...S.startBtn, marginTop:32, opacity:newLocation.trim()?1:0.35}} onClick={newLocation.trim()?renameLocation:undefined}>SAVE</button>
        </div>
      </div>
    );

    return (
      <div style={S.app}>
        <ZapOverlay active={zapActive} /><Sheet />

        {justLogged && (
          <div style={{...S.flash,
            background: justLogged.first_go?"#fff8e0":justLogged.outcome==="sent"?"#c8f5c8":justLogged.outcome==="repeat"?"#061828":"#1e1e1e",
            color: justLogged.first_go?"#a06010":justLogged.outcome==="sent"?"#1a5c1a":justLogged.outcome==="repeat"?"#4a9fd4":"#777",
            border: justLogged.outcome==="project"?"1px solid #2a2a2a":justLogged.outcome==="repeat"?"1px solid #1a4a6a":"none"}}>
            {justLogged.first_go?"⚡ first go!":justLogged.outcome==="sent"?"✓ sent":justLogged.outcome==="repeat"?"↺ repeat":"◎ project"} {justLogged.grade}
          </div>
        )}

        {/* Top bar */}
        <div style={S.topBar}>
          <button style={S.topBarIconBtn} onClick={() => setScreen("home")}>⌂</button>
          <div style={{ flex:1, textAlign:"center", padding:"0 8px" }}>
            <div style={S.sessionLocation}>{activeSession?.location}</div>
            <div style={S.sessionMeta}>
              <span style={{color:"#aaa"}}>{logs.length} logged</span>
              {sends.length > 0 && <span style={{color:"#4caf50"}}> · {sends.length} sent</span>}
              {repeats.length > 0 && <span style={{color:"#4a9fd4"}}> · {repeats.length} ↺</span>}
              {flashes.length > 0 && <span style={{color:"#c07820"}}> · {flashes.length} ⚡</span>}
            </div>
          </div>
          <button style={S.topBarIconBtn} onClick={() => { setNewLocation(activeSession?.location||""); setEditingLocation(true); }}>✎</button>
        </div>

        {/* Climb name — boxed, always visible */}
        <div style={{ padding:"28px 24px 0" }}>
          <div style={{ fontSize:10, color:"#999", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:10 }}>
            {isOutdoor ? "climb name — required" : "climb name — optional"}
          </div>
          <input
            style={S.nameInputBoxed}
            placeholder={isOutdoor ? "e.g. Midnight Lightning" : "e.g. Techno Surfing"}
            value={climbName}
            onChange={e => setClimbName(e.target.value)}
          />
        </div>

        {/* Grade */}
        <div style={{ padding:"32px 0 0" }}>
          <div style={{ fontSize:10, color:"#999", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:14, paddingLeft:24 }}>grade</div>
          <GradeSlider grades={grades} value={selectedGrade} onChange={setSelectedGrade} />
        </div>

        {/* Outcome buttons */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, padding:"28px 24px 0" }}>
          <SentButton disabled={!canLog} onSent={handleSent} onFirstGo={handleFirstGo} />
          <button style={{...S.outcomeBtn, background:"#150f00", color: canLog?"#e07820":"#2a1a08", border:`1px solid ${canLog?"#3a2010":"#1e1608"}`, opacity:1, transition:"all 0.15s"}}
            onClick={() => canLog && commitLog("project")}>PROJECT</button>
          <button style={{...S.outcomeBtn, background:"#06111a", color: canLog?"#4a9fd4":"#0a2030", border:`1px solid ${canLog?"#1a4a6a":"#061018"}`, opacity:1, transition:"all 0.15s"}}
            onClick={() => canLog && commitLog("repeat")}>REPEAT</button>
        </div>

        {/* Recent logs */}
        {logs.length > 0 && (
          <div style={{ padding:"20px 24px 140px" }}>
            {logs.slice(0,5).map(l => (
              <LiveLogRow key={l.id} log={l} isNoteWindow={noteWindowId===l.id} onTap={() => openSheet(l)} isNew={l.id===justLoggedId} />
            ))}
          </div>
        )}

        {/* END SESSION pinned at bottom */}
        <div style={S.endSessionBar}>
          <button style={S.endSessionBtn} onClick={endSession}>END SESSION</button>
        </div>
      </div>
    );
  }

  // RATING
  if (screen==="rating") {
    const RATINGS = [
      { value:1, label:"Drained",    sub:"running on fumes",              color:"#c0392b", bg:"#1a0808" },
      { value:2, label:"Fatigued",   sub:"legs were there, mind wasn't",  color:"#e07820", bg:"#1a1008" },
      { value:3, label:"Felt Good",  sub:"solid session, body cooperated",color:"#888",    bg:"#181818" },
      { value:4, label:"Fresh",      sub:"could've climbed all day",      color:"#4caf50", bg:"#0d1f0d" },
      { value:5, label:"Locked In",  sub:"everything clicked",            color:"#7eb8f0", bg:"#06111a" },
    ];

    const goBackToSession = async () => {
      if (ratingSource === "summary") {
        setScreen("summary");
      } else {
        await supabase.from('sessions').update({ ended_at: null }).eq('id', activeSession.id);
        setScreen("logging");
      }
    };

    return (
      <div style={S.app}>
        <div style={{ padding:"52px 24px 48px", minHeight:"100vh", display:"flex", flexDirection:"column" }}>
          <button style={{...S.backBtn, marginBottom:24}} onClick={goBackToSession}>←</button>
          <div style={{ fontSize:13, color:"#888", letterSpacing:"0.1em", marginBottom:8 }}>{activeSession?.location}</div>
          <div style={{ fontSize:22, fontWeight:700, marginBottom:6 }}>how did you feel?</div>
          <div style={{ fontSize:13, color:"#666", marginBottom:36 }}>builds your training picture over time</div>

          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:36 }}>
            {RATINGS.map(r => (
              <button key={r.value} onClick={() => setSessionRating(prev => prev===r.value ? null : r.value)} style={{
                padding:"16px 20px", borderRadius:8, cursor:"pointer", fontFamily:"'DM Mono',monospace",
                textAlign:"left", transition:"all 0.12s", border:`1px solid ${sessionRating===r.value ? r.color : "#222"}`,
                background: sessionRating===r.value ? r.bg : "#141414",
                display:"flex", alignItems:"center", justifyContent:"space-between",
              }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color: sessionRating===r.value ? r.color : "#f0ede8", marginBottom:2 }}>{r.label}</div>
                  <div style={{ fontSize:11, color: sessionRating===r.value ? r.color : "#666", letterSpacing:"0.04em" }}>{r.sub}</div>
                </div>
                <div style={{ width:10, height:10, borderRadius:"50%", background: sessionRating===r.value ? r.color : "#222", border:`1px solid ${sessionRating===r.value ? r.color : "#444"}`, flexShrink:0 }} />
              </button>
            ))}
          </div>

          <div style={{ marginBottom:32 }}>
            <div style={{ fontSize:10, color:"#888", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:10 }}>session note — optional</div>
            <textarea
              style={{ width:"100%", background:"#141414", border:"1px solid #2a2a2a", borderRadius:6, padding:"14px 16px", color:"#f0ede8", fontSize:14, fontFamily:"'DM Mono',monospace", outline:"none", resize:"none", boxSizing:"border-box", lineHeight:1.7 }}
              placeholder="sleep, food, rest days, what you were working on..."
              value={sessionNote}
              onChange={e => setSessionNote(e.target.value)}
              rows={3}
            />
          </div>

          <button style={S.startBtn} onClick={handleSeeSummary}>
            SEE SUMMARY
          </button>
        </div>
      </div>
    );
  }

  // SUMMARY
  if (screen==="summary" && viewingSession) {
    const vs = viewingSession;
    const vSends   = vs.logs.filter(l=>l.outcome==="sent");
    const vFlashes = vs.logs.filter(l=>l.first_go===true);
    const vRepeats = vs.logs.filter(l=>l.outcome==="repeat");
    const vProjects = vs.logs.filter(l=>l.outcome==="project");
    const hardest = vSends.length > 0 ? vSends.reduce((a,b) => gradeSort(a.grade, vs.discipline) >= gradeSort(b.grade, vs.discipline) ? a : b) : null;
    const RATING_LABELS = {1:"Drained", 2:"Fatigued", 3:"Felt Good", 4:"Fresh", 5:"Locked In"};
    const RATING_COLORS = {1:"#c0392b", 2:"#e07820", 3:"#888", 4:"#4caf50", 5:"#7eb8f0"};
    return (
      <div style={S.app}><Sheet />
        <div style={{ padding:"52px 24px 80px" }}>
          {/* Back arrow to rating */}
          <button style={{...S.backBtn, marginBottom:24}} onClick={() => {
            setRatingSource("summary");
            setSessionRating(vs.session_rating || null);
            setSessionNote(vs.session_note || "");
            setScreen("rating");
          }}>←</button>

          {/* Header */}
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <div style={{ fontSize:52, marginBottom:12 }}>✓</div>
            <div style={{ fontSize:28, fontWeight:700, letterSpacing:"0.04em", marginBottom:6 }}>{vs.location}</div>
            <div style={{ fontSize:13, color:"#888" }}>{new Date(vs.started_at).toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"})}</div>
          </div>

          {/* Big stat row */}
          <div style={S.statsRow}>
            <div style={S.statBox}><div style={S.statNum}>{vs.logs.length}</div><div style={S.statLabel}>climbs</div></div>
            <div style={S.statBox}><div style={S.statNum}>{vSends.length}</div><div style={S.statLabel}>sends</div></div>
            <div style={S.statBox}><div style={S.statNum}>{vFlashes.length}</div><div style={S.statLabel}>⚡ first go</div></div>
          </div>

          {/* Highlights */}
          <div style={{ display:"flex", gap:8, marginBottom:32, flexWrap:"wrap" }}>
            {hardest && (
              <div style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:6, padding:"10px 16px", flex:1 }}>
                <div style={{ fontSize:10, color:"#888", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>hardest send</div>
                <div style={{ fontSize:20, fontWeight:700, color:"#f0ede8" }}>{hardest.grade}</div>
                {hardest.name && <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{hardest.name}</div>}
              </div>
            )}
            {vs.session_rating && (
              <div style={{ background:"#1a1a1a", border:`1px solid ${RATING_COLORS[vs.session_rating]}`, borderRadius:6, padding:"10px 16px", flex:1 }}>
                <div style={{ fontSize:10, color:"#888", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>felt</div>
                <div style={{ fontSize:16, fontWeight:700, color: RATING_COLORS[vs.session_rating] }}>{RATING_LABELS[vs.session_rating]}</div>
              </div>
            )}
            {vRepeats.length > 0 && (
              <div style={{ background:"#06111a", border:"1px solid #1a4a6a", borderRadius:6, padding:"10px 16px", flex:1 }}>
                <div style={{ fontSize:10, color:"#4a9fd4", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>repeats</div>
                <div style={{ fontSize:20, fontWeight:700, color:"#4a9fd4" }}>{vRepeats.length}</div>
              </div>
            )}
            {vProjects.length > 0 && (
              <div style={{ background:"#150f00", border:"1px solid #3a2010", borderRadius:6, padding:"10px 16px", flex:1 }}>
                <div style={{ fontSize:10, color:"#e07820", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>projects</div>
                <div style={{ fontSize:20, fontWeight:700, color:"#e07820" }}>{vProjects.length}</div>
              </div>
            )}
          </div>
          {vs.session_note && (
            <div style={{ background:"#141414", border:"1px solid #222", borderRadius:6, padding:"12px 16px", marginBottom:24, fontSize:13, color:"#aaa", lineHeight:1.6 }}>
              ✎ {vs.session_note}
            </div>
          )}

          {/* Climb list */}
          <div style={S.sectionLabel}>climbs this session</div>
          {vs.logs.map(l => <LogDetailRow key={l.id} log={l} onTap={() => openSheet(l)} />)}

          {/* Done button */}
          <button style={{...S.startBtn, marginTop:36, marginBottom:16}} onClick={() => {setViewingSession(null);setScreen("home");loadSessions();}}>DONE</button>
        </div>
      </div>
    );
  }
}

const S = {
  app:{ fontFamily:"'DM Mono','Courier New',monospace", background:"#0e0e0e", minHeight:"100vh", color:"#f0ede8", maxWidth:390, margin:"0 auto", position:"relative", overflowX:"hidden" },
  homeContainer:{ padding:"56px 24px 160px", display:"flex", flexDirection:"column", minHeight:"100vh" },
  homeTop:{ marginBottom:32 },
  logo:{ fontSize:40, fontWeight:700, letterSpacing:"0.15em" },
  tagline:{ fontSize:12, color:"#888", letterSpacing:"0.08em", marginTop:4 },
  activeCard:{ background:"#0d1f0d", border:"1px solid #1e3a1e", borderRadius:8, padding:"18px 20px", marginBottom:16, cursor:"pointer" },
  latestCard:{ background:"#161616", border:"1px solid #2a2a2a", borderRadius:8, padding:"18px 20px", marginBottom:16, cursor:"pointer" },
  addClimbBtn:{ width:"100%", padding:"13px 0", background:"#161616", border:"1px solid #2a2a2a", borderRadius:6, color:"#f0ede8", fontSize:12, fontWeight:700, letterSpacing:"0.12em", cursor:"pointer", fontFamily:"'DM Mono',monospace", marginBottom:24, textAlign:"center" },
  endBtnSmall:{ background:"none", border:"1px solid #2a4a2a", color:"#4caf50", padding:"7px 14px", borderRadius:4, fontSize:11, fontWeight:700, letterSpacing:"0.12em", cursor:"pointer", fontFamily:"'DM Mono',monospace", flexShrink:0 },
  emptyState:{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, color:"#666" },
  emptyIcon:{ fontSize:52 }, emptyText:{ fontSize:13, letterSpacing:"0.12em" },
  sectionLabel:{ fontSize:10, color:"#888", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:4, paddingTop:4 },
  sessionList:{ flex:1, marginBottom:16 },
  sessionCard:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0", borderBottom:"1px solid #161616", cursor:"pointer" },
  sessionCardLocation:{ fontSize:16, fontWeight:600, color:"#e0ddd8" },
  sessionCardMeta:{ fontSize:12, color:"#999", marginTop:3 },
  sessionCardDate:{ fontSize:12, color:"#bbb", fontWeight:600 },
  trashBtn:{ background:"none", border:"none", color:"#666", fontSize:12, cursor:"pointer", padding:"4px 6px", fontFamily:"'DM Mono',monospace", letterSpacing:"0.04em" },
  floatingBtn:{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:390, padding:"16px 24px 36px", background:"linear-gradient(transparent, #0e0e0e 35%)", boxSizing:"border-box" },
  startBtn:{ width:"100%", padding:20, background:"#f0ede8", color:"#0e0e0e", border:"none", borderRadius:4, fontSize:14, fontWeight:700, letterSpacing:"0.15em", cursor:"pointer", fontFamily:"'DM Mono',monospace", display:"block" },
  signOutBtn:{ width:"100%", padding:10, background:"transparent", color:"#777", border:"none", fontSize:11, cursor:"pointer", fontFamily:"'DM Mono',monospace", letterSpacing:"0.1em", marginTop:8 },
  pageContainer:{ padding:"52px 24px 48px", minHeight:"100vh", display:"flex", flexDirection:"column" },
  backBtn:{ background:"none", border:"none", color:"#aaa", fontSize:22, cursor:"pointer", padding:0, fontFamily:"'DM Mono',monospace", alignSelf:"flex-start" },
  pageTitle:{ fontSize:26, fontWeight:700, letterSpacing:"0.04em", marginBottom:4 },
  pageSubtitle:{ fontSize:12, color:"#888", letterSpacing:"0.05em", marginBottom:28 },
  statsRow:{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:2, marginBottom:28 },
  statBox:{ background:"#141414", padding:"18px 12px", textAlign:"center", borderRadius:4 },
  statNum:{ fontSize:30, fontWeight:700 }, statLabel:{ fontSize:10, color:"#888", letterSpacing:"0.08em", marginTop:3, textTransform:"uppercase" },
  detailRow:{ borderBottom:"1px solid #1a1a1a", paddingBottom:10, marginBottom:2, cursor:"pointer" },
  detailTop:{ display:"flex", alignItems:"center", gap:12, paddingTop:10 },
  detailName:{ flex:1, color:"#ddd", fontSize:14 }, detailGrade:{ fontSize:12, color:"#999", fontWeight:600 },
  tagPills:{ display:"flex", flexWrap:"wrap", gap:6, marginLeft:30, marginTop:6 },
  pill:{ fontSize:10, color:"#888", background:"#1e1e1e", padding:"3px 8px", borderRadius:10, letterSpacing:"0.04em" },
  noteChip:{ marginLeft:30, marginTop:5, fontSize:12, color:"#888", lineHeight:1.5 },
  addChipDetail:{ marginLeft:30, marginTop:5, fontSize:11, color:"#5aaa5a", letterSpacing:"0.06em", fontWeight:600 },
  setupQ:{ fontSize:26, fontWeight:600, marginBottom:36, lineHeight:1.3 },
  setupGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  setupBtn:{ background:"#141414", border:"1px solid #222", borderRadius:8, padding:"28px 16px", color:"#f0ede8", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"'DM Mono',monospace", letterSpacing:"0.05em", display:"flex", flexDirection:"column", alignItems:"center", gap:14 },
  setupIcon:{ fontSize:30 },
  locationInput:{ width:"100%", background:"#141414", border:"1px solid #2a2a2a", borderRadius:6, padding:16, color:"#f0ede8", fontSize:16, fontFamily:"'DM Mono',monospace", outline:"none", boxSizing:"border-box" },
  suggestions:{ position:"absolute", top:"100%", left:0, right:0, background:"#161616", border:"1px solid #222", borderTop:"none", borderRadius:"0 0 6px 6px", zIndex:10 },
  suggestionItem:{ padding:"12px 16px", fontSize:14, color:"#bbb", cursor:"pointer", borderBottom:"1px solid #1e1e1e" },
  flash:{ position:"fixed", top:0, left:"50%", transform:"translateX(-50%)", padding:"11px 24px", borderRadius:"0 0 8px 8px", fontSize:13, fontWeight:600, letterSpacing:"0.06em", zIndex:100, fontFamily:"'DM Mono',monospace", maxWidth:390, width:"100%", textAlign:"center" },
  topBar:{ display:"flex", alignItems:"center", padding:"16px 16px 14px", borderBottom:"1px solid #1a1a1a" },
  topBarIconBtn:{ background:"#1a1a1a", border:"1px solid #2a2a2a", color:"#e0ddd8", width:38, height:38, borderRadius:6, fontSize:16, cursor:"pointer", fontFamily:"'DM Mono',monospace", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  sessionLocation:{ fontSize:16, fontWeight:700, color:"#f0ede8" },
  sessionMeta:{ fontSize:12, marginTop:2 },
  nameInputBoxed:{ width:"100%", background:"#141414", border:"1px solid #2e2e2e", borderRadius:6, padding:"14px 16px", color:"#f0ede8", fontSize:18, fontFamily:"'DM Mono',monospace", outline:"none", boxSizing:"border-box", caretColor:"#f0ede8" },
  outcomeBtn:{ padding:"20px 8px", border:"none", borderRadius:6, fontSize:12, fontWeight:700, letterSpacing:"0.1em", cursor:"pointer", fontFamily:"'DM Mono',monospace" },
  logRowWrap:{ borderBottom:"1px solid #131313", borderRadius:4 },
  logRow:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"10px 0 6px", cursor:"pointer" },
  logName:{ fontSize:13, color:"#ccc" },
  logMeta:{ fontSize:11, color:"#888", marginTop:2 },
  addPromptActive:{ fontSize:12, color:"#5aaa5a", marginTop:3, letterSpacing:"0.04em", fontWeight:600 },
  addPromptFaded:{ fontSize:12, color:"#4a7a4a", marginTop:3, letterSpacing:"0.04em" },
  logGrade:{ fontSize:13, color:"#aaa", fontWeight:600, flexShrink:0, marginLeft:8 },
  endSessionBar:{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:390, padding:"12px 24px 32px", background:"linear-gradient(transparent, #0e0e0e 30%)", boxSizing:"border-box" },
  endSessionBtn:{ width:"100%", padding:18, background:"#f0ede8", color:"#0e0e0e", border:"none", borderRadius:6, fontSize:13, fontWeight:700, letterSpacing:"0.15em", cursor:"pointer", fontFamily:"'DM Mono',monospace" },
  overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"flex-end", zIndex:200 },
  sheet:{ background:"#131313", borderTop:"1px solid #222", borderRadius:"16px 16px 0 0", padding:"20px 24px 48px", width:"100%", maxWidth:390, margin:"0 auto", boxSizing:"border-box", maxHeight:"88vh", overflowY:"auto" },
  sheetHandle:{ width:36, height:3, background:"#2a2a2a", borderRadius:2, margin:"0 auto 20px" },
  sheetTitle:{ fontSize:18, fontWeight:700 },
  sheetNameInput:{ width:"100%", background:"transparent", border:"none", borderBottom:"1px solid #3a3a3a", color:"#f0ede8", fontSize:18, fontWeight:700, fontFamily:"'DM Mono',monospace", outline:"none", padding:"0 0 4px", caretColor:"#f0ede8", boxSizing:"border-box" },
  gradeEditBtn:{ fontSize:13, color:"#bbb", fontWeight:600, background:"#1a1a1a", border:"1px solid #333", borderRadius:4, padding:"4px 10px", cursor:"pointer", fontFamily:"'DM Mono',monospace", flexShrink:0, whiteSpace:"nowrap" },
  tagSection:{ marginTop:20 }, tagLabel:{ fontSize:10, color:"#888", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:10 },
  chipRow:{ display:"flex", flexWrap:"wrap", gap:8 },
  noteInput:{ width:"100%", background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:4, padding:"12px 14px", color:"#f0ede8", fontSize:13, fontFamily:"'DM Mono',monospace", outline:"none", resize:"none", boxSizing:"border-box", lineHeight:1.7, marginTop:4 },
  sheetBtns:{ display:"flex", gap:10, marginTop:20 },
  btnSecondary:{ flex:1, padding:14, background:"transparent", border:"1px solid #333", borderRadius:4, color:"#888", fontSize:12, fontWeight:600, letterSpacing:"0.1em", cursor:"pointer", fontFamily:"'DM Mono',monospace" },
  btnPrimary:{ flex:2, padding:14, background:"#f0ede8", border:"none", borderRadius:4, color:"#0e0e0e", fontSize:12, fontWeight:700, letterSpacing:"0.1em", cursor:"pointer", fontFamily:"'DM Mono',monospace" },
};
