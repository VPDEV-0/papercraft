import React, { useMemo, useState, useEffect } from "react";
import html2pdf from "html2pdf.js";

const uid = () => Math.random().toString(36).slice(2, 9);
const ROMANS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const PART_COLORS = {
  A: { ring: "#2563EB", bg: "#EFF6FF", text: "#1D4ED8" },
  B: { ring: "#0D9488", bg: "#F0FDFA", text: "#0F766E" },
  C: { ring: "#D97706", bg: "#FFFBEB", text: "#B45309" },
  D: { ring: "#16A34A", bg: "#F0FDF4", text: "#15803D" },
  E: { ring: "#9333EA", bg: "#FAF5FF", text: "#7E22CE" },
  F: { ring: "#E11D48", bg: "#FFF1F2", text: "#BE123C" },
};

const bi = (en = "", kn = "") => ({ en, kn });

const emptyQuestion = (type) => ({
  id: uid(),
  type,
  text: bi(),
  marks: 1,
  options: type === "mcq" ? [bi(), bi(), bi(), bi()] : [],
  matchLeft: type === "match" ? [bi(), bi(), bi()] : [],
  matchRight: type === "match" ? [bi(), bi(), bi()] : [],
  table:
    type === "table"
      ? { cols: ["Factor (L)", "TPL", "MPL", "APL"], rows: [["0", "0", "0", "0"], ["1", "10", "-", "10"], ["2", "22", "-", "-"]] }
      : null,
});

const emptyBlock = (roman, instructionEn, marksScheme = "1x2=2", kind = "mcq") => ({
  id: uid(),
  roman,
  instruction: bi(instructionEn, ""),
  marksScheme: marksScheme,
  wordbank: bi(),
  questions: [emptyQuestion(kind)],
});

const emptyPart = (key) => ({ id: uid(), key, blocks: [] });

const QUESTION_TYPES = [
  { key: "mcq", label: "MCQ" },
  { key: "fillblank", label: "Fill Blank" },
  { key: "match", label: "Match" },
  { key: "oneword", label: "One Word" },
  { key: "descriptive", label: "Descriptive" },
  { key: "table", label: "Table" },
];

function buildDefaultPaper() {
  const A = emptyPart("A");
  A.blocks = [
    { ...emptyBlock("I", "Choose the correct answer.", "1x2=2", "mcq"), questions: [{ ...emptyQuestion("mcq"), marks: 1, text: bi("Which of the following is an example of Micro Economics?"), options: [bi("National Income"), bi("Consumer Behaviour"), bi("Both a and b"), bi("Unemployment")] }] },
    { ...emptyBlock("II", "Fill in the blanks.", "1x2=2", "fillblank"), wordbank: bi("Iso quant, market, opposite"), questions: [{ ...emptyQuestion("fillblank"), marks: 1, text: bi("The demand for a good moves in the ______ direction of its price.") }] },
    { ...emptyBlock("III", "Match the following.", "1x3=3", "match"), questions: [{ ...emptyQuestion("match"), marks: 3, matchLeft: [bi("Positive economics"), bi("Indifference map"), bi("SAC")], matchRight: [bi("Short run average cost"), bi("Functioning of mechanism"), bi("A family of indifference curve")] }] },
    { ...emptyBlock("IV", "Answer in a word or a sentence.", "1x2=2", "oneword"), questions: [{ ...emptyQuestion("oneword"), marks: 1, text: bi("Give an example of a market economy.") }] },
  ];

  const B = emptyPart("B");
  B.blocks = [{ ...emptyBlock("V", "Answer any three questions in four sentences each.", "2x3=6", "descriptive"), questions: [{ ...emptyQuestion("descriptive"), marks: 2, text: bi("List out the basic economic activities.") }] }];

  const E = emptyPart("E");
  E.blocks = [{
    ...emptyBlock("VIII", "Answer any one of the project oriented questions.", "5x1=5", "table"),
    questions: [{
      ...emptyQuestion("table"),
      marks: 5,
      text: bi("Find the missing products in the following table:"),
      table: {
        cols: ["Factor (L)", "TPL", "MPL", "APL"],
        rows: [["0", "0", "0", "0"], ["1", "10", "-", "10"], ["2", "22", "-", "-"]],
      },
    }],
  }];

  return [A, B, E];
}

function parseSchemeTotal(schemeStr) {
  if (!schemeStr) return 0;
  if (schemeStr.includes("=")) {
    const total = schemeStr.split("=")[1].trim();
    return Number(total) || 0;
  }
  return Number(schemeStr) || 0;
}

function partTotal(part) {
  return part.blocks.reduce((sum, b) => sum + parseSchemeTotal(b.marksScheme), 0);
}

const STORAGE_KEY = "papercraft_saved_data_v1";

export default function App() {
  const savedData = useMemo(() => {
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }, []);

  const [lang, setLang] = useState(savedData?.lang || "en");
  const [college, setCollege] = useState(savedData?.college || bi("DKPUCPA / SRI VIDYA COMPOSITE PU COLLEGE"));
  const [examTitle, setExamTitle] = useState(savedData?.examTitle || bi("FIRST TEST — AUGUST 2026", "ಪ್ರಥಮ ಕಿರು ಪರೀಕ್ಷೆ — ಆಗಸ್ಟ್ 2026"));
  const [subjectLine, setSubjectLine] = useState(savedData?.subjectLine || bi("II PUC - ECONOMICS", "ದ್ವಿತೀಯ ಪಿ.ಯು.ಸಿ. — ಅರ್ಥಶಾಸ್ತ್ರ"));
  const [time, setTime] = useState(savedData?.time || bi("1½ Hrs.", "1½ ಗಂಟೆ"));
  const [instructions, setInstructions] = useState(savedData?.instructions || bi("1. Write the question number visibility within the margin.\n2. Answer for the question should be continuous.", "1. ಪ್ರಶ್ನೆ ಸಂಖ್ಯೆಗಳನ್ನು ಮಾರ್ಜಿನ್‌ನಲ್ಲಿ ಸ್ಪಷ್ಟವಾಗಿ ಬರೆಯಿರಿ.\n2. ಪ್ರಶ್ನೆಗಳ ಉತ್ತರಗಳು ನಿರಂತರವಾಗಿರತಕ್ಕದ್ದು."));
  const [subjectCode, setSubjectCode] = useState(savedData?.subjectCode || "22");
  const [maxMarks, setMaxMarks] = useState(savedData?.maxMarks || 40);

  const [parts, setParts] = useState(savedData?.parts || buildDefaultPaper());
  const [activePart, setActivePart] = useState(savedData?.parts?.[0]?.id || parts[0]?.id || "");
  const [mobileTab, setMobileTab] = useState("edit");

  // Continuous auto-save to browser local storage
  useEffect(() => {
    const payload = {
      lang,
      college,
      examTitle,
      subjectLine,
      time,
      instructions,
      subjectCode,
      maxMarks,
      parts,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn("Storage auto-save failed:", err);
    }
  }, [lang, college, examTitle, subjectLine, time, instructions, subjectCode, maxMarks, parts]);

  const handleResetPaper = () => {
    if (window.confirm("Do you want to reset all inputs and start a new paper?")) {
      localStorage.removeItem(STORAGE_KEY);
      const defaults = buildDefaultPaper();
      setCollege(bi("DKPUCPA / SRI VIDYA COMPOSITE PU COLLEGE"));
      setExamTitle(bi("FIRST TEST — AUGUST 2026", "ಪ್ರಥಮ ಕಿರು ಪರೀಕ್ಷೆ — ಆಗಸ್ಟ್ 2026"));
      setSubjectLine(bi("II PUC - ECONOMICS", "ದ್ವಿತೀಯ ಪಿ.ಯು.ಸಿ. — ಅರ್ಥಶಾಸ್ತ್ರ"));
      setTime(bi("1½ Hrs.", "1½ ಗಂಟೆ"));
      setInstructions(bi("1. Write the question number visibility within the margin.\n2. Answer for the question should be continuous.", "1. ಪ್ರಶ್ನೆ ಸಂಖ್ಯೆಗಳನ್ನು ಮಾರ್ಜಿನ್‌ನಲ್ಲಿ ಸ್ಪಷ್ಟವಾಗಿ ಬರೆಯಿರಿ.\n2. ಪ್ರಶ್ನೆಗಳ ಉತ್ತರಗಳು ನಿರಂತರವಾಗಿರತಕ್ಕದ್ದು."));
      setSubjectCode("22");
      setMaxMarks(40);
      setParts(defaults);
      setActivePart(defaults[0].id);
    }
  };

  const updatePart = (id, patch) => setParts((p) => p.map((pt) => (pt.id === id ? { ...pt, ...patch } : pt)));
  const addPart = () => {
    const nextKey = String.fromCharCode(65 + parts.length);
    const pt = emptyPart(nextKey);
    setParts((p) => [...p, pt]);
    setActivePart(pt.id);
  };
  const removePart = (id) => {
    const rem = parts.filter((pt) => pt.id !== id);
    setParts(rem);
    if (activePart === id && rem.length > 0) setActivePart(rem[0].id);
  };

  const addBlock = (partId, kind) => {
    setParts((p) =>
      p.map((pt) =>
        pt.id !== partId
          ? pt
          : { ...pt, blocks: [...pt.blocks, emptyBlock(ROMANS[pt.blocks.length] || `#${pt.blocks.length + 1}`, "", "1x2=2", kind)] }
      )
    );
  };

  const updateBlock = (partId, blockId, patch) => {
    setParts((p) =>
      p.map((pt) =>
        pt.id !== partId
          ? pt
          : { ...pt, blocks: pt.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)) }
      )
    );
  };

  const removeBlock = (partId, blockId) => {
    setParts((p) =>
      p.map((pt) =>
        pt.id !== partId
          ? pt
          : { ...pt, blocks: pt.blocks.filter((b) => b.id !== blockId) }
      )
    );
  };

  const addQuestion = (partId, blockId, type) => {
    setParts((p) =>
      p.map((pt) =>
        pt.id !== partId
          ? pt
          : {
              ...pt,
              blocks: pt.blocks.map((b) =>
                b.id !== blockId ? b : { ...b, questions: [...b.questions, emptyQuestion(type)] }
              ),
            }
      )
    );
  };

  const updateQuestion = (partId, blockId, qId, patch) => {
    setParts((p) =>
      p.map((pt) =>
        pt.id !== partId
          ? pt
          : {
              ...pt,
              blocks: pt.blocks.map((b) =>
                b.id !== blockId
                  ? b
                  : { ...b, questions: b.questions.map((q) => (q.id === qId ? { ...q, ...patch } : q)) }
              ),
            }
      )
    );
  };

  const removeQuestion = (partId, blockId, qId) => {
    setParts((p) =>
      p.map((pt) =>
        pt.id !== partId
          ? pt
          : {
              ...pt,
              blocks: pt.blocks.map((b) =>
                b.id !== blockId ? b : { ...b, questions: b.questions.filter((q) => q.id !== qId) }
              ),
            }
      )
    );
  };

  const numbering = useMemo(() => {
    const map = {};
    let n = 1;
    parts.forEach((pt) => pt.blocks.forEach((b) => b.questions.forEach((q) => (map[q.id] = n++))));
    return map;
  }, [parts]);

  const totalCalculatedMarks = parts.reduce((s, pt) => s + partTotal(pt), 0);
  const currentPart = parts.find((p) => p.id === activePart) || parts[0];
  const fontFamily = lang === "kn" ? "'Noto Sans Kannada', serif" : "'Tinos', Georgia, serif";

  const handleDownloadPDF = () => {
    const element = document.getElementById("print-area");
    const opt = {
      margin: [8, 10, 8, 10],
      filename: `${examTitle[lang] || "Question_Paper"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: 794 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#F1F5F9", minHeight: "100vh", width: "100%", margin: 0, padding: 0, color: "#0F172A", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Tinos:wght@400;700&family=Noto+Sans+Kannada:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body, html, #root {
          width: 100% !important;
          min-height: 100vh !important;
          background: #F1F5F9 !important;
        }

        .field-label { font-size: 11px; font-weight: 600; letter-spacing: .03em; text-transform: uppercase; color: #475569; margin-bottom: 4px; display: block; }
        .input { width: 100%; padding: 7px 10px; border: 1.5px solid #CBD5E1; border-radius: 6px; font-size: 13px; background: #FFFFFF !important; color: #0F172A !important; outline: none; }
        .input:focus { border-color: #2563EB; }
        .input-kn { font-family: 'Noto Sans Kannada', sans-serif !important; }
        
        .btn { border: none; border-radius: 6px; padding: 7px 14px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .btn-primary { background: #0F172A; color: #fff; }
        .btn-ghost { background: #fff; color: #334155; border: 1px solid #CBD5E1; }
        .pill { padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
        .qcard { background: #fff; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
        .toolbtn { background: #fff; border: 1px dashed #94A3B8; border-radius: 6px; padding: 6px 10px; font-size: 11.5px; font-weight: 600; color: #334155; cursor: pointer; }
        .toolbtn:hover { border-color: #2563EB; color: #2563EB; background: #F8FAFC; }
        .blockcard { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; margin-bottom: 14px; }
        
        .app-layout { 
          display: flex; 
          width: 100%; 
          gap: 16px; 
          padding: 16px; 
          align-items: flex-start; 
        }
        .edit-pane { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
        .preview-pane { flex: 1; min-width: 0; display: flex; justify-content: center; position: sticky; top: 72px; }

        .paper {
          font-family: ${fontFamily};
          color: #000;
          background: #fff;
          width: 100%;
          max-width: 680px;
          min-height: 840px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          border-radius: 2px;
          padding: 34px 28px;
        }

        .mobile-bar { display: none; }

        @media (max-width: 900px) {
          .nav-wrapper { flex-direction: row; justify-content: space-between; gap: 8px; }
          .nav-actions { width: auto; gap: 6px; }
          .app-layout { flex-direction: column; padding: 10px; }
          .edit-pane, .preview-pane { width: 100%; position: static; }
          .edit-pane { display: ${mobileTab === "edit" ? "flex" : "none"}; }
          .preview-pane { display: ${mobileTab === "preview" ? "block" : "none"}; }
          .mobile-bar { display: flex; gap: 8px; padding: 8px 12px; background: #fff; border-bottom: 1px solid #E2E8F0; }
        }
      `}</style>

      {/* TOP HEADER */}
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", padding: "10px 16px", position: "sticky", top: 0, zIndex: 20 }}>
        <div className="nav-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1400, margin: "0 auto" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 6, background: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", color: "#F8FAFC", flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>PaperCraft</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>PU College Question Generator</div>
            </div>
          </div>

          <div className="nav-actions" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 10px" }} onClick={handleResetPaper} title="Start a fresh question paper">
              New Paper
            </button>

            <div style={{ display: "flex", border: "1.5px solid #CBD5E1", borderRadius: 6, overflow: "hidden" }}>
              <button className="pill" onClick={() => setLang("en")} style={{ borderRadius: 0, padding: "6px 10px", background: lang === "en" ? "#0F172A" : "#fff", color: lang === "en" ? "#fff" : "#475569" }}>EN</button>
              <button className="pill" onClick={() => setLang("kn")} style={{ borderRadius: 0, padding: "6px 10px", background: lang === "kn" ? "#0F172A" : "#fff", color: lang === "kn" ? "#fff" : "#475569" }}>ಕನ್ನಡ</button>
            </div>

            <button className="btn btn-primary" onClick={handleDownloadPDF}>
              ⬇ Export PDF
            </button>
          </div>

        </div>
      </header>

      {/* MOBILE TAB CONTROLS */}
      <div className="mobile-bar">
        <button className="pill" onClick={() => setMobileTab("edit")} style={{ flex: 1, textAlign: "center", background: mobileTab === "edit" ? "#0F172A" : "#fff", color: mobileTab === "edit" ? "#fff" : "#334155", border: "1px solid #CBD5E1" }}>
          Question Editor
        </button>
        <button className="pill" onClick={() => setMobileTab("preview")} style={{ flex: 1, textAlign: "center", background: mobileTab === "preview" ? "#0F172A" : "#fff", color: mobileTab === "preview" ? "#fff" : "#334155", border: "1px solid #CBD5E1" }}>
          Live A4 Preview
        </button>
      </div>

      {/* MAIN SPLIT VIEW */}
      <div className="app-layout">
        
        {/* LEFT PANEL: QUESTION FORM */}
        <div className="edit-pane">
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: "#1E293B", display: "flex", justifyContent: "space-between" }}>
              <span>Header Details ({lang === "en" ? "English" : "ಕನ್ನಡ"})</span>
              <span style={{ fontSize: 11, color: totalCalculatedMarks === maxMarks ? "#16A34A" : "#D97706" }}>
                Total: <b>{totalCalculatedMarks}</b> / {maxMarks} Marks
              </span>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="field-label">Institution / Board Title</label>
                <input className={"input" + (lang === "kn" ? " input-kn" : "")} value={college[lang] || ""} onChange={(e) => setCollege({ ...college, [lang]: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Exam Name</label>
                <input className={"input" + (lang === "kn" ? " input-kn" : "")} value={examTitle[lang] || ""} onChange={(e) => setExamTitle({ ...examTitle, [lang]: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Class & Subject</label>
                <input className={"input" + (lang === "kn" ? " input-kn" : "")} value={subjectLine[lang] || ""} onChange={(e) => setSubjectLine({ ...subjectLine, [lang]: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Subject Code</label>
                <input className="input" value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Time Duration</label>
                <input className={"input" + (lang === "kn" ? " input-kn" : "")} value={time[lang] || ""} onChange={(e) => setTime({ ...time, [lang]: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Max Marks</label>
                <input className="input" type="number" value={maxMarks} onChange={(e) => setMaxMarks(Number(e.target.value) || 0)} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="field-label">Instructions (One per line)</label>
                <textarea className={"input" + (lang === "kn" ? " input-kn" : "")} rows={2} value={instructions[lang] || ""} onChange={(e) => setInstructions({ ...instructions, [lang]: e.target.value })} />
              </div>
            </div>
          </div>

          {/* PART TABS */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {parts.map((pt) => {
              const c = PART_COLORS[pt.key] || PART_COLORS.A;
              const active = pt.id === activePart;
              return (
                <button key={pt.id} className="pill" onClick={() => setActivePart(pt.id)} style={{ background: active ? c.ring : c.bg, color: active ? "#fff" : c.text, border: "1px solid " + c.ring }}>
                  PART-{pt.key} · {partTotal(pt)}m
                </button>
              );
            })}
            <button className="pill" onClick={addPart} style={{ background: "#fff", border: "1px dashed #94A3B8", color: "#475569" }}>+ Add Part</button>
          </div>

          {/* ACTIVE PART SECTIONS */}
          {currentPart && (
            <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Editing PART - {currentPart.key}</span>
                <button className="btn btn-ghost" style={{ color: "#DC2626", borderColor: "#FCA5A5", fontSize: 11, padding: "4px 8px" }} onClick={() => removePart(currentPart.id)}>Delete Part</button>
              </div>

              {currentPart.blocks.map((block) => (
                <BlockEditor
                  key={block.id}
                  lang={lang}
                  block={block}
                  numbering={numbering}
                  onChange={(patch) => updateBlock(currentPart.id, block.id, patch)}
                  onRemove={() => removeBlock(currentPart.id, block.id)}
                  onAddQuestion={(type) => addQuestion(currentPart.id, block.id, type)}
                  onUpdateQuestion={(qId, patch) => updateQuestion(currentPart.id, block.id, qId, patch)}
                  onRemoveQuestion={(qId) => removeQuestion(currentPart.id, block.id, qId)}
                />
              ))}

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {QUESTION_TYPES.map((t) => <button key={t.key} className="toolbtn" onClick={() => addBlock(currentPart.id, t.key)}>+ Add {t.label} Block</button>)}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: LIVE A4 PREVIEW */}
        <div className="preview-pane">
          <div id="print-area" className="paper">
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{college[lang]}</div>
              <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 4 }}>{examTitle[lang]}</div>
              <div style={{ fontSize: 12.5, marginTop: 2 }}>{subjectLine[lang]} {subjectCode ? `(${subjectCode})` : ""}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, borderTop: "1.5px solid #000", borderBottom: "1.5px solid #000", padding: "4px 0", margin: "10px 0 8px" }}>
              <span>{lang === "en" ? "Time" : "ಸಮಯ"}: {time[lang]}</span>
              <span>{lang === "en" ? "Max Marks" : "ಗರಿಷ್ಠ ಅಂಕಗಳು"}: {maxMarks}</span>
            </div>

            {instructions[lang]?.trim() && (
              <div style={{ fontSize: 11, marginBottom: 10, lineHeight: 1.4, borderBottom: "1px solid #000", paddingBottom: 6 }}>
                <b>{lang === "en" ? "Instructions:" : "ಸೂಚನೆಗಳು:"}</b>
                <div style={{ marginTop: 2 }}>
                  {instructions[lang].split("\n").map((line, i) => <div key={i}>{line}</div>)}
                </div>
              </div>
            )}

            {parts.map((pt) => (
              <div key={pt.id} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13, textAlign: "center", margin: "8px 0 6px" }}>
                  {lang === "en" ? `PART - ${pt.key}` : `ಭಾಗ - ${pt.key}`}
                </div>

                {pt.blocks.map((block) => (
                  <div key={block.id} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 12 }}>
                      <span>{block.roman} {block.instruction[lang]}</span>
                      <span style={{ fontWeight: 700, color: "#000" }}>{block.marksScheme}</span>
                    </div>

                    {block.wordbank[lang] && (
                      <div style={{ fontSize: 11.5, fontStyle: "italic", margin: "2px 0 4px" }}>({block.wordbank[lang]})</div>
                    )}

                    {block.questions.map((q) => (
                      <PreviewQuestion key={q.id} q={q} lang={lang} number={numbering[q.id]} />
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function BlockEditor({ lang, block, numbering, onChange, onRemove, onAddQuestion, onUpdateQuestion, onRemoveQuestion }) {
  const showWordbank = block.questions.some((q) => q.type === "fillblank");
  const knCls = lang === "kn" ? " input-kn" : "";
  return (
    <div className="blockcard">
      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
        <input className="input" style={{ width: 44, fontWeight: 700, textAlign: "center", padding: "6px 2px" }} value={block.roman} onChange={(e) => onChange({ roman: e.target.value })} title="Roman numeral" />
        <input className={"input" + knCls} style={{ flex: 1 }} value={block.instruction[lang] || ""} onChange={(e) => onChange({ instruction: { ...block.instruction, [lang]: e.target.value } })} placeholder="Subheading (e.g. Choose the correct answer:)" />
        <input className="input" style={{ width: 75, fontWeight: 600, textAlign: "center", padding: "6px 4px" }} value={block.marksScheme} onChange={(e) => onChange({ marksScheme: e.target.value })} placeholder="1x2=2" title="Mark scheme formula" />
        <button onClick={onRemove} style={{ border: "none", background: "none", color: "#EF4444", cursor: "pointer", fontSize: 15, padding: "0 4px" }} title="Remove block">✕</button>
      </div>

      {showWordbank && (
        <input className={"input" + knCls} style={{ marginBottom: 8, fontStyle: "italic" }} placeholder="Word bank (e.g. capital, land, labour)" value={block.wordbank[lang] || ""} onChange={(e) => onChange({ wordbank: { ...block.wordbank, [lang]: e.target.value } })} />
      )}

      {block.questions.map((q) => (
        <QuestionEditor key={q.id} lang={lang} number={numbering[q.id]} q={q} onChange={(patch) => onUpdateQuestion(q.id, patch)} onRemove={() => onRemoveQuestion(q.id)} />
      ))}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {QUESTION_TYPES.map((t) => <button key={t.key} className="toolbtn" onClick={() => onAddQuestion(t.key)}>+ {t.label}</button>)}
      </div>
    </div>
  );
}

function QuestionEditor({ lang, number, q, onChange, onRemove }) {
  const knCls = lang === "kn" ? " input-kn" : "";
  return (
    <div className="qcard">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#1E293B", background: "#F1F5F9", padding: "2px 8px", borderRadius: 4 }}>Q{number} · {q.type.toUpperCase()}</span>
        <button onClick={onRemove} style={{ border: "none", background: "none", color: "#EF4444", cursor: "pointer", fontSize: 14 }}>✕</button>
      </div>

      <textarea className={"input" + knCls} rows={2} placeholder="Question text..." value={q.text[lang] || ""} onChange={(e) => onChange({ text: { ...q.text, [lang]: e.target.value } })} style={{ marginBottom: 8 }} />

      {q.type === "mcq" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {q.options.map((opt, i) => (
            <input key={i} className={"input" + knCls} placeholder={`Option (${String.fromCharCode(97 + i)})`} value={opt[lang] || ""} onChange={(e) => { const o = q.options.map((x) => ({ ...x })); o[i][lang] = e.target.value; onChange({ options: o }); }} />
          ))}
        </div>
      )}

      {q.type === "match" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {q.matchLeft.map((v, i) => (
            <div key={i} style={{ display: "flex", gap: 6 }}>
              <input className={"input" + knCls} placeholder={`A.${i + 1}`} value={v[lang] || ""} onChange={(e) => { const a = q.matchLeft.map((x) => ({ ...x })); a[i][lang] = e.target.value; onChange({ matchLeft: a }); }} />
              <input className={"input" + knCls} placeholder={`B.${String.fromCharCode(97 + i)}`} value={q.matchRight[i]?.[lang] || ""} onChange={(e) => { const a = q.matchRight.map((x) => ({ ...x })); a[i][lang] = e.target.value; onChange({ matchRight: a }); }} />
            </div>
          ))}
        </div>
      )}

      {q.type === "table" && q.table && (
        <div>
          <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
            {q.table.cols.map((c, ci) => (
              <input key={ci} className="input" style={{ fontWeight: 700, fontSize: 11, textAlign: "center" }} value={c} onChange={(e) => { const cols = [...q.table.cols]; cols[ci] = e.target.value; onChange({ table: { ...q.table, cols } }); }} />
            ))}
          </div>
          {q.table.rows.map((row, ri) => (
            <div key={ri} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              {row.map((cell, ci) => (
                <input key={ci} className="input" style={{ fontSize: 11, textAlign: "center" }} value={cell} onChange={(e) => { const rows = q.table.rows.map((r) => [...r]); rows[ri][ci] = e.target.value; onChange({ table: { ...q.table, rows } }); }} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PreviewQuestion({ q, lang, number }) {
  return (
    <div style={{ fontSize: 12, marginBottom: 6, lineHeight: 1.45 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span><b>{number}.</b> {q.text[lang] || ""}</span>
      </div>

      {q.type === "mcq" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 8px", marginTop: 2, paddingLeft: 14, fontSize: 11.5 }}>
          {q.options.map((o, i) => (
            o[lang] ? <span key={i}><b>{String.fromCharCode(97 + i)})</b> {o[lang]}</span> : null
          ))}
        </div>
      )}

      {q.type === "match" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px", marginTop: 3, paddingLeft: 14, fontSize: 11.5 }}>
          {q.matchLeft.map((l, i) => (
            <React.Fragment key={i}>
              <span>{i + 1}. {l[lang] || "—"}</span>
              <span>{String.fromCharCode(97 + i)}. {q.matchRight[i]?.[lang] || "—"}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      {q.type === "table" && q.table && (
        <div style={{ display: "flex", justifyContent: "center", margin: "6px 0" }}>
          <table style={{ borderCollapse: "collapse", border: "1px solid #000", width: "85%", fontSize: 11, textAlign: "center" }}>
            <thead>
              <tr style={{ background: "#F3F4F6" }}>
                {q.table.cols.map((c, i) => (
                  <th key={i} style={{ border: "1px solid #000", padding: "4px 8px", fontWeight: 700 }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.table.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ border: "1px solid #000", padding: "4px 8px" }}>
                      {cell || "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}