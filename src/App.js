/* eslint-disable */
import { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import SummitLoader from "./SummitLoader";

const BOULDER_GRADES = ["VB","V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10","V11","V12","V13","V14","V15","V16"];
const ROUTE_GRADES = ["5.6","5.7","5.8","5.9","5.10a","5.10b","5.10c","5.10d","5.11a","5.11b","5.11c","5.11d","5.12a","5.12b","5.12c","5.12d","5.13a","5.13b","5.13c","5.13d","5.14a","5.14b","5.14c","5.14d"];
const BOULDER_SORT = Object.fromEntries(BOULDER_GRADES.map((g,i) => [g, i+1]));
const ROUTE_SORT   = Object.fromEntries(ROUTE_GRADES.map((g,i) => [g, i+1]));
const ANGLES = ["Slab","Vert","Overhang","Roof"];
const STYLES = ["Crimps","Pinches","Pockets","Slopers","Compression","Dynos","Heel hook","Lockoff","Smear","Power Endurance","Endurance","Finger crack","Hand crack","Offwidth","Chimney"];
const NOTE_WINDOW_MS = 7000;
const DOUBLE_TAP_MS  = 300;

const displayName = (log) => log.name || (log.is_gym ? "Plastic" : "unnamed");
const gradeSort = (grade, discipline) => discipline === "route" ? (ROUTE_SORT[grade]||0) : (BOULDER_SORT[grade]||0);
const TAB_SCREENS = ["home","lookup","insights"];

// ── Grade Slider ────────────────────────────────────────────────────────────
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
        <span style={{ fontSize:11, color:"#aaa", letterSpacing:"0.1em" }}>{grades[0]}</span>
        <span style={{ fontSize:34, fontWeight:700, color: value ? "#f0ede8" : "#555", transition:"color 0.12s" }}>{value || "—"}</span>
        <span style={{ fontSize:11, color:"#aaa", letterSpacing:"0.1em" }}>{grades[grades.length-1]}</span>
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

// ── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ label, selected, onToggle, accent }) {
  return (
    <button onClick={onToggle} style={{ padding:"7px 14px", borderRadius:20, fontSize:12, fontWeight:600, letterSpacing:"0.04em", cursor:"pointer", fontFamily:"'DM Mono',monospace", border:"none", transition:"all 0.12s", flexShrink:0, background: selected ? (accent || "#f0ede8") : "#1e1e1e", color: selected ? (accent ? "#fff" : "#0e0e0e") : "#888" }}>{label}</button>
  );
}

// ── Zap overlay ───────────────────────────────────────────────────────────────
function ZapOverlay({ active }) {
  if (!active) return null;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:999, pointerEvents:"none", background:"rgba(255,220,50,0.12)", animation:"zap 0.35s ease-out forwards" }}>
      <style>{`@keyframes zap { 0%{opacity:0} 15%{opacity:1} 35%{opacity:0.6} 55%{opacity:1} 100%{opacity:0} }`}</style>
    </div>
  );
}

// ── Sent button with double-tap first go ──────────────────────────────────────
function SentButton({ disabled, onSent, onFirstGo }) {
  const tapTimer = useRef(null);
  const tapped = useRef(false);
  const handlePress = () => {
    if (disabled) return;
    if (tapped.current) {
      // Double tap — cancel the pending send and fire flash instead
      clearTimeout(tapTimer.current);
      tapped.current = false;
      onFirstGo();
    } else {
      // First tap — log immediately, but listen for a second tap
      tapped.current = true;
      onSent();
      tapTimer.current = setTimeout(() => { tapped.current = false; }, 750);
    }
  };
  useEffect(() => () => clearTimeout(tapTimer.current), []);
  return (
    <button onClick={handlePress} style={{ ...S.outcomeBtn, background:"#4caf50", color:"#fff", opacity: disabled ? 0.55 : 1, transition:"opacity 0.2s" }}>
      SEND
    </button>
  );
}

// ── Location input with suggestions ──────────────────────────────────────────
function LocationInput({ value, onChange, placeholder, pastLocations }) {
  const [open, setOpen] = useState(false);
  const suggestions = value.length > 0
    ? pastLocations.filter(l => l.toLowerCase().includes(value.toLowerCase()) && l.toLowerCase() !== value.toLowerCase())
    : pastLocations.slice(0, 3);
  return (
    <div style={{ position:"relative" }}>
      <input style={S.locationInput} placeholder={placeholder} value={value} autoFocus autoCapitalize="words"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
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

// ── Detail sheet (bottom drawer for editing a climb) ─────────────────────────
function DetailSheet({ entry, discipline, onSave, onDismiss, onDelete, saving }) {
  const [name, setName]       = useState(entry.name || "");
  const [editingName, setEditingName] = useState(false);
  const [grade, setGrade]     = useState(entry.grade || "");
  const [editingGrade, setEditingGrade] = useState(false);
  const [outcome, setOutcome] = useState(entry.outcome || "sent");
  const [note, setNote]       = useState(entry.note || "");
  const [angles, setAngles]   = useState(entry.angles || []);
  const [styles, setStyles]   = useState(entry.styles || []);
  const [firstGo, setFirstGo] = useState(entry.first_go || false);
  const [pitches, setPitches] = useState(entry.pitches || null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isOutdoorRoute = !entry.is_gym && discipline === "route";
  const grades = discipline === "route" ? ROUTE_GRADES : BOULDER_GRADES;
  const toggleAngle = (a) => setAngles(p => p.includes(a) ? p.filter(x=>x!==a) : [...p,a]);
  const toggleStyle = (s) => setStyles(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s]);

  if (confirmDelete) return (
    <div style={S.overlay} onClick={() => setConfirmDelete(false)}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>
        <div style={S.sheetHandle} />
        <div style={{ textAlign:"center", padding:"12px 0 8px" }}>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>delete this climb?</div>
          <div style={{ fontSize:13, color:"#aaa", marginBottom:24 }}>{displayName(entry)} · {entry.grade}</div>
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
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          {["sent","project","repeat"].map(o => (
            <button key={o} onClick={() => setOutcome(o)} style={{
              flex:1, padding:"10px 4px", borderRadius:6, fontSize:11, fontWeight:700, letterSpacing:"0.08em",
              cursor:"pointer", fontFamily:"'DM Mono',monospace", transition:"all 0.12s",
              background: outcome===o ? (o==="sent"?COLOR_SENT:o==="project"?"#0a1e1c":"#061828") : "#161616",
              color: outcome===o ? (o==="sent"?"#fff":o==="project"?COLOR_PROJECT:COLOR_REPEAT) : "#444",
              border: outcome===o ? (o==="sent"?`1px solid ${COLOR_SENT}`:o==="project"?`1px solid ${COLOR_PROJECT}`:`1px solid ${COLOR_REPEAT}`) : "1px solid #1e1e1e",
            }}>{o === "sent" ? "SEND" : o.toUpperCase()}</button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20 }}>
          <div style={{ flex:1, minWidth:0 }}>
            {editingName ? (
              <input autoFocus style={S.sheetNameInput} value={name} onChange={e => setName(e.target.value)}
                onBlur={() => setEditingName(false)} onKeyDown={e => e.key==="Enter" && setEditingName(false)}
                placeholder={entry.is_gym ? "Plastic" : "climb name"} />
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <span style={S.sheetTitle}>{name || (entry.is_gym ? "Plastic" : <em style={{color:"#999",fontStyle:"italic"}}>unnamed</em>)}</span>
                <button onClick={() => setEditingName(true)} style={{ background:"none", border:"none", color:"#999", fontSize:14, cursor:"pointer", padding:"0 2px", fontFamily:"'DM Mono',monospace", lineHeight:1 }}>✎</button>
              </div>
            )}
          </div>
          {editingGrade ? (
            <div style={{ position:"absolute", inset:0, background:"#131313", borderRadius:"16px 16px 0 0", padding:"20px 24px", zIndex:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:600, letterSpacing:"0.08em" }}>change grade</div>
                <button onClick={() => setEditingGrade(false)} style={{ background:"none", border:"none", color:"#999", fontSize:20, cursor:"pointer", fontFamily:"inherit" }}>✕</button>
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
        {isOutdoorRoute && (
          <div style={S.tagSection}>
            <div style={S.tagLabel}>pitches</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {[1,2,3,4,5,6,7,8,10,12,15,20].map(n => (
                <button key={n} onClick={() => setPitches(pitches===n ? null : n)} style={{
                  padding:"7px 14px", borderRadius:20, fontSize:13, fontWeight:600, cursor:"pointer",
                  fontFamily:"'DM Mono',monospace", border:"none", transition:"all 0.12s", flexShrink:0,
                  background: pitches===n ? "#f0ede8" : "#1e1e1e",
                  color: pitches===n ? "#0e0e0e" : "#888"
                }}>{n}</button>
              ))}
            </div>
            {pitches && <div style={{ fontSize:12, color:"#aaa", marginTop:8 }}>{pitches} {pitches===1?"pitch":"pitches"} selected · tap to deselect</div>}
          </div>
        )}
        <div style={S.sheetBtns}>
          <button style={{ ...S.btnSecondary, color:"#c0392b", borderColor:"#2a1515" }} onClick={() => setConfirmDelete(true)}>delete</button>
          <button style={{ ...S.btnPrimary, flex:2, opacity: saving ? 0.6 : 1 }} onClick={() => onSave({ name: name.trim()||null, grade, outcome, note, angles, styles, first_go: outcome==="sent" ? firstGo : false, pitches: isOutdoorRoute ? pitches : null })} disabled={saving}>
            {saving ? "saving..." : "save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Live log row (logging screen) ─────────────────────────────────────────────
function LiveLogRow({ log, isNoteWindow, onTap, onDupe, isNew }) {
  const hasTags = log.angles?.length > 0 || log.styles?.length > 0;
  const hasAnything = hasTags || log.note || log.first_go;
  const showWindow = isNoteWindow && !hasAnything;
  const isSent = log.outcome === "sent";
  const isRepeat = log.outcome === "repeat";
  return (
    <div style={{ ...S.logRowWrap, animation: isNew ? "pulseRow 0.5s ease-out" : "none", borderLeft: showWindow ? "2px solid #4caf50" : "2px solid transparent", paddingLeft: 8, transition:"border-color 0.3s" }}>
      <style>{`@keyframes pulseRow { 0%{background:#1a2a1a} 100%{background:transparent} }`}</style>
      <div style={{ display:"flex", alignItems:"center" }}>
        <div style={{ ...S.logRow, flex:1 }} onClick={onTap}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:10, flex:1, minWidth:0 }}>
          <OutcomeIcon outcome={log.outcome} firstGo={log.first_go} size={24} />
            <div style={{ minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={S.logName}>{displayName(log)}</span>
                {log.first_go && <span style={{ fontSize:14, color:"#c07820" }}>⚡</span>}
              </div>
              {log.note ? <div style={S.logMeta}>✎ {log.note.slice(0,42)}{log.note.length>42?"…":""}</div>
                : hasTags ? <div style={S.logMeta}>{[...(log.angles||[]),...(log.styles||[])].join(" · ")}</div>
                : showWindow ? <div style={S.addPromptActive}>+ add details</div>
                : <div style={S.addPromptFaded}>+ add details</div>}
            </div>
          </div>
          <span style={S.logGrade}>{log.grade}</span>
        </div>
        <button onClick={e => { e.stopPropagation(); onDupe(log); }} style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:4, color:"#bbb", fontSize:11, fontWeight:700, width:38, height:38, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0, marginLeft:8, fontFamily:"'DM Mono',monospace", lineHeight:1, gap:1, letterSpacing:"0.04em" }}>
          <span style={{ fontSize:14 }}>+</span>
          <span style={{ fontSize:8, color:"#aaa" }}>again</span>
        </button>
      </div>
    </div>
  );
}

// ── Log detail row (session/summary pages) ────────────────────────────────────
function LogDetailRow({ log, onTap }) {
  const hasTags = log.angles?.length > 0 || log.styles?.length > 0;
  const isSent = log.outcome === "sent";
  const isRepeat = log.outcome === "repeat";
  return (
    <div style={S.detailRow} onClick={onTap}>
      <div style={S.detailTop}>
        <OutcomeIcon outcome={log.outcome} firstGo={log.first_go} size={26} />
        <span style={S.detailName}>{displayName(log)}</span>
        <span style={S.detailGrade}>{log.grade}</span>
      </div>
      {hasTags && <div style={S.tagPills}>{[...(log.angles||[]),...(log.styles||[])].map(t => <span key={t} style={S.pill}>{t}</span>)}</div>}
      {log.pitches && <div style={S.tagPills}><span style={{...S.pill, color:"#f0ede8", background:"#2a2a2a"}}>{log.pitches}p</span></div>}
      {log.note && <div style={S.noteChip}>✎ {log.note}</div>}
      {!hasTags && !log.note && !log.first_go && <div style={S.addChipDetail}>+ add details</div>}
    </div>
  );
}

// ── Outcome colors ────────────────────────────────────────────────────────────
const COLOR_SENT    = "#4caf50";
const COLOR_REPEAT  = "#4a9fd4";
const COLOR_PROJECT = "#2ab0a0";
const COLOR_FLASH   = "#ffe44d";

// ── Outcome icon SVG component ────────────────────────────────────────────────
function OutcomeIcon({ outcome, firstGo, size = 26 }) {
  const r = size / 2;
  const bg = outcome === "sent" ? COLOR_SENT : outcome === "repeat" ? COLOR_REPEAT : COLOR_PROJECT;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink:0 }}>
      <circle cx={r} cy={r} r={r} fill={bg} />

      {outcome === "sent" && !firstGo && (
        // White envelope, black outline
        <>
          {/* envelope body */}
          <rect x={size*0.18} y={size*0.30} width={size*0.64} height={size*0.42} rx={size*0.04}
            fill="#000" />
          <rect x={size*0.20} y={size*0.32} width={size*0.60} height={size*0.38} rx={size*0.03}
            fill="#fff" />
          {/* envelope flap V */}
          <polyline points={`${size*0.20},${size*0.33} ${size*0.50},${size*0.56} ${size*0.80},${size*0.33}`}
            fill="none" stroke="#000" strokeWidth={size*0.07} strokeLinejoin="round" />
          <polyline points={`${size*0.20},${size*0.33} ${size*0.50},${size*0.56} ${size*0.80},${size*0.33}`}
            fill="none" stroke="#fff" strokeWidth={size*0.045} strokeLinejoin="round" />
        </>
      )}

      {outcome === "sent" && firstGo && (
        // Flash bolt — black outline then yellow
        <>
          <polygon points={`${size*0.58},${size*0.1} ${size*0.28},${size*0.52} ${size*0.48},${size*0.52} ${size*0.38},${size*0.9} ${size*0.72},${size*0.44} ${size*0.52},${size*0.44}`}
            fill="none" stroke="#000" strokeWidth={size*0.09} strokeLinejoin="round" />
          <polygon points={`${size*0.58},${size*0.1} ${size*0.28},${size*0.52} ${size*0.48},${size*0.52} ${size*0.38},${size*0.9} ${size*0.72},${size*0.44} ${size*0.52},${size*0.44}`}
            fill={COLOR_FLASH} />
        </>
      )}

      {outcome === "repeat" && (
        // Ouroboros — snake eating its own tail, black outline
        <>
          <circle cx={r} cy={r} r={r*0.55} fill="none" stroke="#000" strokeWidth={size*0.16} />
          <circle cx={r} cy={r} r={r*0.55} fill="none" stroke="#fff" strokeWidth={size*0.11} />
          {/* head top-right */}
          <circle cx={size*0.74} cy={size*0.26} r={size*0.13} fill="#000" />
          <circle cx={size*0.74} cy={size*0.26} r={size*0.10} fill="#fff" />
          {/* eye */}
          <circle cx={size*0.77} cy={size*0.23} r={size*0.03} fill="#000" />
          {/* upper jaw */}
          <line x1={size*0.68} y1={size*0.20} x2={size*0.61} y2={size*0.15}
            stroke="#000" strokeWidth={size*0.06} strokeLinecap="round" />
          <line x1={size*0.68} y1={size*0.20} x2={size*0.61} y2={size*0.15}
            stroke="#fff" strokeWidth={size*0.038} strokeLinecap="round" />
          {/* lower jaw */}
          <line x1={size*0.70} y1={size*0.30} x2={size*0.63} y2={size*0.35}
            stroke="#000" strokeWidth={size*0.06} strokeLinecap="round" />
          <line x1={size*0.70} y1={size*0.30} x2={size*0.63} y2={size*0.35}
            stroke="#fff" strokeWidth={size*0.038} strokeLinecap="round" />
          {/* tail tip between jaws */}
          <line x1={size*0.60} y1={size*0.18} x2={size*0.54} y2={size*0.23}
            stroke="#000" strokeWidth={size*0.09} strokeLinecap="round" />
          <line x1={size*0.60} y1={size*0.18} x2={size*0.54} y2={size*0.23}
            stroke="#fff" strokeWidth={size*0.055} strokeLinecap="round" />
        </>
      )}

      {outcome === "project" && (
        // Hammer — black outline on white
        <>
          {/* handle outline */}
          <line x1={size*0.54} y1={size*0.52} x2={size*0.78} y2={size*0.80}
            stroke="#000" strokeWidth={size*0.16} strokeLinecap="round" />
          {/* handle fill */}
          <line x1={size*0.54} y1={size*0.52} x2={size*0.78} y2={size*0.80}
            stroke="#fff" strokeWidth={size*0.10} strokeLinecap="round" />
          {/* head outline */}
          <rect x={size*0.20} y={size*0.28} width={size*0.42} height={size*0.24} rx={size*0.04}
            fill="#000" transform={`rotate(-40 ${size*0.41} ${size*0.40})`} />
          {/* head fill */}
          <rect x={size*0.22} y={size*0.30} width={size*0.38} height={size*0.20} rx={size*0.03}
            fill="#fff" transform={`rotate(-40 ${size*0.41} ${size*0.40})`} />
        </>
      )}
    </svg>
  );
}
function BarChart({ data, color = "#f0ede8", unit = "" }) {
  const [tapped, setTapped] = useState(null);
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const shortLabel = (l) => l.startsWith("5.") ? l.slice(2) : l;
  return (
    <div style={{ overflowX:"auto", paddingBottom:4 }}>
      <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:96, minWidth: data.length * 26 }}>
        {data.map((d, i) => (
          <div key={i} onClick={() => setTapped(tapped===i ? null : i)}
            style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, flex:1, cursor:"pointer", position:"relative" }}>
            {tapped === i && (
              <div style={{ position:"absolute", bottom:-28, left:"50%", transform:"translateX(-50%)", background:"#f0ede8", color:"#0e0e0e", fontSize:10, fontWeight:700, borderRadius:3, padding:"2px 6px", whiteSpace:"nowrap", zIndex:10 }}>
                {d.value}{unit}
              </div>
            )}
            <div style={{ width:"100%", maxWidth:26, background: tapped===i ? "#fff" : color, borderRadius:"2px 2px 0 0", height: Math.max(3, (d.value / max) * 72), opacity: tapped===i ? 1 : 0.85, transition:"all 0.15s" }} />
            <div style={{ fontSize:9, color: tapped===i ? "#f0ede8" : "#666", letterSpacing:"0.02em", textAlign:"center", maxWidth:28, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{shortLabel(d.label)}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:12, color:"#999", marginTop:6, letterSpacing:"0.06em" }}>tap a bar to see value</div>
    </div>
  );
}

// ── Bottom nav ────────────────────────────────────────────────────────────────
function BottomNav({ tab, setTab, hasActiveSession }) {
  return (
    <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:390, background:"#111", borderTop:"1px solid #2a2a2a", display:"flex", zIndex:60, paddingBottom:"env(safe-area-inset-bottom)" }}>
      {[
        { id:"home",     icon:"⌂", label:"home" },
        { id:"lookup",   icon:"⊙", label:"look up" },
        { id:"insights", icon:"◈", label:"insights" },
      ].map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{ flex:1, padding:"12px 0 10px", background:"none", border:"none", cursor:"pointer", fontFamily:"'DM Mono',monospace", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
          <span style={{ fontSize:22, color: tab===t.id ? "#f0ede8" : "#555", transition:"color 0.12s" }}>{t.icon}</span>
          <span style={{ fontSize:9, letterSpacing:"0.1em", color: tab===t.id ? "#f0ede8" : "#444", textTransform:"uppercase" }}>{t.label}</span>
          {t.id==="home" && hasActiveSession && <span style={{ width:5, height:5, borderRadius:"50%", background:"#4caf50", display:"block", marginTop:1 }} />}
        </button>
      ))}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App({ user, onSignOut }) {
  const [screen, setScreen] = useState("home");
  const [tab, setTab] = useState("home");
  const [activeSession, setActiveSession] = useState(null);
  const [logs, setLogs] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [allClimbs, setAllClimbs] = useState([]);
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
  const [isAddingClimbs, setIsAddingClimbs] = useState(false);
  const [firstClimbHint, setFirstClimbHint] = useState(false);
  const [sessionOnboardHint, setSessionOnboardHint] = useState(false);
  const [editingRating, setEditingRating] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [localNote, setLocalNote] = useState("");
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupMode, setLookupMode] = useState("sessions"); // "sessions" | "climbs"
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [confirmEndEmpty, setConfirmEndEmpty] = useState(false);

  const noteTimerRef = useRef(null);

  const grades = discipline === "route" ? ROUTE_GRADES : BOULDER_GRADES;
  const isOutdoor = environment === "outdoor";
  const isGym = environment === "gym";
  const canLog = selectedGrade && (!isOutdoor || climbName.trim());
  const pastLocations = isGym ? gymLocations : outdoorLocations;
  const showNav = TAB_SCREENS.includes(screen);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoadingSessions(true);
    const { data: sessions } = await supabase.from('sessions').select('*').order('started_at', { ascending: false });
    const { data: climbs } = await supabase.from('climbs').select('*').order('logged_at', { ascending: false });
    if (!sessions) { setLoadingSessions(false); return; }
    const climbsArr = climbs || [];
    const sessionsWithClimbs = sessions.map(s => ({ ...s, logs: climbsArr.filter(c => c.session_id === s.id) }));
    setAllSessions(sessionsWithClimbs);
    setAllClimbs(climbsArr);
    setGymLocations([...new Set(sessionsWithClimbs.filter(s=>s.environment==="gym").map(s=>s.location).filter(Boolean))]);
    setOutdoorLocations([...new Set(sessionsWithClimbs.filter(s=>s.environment==="outdoor").map(s=>s.location).filter(Boolean))]);
    const active = sessionsWithClimbs.find(s => !s.ended_at);
    if (active) { setActiveSession(active); setLogs(active.logs); setEnvironment(active.environment); setDiscipline(active.discipline); }
    setLoadingSessions(false);
  };

  // ── DB helpers ──────────────────────────────────────────────────────────────
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
    await supabase.from('climbs').update(updates).eq('id', climbId);
  };

  const deleteClimbFromDb = async (climbId) => { await supabase.from('climbs').delete().eq('id', climbId); };

  const deleteSession = async (sessionId) => {
    await supabase.from('climbs').delete().eq('session_id', sessionId);
    await supabase.from('sessions').delete().eq('id', sessionId);
    const removed = allSessions.filter(s => s.id !== sessionId);
    setAllSessions(removed);
    setAllClimbs(prev => prev.filter(c => c.session_id !== sessionId));
    setDeleteSessionTarget(null);
    if (activeSession?.id === sessionId) { setActiveSession(null); setLogs([]); }
  };

  const renameLocation = async () => {
    if (!newLocation.trim() || !activeSession) return;
    await supabase.from('sessions').update({ location: newLocation.trim() }).eq('id', activeSession.id);
    setActiveSession(prev => ({...prev, location: newLocation.trim()}));
    setEditingLocation(false);
  };

  // ── Logging ─────────────────────────────────────────────────────────────────
  const commitLog = async (outcome, firstGo = false) => {
    if (!canLog || !activeSession) return;
    const climbData = { name: climbName.trim()||null, grade: selectedGrade, outcome, first_go: firstGo, angles:[], styles:[], note:"", is_gym: isGym };
    const tempId = `temp-${Date.now()}`;
    const tempEntry = { id: tempId, ...climbData, logged_at: new Date().toISOString() };
    setLogs(prev => [tempEntry, ...prev]);
    setJustLogged(tempEntry); setJustLoggedId(tempId);
    setClimbName(""); setSelectedGrade(null);
    setTimeout(() => { setJustLogged(null); setJustLoggedId(null); }, 1800);
    clearTimeout(noteTimerRef.current);
    setNoteWindowId(tempId);
    noteTimerRef.current = setTimeout(() => setNoteWindowId(null), NOTE_WINDOW_MS);
    const saved = await saveClimbToDb(activeSession.id, climbData);
    if (saved) {
      const withGym = {...saved, is_gym: isGym};
      setLogs(prev => prev.map(l => l.id===tempId ? withGym : l));
      setAllClimbs(prev => [withGym, ...prev.filter(c => c.id !== tempId)]);
      setNoteWindowId(saved.id);
    }
  };

  const showTapHint = () => {
    if (isAddingClimbs) return;
    setSessionOnboardHint(false);
    setFirstClimbHint(true);
  };

  const handleSent = () => { showTapHint(); commitLog("sent", false); };
  const handleFirstGo = () => { showTapHint(); setZapActive(true); setTimeout(() => setZapActive(false), 400); commitLog("sent", true); };

  const dupeLog = async (log) => {
    if (!activeSession) return;
    showTapHint();
    const climbData = { name: log.name||null, grade: log.grade, outcome: log.outcome, first_go: false, angles: log.angles||[], styles: log.styles||[], note: "", is_gym: isGym };
    const tempId = `temp-${Date.now()}`;
    const tempEntry = { id: tempId, ...climbData, logged_at: new Date().toISOString() };
    setLogs(prev => [tempEntry, ...prev]);
    setJustLoggedId(tempId);
    setTimeout(() => setJustLoggedId(null), 1800);
    const saved = await saveClimbToDb(activeSession.id, climbData);
    if (saved) {
      const withGym = { ...saved, is_gym: isGym };
      setLogs(prev => prev.map(l => l.id===tempId ? withGym : l));
      setAllClimbs(prev => [withGym, ...prev.filter(c => c.id !== tempId)]);
    }
  };

  const openSheet = (entry) => { clearTimeout(noteTimerRef.current); setNoteWindowId(null); setFirstClimbHint(false); setSheetEntry(entry); };

  const saveDetail = async ({ name, grade, outcome, note, angles, styles, first_go, pitches }) => {
    setSheetSaving(true);
    const disc = discipline || (viewingSession?.discipline) || "boulder";
    const updates = { name: name||null, grade, grade_sort: gradeSort(grade, disc), outcome, note, angles, styles, first_go, pitches: pitches||null };
    const updateLog = l => l.id===sheetEntry.id ? {...l,...updates} : l;
    setLogs(prev => prev.map(updateLog));
    setAllClimbs(prev => prev.map(updateLog));
    if (viewingSession) {
      const updated = {...viewingSession, logs: viewingSession.logs.map(updateLog)};
      setViewingSession(updated);
      setAllSessions(prev => prev.map(s => s.id===viewingSession.id ? updated : s));
    }
    if (!String(sheetEntry.id).startsWith('temp-')) await updateClimbInDb(sheetEntry.id, updates);
    setSheetSaving(false); setSheetEntry(null);
  };

  const deleteClimb = async () => {
    const id = sheetEntry.id; setSheetEntry(null);
    setLogs(prev => prev.filter(l => l.id !== id));
    setAllClimbs(prev => prev.filter(c => c.id !== id));
    if (viewingSession) {
      const updated = {...viewingSession, logs: viewingSession.logs.filter(l => l.id !== id)};
      setViewingSession(updated);
      setAllSessions(prev => prev.map(s => s.id===viewingSession.id ? updated : s));
    }
    if (!String(id).startsWith('temp-')) await deleteClimbFromDb(id);
  };

  // ── Session management ──────────────────────────────────────────────────────
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
    const newSession = {...data, logs:[]};
    setAllSessions(prev => [newSession, ...prev]);
    setActiveSession(data); setLogs([]); setClimbName(""); setSelectedGrade(null); setNoteWindowId(null);
    setIsAddingClimbs(false);
    setFirstClimbHint(false);
    // Show onboard hint every time a new session starts — persists until first climb logged
    setSessionOnboardHint(true);
    setScreen("logging");
  };

  const endSession = async () => {
    if (!activeSession) return;
    if (logs.length === 0) {
      setConfirmEndEmpty(true);
      return;
    }
    clearTimeout(noteTimerRef.current); setNoteWindowId(null);
    await supabase.from('sessions').update({ ended_at: new Date().toISOString() }).eq('id', activeSession.id);
    const done = { ...activeSession, logs, ended_at: new Date().toISOString() };
    setAllSessions(prev => prev.map(s => s.id === activeSession.id ? done : s));
    setActiveSession(null); setViewingSession(done); setScreen("summary");
  };

  const endEmptySession = async () => {
    if (!activeSession) return;
    setConfirmEndEmpty(false);
    await supabase.from('sessions').delete().eq('id', activeSession.id);
    setAllSessions(prev => prev.filter(s => s.id !== activeSession.id));
    setActiveSession(null); setLogs([]);
    setScreen("home"); setTab("home");
  };

  const addClimbsTo = async (session) => {
    const sessionClimbs = allClimbs.filter(c => c.session_id === session.id);
    setActiveSession(session);
    setLogs(sessionClimbs);
    setEnvironment(session.environment);
    setDiscipline(session.discipline);
    setClimbName(""); setSelectedGrade(null); setNoteWindowId(null);
    setIsAddingClimbs(true);
    setViewingSession(session);
    setScreen("logging");
  };

  const doneAddingClimbs = async (goTo) => {
    clearTimeout(noteTimerRef.current); setNoteWindowId(null);
    const freshClimbs = allClimbs.filter(c => c.session_id === activeSession.id);
    const updated = {...viewingSession, logs: freshClimbs};
    setViewingSession(updated);
    setAllSessions(prev => prev.map(s => s.id===activeSession.id ? updated : s));
    setActiveSession(null); setLogs([]);
    setIsAddingClimbs(false);
    setScreen(goTo || "sessionDetail");
  };

  // ── Lookup helpers ──────────────────────────────────────────────────────────
  const filteredSessions = useMemo(() => {
    if (!lookupQuery.trim()) return allSessions.filter(s => s.ended_at);
    const q = lookupQuery.toLowerCase();
    return allSessions.filter(s => s.ended_at && (s.location||"").toLowerCase().includes(q));
  }, [lookupQuery, allSessions]);

  const filteredClimbs = useMemo(() => {
    if (!lookupQuery.trim()) return [];
    const q = lookupQuery.toLowerCase();
    return allClimbs.filter(c => (c.name||"").toLowerCase().includes(q)).slice(0, 30);
  }, [lookupQuery, allClimbs]);

  // ── Open projects logic ─────────────────────────────────────────────────────
  // fingerprint = name (lowercase) + grade + location — outdoor named climbs only
  const openProjects = useMemo(() => {
    // Build a map of fingerprint → { projectLogs, sentLogs }
    const map = {};
    const outdoorSessions = Object.fromEntries(allSessions.map(s => [s.id, s]));
    allClimbs.forEach(c => {
      if (!c.name || c.is_gym) return; // outdoor named only
      const session = outdoorSessions[c.session_id];
      if (!session || session.environment === "gym") return;
      const location = session.location || "";
      const key = `${c.name.trim().toLowerCase()}|${c.grade}|${location.trim().toLowerCase()}`;
      if (!map[key]) map[key] = { name: c.name, grade: c.grade, location, projectLogs: [], sentLogs: [], lastAttempt: null };
      if (c.outcome === "project") map[key].projectLogs.push(c);
      if (c.outcome === "sent") map[key].sentLogs.push(c);
      // track most recent attempt date
      const d = new Date(c.logged_at);
      if (!map[key].lastAttempt || d > map[key].lastAttempt) map[key].lastAttempt = d;
    });
    // Open = has projects, no sends
    return Object.values(map)
      .filter(p => p.projectLogs.length > 0 && p.sentLogs.length === 0)
      .sort((a, b) => b.lastAttempt - a.lastAttempt);
  }, [allClimbs, allSessions]);

  const [projectFilterArea, setProjectFilterArea] = useState("");
  const [projectFilterGrade, setProjectFilterGrade] = useState("");

  const filteredProjects = useMemo(() => {
    let list = openProjects;
    if (projectFilterArea.trim()) {
      const q = projectFilterArea.toLowerCase();
      list = list.filter(p => p.location.toLowerCase().includes(q));
    }
    if (projectFilterGrade) {
      list = list.filter(p => p.grade === projectFilterGrade);
    }
    return list;
  }, [openProjects, projectFilterArea, projectFilterGrade]);

  // All distinct locations and grades that appear in open projects (for filter chips)
  const projectAreas = useMemo(() => [...new Set(openProjects.map(p => p.location))].sort(), [openProjects]);
  const projectGrades = useMemo(() => {
    const grades = [...new Set(openProjects.map(p => p.grade))];
    return grades.sort((a, b) => (gradeSort(a, BOULDER_GRADES.includes(a) ? "boulder" : "route") - gradeSort(b, BOULDER_GRADES.includes(b) ? "boulder" : "route")));
  }, [openProjects]);

  // ── Insights data ───────────────────────────────────────────────────────────
  const [insightsDiscipline, setInsightsDiscipline] = useState("boulder");
  const [showBestExplain, setShowBestExplain] = useState(false);

  const insightsData = useMemo(() => {
    const compute = (disc) => {
      const gradeList = disc === "boulder" ? BOULDER_GRADES : ROUTE_GRADES;
      const discClimbs = allClimbs.filter(c => gradeList.includes(c.grade));
      const discSessions = allSessions.filter(s => s.ended_at && s.discipline === disc);

      const sent = discClimbs.filter(c => c.outcome === "sent");
      const flashed = discClimbs.filter(c => c.first_go === true);
      const total = discClimbs.length;
      const locations = new Set(discSessions.map(s => s.location).filter(Boolean)).size;

      // Flash % by grade — flashes / (sent + project) per grade, excludes repeats
      const gradeAttempts = {}; // grade -> { flashes, sends }
      discClimbs.filter(c => c.outcome !== "repeat").forEach(c => {
        if (!gradeAttempts[c.grade]) gradeAttempts[c.grade] = { flashes: 0, total: 0 };
        gradeAttempts[c.grade].total++;
        if (c.first_go) gradeAttempts[c.grade].flashes++;
      });
      const flashByGrade = gradeList
        .filter(g => gradeAttempts[g] && gradeAttempts[g].total >= 2)
        .map(g => ({ label: g, value: Math.round((gradeAttempts[g].flashes / gradeAttempts[g].total) * 100) }));

      // Sends by grade bar chart
      const gradeMap = {};
      sent.forEach(c => { gradeMap[c.grade] = (gradeMap[c.grade]||0) + 1; });
      const gradeCounts = gradeList.filter(g => gradeMap[g]).map(g => ({ label: g, value: gradeMap[g] }));

      // Top locations for this discipline
      const locMap = {};
      discSessions.forEach(s => { if (s.location) locMap[s.location] = (locMap[s.location]||0) + (s.logs||[]).filter(l => gradeList.includes(l.grade)).length; });
      const topLocs = Object.entries(locMap).sort((a,b)=>b[1]-a[1]).map(([label,value])=>({label,value}));

      // Best conditions on sends
      let bestConditions = null;
      if (sent.length >= 10) {
        const angleCount = {}; const styleCount = {};
        sent.forEach(c => {
          (c.angles||[]).forEach(a => { angleCount[a] = (angleCount[a]||0)+1; });
          (c.styles||[]).forEach(s => { styleCount[s] = (styleCount[s]||0)+1; });
        });
        const topAngle = Object.entries(angleCount).sort((a,b)=>b[1]-a[1])[0];
        const topStyle = Object.entries(styleCount).sort((a,b)=>b[1]-a[1])[0];
        if (topAngle || topStyle) bestConditions = { angle: topAngle?.[0], style: topStyle?.[0] };
      }

      // Outdoor vs gym for this discipline
      const outdoorCount = discClimbs.filter(c => !c.is_gym).length;
      const gymCount = discClimbs.filter(c => c.is_gym).length;

      return { total, sent: sent.length, flashed: flashed.length, sessions: discSessions.length, locations, gradeCounts, flashByGrade, topLocs, bestConditions, outdoorCount, gymCount };
    };

    return { boulder: compute("boulder"), route: compute("route") };
  }, [allClimbs, allSessions]);

  const sends   = logs.filter(l => l.outcome==="sent");
  const repeats = logs.filter(l => l.outcome==="repeat");
  const flashes = logs.filter(l => l.first_go===true);

  // ── Dupe send prompt ─────────────────────────────────────────────────────────
  // Inline JSX helpers (not components — avoids React reconciliation issues)
  const Sheet = () => sheetEntry ? (
    <DetailSheet entry={sheetEntry}
      discipline={discipline || viewingSession?.discipline || "boulder"}
      onSave={saveDetail} onDismiss={() => setSheetEntry(null)} onDelete={deleteClimb} saving={sheetSaving} />
  ) : null;

  const DeleteSessionModal = () => !deleteSessionTarget ? null : (
    <div style={S.overlay} onClick={() => setDeleteSessionTarget(null)}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>
        <div style={S.sheetHandle} />
        <div style={{ textAlign:"center", padding:"12px 0 8px" }}>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>delete this session?</div>
          <div style={{ fontSize:13, color:"#999", marginBottom:4 }}>{deleteSessionTarget.location}</div>
          <div style={{ fontSize:12, color:"#999", marginBottom:24 }}>{deleteSessionTarget.logs?.length || 0} climbs will be deleted</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <button style={S.btnSecondary} onClick={() => setDeleteSessionTarget(null)}>cancel</button>
            <button style={{ ...S.btnPrimary, background:"#c0392b" }} onClick={() => { deleteSession(deleteSessionTarget.id); if (screen==="sessionDetail") { setViewingSession(null); setScreen("home"); } }}>delete</button>
          </div>
        </div>
      </div>
    </div>
  );

  // Inline JSX helpers (not components — avoids React reconciliation issues)

  const confirmEndOverlay = confirmEndEmpty ? (
    <div style={S.overlay} onClick={() => setConfirmEndEmpty(false)}>
      <div style={S.sheet} onClick={e => e.stopPropagation()}>
        <div style={S.sheetHandle} />
        <div style={{ textAlign:"center", padding:"12px 0 8px" }}>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>end empty session?</div>
          <div style={{ fontSize:13, color:"#999", marginBottom:24 }}>no climbs logged — this session won't be saved</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <button style={S.btnSecondary} onClick={() => setConfirmEndEmpty(false)}>keep going</button>
            <button style={{ ...S.btnPrimary, background:"#c0392b" }} onClick={endEmptySession}>end anyway</button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  // ── LOADING ──────────────────────────────────────────────────────────────────
  if (loadingSessions) return <SummitLoader />;

  // ── HOME tab ─────────────────────────────────────────────────────────────────
  if (screen === "home") {
    const pastSessions = allSessions.filter(s => s.ended_at);
    const latestSession = allSessions[0];
    const displaySessions = showAllSessions ? pastSessions : pastSessions.slice(0, 8);

    return (
      <div style={S.app}>
        <Sheet /><DeleteSessionModal />{confirmEndOverlay}
        <div style={{ padding:"52px 24px 200px" }}>
          <div style={S.homeTop}><div style={S.logo}>SUMMIT</div><div style={S.tagline}>your climbing registry</div></div>

          {/* Active session — IN PROGRESS */}
          {activeSession && (
            <div style={S.activeCard} onClick={() => setScreen("logging")}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, color:"#4caf50", letterSpacing:"0.15em", marginBottom:6 }}>● IN PROGRESS</div>
                  <div style={{ fontSize:20, fontWeight:700, color:"#f0ede8" }}>{activeSession.location}</div>
                  <div style={{ fontSize:14, color:"#ddd", marginTop:3, fontWeight:600 }}>{new Date(activeSession.started_at).toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"})}</div>
                  <div style={{ fontSize:13, color:"#bbb", marginTop:3 }}>{activeSession.discipline} · {logs.length} logged · {sends.length} sent{flashes.length>0?` · ${flashes.length} ⚡`:""}
                  </div>
                </div>
                <button style={S.endBtnSmall} onClick={e => { e.stopPropagation(); endSession(); }}>END</button>
              </div>
            </div>
          )}

          {/* Last session card — only when no active */}
          {!activeSession && latestSession && (
            <div style={S.latestCard} onClick={() => { setViewingSession(latestSession); setScreen("sessionDetail"); }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, letterSpacing:"0.15em", marginBottom:6, color:"#aaa" }}>LAST SESSION</div>
                  <div style={{ fontSize:20, fontWeight:700, color:"#f0ede8" }}>{latestSession.location}</div>
                  <div style={{ fontSize:14, color:"#ddd", marginTop:3, fontWeight:600 }}>{new Date(latestSession.started_at).toLocaleDateString([],{weekday:"short",month:"short",day:"numeric"})}</div>
                  <div style={{ fontSize:13, color:"#bbb", marginTop:3 }}>{latestSession.discipline} · {(latestSession.logs||[]).filter(l=>l.outcome==="sent").length} send · {(latestSession.logs||[]).length} climbs</div>
                </div>
                <div style={{ fontSize:22, color:"#888", alignSelf:"center" }}>›</div>
              </div>
            </div>
          )}

          {/* Session list */}
          {loadingSessions ? (
            <div style={{ color:"#999", fontSize:12, letterSpacing:"0.1em", padding:"20px 0" }}>loading...</div>
          ) : pastSessions.length > 0 ? (
            <>
              <div style={S.sectionLabel}>sessions</div>
              {displaySessions.filter(s => s.id !== latestSession?.id).map(s => (
                <div key={s.id} style={S.sessionCard}>
                  <div style={{ flex:1 }} onClick={() => { setViewingSession(s); setScreen("sessionDetail"); }}>
                    <div style={S.sessionCardLocation}>{s.location}</div>
                    <div style={S.sessionCardMeta}>{s.discipline} · {(s.logs||[]).filter(l=>l.outcome==="sent").length} send · {(s.logs||[]).length} climbs</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={S.sessionCardDate}>{new Date(s.started_at).toLocaleDateString([],{month:"short",day:"numeric"})}</div>
                    <button style={S.trashBtn} onClick={() => setDeleteSessionTarget(s)}>✕</button>
                  </div>
                </div>
              ))}
              {pastSessions.length > 9 && !showAllSessions && (
                <button style={S.lookupMoreBtn} onClick={() => { setTab("lookup"); setScreen("lookup"); }}>
                  look up more ›
                </button>
              )}
            </>
          ) : !activeSession && (
            <div style={{ textAlign:"center", padding:"52px 0" }}>
              <div style={{ fontSize:42, marginBottom:12 }}>⬡</div>
              <div style={{ fontSize:16, fontWeight:700, color:"#f0ede8", marginBottom:6 }}>no sessions yet</div>
              <div style={{ fontSize:13, color:"#aaa", lineHeight:1.6 }}>start your first session to begin tracking</div>
            </div>
          )}
        </div>

        {/* START SESSION + sign out */}
        <div style={S.floatingBtn}>
          {!activeSession && !loadingSessions && <button style={S.startBtn} onClick={startSetup}>START SESSION</button>}
          <button style={S.signOutBtn} onClick={onSignOut}>sign out</button>
        </div>

        <BottomNav tab={tab} setTab={t => { setTab(t); setScreen(t); }} hasActiveSession={!!activeSession} />
      </div>
    );
  }

  // ── LOOKUP tab ───────────────────────────────────────────────────────────────
  if (screen === "lookup") {
    return (
      <div style={S.app}>
        <Sheet /><DeleteSessionModal />{confirmEndOverlay}
        <div style={{ padding:"52px 24px 160px" }}>
          <div style={S.homeTop}><div style={S.logo}>LOOK UP</div><div style={S.tagline}>find sessions & climbs</div></div>

          {/* Mode toggle — three modes */}
          <div style={{ display:"flex", gap:6, marginBottom:20 }}>
            {["sessions","climbs","projects"].map(m => (
              <button key={m} onClick={() => setLookupMode(m)} style={{
                flex:1, padding:"9px 4px", borderRadius:6, fontSize:10, fontWeight:700, letterSpacing:"0.08em",
                cursor:"pointer", fontFamily:"'DM Mono',monospace", border:"none",
                background: lookupMode===m ? "#f0ede8" : "#161616",
                color: lookupMode===m ? "#0e0e0e" : "#777",
              }}>{m.toUpperCase()}</button>
            ))}
          </div>

          {/* Search input — hidden for projects mode (uses filter chips instead) */}
          {lookupMode !== "projects" && (
            <input
              style={{ ...S.nameInputBoxed, marginBottom:20 }}
              placeholder={lookupMode === "sessions" ? "search by location..." : "search by climb name..."}
              value={lookupQuery}
              onChange={e => setLookupQuery(e.target.value)}
              autoCapitalize="off"
            />
          )}

          {/* SESSIONS */}
          {lookupMode === "sessions" && (
            <>
              {filteredSessions.length === 0 && lookupQuery && (
                <div style={{ color:"#999", fontSize:13, padding:"20px 0" }}>no sessions match "{lookupQuery}"</div>
              )}
              {filteredSessions.length === 0 && !lookupQuery && (
                <div style={{ color:"#999", fontSize:13, padding:"20px 0" }}>type to search sessions by location</div>
              )}
              {filteredSessions.map(s => (
                <div key={s.id} style={S.sessionCard} onClick={() => { setViewingSession(s); setScreen("sessionDetail"); }}>
                  <div style={{ flex:1 }}>
                    <div style={S.sessionCardLocation}>{s.location}</div>
                    <div style={S.sessionCardMeta}>{s.discipline} · {(s.logs||[]).filter(l=>l.outcome==="sent").length} send · {(s.logs||[]).length} climbs</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={S.sessionCardDate}>{new Date(s.started_at).toLocaleDateString([],{month:"short",day:"numeric"})}</div>
                    <div style={{ fontSize:18, color:"#aaa" }}>›</div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* CLIMBS */}
          {lookupMode === "climbs" && (
            <>
              {!lookupQuery && <div style={{ color:"#999", fontSize:13, padding:"20px 0" }}>type a climb name to search</div>}
              {lookupQuery && filteredClimbs.length === 0 && <div style={{ color:"#999", fontSize:13, padding:"20px 0" }}>no climbs named "{lookupQuery}"</div>}
              {filteredClimbs.map(c => {
                const hasTags = (c.angles||[]).length > 0 || (c.styles||[]).length > 0;
                return (
                  <div key={c.id} style={S.detailRow} onClick={() => openSheet(c)}>
                    <div style={S.detailTop}>
                      <OutcomeIcon outcome={c.outcome} firstGo={c.first_go} size={26} />
                      <span style={S.detailName}>{displayName(c)}</span>
                      <span style={S.detailGrade}>{c.grade}</span>
                    </div>
                    {hasTags && <div style={S.tagPills}>{[...(c.angles||[]),...(c.styles||[])].map(t=><span key={t} style={S.pill}>{t}</span>)}</div>}
                    {c.note && <div style={S.noteChip}>✎ {c.note}</div>}
                  </div>
                );
              })}
            </>
          )}

          {/* OPEN PROJECTS */}
          {lookupMode === "projects" && (
            <>
              {/* Area filter chips */}
              {projectAreas.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:"#aaa", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:8 }}>filter by area</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {projectAreas.map(area => (
                      <button key={area} onClick={() => setProjectFilterArea(projectFilterArea === area ? "" : area)} style={{
                        padding:"6px 12px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer",
                        fontFamily:"'DM Mono',monospace", border:"none", transition:"all 0.12s",
                        background: projectFilterArea === area ? COLOR_PROJECT : "#1e1e1e",
                        color: projectFilterArea === area ? "#fff" : "#aaa",
                      }}>{area}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Grade filter chips */}
              {projectGrades.length > 0 && (
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, color:"#aaa", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:8 }}>filter by grade</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {projectGrades.map(g => (
                      <button key={g} onClick={() => setProjectFilterGrade(projectFilterGrade === g ? "" : g)} style={{
                        padding:"6px 12px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer",
                        fontFamily:"'DM Mono',monospace", border:"none", transition:"all 0.12s",
                        background: projectFilterGrade === g ? "#f0ede8" : "#1e1e1e",
                        color: projectFilterGrade === g ? "#0e0e0e" : "#aaa",
                      }}>{g}</button>
                    ))}
                  </div>
                </div>
              )}

              {openProjects.length === 0 && (
                <div style={{ textAlign:"center", padding:"40px 0" }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>🐍</div>
                  <div style={{ fontSize:16, fontWeight:700, color:"#f0ede8", marginBottom:6 }}>no open projects</div>
                  <div style={{ fontSize:13, color:"#aaa", lineHeight:1.6 }}>log outdoor climbs as PROJECT and they'll appear here until you send them</div>
                </div>
              )}

              {openProjects.length > 0 && filteredProjects.length === 0 && (
                <div style={{ color:"#999", fontSize:13, padding:"20px 0" }}>no projects match those filters</div>
              )}

              {filteredProjects.map((p, i) => (
                <div key={i} style={{ ...S.detailRow }}>
                  <div style={S.detailTop}>
                    <OutcomeIcon outcome="project" size={26} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={S.detailName}>{p.name}</div>
                      <div style={{ fontSize:12, color:"#aaa", marginTop:2 }}>
                        {p.location} · {p.projectLogs.length} {p.projectLogs.length === 1 ? "attempt" : "attempts"}
                        {" · last "}{p.lastAttempt.toLocaleDateString([],{month:"short",day:"numeric"})}
                      </div>
                    </div>
                    <span style={S.detailGrade}>{p.grade}</span>
                  </div>
                </div>
              ))}

              {filteredProjects.length > 0 && (
                <div style={{ fontSize:12, color:"#777", marginTop:16, textAlign:"center", lineHeight:1.6 }}>
                  {filteredProjects.length} open {filteredProjects.length === 1 ? "project" : "projects"}
                  {projectFilterArea || projectFilterGrade ? " matching filters" : ""}
                </div>
              )}
            </>
          )}
        </div>
        <BottomNav tab={tab} setTab={t => { setTab(t); setScreen(t); }} hasActiveSession={!!activeSession} />
      </div>
    );
  }

  // ── INSIGHTS tab ─────────────────────────────────────────────────────────────
  if (screen === "insights") {
    const d = insightsData[insightsDiscipline];
    const { total, sent, flashed, sessions, locations, gradeCounts, flashByGrade, topLocs, bestConditions, outdoorCount, gymCount } = d;
    const hasData = total >= 1;
    const hasGradeData = gradeCounts.length >= 3;
    const hasBestConditions = !!bestConditions;

    return (
      <div style={S.app}>
        {showBestExplain && (
          <div style={S.overlay} onClick={() => setShowBestExplain(false)}>
            <div style={S.sheet} onClick={e => e.stopPropagation()}>
              <div style={S.sheetHandle} />
              <div style={{ fontSize:14, color:"#ccc", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:14 }}>how this is calculated</div>
              <div style={{ fontSize:14, color:"#f0ede8", lineHeight:1.8, marginBottom:16 }}>
                We look at all your sends and count which <span style={{ color:"#e07820" }}>angles</span> and <span style={{ color:"#e07820" }}>styles</span> appear most often.
              </div>
              <div style={{ fontSize:14, color:"#ccc", lineHeight:1.7, marginBottom:20 }}>
                The top angle and top style from your {sent} sends are combined to give you your preferred climbing conditions. The more you tag, the more accurate this gets.
              </div>
              <button style={{ ...S.btnPrimary, width:"100%" }} onClick={() => setShowBestExplain(false)}>got it</button>
            </div>
          </div>
        )}

        <div style={{ padding:"52px 24px 160px" }}>
          <div style={S.homeTop}><div style={S.logo}>INSIGHTS</div><div style={S.tagline}>your climbing data</div></div>

          {/* Boulder / Route toggle */}
          <div style={{ display:"flex", gap:6, marginBottom:28, background:"#141414", borderRadius:8, padding:4 }}>
            {["boulder","route"].map(disc => (
              <button key={disc} onClick={() => setInsightsDiscipline(disc)} style={{
                flex:1, padding:"10px 0", borderRadius:6, fontSize:12, fontWeight:700, letterSpacing:"0.1em",
                cursor:"pointer", fontFamily:"'DM Mono',monospace", border:"none", transition:"all 0.15s",
                background: insightsDiscipline===disc ? "#f0ede8" : "transparent",
                color: insightsDiscipline===disc ? "#0e0e0e" : "#555",
              }}>{disc.toUpperCase()}</button>
            ))}
          </div>

          {!hasData ? (
            <div style={{ textAlign:"center", padding:"40px 0" }}>
              <div style={{ fontSize:42, marginBottom:12 }}>◈</div>
              <div style={{ fontSize:16, fontWeight:700, color:"#f0ede8", marginBottom:6 }}>no {insightsDiscipline} data yet</div>
              <div style={{ fontSize:14, color:"#aaa", lineHeight:1.6 }}>log some {insightsDiscipline} sessions to see your insights</div>
            </div>
          ) : (
            <>
              {/* Totals */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:20 }}>
                {[
                  { num: total,    label:"climbs" },
                  { num: sent,     label:"send" },
                  { num: sessions, label:"sessions" },
                  { num: locations,label:"locations" },
                ].map(({ num, label }) => (
                  <div key={label} style={S.statBox}>
                    <div style={{ fontSize:30, fontWeight:700, color:"#f0ede8" }}>{num}</div>
                    <div style={{ fontSize:12, color:"#ccc", letterSpacing:"0.1em", textTransform:"uppercase", marginTop:2 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Sends by grade */}
              <div style={{ background:"#141414", border:"1px solid #2a2a2a", borderRadius:8, padding:"16px 20px", marginBottom:16 }}>
                <div style={{ fontSize:12, color:"#ccc", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:12 }}>sends by grade</div>
                {hasGradeData ? (
                  <BarChart data={gradeCounts} color="#f0ede8" unit=" sends" />
                ) : (
                  <div style={{ fontSize:13, color:"#aaa", fontStyle:"italic" }}>log {Math.max(0, 3 - gradeCounts.length)} more sends across different grades to unlock</div>
                )}
              </div>

              {/* Outdoor vs gym */}
              {(outdoorCount > 0 || gymCount > 0) && (
                <div style={{ background:"#141414", border:"1px solid #2a2a2a", borderRadius:8, padding:"16px 20px", marginBottom:16 }}>
                  <div style={{ fontSize:12, color:"#ccc", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:12 }}>outdoor vs gym</div>
                  <div style={{ display:"flex", gap:10 }}>
                    <div style={{ flex: outdoorCount||1, background:"#1a3a1a", border:"1px solid #2a4a2a", borderRadius:6, padding:"10px 14px" }}>
                      <div style={{ fontSize:22, fontWeight:700, color:"#4caf50" }}>{outdoorCount}</div>
                      <div style={{ fontSize:10, color:"#4caf50", letterSpacing:"0.1em", marginTop:2 }}>OUTDOOR</div>
                    </div>
                    <div style={{ flex: gymCount||1, background:"#06111a", border:"1px solid #1a4a6a", borderRadius:6, padding:"10px 14px" }}>
                      <div style={{ fontSize:22, fontWeight:700, color:"#4a9fd4" }}>{gymCount}</div>
                      <div style={{ fontSize:10, color:"#4a9fd4", letterSpacing:"0.1em", marginTop:2 }}>GYM</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Top spots — top 5 visible, rest scrollable */}
              {topLocs.length > 0 && (
                <div style={{ background:"#141414", border:"1px solid #2a2a2a", borderRadius:8, padding:"16px 20px", marginBottom:16 }}>
                  <div style={{ fontSize:12, color:"#ccc", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:12 }}>top spots</div>
                  <div style={{ maxHeight: topLocs.length > 5 ? 210 : "none", overflowY: topLocs.length > 5 ? "auto" : "visible" }}>
                    {topLocs.map((l, i) => (
                      <div key={l.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom: i < topLocs.length-1 ? "1px solid #1a1a1a" : "none" }}>
                        <div style={{ fontSize:13, color: i < 3 ? "#f0ede8" : "#bbb" }}>{i===0?"🥇 ":i===1?"🥈 ":i===2?"🥉 ":""}{l.label}</div>
                        <div style={{ fontSize:13, color:"#ccc", fontWeight:600, flexShrink:0, marginLeft:8 }}>{l.value}</div>
                      </div>
                    ))}
                  </div>
                  {topLocs.length > 5 && <div style={{ fontSize:12, color:"#999", marginTop:8, letterSpacing:"0.06em" }}>scroll to see all {topLocs.length} spots</div>}
                </div>
              )}

              {/* Best conditions — tappable for explanation */}
              <div style={{ background:"#141414", border:`1px solid ${hasBestConditions?"#3a2a1a":"#2a2a2a"}`, borderRadius:8, padding:"16px 20px", marginBottom:16, cursor: hasBestConditions ? "pointer" : "default" }}
                onClick={() => hasBestConditions && setShowBestExplain(true)}>
                <div style={{ fontSize:11, color: hasBestConditions?"#e07820":"#888", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>preferred style</div>
                {hasBestConditions ? (
                  <>
                    <div style={{ fontSize:15, color:"#f0ede8", fontWeight:600, lineHeight:1.6 }}>
                      {bestConditions.angle && <span style={{ color:"#e07820" }}>{bestConditions.angle}</span>}
                      {bestConditions.angle && bestConditions.style && <span style={{ color:"#999" }}> · </span>}
                      {bestConditions.style && <span style={{ color:"#e07820" }}>{bestConditions.style}</span>}
                    </div>
                    <div style={{ fontSize:14, color:"#ccc", marginTop:6 }}>based on {sent} sends · tap to learn more</div>
                  </>
                ) : (
                  <div style={{ fontSize:13, color:"#aaa", fontStyle:"italic" }}>
                    log {Math.max(0, 10 - sent)} more sends to unlock
                    <div style={{ height:4, background:"#1e1e1e", borderRadius:2, marginTop:8 }}>
                      <div style={{ width:`${Math.min(100,(sent/10)*100)}%`, height:"100%", background:"#3a2a1a", borderRadius:2 }} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <BottomNav tab={tab} setTab={t => { setTab(t); setScreen(t); }} hasActiveSession={!!activeSession} />
      </div>
    );
  }

  // ── SESSION DETAIL ───────────────────────────────────────────────────────────
  if (screen === "sessionDetail" && viewingSession) {
    const s = viewingSession;
    const sf = (s.logs||[]).filter(l=>l.first_go===true);
    const RATINGS_LIST = [
      { value:1, label:"Drained",   color:"#c0392b", bg:"#1a0808" },
      { value:2, label:"Fatigued",  color:"#e07820", bg:"#1a1008" },
      { value:3, label:"Felt Good", color:"#aaa",    bg:"#181818" },
      { value:4, label:"Fresh",     color:"#4caf50", bg:"#0d1f0d" },
      { value:5, label:"Locked In", color:"#7eb8f0", bg:"#06111a" },
    ];
    const RATING_LABELS = Object.fromEntries(RATINGS_LIST.map(r=>[r.value,r.label]));
    const RATING_COLORS = Object.fromEntries(RATINGS_LIST.map(r=>[r.value,r.color]));

    const saveRating = async (val) => {
      await supabase.from('sessions').update({ session_rating: val }).eq('id', s.id);
      const updated = {...s, session_rating: val};
      setViewingSession(updated);
      setAllSessions(prev => prev.map(x => x.id===s.id ? updated : x));
      setEditingRating(false);
    };

    const saveNote = async () => {
      await supabase.from('sessions').update({ session_note: localNote.trim()||null }).eq('id', s.id);
      const updated = {...s, session_note: localNote.trim()||null};
      setViewingSession(updated);
      setAllSessions(prev => prev.map(x => x.id===s.id ? updated : x));
      setEditingNote(false);
    };

    const backDest = tab === "lookup" ? "lookup" : "home";

    return (
      <div style={S.app}><Sheet /><DeleteSessionModal />{confirmEndOverlay}
        <div style={{ padding:"52px 24px 80px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:40 }}>
            <button style={S.backBtn} onClick={() => { setViewingSession(null); setScreen(backDest); }}>←</button>
            <button style={{ ...S.trashBtn, color:"#c0392b", fontSize:12 }} onClick={() => setDeleteSessionTarget(s)}>✕ delete</button>
          </div>
          <div style={S.pageTitle}>{s.location}</div>
          <div style={S.pageSubtitle}>{new Date(s.started_at).toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"})}</div>
          <div style={S.statsRow}>
            <div style={S.statBox}><div style={S.statNum}>{(s.logs||[]).length}</div><div style={S.statLabel}>climbs</div></div>
            <div style={S.statBox}><div style={S.statNum}>{(s.logs||[]).filter(l=>l.outcome==="sent").length}</div><div style={S.statLabel}>send</div></div>
            <div style={S.statBox}><div style={S.statNum}>{sf.length}</div><div style={S.statLabel}>⚡ first go</div></div>
          </div>

          <button style={S.addClimbBtn} onClick={() => addClimbsTo(s)}>+ add climb</button>
          <div style={S.sectionLabel}>climbs</div>
          {(s.logs||[]).map(l => <LogDetailRow key={l.id} log={l} onTap={() => openSheet(l)} />)}
        </div>
      </div>
    );
  }

  // ── SETUP ────────────────────────────────────────────────────────────────────
  if (screen === "setup") return (
    <div style={S.app}>
      <div style={{ padding:"52px 24px 48px" }}>
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

  // ── LOGGING ──────────────────────────────────────────────────────────────────
  if (screen === "logging") {
    if (editingLocation) return (
      <div style={S.app}>
        <div style={{ padding:"52px 24px 48px" }}>
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
        <ZapOverlay active={zapActive} /><Sheet />{confirmEndOverlay}
        {justLogged && (
          <div style={{...S.flash, background: justLogged.first_go?"#1a1a00":justLogged.outcome==="sent"?"#0d1f0d":justLogged.outcome==="repeat"?"#061828":"#0a1e1c", color: justLogged.first_go?COLOR_FLASH:justLogged.outcome==="sent"?COLOR_SENT:justLogged.outcome==="repeat"?COLOR_REPEAT:COLOR_PROJECT, border:`1px solid ${justLogged.first_go?COLOR_FLASH:justLogged.outcome==="sent"?COLOR_SENT:justLogged.outcome==="repeat"?COLOR_REPEAT:COLOR_PROJECT}22`}}>
            {justLogged.first_go?"⚡ flash!":justLogged.outcome==="sent"?"✓ send":justLogged.outcome==="repeat"?"↺ repeat":"◎ project"} {justLogged.grade}
          </div>
        )}

        <div style={S.topBar}>
          <button style={S.topBarIconBtn} onClick={async () => {
            if (isAddingClimbs) { await doneAddingClimbs("home"); setTab("home"); }
            else { setScreen("home"); setTab("home"); }
          }}>⌂</button>
          <div style={{ flex:1, textAlign:"center", padding:"0 8px" }}>
            <div style={S.sessionLocation}>{activeSession?.location}</div>
            <div style={S.sessionMeta}>
              <span style={{color:"#ddd"}}>{logs.length} logged</span>
              {sends.length > 0 && <span style={{color:COLOR_SENT}}> · {sends.length} send</span>}
              {repeats.length > 0 && <span style={{color:COLOR_REPEAT}}> · {repeats.length} ↺</span>}
              {flashes.length > 0 && <span style={{color:COLOR_FLASH}}> · {flashes.length} ⚡</span>}
            </div>
          </div>
          <button style={S.topBarIconBtn} onClick={() => { setNewLocation(activeSession?.location||""); setEditingLocation(true); }}>✎</button>
        </div>

        {sessionOnboardHint && (
          <div onClick={() => setSessionOnboardHint(false)} style={{ margin:"14px 24px 0", background:"#1a2a1a", border:"1px solid #2a4a2a", borderRadius:8, padding:"12px 16px", fontSize:12, color:"#bbb", lineHeight:1.8, cursor:"pointer" }}>
            {isGym
              ? <>move the slider to set a grade, then hit <span style={{ color:"#4caf50", fontWeight:700 }}>SENT</span>, <span style={{ color:COLOR_PROJECT, fontWeight:700 }}>PROJECT</span>, or <span style={{ color:COLOR_REPEAT, fontWeight:700 }}>REPEAT</span> to log your first climb</>
              : <>add the climb name, set a grade, then hit <span style={{ color:"#4caf50", fontWeight:700 }}>SENT</span>, <span style={{ color:COLOR_PROJECT, fontWeight:700 }}>PROJECT</span>, or <span style={{ color:COLOR_REPEAT, fontWeight:700 }}>REPEAT</span></>
            }
            <div style={{ fontSize:12, color:"#5a9a5a", marginTop:6, letterSpacing:"0.06em" }}>tap to dismiss</div>
          </div>
        )}

        {/* Step 1: Climb name — always glowing first */}
        <div style={{ padding:"28px 24px 0" }}>
          <div style={{ fontSize:12, color: isOutdoor ? "#4caf50" : "#bbb", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10, transition:"color 0.2s" }}>
            {isOutdoor ? "climb name — required" : "climb name — optional"}
          </div>
          <input
            style={{ ...S.nameInputBoxed,
              border: isOutdoor && !climbName.trim() ? "1px solid #4caf50" : isOutdoor && climbName.trim() ? "1px solid #2a2a2a" : "1px solid #2e2e2e",
              boxShadow: isOutdoor && !climbName.trim() ? "0 0 0 3px rgba(76,175,80,0.10)" : "none",
              transition:"border-color 0.2s, box-shadow 0.2s"
            }}
            placeholder={isGym ? "Plastic" : "e.g. Midnight Lightning"}
            value={climbName}
            onChange={e => setClimbName(e.target.value)}
          />
        </div>

        {/* Step 2: Grade — lights up once name entered (outdoor) or always (gym) */}
        {(() => {
          const gradeActive = isGym || climbName.trim().length > 0;
          return (
            <div style={{ padding:"32px 0 0", opacity: gradeActive ? 1 : 0.55, transition:"opacity 0.25s", pointerEvents: gradeActive ? "auto" : "none" }}>
              <div style={{ fontSize:12, color: gradeActive && !selectedGrade ? "#4caf50" : "#bbb", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:14, paddingLeft:24, transition:"color 0.2s" }}>grade</div>
              <GradeSlider grades={grades} value={selectedGrade} onChange={setSelectedGrade} />
            </div>
          );
        })()}

        {/* Step 3: Buttons — light up once grade selected */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, padding:"28px 24px 0" }}>
          {logs.length > 0 && (
            <div style={{ gridColumn:"1/-1", fontSize:14, color:"#ccc", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8, textAlign:"center" }}>
              climb {logs.length + 1} — pick grade to log
            </div>
          )}
          <SentButton disabled={!canLog} onSent={handleSent} onFirstGo={handleFirstGo} />
          <button style={{...S.outcomeBtn, background:"#0a1e1c", color:canLog?COLOR_PROJECT:"#1a6058", border:`1px solid ${canLog?COLOR_PROJECT:"#1a5048"}`, transition:"all 0.2s", opacity: canLog ? 1 : 0.55}} onClick={() => { if(canLog){showTapHint(); commitLog("project");} }}>PROJECT</button>
          <button style={{...S.outcomeBtn, background:"#06111a", color:canLog?COLOR_REPEAT:"#1a4a6a", border:`1px solid ${canLog?COLOR_REPEAT:"#1a3a58"}`, transition:"all 0.2s", opacity: canLog ? 1 : 0.55}} onClick={() => { if(canLog){showTapHint(); commitLog("repeat");} }}>REPEAT</button>
        </div>

        {logs.length > 0 && (
          <div style={{ padding:"20px 24px 140px" }}>
            {firstClimbHint && (
              <div style={{ background:"#1a2a1a", border:"1px solid #2a4a2a", borderRadius:6, padding:"10px 14px", marginBottom:12, fontSize:13, color:"#5aaa5a", letterSpacing:"0.04em", textAlign:"center" }}>
                tap a climb below to add details — angle, style & notes
              </div>
            )}
            {logs.slice(0,5).map(l => (
              <LiveLogRow key={l.id} log={l} isNoteWindow={noteWindowId===l.id} onTap={() => openSheet(l)} onDupe={dupeLog} isNew={l.id===justLoggedId} />
            ))}
          </div>
        )}

        <div style={S.endSessionBar}>
          {isAddingClimbs
            ? <button style={S.endSessionBtn} onClick={() => doneAddingClimbs("sessionDetail")}>DONE ADDING</button>
            : <button style={S.endSessionBtn} onClick={() => { document.activeElement?.blur(); endSession(); }}>END SESSION</button>
          }
        </div>
      </div>
    );
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────────────
  if (screen === "summary" && viewingSession) {
    const vs = viewingSession;
    const vSends   = vs.logs.filter(l=>l.outcome==="sent");
    const vFlashes = vs.logs.filter(l=>l.first_go===true);
    const vRepeats = vs.logs.filter(l=>l.outcome==="repeat");
    const vProjects = vs.logs.filter(l=>l.outcome==="project");
    const hardest = vSends.length > 0 ? vSends.reduce((a,b) => gradeSort(a.grade, vs.discipline) >= gradeSort(b.grade, vs.discipline) ? a : b) : null;
    return (
      <div style={S.app}><Sheet />
        <div style={{ padding:"52px 24px 80px" }}>
          <button style={{...S.backBtn, marginBottom:24}} onClick={() => setScreen("logging")}>←</button>
          <div style={{ textAlign:"center", marginBottom:36 }}>
            <div style={{ fontSize:52, marginBottom:12 }}>✓</div>
            <div style={{ fontSize:28, fontWeight:700, letterSpacing:"0.04em", marginBottom:6 }}>{vs.location}</div>
            <div style={{ fontSize:14, color:"#ccc" }}>{new Date(vs.started_at).toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"})}</div>
          </div>
          <div style={S.statsRow}>
            <div style={S.statBox}><div style={S.statNum}>{vs.logs.length}</div><div style={S.statLabel}>climbs</div></div>
            <div style={S.statBox}><div style={S.statNum}>{vSends.length}</div><div style={S.statLabel}>send</div></div>
            <div style={S.statBox}><div style={S.statNum}>{vFlashes.length}</div><div style={S.statLabel}>⚡ first go</div></div>
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:28, flexWrap:"wrap" }}>
            {hardest && (
              <div style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:6, padding:"10px 16px", flex:1 }}>
                <div style={{ fontSize:10, color:"#aaa", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>hardest send</div>
                <div style={{ fontSize:20, fontWeight:700 }}>{hardest.grade}</div>
                {hardest.name && <div style={{ fontSize:11, color:"#aaa", marginTop:2 }}>{hardest.name}</div>}
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
                <div style={{ fontSize:10, color:COLOR_PROJECT, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:4 }}>projects</div>
                <div style={{ fontSize:20, fontWeight:700, color:COLOR_PROJECT }}>{vProjects.length}</div>
              </div>
            )}
          </div>
          <div style={S.sectionLabel}>climbs this session</div>
          {vs.logs.map(l => <LogDetailRow key={l.id} log={l} onTap={() => openSheet(l)} />)}
          <button style={{...S.startBtn, marginTop:36}} onClick={() => { setViewingSession(null); setScreen("home"); setTab("home"); loadData(); }}>DONE</button>
        </div>
      </div>
    );
  }
}

const S = {
  app:{ fontFamily:"'DM Mono','Courier New',monospace", background:"#0e0e0e", minHeight:"100vh", color:"#f0ede8", maxWidth:390, margin:"0 auto", position:"relative", overflowX:"hidden" },
  homeTop:{ marginBottom:28 },
  logo:{ fontSize:36, fontWeight:700, letterSpacing:"0.15em" },
  tagline:{ fontSize:15, color:"#ccc", letterSpacing:"0.08em", marginTop:4 },
  activeCard:{ background:"#0d1f0d", border:"1px solid #1e3a1e", borderRadius:8, padding:"18px 20px", marginBottom:16, cursor:"pointer" },
  latestCard:{ background:"#161616", border:"1px solid #2a2a2a", borderRadius:8, padding:"18px 20px", marginBottom:16, cursor:"pointer" },
  endBtnSmall:{ background:"none", border:"1px solid #2a4a2a", color:"#4caf50", padding:"7px 14px", borderRadius:4, fontSize:12, fontWeight:700, letterSpacing:"0.12em", cursor:"pointer", fontFamily:"'DM Mono',monospace", flexShrink:0 },
  sectionLabel:{ fontSize:12, color:"#ddd", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:4, paddingTop:4 },
  sessionCard:{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 0", borderBottom:"1px solid #1e1e1e", cursor:"pointer" },
  sessionCardLocation:{ fontSize:16, fontWeight:600, color:"#f0ede8" },
  sessionCardMeta:{ fontSize:14, color:"#ddd", marginTop:3 },
  sessionCardDate:{ fontSize:14, color:"#f0ede8", fontWeight:600 },
  trashBtn:{ background:"none", border:"none", color:"#aaa", fontSize:12, cursor:"pointer", padding:"4px 6px", fontFamily:"'DM Mono',monospace" },
  lookupMoreBtn:{ width:"100%", padding:"14px 0", background:"transparent", border:"1px solid #333", borderRadius:6, color:"#bbb", fontSize:13, fontWeight:700, letterSpacing:"0.12em", cursor:"pointer", fontFamily:"'DM Mono',monospace", marginTop:12, textAlign:"center" },
  floatingBtn:{ position:"fixed", bottom:72, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:390, padding:"0 24px 12px", background:"linear-gradient(transparent, #0e0e0e 35%)", boxSizing:"border-box", zIndex:40 },
  startBtn:{ width:"100%", padding:20, background:"#f0ede8", color:"#0e0e0e", border:"none", borderRadius:4, fontSize:14, fontWeight:700, letterSpacing:"0.15em", cursor:"pointer", fontFamily:"'DM Mono',monospace", display:"block" },
  signOutBtn:{ width:"100%", padding:8, background:"transparent", color:"#aaa", border:"none", fontSize:13, cursor:"pointer", fontFamily:"'DM Mono',monospace", letterSpacing:"0.1em", marginTop:6 },
  backBtn:{ background:"none", border:"1px solid #3a3a3a", borderRadius:6, color:"#ddd", fontSize:18, cursor:"pointer", padding:"6px 12px", fontFamily:"'DM Mono',monospace", alignSelf:"flex-start", display:"inline-flex", alignItems:"center", gap:4, letterSpacing:0 },
  pageTitle:{ fontSize:26, fontWeight:700, letterSpacing:"0.04em", marginBottom:4 },
  pageSubtitle:{ fontSize:15, color:"#ccc", letterSpacing:"0.05em", marginBottom:28 },
  statsRow:{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:2, marginBottom:20 },
  statBox:{ background:"#141414", padding:"16px 12px", textAlign:"center", borderRadius:4 },
  statNum:{ fontSize:28, fontWeight:700 }, statLabel:{ fontSize:12, color:"#ccc", letterSpacing:"0.08em", marginTop:3, textTransform:"uppercase" },
  detailRow:{ borderBottom:"1px solid #1a1a1a", paddingBottom:10, marginBottom:2, cursor:"pointer" },
  detailTop:{ display:"flex", alignItems:"center", gap:12, paddingTop:10 },
  detailName:{ flex:1, color:"#f0ede8", fontSize:15 }, detailGrade:{ fontSize:13, color:"#ccc", fontWeight:600 },
  tagPills:{ display:"flex", flexWrap:"wrap", gap:6, marginLeft:30, marginTop:6 },
  pill:{ fontSize:12, color:"#ccc", background:"#1e1e1e", padding:"3px 8px", borderRadius:10 },
  noteChip:{ marginLeft:30, marginTop:5, fontSize:13, color:"#ccc", lineHeight:1.5 },
  addChipDetail:{ marginLeft:30, marginTop:5, fontSize:12, color:"#5aaa5a", letterSpacing:"0.06em", fontWeight:600 },
  addClimbBtn:{ width:"100%", padding:"13px 0", background:"#161616", border:"1px solid #2a2a2a", borderRadius:6, color:"#f0ede8", fontSize:14, fontWeight:700, letterSpacing:"0.12em", cursor:"pointer", fontFamily:"'DM Mono',monospace", marginBottom:24, textAlign:"center" },
  setupQ:{ fontSize:26, fontWeight:600, marginBottom:36, lineHeight:1.3, marginTop:28 },
  setupGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  setupBtn:{ background:"#141414", border:"1px solid #222", borderRadius:8, padding:"28px 16px", color:"#f0ede8", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"'DM Mono',monospace", letterSpacing:"0.05em", display:"flex", flexDirection:"column", alignItems:"center", gap:14 },
  setupIcon:{ fontSize:30 },
  locationInput:{ width:"100%", background:"#141414", border:"1px solid #2a2a2a", borderRadius:6, padding:16, color:"#f0ede8", fontSize:16, fontFamily:"'DM Mono',monospace", outline:"none", boxSizing:"border-box" },
  suggestions:{ position:"absolute", top:"100%", left:0, right:0, background:"#161616", border:"1px solid #222", borderTop:"none", borderRadius:"0 0 6px 6px", zIndex:10 },
  suggestionItem:{ padding:"12px 16px", fontSize:14, color:"#ccc", cursor:"pointer", borderBottom:"1px solid #1e1e1e" },
  flash:{ position:"fixed", top:0, left:"50%", transform:"translateX(-50%)", padding:"11px 24px", borderRadius:"0 0 8px 8px", fontSize:15, fontWeight:600, letterSpacing:"0.06em", zIndex:100, fontFamily:"'DM Mono',monospace", maxWidth:390, width:"100%", textAlign:"center" },
  topBar:{ display:"flex", alignItems:"center", padding:"16px 16px 14px", borderBottom:"1px solid #1a1a1a" },
  topBarIconBtn:{ background:"#1a1a1a", border:"1px solid #2a2a2a", color:"#f0ede8", width:38, height:38, borderRadius:6, fontSize:16, cursor:"pointer", fontFamily:"'DM Mono',monospace", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  sessionLocation:{ fontSize:16, fontWeight:700, color:"#f0ede8" },
  sessionMeta:{ fontSize:13, marginTop:2 },
  nameInputBoxed:{ width:"100%", background:"#141414", border:"1px solid #2e2e2e", borderRadius:6, padding:"14px 16px", color:"#f0ede8", fontSize:18, fontFamily:"'DM Mono',monospace", outline:"none", boxSizing:"border-box", caretColor:"#f0ede8" },
  outcomeBtn:{ padding:"20px 8px", border:"none", borderRadius:6, fontSize:14, fontWeight:700, letterSpacing:"0.1em", cursor:"pointer", fontFamily:"'DM Mono',monospace" },
  logRowWrap:{ borderBottom:"1px solid #131313", borderRadius:4 },
  logRow:{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"10px 0 6px", cursor:"pointer" },
  logName:{ fontSize:15, color:"#f0ede8" },
  logMeta:{ fontSize:13, color:"#bbb", marginTop:2 },
  addPromptActive:{ fontSize:13, color:"#5aaa5a", marginTop:3, letterSpacing:"0.04em", fontWeight:600 },
  addPromptFaded:{ fontSize:13, color:"#aaa", marginTop:3, letterSpacing:"0.04em" },
  logGrade:{ fontSize:14, color:"#ddd", fontWeight:600, flexShrink:0, marginLeft:8 },
  endSessionBar:{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:390, padding:"12px 24px 32px", background:"linear-gradient(transparent, #0e0e0e 30%)", boxSizing:"border-box", zIndex:50 },
  endSessionBtn:{ width:"100%", padding:18, background:"#f0ede8", color:"#0e0e0e", border:"none", borderRadius:6, fontSize:15, fontWeight:700, letterSpacing:"0.15em", cursor:"pointer", fontFamily:"'DM Mono',monospace" },
  overlay:{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"flex-end", zIndex:200 },
  sheet:{ background:"#131313", borderTop:"1px solid #222", borderRadius:"16px 16px 0 0", padding:"20px 24px 48px", width:"100%", maxWidth:390, margin:"0 auto", boxSizing:"border-box", maxHeight:"88vh", overflowY:"auto" },
  sheetHandle:{ width:36, height:3, background:"#2a2a2a", borderRadius:2, margin:"0 auto 20px" },
  sheetTitle:{ fontSize:18, fontWeight:700 },
  sheetNameInput:{ width:"100%", background:"transparent", border:"none", borderBottom:"1px solid #3a3a3a", color:"#f0ede8", fontSize:18, fontWeight:700, fontFamily:"'DM Mono',monospace", outline:"none", padding:"0 0 4px", caretColor:"#f0ede8", boxSizing:"border-box" },
  gradeEditBtn:{ fontSize:13, color:"#ccc", fontWeight:600, background:"#1a1a1a", border:"1px solid #333", borderRadius:4, padding:"4px 10px", cursor:"pointer", fontFamily:"'DM Mono',monospace", flexShrink:0, whiteSpace:"nowrap" },
  tagSection:{ marginTop:20 }, tagLabel:{ fontSize:12, color:"#ddd", letterSpacing:"0.2em", textTransform:"uppercase", marginBottom:10 },
  chipRow:{ display:"flex", flexWrap:"wrap", gap:8 },
  noteInput:{ width:"100%", background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:4, padding:"12px 14px", color:"#f0ede8", fontSize:15, fontFamily:"'DM Mono',monospace", outline:"none", resize:"none", boxSizing:"border-box", lineHeight:1.7, marginTop:4 },
  sheetBtns:{ display:"flex", gap:10, marginTop:20 },
  btnSecondary:{ flex:1, padding:14, background:"transparent", border:"1px solid #333", borderRadius:4, color:"#ccc", fontSize:13, fontWeight:600, letterSpacing:"0.1em", cursor:"pointer", fontFamily:"'DM Mono',monospace" },
  btnPrimary:{ flex:2, padding:14, background:"#f0ede8", border:"none", borderRadius:4, color:"#0e0e0e", fontSize:13, fontWeight:700, letterSpacing:"0.1em", cursor:"pointer", fontFamily:"'DM Mono',monospace" },
};
