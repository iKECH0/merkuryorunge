import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronRight, BookOpen, BarChart3, RefreshCw } from "lucide-react";
import { CURRICULUM, SCHOOL_LEVELS, GRADE_LABELS } from "../data/curriculum";
import { getTopicProgress, markTopicComplete, unmarkTopicComplete } from "../api";
import axios from "axios";

const API_URL = import.meta.env.PROD
  ? "https://backend-three-khaki-37.vercel.app/api"
  : "http://localhost:5000/api";

const SUBJECT_COLORS = {
  matematik: "#3b82f6", geometri: "#8b5cf6", fizik: "#06b6d4", kimya: "#10b981",
  biyoloji: "#22c55e", turkce: "#f59e0b", edebiyat: "#f59e0b", tarih: "#ef4444",
  cografya: "#f97316", felsefe: "#a855f7", hayat: "#14b8a6", fen: "#0ea5e9",
  sosyal: "#fb7185", inkilap: "#ef4444"
};

const SUBJECT_ORDER = [
  "Matematik", "Geometri", "Türkçe", "Türk Dili ve Edebiyatı", 
  "Fizik", "Kimya", "Biyoloji", "Fen Bilimleri", 
  "Tarih", "T.C. İnkılap Tarihi ve Atatürkçülük", "Coğrafya", "Felsefe", 
  "Din Kültürü ve Ahlak Bilgisi", "İngilizce", "Sosyal Bilgiler", "Hayat Bilgisi", 
  "Beden Eğitimi ve Spor", "Beden Eğitimi ve Oyun", "Görsel Sanatlar", "Müzik"
];
const getColor = (subject) => {
  const lower = subject.toLowerCase();
  for (const [key, val] of Object.entries(SUBJECT_COLORS)) {
    if (lower.includes(key)) return val;
  }
  return "#6366f1";
};

export default function TopicTracker({ studentName }) {
  const [selectedLevel, setSelectedLevel] = useState("Lise");
  const [selectedGrade, setSelectedGrade] = useState("TYT");
  const [curriculum, setCurriculum] = useState(null); // from backend
  const [completedIds, setCompletedIds] = useState(new Set());
  const [openSubjects, setOpenSubjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [saving, setSaving] = useState(null);

  const fetchCurriculum = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/curriculum`);
      setCurriculum(res.data);
      // If empty, seed it
      if (!res.data || Object.keys(res.data).length === 0) {
        await seedCurriculum();
      }
    } catch { setCurriculum({}); }
  }, []);

  const seedCurriculum = async () => {
    setSeeding(true);
    try {
      await axios.post(`${API_URL}/curriculum/seed`, { topics: CURRICULUM });
      const res = await axios.get(`${API_URL}/curriculum`);
      setCurriculum(res.data);
    } catch {}
    setSeeding(false);
  };

  const fetchProgress = useCallback(async () => {
    try {
      const ids = await getTopicProgress(studentName);
      setCompletedIds(new Set(ids));
    } catch {}
  }, [studentName]);

  useEffect(() => {
    Promise.all([fetchCurriculum(), fetchProgress()]).finally(() => setLoading(false));
  }, [fetchCurriculum, fetchProgress]);

  const toggleTopic = async (topicId) => {
    const isCompleted = completedIds.has(topicId);
    setSaving(topicId);
    try {
      if (isCompleted) {
        await unmarkTopicComplete(studentName, topicId);
        setCompletedIds(prev => { const n = new Set(prev); n.delete(topicId); return n; });
      } else {
        await markTopicComplete(studentName, topicId);
        setCompletedIds(prev => new Set([...prev, topicId]));
      }
    } catch {}
    setSaving(null);
  };

  const toggleSubject = (key) => setOpenSubjects(prev => ({ ...prev, [key]: !prev[key] }));

  if (loading || seeding) {
    return (
      <div className="glass-card fade-in" style={{ textAlign: "center", padding: "40px" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>📚</div>
        <p style={{ color: "var(--color-text-muted)" }}>{seeding ? "Müfredat yükleniyor..." : "Veriler getiriliyor..."}</p>
      </div>
    );
  }

  const gradeData = curriculum?.[selectedGrade] || {};
  const allGradeTopics = Object.values(gradeData).flat();
  const completedGrade = allGradeTopics.filter(t => completedIds.has(t.id)).length;
  const gradePercent = allGradeTopics.length > 0 ? Math.round((completedGrade / allGradeTopics.length) * 100) : 0;

  const allTopics = curriculum ? Object.values(curriculum).flatMap(g => Object.values(g)).flat() : [];
  const overallPercent = allTopics.length > 0 ? Math.round((completedIds.size / allTopics.length) * 100) : 0;

  const currentLevel = SCHOOL_LEVELS[selectedLevel];

  return (
    <div className="fade-in">
      {/* Overall */}
      <div className="glass-card slide-up" style={{ marginBottom: "20px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", marginBottom: "16px" }}>
          <div style={{ padding: "10px", background: "rgba(99,102,241,0.1)", borderRadius: "12px", color: "#6366f1" }}>
            <BarChart3 size={22} />
          </div>
          <h2 className="title" style={{ margin: 0, fontSize: "18px" }}>Genel İlerleme</h2>
        </div>
        <div style={{ fontSize: "36px", fontWeight: "800", color: "#6366f1" }}>{overallPercent}%</div>
        <div style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "12px" }}>{completedIds.size} / {allTopics.length} konu tamamlandı</div>
        <div style={{ height: "8px", background: "var(--color-border)", borderRadius: "100px", overflow: "hidden" }}>
          <div style={{ width: `${overallPercent}%`, height: "100%", background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: "100px", transition: "width 0.5s ease" }} />
        </div>
      </div>

      {/* School Level Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
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

      {/* Grade sub-tabs */}
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

      {/* Grade progress bar */}
      <div className="glass-card" style={{ marginBottom: "16px", padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--color-text-main)" }}>{GRADE_LABELS[selectedGrade] || selectedGrade} İlerlemesi</span>
          <span style={{ fontSize: "14px", color: "var(--color-primary)", fontWeight: "700" }}>{gradePercent}%</span>
        </div>
        <div style={{ height: "6px", background: "var(--color-border)", borderRadius: "100px", overflow: "hidden" }}>
          <div style={{ width: `${gradePercent}%`, height: "100%", background: "linear-gradient(90deg,var(--color-primary),#8b5cf6)", borderRadius: "100px", transition: "width 0.5s ease" }} />
        </div>
        <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>{completedGrade} / {allGradeTopics.length} konu</div>
      </div>

      {/* Subject Accordions */}
      {Object.keys(gradeData).length === 0 && (
        <div className="glass-card" style={{ textAlign: "center", padding: "32px" }}>
          <p style={{ color: "var(--color-text-muted)" }}>Bu sınıf için henüz konu eklenmemiş.</p>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {Object.entries(gradeData).sort(([a], [b]) => {
          const indexA = SUBJECT_ORDER.indexOf(a);
          const indexB = SUBJECT_ORDER.indexOf(b);
          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          return a.localeCompare(b);
        }).map(([subject, topics]) => {
          const color = getColor(subject);
          const completedInSubject = topics.filter(t => completedIds.has(t.id)).length;
          const subjectPercent = Math.round((completedInSubject / topics.length) * 100);
          const isOpen = openSubjects[`${selectedGrade}-${subject}`];
          return (
            <div key={subject} className="glass-card" style={{ padding: 0, overflow: "hidden", border: `1px solid ${color}22` }}>
              <button onClick={() => toggleSubject(`${selectedGrade}-${subject}`)}
                style={{ width: "100%", background: "transparent", border: "none", padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ padding: "8px", background: `${color}22`, borderRadius: "10px", color, flexShrink: 0 }}><BookOpen size={16} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontWeight: "700", fontSize: "14px", color: "var(--color-text-main)" }}>{subject}</span>
                    <span style={{ fontSize: "13px", color, fontWeight: "700", marginLeft: "8px" }}>{completedInSubject}/{topics.length}</span>
                  </div>
                  <div style={{ height: "4px", background: "var(--color-border)", borderRadius: "100px", overflow: "hidden" }}>
                    <div style={{ width: `${subjectPercent}%`, height: "100%", background: color, borderRadius: "100px", transition: "width 0.3s" }} />
                  </div>
                </div>
                <div style={{ color: "var(--color-text-muted)" }}>{isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</div>
              </button>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${color}22`, padding: "8px 12px 12px" }}>
                  {topics.map(topic => {
                    const done = completedIds.has(topic.id);
                    return (
                      <button key={topic.id} onClick={() => saving !== topic.id && toggleTopic(topic.id)}
                        style={{ width: "100%", background: done ? `${color}12` : "transparent", border: `1px solid ${done ? color + "44" : "transparent"}`,
                          borderRadius: "10px", padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px",
                          textAlign: "left", transition: "all 0.2s", opacity: saving === topic.id ? 0.5 : 1 }}>
                        <div style={{ color: done ? color : "var(--color-text-muted)", flexShrink: 0 }}>{done ? <CheckCircle2 size={18} /> : <Circle size={18} />}</div>
                        <span style={{ fontSize: "13px", fontFamily: "var(--font-primary)", color: done ? "var(--color-text-main)" : "var(--color-text-muted)", fontWeight: done ? "600" : "400" }}>
                          {topic.topic_name}
                        </span>
                        {done && <span style={{ marginLeft: "auto", fontSize: "11px", color, fontWeight: "700" }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
