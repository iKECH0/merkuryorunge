import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, TrendingUp, Calendar, User, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

const TeachingHoursTracker = ({ teacherId, students = [] }) => {
  const apiBaseUrl = import.meta.env.PROD ? 'https://backend-three-khaki-37.vercel.app' : (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000');
  
  const [teachingLogs, setTeachingLogs] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('log'); // 'log' or 'report'
  
  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [lessonSubject, setLessonSubject] = useState('Matematik');
  const [lessonDuration, setLessonDuration] = useState('60');
  const [lessonDate, setLessonDate] = useState(new Date().toISOString().split('T')[0]);
  const [lessonNotes, setLessonNotes] = useState('');
  const [zoomLink, setZoomLink] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Report filter states
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const SUBJECT_GROUPS = [
    {
      label: 'Dersler',
      options: ['Matematik', 'Türkçe', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'İngilizce']
    },
    {
      label: 'Çalışma Türleri',
      options: ['Kitap Okuma', 'Paragraf Çalışması', 'Deneme Sınavı', 'Soru Çözümü', 'Ödev / Etüt', 'Konu Tekrarı', 'Diğer']
    }
  ];

  useEffect(() => {
    if (teacherId) {
      fetchTeachingLogs();
      fetchSummary();
      fetchStudents();
    }
  }, [teacherId]);

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/teacher-students/${teacherId}`);
      const data = await response.json();
      if (response.ok && Array.isArray(data)) setAvailableStudents(data);
    } catch (err) {
      console.error('Öğrenci listesi alınamadı:', err);
    }
  };

  const formStudents = availableStudents.length > 0 ? availableStudents : students;

  useEffect(() => {
    if (!selectedStudentId && formStudents.length > 0) {
      const firstStudent = formStudents.find(student => student.id || student.student_id);
      if (firstStudent) {
        setSelectedStudentId(String(firstStudent.id || firstStudent.student_id));
        setSelectedStudentName(firstStudent.full_name || firstStudent.name || firstStudent.student_name || '');
      }
    }
  }, [formStudents, selectedStudentId]);

  const fetchTeachingLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/api/teaching-logs?teacher_id=${teacherId}`);
      const data = await response.json();
      setTeachingLogs(data);
    } catch (err) {
      console.error('Ders saati kayıtları alınamadı:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      let url = `${apiBaseUrl}/api/teaching-logs/summary/${teacherId}`;
      if (dateRange.start) url += `?start_date=${dateRange.start}`;
      if (dateRange.end) url += `${dateRange.start ? '&' : '?'}end_date=${dateRange.end}`;
      
      const response = await fetch(url);
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Rapor alınamadı:', err);
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedStudentId || !selectedStudentName || !lessonDuration || Number(lessonDuration) < 1) {
      setFormError('Lütfen öğrenci ve geçerli bir süre seçiniz');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${apiBaseUrl}/api/teaching-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: parseInt(teacherId),
          student_id: parseInt(selectedStudentId),
          student_name: selectedStudentName,
          subject: lessonSubject,
          duration_minutes: parseInt(lessonDuration),
          lesson_date: lessonDate,
          notes: lessonNotes,
          zoom_link: zoomLink
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Çalışma kaydı oluşturulamadı');
      }
      
      setFormSuccess('✅ Ders saati başarıyla kaydedildi!');
      
      // Reset form
      setSelectedStudentId('');
      setSelectedStudentName('');
      setLessonDuration('60');
      setLessonDate(new Date().toISOString().split('T')[0]);
      setLessonSubject('Matematik');
      setLessonNotes('');
      setZoomLink('');
      
      // Refresh data
      setTimeout(() => {
        fetchTeachingLogs();
        fetchSummary();
      }, 500);
    } catch (err) {
      setFormError('Hata: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Bu ders kaydını silmek istediğinize emin misiniz?')) return;
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/teaching-logs/${logId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Silinemedi');
      
      setTeachingLogs(teachingLogs.filter(log => log.id !== logId));
      fetchSummary();
    } catch (err) {
      console.error('Silme hatası:', err);
    }
  };

  const handleStudentSelect = (e) => {
    const studentId = e.target.value;
    setSelectedStudentId(studentId);
    const selected = formStudents.find(s => String(s.id || s.student_id) === String(studentId));
    if (selected) {
      setSelectedStudentName(selected.full_name || selected.name || selected.student_name || '');
    }
  };

  const handleDateRangeChange = async () => {
    await fetchSummary();
  };

  const getRecentLogs = () => {
    return teachingLogs.slice(0, 10);
  };

  const totalTeachingHours = summary.reduce((sum, s) => sum + (parseFloat(s.total_hours) || 0), 0);
  const totalLessons = summary.reduce((sum, s) => sum + (s.lesson_count || 0), 0);

  return (
    <div className="glass-card slide-up">
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            padding: '10px', 
            background: 'var(--color-bg-deep)', 
            borderRadius: '12px', 
            color: '#06b6d4' 
          }}>
            <Clock size={24} />
          </div>
          <div>
            <h2 className="title" style={{ fontSize: '20px', margin: 0, color: 'var(--color-text-main)' }}>
              Ders ve Çalışma Kaydı
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Ders, kitap okuma ve tüm çalışma etkinliklerini kaydedin
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
          <div style={{ padding: '8px 12px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '8px', color: '#06b6d4', fontWeight: 600 }}>
            📊 {totalLessons} çalışma
          </div>
          <div style={{ padding: '8px 12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: '#3b82f6', fontWeight: 600 }}>
                ⏱️ {totalTeachingHours.toFixed(1)} saat çalışma
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setActiveTab('log')}
          style={{
            flex: 1,
            padding: '12px',
            background: activeTab === 'log' ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
            color: activeTab === 'log' ? '#06b6d4' : 'var(--color-text-muted)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'log' ? 600 : 400,
            fontSize: '14px',
            borderBottom: activeTab === 'log' ? '2px solid #06b6d4' : 'none'
          }}
        >
          ➕ Ders Kaydı Ekle
        </button>
        <button
          onClick={() => setActiveTab('report')}
          style={{
            flex: 1,
            padding: '12px',
            background: activeTab === 'report' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            color: activeTab === 'report' ? '#3b82f6' : 'var(--color-text-muted)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'report' ? 600 : 400,
            fontSize: '14px',
            borderBottom: activeTab === 'report' ? '2px solid #3b82f6' : 'none'
          }}
        >
          📋 Rapor & Özet
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        {/* LOG TAB */}
        {activeTab === 'log' && (
          <form onSubmit={handleAddLesson} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {formError && (
              <div style={{
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                {formError}
              </div>
            )}
            {formSuccess && (
              <div style={{
                padding: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                {formSuccess}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--color-text-main)', fontWeight: 500 }}>
                  🎓 Öğrenci Seç
                </label>
                <select
                  value={selectedStudentId}
                  onChange={handleStudentSelect}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-deep)',
                    color: 'white',
                    fontSize: '14px'
                  }}
                >
                  <option value="">-- Öğrenci Seçiniz --</option>
                  {formStudents.map(student => {
                    const studentId = student.id || student.student_id;
                    const studentName = student.full_name || student.name || student.student_name;
                    return (
                    <option key={studentId} value={studentId}>{studentName}</option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--color-text-main)', fontWeight: 500 }}>
                  📚 Ders / Çalışma Türü
                </label>
                <select
                  value={lessonSubject}
                  onChange={(e) => setLessonSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-deep)',
                    color: 'white',
                    fontSize: '14px'
                  }}
                >
                  {SUBJECT_GROUPS.map(group => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--color-text-main)', fontWeight: 500 }}>
                  📅 Çalışma Tarihi
                </label>
                <input
                  type="date"
                  value={lessonDate}
                  onChange={(e) => setLessonDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-deep)',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--color-text-main)', fontWeight: 500 }}>
                  ⏱️ Süre (dakika)
                </label>
                <input
                  type="number"
                  value={lessonDuration}
                  onChange={(e) => setLessonDuration(e.target.value)}
                  min="1"
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-deep)',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--color-text-main)', fontWeight: 500 }}>
                📝 Notlar (İsteğe Bağlı)
              </label>
              <textarea
                value={lessonNotes}
                onChange={(e) => setLessonNotes(e.target.value)}
                placeholder="Kitap adı, sayfa aralığı, paragraf konusu veya ders notu..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-deep)',
                  color: 'white',
                  fontSize: '14px',
                  resize: 'vertical',
                  minHeight: '80px',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--color-text-main)', fontWeight: 500 }}>
                🔗 Zoom Linki (İsteğe Bağlı)
              </label>
              <input
                type="url"
                value={zoomLink}
                onChange={(e) => setZoomLink(e.target.value)}
                placeholder="https://zoom.us/j/..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-deep)',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
            </div>


            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '12px',
                background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Plus size={18} /> {submitting ? 'Kaydediliyor...' : 'Çalışma Kaydını Kaydet'}
            </button>

            {/* Recent Logs */}
            {getRecentLogs().length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--color-border)' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text-main)' }}>
                  Son Kaydedilen Çalışmalar
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                  {getRecentLogs().map(log => (
                    <div
                      key={log.id}
                      style={{
                        padding: '10px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '13px'
                      }}
                    >
                      <div>
                        <strong>{log.student_name}</strong> - {log.subject} ({log.duration_minutes} dk)
                        <br />
                        <span style={{ color: 'var(--color-text-muted)' }}>📅 {log.lesson_date}</span>
                        {log.zoom_link && (
                          <div style={{ marginTop: '4px' }}>
                            <a href={log.zoom_link} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              🔗 Zoom Linki
                            </a>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '12px'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}

        {/* REPORT TAB */}
        {activeTab === 'report' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Date Range Filter */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-deep)',
                    color: 'white',
                    fontSize: '12px'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-deep)',
                    color: 'white',
                    fontSize: '12px'
                  }}
                />
              </div>
              <button
                onClick={handleDateRangeChange}
                style={{
                  padding: '8px 16px',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  alignSelf: 'flex-end'
                }}
              >
                Filtrele
              </button>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '16px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '8px', borderLeft: '3px solid #06b6d4' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Toplam Çalışma</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#06b6d4' }}>{totalLessons}</div>
              </div>
              <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', borderLeft: '3px solid #3b82f6' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Toplam Saat</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>{totalTeachingHours.toFixed(1)}h</div>
              </div>
              <div style={{ padding: '16px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', borderLeft: '3px solid #8b5cf6' }}>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Öğrenci Başına Ortalama</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6' }}>
                  {summary.length > 0 ? (totalLessons / summary.length).toFixed(1) : 0}
                </div>
              </div>
            </div>

            {/* Student Summary List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 12px 0', color: 'var(--color-text-main)' }}>
                📊 Öğrenci Başına Rapor
              </h3>
              {summary.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  Henüz ders kaydı yok
                </div>
              ) : (
                summary.map(student => (
                  <div key={student.student_id} style={{
                    padding: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setExpandedStudent(expandedStudent === student.student_id ? null : student.student_id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'white', marginBottom: '4px' }}>
                          👤 {student.student_name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                          {student.lesson_count} çalışma • {student.total_hours} saat • Ort. {student.avg_duration} dk/kayıt
                        </div>
                      </div>
                      <div>
                        {expandedStudent === student.student_id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>

                    {expandedStudent === student.student_id && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border)', fontSize: '13px' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <strong>📚 Dersler / Çalışmalar:</strong> {student.subjects}
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                          <strong>📅 Tarih Aralığı:</strong> {student.first_lesson} → {student.last_lesson}
                        </div>
                        <div>
                          <strong>📊 Detay:</strong> {student.total_minutes} dakika ({student.total_hours} saat)
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeachingHoursTracker;
