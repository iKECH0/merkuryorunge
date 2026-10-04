import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit3, Check, X, ChevronDown, ChevronRight, BookOpen, PlusCircle, RefreshCw, GraduationCap } from "lucide-react";
import { CURRICULUM, SCHOOL_LEVELS, GRADE_LABELS } from "../data/curriculum";
import axios from "axios";

const API_URL = import.meta.env.PROD
  ? "https://backend-kodivas-projects.vercel.app/api"
  : "http://localhost:5000/api";

const SUBJECT_COLORS = {
  matematik:"#3b82f6",geometri:"#8b5cf6",fizik:"#06b6d4",kimya:"#10b981",
  biyoloji:"#22c55e",turkce:"#f59e0b",edebiyat:"#f59e0b",tarih:"#ef4444",
  cografya:"#f97316",felsefe:"#a855f7",hayat:"#14b8a6",fen:"#0ea5e9",sosyal:"#fb7185",inkilap:"#ef4444"
};
const getColor = (subject) => {
  const lower = subject.toLowerCase();
  for (const [k,v] of Object.entries(SUBJECT_COLORS)) { if (lower.includes(k)) return v; }
  return "#6366f1";
};

export default function CurriculumManager() {
  const [curriculum, setCurriculum] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState("Lise");
  const [selectedGrade, setSelectedGrade] = useState("TYT");
  const [openSubjects, setOpenSubjects] = useState({});
  const [editingTopic, setEditingTopic] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [newTopicInputs, setNewTopicInputs] = useState({});
  const [newSubjectInputs, setNewSubjectInputs] = useState({});
  const [showNewSubject, setShowNewSubject] = useState(false);
  const [reseeding, setReseeding] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchCurriculum = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/curriculum`);
      setCurriculum(res.data || {});
      if (!res.data || Object.keys(res.data).length === 0) {
        await handleReseed(true);
      }
    } catch { setCurriculum({}); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCurriculum(); }, [fetchCurriculum]);

  const handleReseed = async (silent = false) => {
    if (!silent && !window.confirm("Tüm müfredat silinip varsayılan konular yüklenecek. Öğrenci ilerlemeleri de sıfırlanacak. Emin misiniz?")) return;
    setReseeding(true);
    try {
      await axios.post(`${API_URL}/curriculum/reseed`, { topics: CURRICULUM });
      await fetchCurriculum();
    } catch {}
    setReseeding(false);
  };

  const handleAddTopic = async (grade, subject) => {
    const key = `${grade}-${subject}`;
    const name = (newTopicInputs[key] || "").trim();
    if (!name) return;
    setSaving(true);
    try {
      await axios.post(`${API_URL}/curriculum/topic`, { grade, subject, topic_name: name });
      setNewTopicInputs(p => ({ ...p, [key]: "" }));
      await fetchCurriculum();
    } catch {}
    setSaving(false);
  };

  const handleEditTopic = async (id) => {
    const name = editValue.trim();
    if (!name) return;
    setSaving(true);
    try {
      await axios.put(`${API_URL}/curriculum/topic/${id}`, { topic_name: name });
      setEditingTopic(null);
      setEditValue("");
      await fetchCurriculum();
    } catch {}
    setSaving(false);
  };

  const handleDeleteTopic = async (id) => {
    if (!window.confirm("Bu konuyu silmek istediginize emin misiniz?")) return;
    setSaving(true);
    try {
      await axios.delete(`${API_URL}/curriculum/topic/${id}`);
      await fetchCurriculum();
    } catch {}
    setSaving(false);
  };

  const handleAddSubject = async (grade) => {
    const name = (newSubjectInputs[grade] || "").trim();
    if (!name) return;
    setSaving(true);
    try {
      await axios.post(`${API_URL}/curriculum/subject`, { grade, subject: name });
      setNewSubjectInputs(p => ({ ...p, [grade]: "" }));
      setShowNewSubject(false);
      await fetchCurriculum();
    } catch (err) {
      alert(err?.response?.data?.error || "Hata olustu");
    }
    setSaving(false);
  };

  const gradeData = curriculum[selectedGrade] || {};
  const currentLevel = SCHOOL_LEVELS[selectedLevel];

  if (loading || reseeding) {
    return (
      <div className="glass-card fade-in" style={{ textAlign: "center", padding: "40px" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>📚</div>
        <p style={{ color: "var(--color-text-muted)" }}>{reseeding ? "Müfredat yükleniyor..." : "Yükleniyor..."}</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="glass-card slide-up" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "10px", background: "rgba(99,102,241,0.1)", borderRadius: "12px", color: "#6366f1" }}><GraduationCap size={22} /></div>
            <div>
              <h2 className="title" style={{ margin: 0, fontSize: "18px" }}>Müfredat Yönetimi</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-muted)" }}>Konu ekle, düzenle, sil</p>
            </div>
          </div>
          <button onClick={() => handleReseed(false)} disabled={reseeding}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "100px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)", color: "#ef4444", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>
            <RefreshCw size={14} /> Varsayılana Sıfırla
          </button>
        </div>
      </div>

      {/* Level Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "14px", flexWrap: "wrap" }}>
        {Object.entries(SCHOOL_LEVELS).map(([lvl, info]) => (
          <button key={lvl} onClick={() => { setSelectedLevel(lvl); setSelectedGrade(info.grades[0]); }}
            style={{ padding: "8px 18px", borderRadius: "100px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "700", fontFamily: "var(--font-primary)",
              background: selectedLevel === lvl ? "var(--color-primary)" : "var(--color-bg-glass)",
              color: selectedLevel === lvl ? "#fff" : "var(--color-text-muted)", transition: "all 0.2s",
              boxShadow: selectedLevel === lvl ? "0 4px 12px rgba(6,182,212,0.3)" : "none" }}>
            {info.emoji} {lvl}
          </button>
        ))}
      </div>

      {/* Grade Sub-tabs */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
        {currentLevel.grades.map(grade => (
          <button key={grade} onClick={() => setSelectedGrade(grade)}
            style={{ padding: "6px 14px", borderRadius: "100px", border: "1px solid var(--color-border)", cursor: "pointer", fontSize: "12px", fontWeight: "600", fontFamily: "var(--font-primary)",
              background: selectedGrade === grade ? "rgba(99,102,241,0.15)" : "transparent",
              color: selectedGrade === grade ? "#6366f1" : "var(--color-text-muted)", transition: "all 0.2s" }}>
            {GRADE_LABELS[grade] || grade}
          </button>
        ))}
      </div>

      {/* Add Subject */}
      <div className="glass-card" style={{ marginBottom: "16px", padding: "14px" }}>
        {showNewSubject ? (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input value={newSubjectInputs[selectedGrade] || ""} onChange={e => setNewSubjectInputs(p => ({ ...p, [selectedGrade]: e.target.value }))}
              placeholder="Yeni ders adı..." className="input-field" style={{ flex: 1, margin: 0, padding: "8px 12px", fontSize: "14px" }}
              onKeyDown={e => { if (e.key === "Enter") handleAddSubject(selectedGrade); }} autoFocus />
            <button onClick={() => handleAddSubject(selectedGrade)} disabled={saving}
              style={{ padding: "8px 16px", background: "var(--color-primary)", border: "none", borderRadius: "100px", color: "#fff", cursor: "pointer", fontWeight: "700", fontSize: "13px" }}>Ekle</button>
            <button onClick={() => setShowNewSubject(false)}
              style={{ padding: "8px 12px", background: "transparent", border: "1px solid var(--color-border)", borderRadius: "100px", color: "var(--color-text-muted)", cursor: "pointer" }}><X size={16} /></button>
          </div>
        ) : (
          <button onClick={() => setShowNewSubject(true)}
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "1px dashed var(--color-border)", borderRadius: "12px", padding: "10px 16px", cursor: "pointer", color: "var(--color-text-muted)", width: "100%", fontFamily: "var(--font-primary)", fontSize: "13px" }}>
            <PlusCircle size={16} /> {GRADE_LABELS[selectedGrade] || selectedGrade} için yeni ders ekle
          </button>
        )}
      </div>

      {/* Subjects & Topics */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {Object.keys(gradeData).length === 0 && (
          <div className="glass-card" style={{ textAlign: "center", padding: "32px" }}>
            <p style={{ color: "var(--color-text-muted)" }}>Bu sınıf için henüz konu yok. Yukarıdan ders ekleyin.</p>
          </div>
        )}
        {Object.entries(gradeData).map(([subject, topics]) => {
          const color = getColor(subject);
          const isOpen = openSubjects[`${selectedGrade}-${subject}`];
          const newTopicKey = `${selectedGrade}-${subject}`;
          return (
            <div key={subject} className="glass-card" style={{ padding: 0, overflow: "hidden", border: `1px solid ${color}22` }}>
              <button onClick={() => setOpenSubjects(p => ({ ...p, [newTopicKey]: !p[newTopicKey] }))}
                style={{ width: "100%", background: "transparent", border: "none", padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ padding: "8px", background: `${color}22`, borderRadius: "10px", color, flexShrink: 0 }}><BookOpen size={16} /></div>
                <span style={{ fontWeight: "700", fontSize: "14px", color: "var(--color-text-main)", flex: 1, textAlign: "left" }}>{subject}</span>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)", marginRight: "8px" }}>{topics.length} konu</span>
                <div style={{ color: "var(--color-text-muted)" }}>{isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</div>
              </button>
              {openSubjects[newTopicKey] && (
                <div style={{ borderTop: `1px solid ${color}22`, padding: "10px 14px 14px" }}>
                  {topics.map(topic => (
                    <div key={topic.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "10px", marginBottom: "6px", background: "var(--color-bg-deep)", border: "1px solid var(--color-border)" }}>
                      {editingTopic === topic.id ? (
                        <>
                          <input value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
                            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--color-text-main)", fontSize: "13px", fontFamily: "var(--font-primary)" }}
                            onKeyDown={e => { if (e.key === "Enter") handleEditTopic(topic.id); if (e.key === "Escape") setEditingTopic(null); }} />
                          <button onClick={() => handleEditTopic(topic.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#10b981" }}><Check size={16} /></button>
                          <button onClick={() => setEditingTopic(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}><X size={16} /></button>
                        </>
                      ) : (
                        <>
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color, flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: "13px", color: "var(--color-text-main)", fontFamily: "var(--font-primary)" }}>{topic.topic_name}</span>
                          <button onClick={() => { setEditingTopic(topic.id); setEditValue(topic.topic_name); }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "4px" }}><Edit3 size={14} /></button>
                          <button onClick={() => handleDeleteTopic(topic.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "4px" }}><Trash2 size={14} /></button>
                        </>
                      )}
                    </div>
                  ))}
                  {/* Add Topic Input */}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "10px" }}>
                    <input value={newTopicInputs[newTopicKey] || ""} onChange={e => setNewTopicInputs(p => ({ ...p, [newTopicKey]: e.target.value }))}
                      placeholder="Yeni konu adı..." className="input-field"
                      style={{ flex: 1, margin: 0, padding: "8px 12px", fontSize: "13px" }}
                      onKeyDown={e => { if (e.key === "Enter") handleAddTopic(selectedGrade, subject); }} />
                    <button onClick={() => handleAddTopic(selectedGrade, subject)} disabled={saving}
                      style={{ padding: "8px 14px", background: color, border: "none", borderRadius: "100px", color: "#fff", cursor: "pointer", fontWeight: "700", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Plus size={14} /> Ekle
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
