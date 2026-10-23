import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Plus, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../api';

const pad = value => String(value).padStart(2, '0');
const toDateValue = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseDate = value => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
};
const addDays = (value, amount) => {
  const date = typeof value === 'string' ? parseDate(value) : new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
};
const getWeekRange = value => {
  const date = value ? parseDate(value) : new Date();
  const mondayOffset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  const start = addDays(date, mondayOffset);
  return { start: toDateValue(start), end: toDateValue(addDays(start, 6)) };
};
const formatRange = ({ start, end }) => {
  if (!start || !end) return 'Tarih aralığı seçin';
  const first = parseDate(start).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  const last = parseDate(end).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${first} – ${last}`;
};
const formatDisplayDate = value => {
  if (!value) return '—';
  const datePart = String(value).slice(0, 10);
  return parseDate(datePart).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};
const formatDuration = value => {
  const minutes = Number(value) || 0;
  if (!minutes) return '—';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours && remainder) return `${hours} sa ${remainder} dk`;
  if (hours) return `${hours} saat`;
  return `${remainder} dk`;
};
const getStudentId = student => student?.id ?? student?.student_id;
const getStudentName = student => student?.full_name || student?.name || student?.student_name || 'İsimsiz öğrenci';

const TeachingHoursTracker = ({ teacherId, students = [] }) => {
  const apiBaseUrl = API_BASE_URL;
  const [teachingLogs, setTeachingLogs] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('report');
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [dateRange, setDateRange] = useState(() => getWeekRange());

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [lessonSubject, setLessonSubject] = useState('Matematik');
  const [lessonDuration, setLessonDuration] = useState('60');
  const [lessonCount, setLessonCount] = useState(1);
  const [lessonDate, setLessonDate] = useState(toDateValue(new Date()));
  const [lessonNotes, setLessonNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const subjectGroups = [
    { label: 'Dersler', options: ['Matematik', 'Türkçe', 'Fizik', 'Kimya', 'Biyoloji', 'Tarih', 'Coğrafya', 'İngilizce'] },
    { label: 'Çalışma Türleri', options: ['Kitap Okuma', 'Paragraf Çalışması', 'Deneme Sınavı', 'Soru Çözümü', 'Ödev / Etüt', 'Konu Tekrarı', 'Diğer'] }
  ];
  // API'den alınan liste ile panelin güncel listesini birleştir. Böylece yeni
  // eklenen ve henüz ders kaydı olmayan öğrenciler de hemen seçilebilir olur.
  const formStudents = useMemo(() => {
    const byId = new Map();
    [...availableStudents, ...students].forEach(student => {
      const id = getStudentId(student);
      if (id !== undefined && id !== null) byId.set(String(id), student);
    });
    return [...byId.values()].sort((a, b) => getStudentName(a).localeCompare(getStudentName(b), 'tr'));
  }, [availableStudents, students]);

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/teacher-students/${teacherId}`, { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && Array.isArray(data)) setAvailableStudents(data);
    } catch (error) {
      console.error('Öğrenci listesi alınamadı:', error);
    }
  };
  const fetchTeachingLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/api/teaching-logs?teacher_id=${teacherId}`);
      const data = await response.json();
      setTeachingLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Ders kayıtları alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };
  const fetchSummary = async (range = dateRange) => {
    try {
      const params = new URLSearchParams({ start_date: range.start, end_date: range.end });
      const response = await fetch(`${apiBaseUrl}/api/teaching-logs/summary/${teacherId}?${params}`);
      const data = await response.json();
      setSummary(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Haftalık rapor alınamadı:', error);
    }
  };

  useEffect(() => {
    if (!teacherId) return;
    fetchTeachingLogs();
    fetchStudents();
  }, [teacherId]);
  useEffect(() => {
    if (!teacherId || !dateRange.start || !dateRange.end) return;
    fetchSummary(dateRange);
  }, [teacherId, dateRange.start, dateRange.end]);
  useEffect(() => {
    if (selectedStudentId || !formStudents.length) return;
    const firstStudent = formStudents.find(student => getStudentId(student));
    if (!firstStudent) return;
    setSelectedStudentId(String(getStudentId(firstStudent)));
    setSelectedStudentName(getStudentName(firstStudent));
  }, [formStudents, selectedStudentId]);

  const weeklyRows = useMemo(() => {
    const byStudent = new Map(summary.map(item => [String(item.student_id), item]));
    return formStudents.map(student => {
      const studentId = getStudentId(student);
      const item = byStudent.get(String(studentId));
      return {
        studentId,
        studentName: getStudentName(student),
        lessonCount: Number(item?.lesson_count) || 0,
        totalMinutes: Number(item?.total_minutes) || 0,
        subjects: item?.subjects || '',
        firstLesson: item?.first_lesson,
        lastLesson: item?.last_lesson
      };
    }).sort((a, b) => a.studentName.localeCompare(b.studentName, 'tr'));
  }, [formStudents, summary]);
  const totalLessons = weeklyRows.reduce((sum, row) => sum + row.lessonCount, 0);
  const totalMinutes = weeklyRows.reduce((sum, row) => sum + row.totalMinutes, 0);
  const activeStudents = weeklyRows.filter(row => row.lessonCount > 0).length;

  const handleStudentSelect = event => {
    const id = event.target.value;
    setSelectedStudentId(id);
    const selected = formStudents.find(student => String(getStudentId(student)) === id);
    setSelectedStudentName(selected ? getStudentName(selected) : '');
  };
  const handleAddForStudent = row => {
    setSelectedStudentId(String(row.studentId));
    setSelectedStudentName(row.studentName);
    const today = toDateValue(new Date());
    setLessonDate(today >= dateRange.start && today <= dateRange.end ? today : dateRange.start);
    setFormError('');
    setFormSuccess('');
    setActiveTab('log');
  };
  const handleAddLesson = async event => {
    event.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!selectedStudentId || !selectedStudentName || Number(lessonDuration) < 1 || ![1, 2].includes(lessonCount)) {
      setFormError('Lütfen öğrenci ve geçerli bir ders süresi seçin.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        teacher_id: Number(teacherId),
        student_id: Number(selectedStudentId),
        student_name: selectedStudentName,
        subject: lessonSubject,
        duration_minutes: Number(lessonDuration),
        lesson_date: lessonDate,
        notes: lessonNotes
      };
      const responses = await Promise.all(Array.from({ length: lessonCount }, () => fetch(`${apiBaseUrl}/api/teaching-logs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      })));
      const failedResponse = responses.find(response => !response.ok);
      if (failedResponse) {
        const data = await failedResponse.json().catch(() => ({}));
        throw new Error(data.error || 'Ders kaydı oluşturulamadı');
      }
      const totalMinutes = Number(lessonDuration) * lessonCount;
      setFormSuccess(`${selectedStudentName} için ${lessonCount} ders (${formatDuration(totalMinutes)}) kaydedildi.`);
      setLessonDuration('60');
      setLessonCount(1);
      setLessonNotes('');
      await Promise.all([fetchTeachingLogs(), fetchSummary(dateRange)]);
    } catch (error) {
      setFormError(`Hata: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };
  const handleDeleteLog = async id => {
    if (!window.confirm('Bu ders kaydını silmek istediğinize emin misiniz?')) return;
    try {
      const response = await fetch(`${apiBaseUrl}/api/teaching-logs/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Kayıt silinemedi');
      await Promise.all([fetchTeachingLogs(), fetchSummary(dateRange)]);
    } catch (error) {
      console.error('Silme hatası:', error);
    }
  };
  const shiftWeek = days => {
    setDateRange(current => ({
      start: toDateValue(addDays(current.start, days)),
      end: toDateValue(addDays(current.end, days))
    }));
    setExpandedStudent(null);
  };

  return (
    <div className="glass-card slide-up">
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', background: 'var(--color-bg-deep)', borderRadius: '12px', color: '#06b6d4' }}><Clock size={24} /></div>
          <div>
            <h2 className="title" style={{ fontSize: '20px', margin: 0, color: 'var(--color-text-main)' }}>Haftalık Ders Takibi</h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>Öğrencilerin ders adetlerini ve toplam sürelerini hafta hafta takip edin</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', fontSize: '13px', flexWrap: 'wrap' }}>
          <Badge color="#06b6d4">{totalLessons} ders</Badge>
          <Badge color="#3b82f6">{formatDuration(totalMinutes)}</Badge>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
        <TabButton active={activeTab === 'report'} color="#3b82f6" onClick={() => setActiveTab('report')}>Haftalık Tablo</TabButton>
        <TabButton active={activeTab === 'log'} color="#06b6d4" onClick={() => setActiveTab('log')}>Ders Kaydı Ekle</TabButton>
      </div>

      <div style={{ padding: '20px' }}>
        {activeTab === 'report' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={rangeBoxStyle}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', color: 'var(--color-text-main)', fontWeight: 700 }}>
                  <Calendar size={17} /> {formatRange(dateRange)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Tarihleri değiştirerek özel bir hafta aralığı da görüntüleyebilirsiniz.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => shiftWeek(-7)} aria-label="Önceki hafta" style={navButtonStyle}><ChevronLeft size={17} /></button>
                <DateInput label="Başlangıç" value={dateRange.start} onChange={value => setDateRange(current => ({ start: value, end: current.end < value ? toDateValue(addDays(value, 6)) : current.end }))} />
                <DateInput label="Bitiş" value={dateRange.end} min={dateRange.start} onChange={value => setDateRange(current => ({ ...current, end: value }))} />
                <button type="button" onClick={() => shiftWeek(7)} aria-label="Sonraki hafta" style={navButtonStyle}><ChevronRight size={17} /></button>
                <button type="button" onClick={() => { setDateRange(getWeekRange()); setExpandedStudent(null); }} style={{ ...navButtonStyle, width: 'auto', padding: '0 12px', fontSize: '12px', fontWeight: 600 }}>Bu hafta</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              <SummaryCard label="Toplam ders" value={totalLessons} color="#06b6d4" />
              <SummaryCard label="Toplam süre" value={formatDuration(totalMinutes)} color="#3b82f6" />
              <SummaryCard label="Ders yapılan öğrenci" value={`${activeStudents} / ${weeklyRows.length}`} color="#8b5cf6" />
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
              <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', color: 'var(--color-text-main)' }}>
                <thead><tr style={{ background: 'rgba(255,255,255,.05)', textAlign: 'left' }}>
                  <th style={thStyle}>Öğrenci</th><th style={thStyle}>Ders adedi</th><th style={thStyle}>Toplam süre</th><th style={thStyle}>Dersler</th><th style={{ ...thStyle, textAlign: 'right' }}>İşlem</th>
                </tr></thead>
                <tbody>
                  {weeklyRows.map(row => (
                    <React.Fragment key={row.studentId}>
                      <tr style={{ borderTop: '1px solid var(--color-border)' }}>
                        <td style={tdStyle}><div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontWeight: 600 }}>
                          <span style={avatarStyle(row.lessonCount)}>{row.studentName.charAt(0).toLocaleUpperCase('tr-TR')}</span>{row.studentName}
                        </div></td>
                        <td style={tdStyle}><span style={{ fontWeight: 700, color: row.lessonCount ? '#06b6d4' : 'var(--color-text-muted)' }}>{row.lessonCount} ders</span></td>
                        <td style={tdStyle}>{formatDuration(row.totalMinutes)}</td>
                        <td style={{ ...tdStyle, maxWidth: '210px', color: row.subjects ? 'var(--color-text-main)' : 'var(--color-text-muted)' }}>{row.subjects || 'Henüz kayıt yok'}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {row.lessonCount > 0 && <button type="button" aria-label={`${row.studentName} detayları`} onClick={() => setExpandedStudent(expandedStudent === row.studentId ? null : row.studentId)} style={{ ...smallButtonStyle, marginRight: '6px', background: 'rgba(255,255,255,.06)', color: 'var(--color-text-muted)' }}>{expandedStudent === row.studentId ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</button>}
                          <button type="button" onClick={() => handleAddForStudent(row)} style={smallButtonStyle}><Plus size={15} /> Ders ekle</button>
                        </td>
                      </tr>
                      {expandedStudent === row.studentId && row.lessonCount > 0 && <tr style={{ background: 'rgba(59,130,246,.05)', borderTop: '1px solid var(--color-border)' }}><td colSpan="5" style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--color-text-muted)' }}>İlk ders: <strong>{formatDisplayDate(row.firstLesson)}</strong> · Son ders: <strong>{formatDisplayDate(row.lastLesson)}</strong> · Toplam: <strong>{formatDuration(row.totalMinutes)}</strong></td></tr>}
                    </React.Fragment>
                  ))}
                  {!weeklyRows.length && <tr><td colSpan="5" style={{ padding: '28px', textAlign: 'center', color: 'var(--color-text-muted)' }}>Bu öğretmene atanmış öğrenci bulunamadı.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'log' && (
          <form onSubmit={handleAddLesson} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {formError && <div style={errorStyle}>{formError}</div>}
            {formSuccess && <div style={successStyle}>✓ {formSuccess}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <FormField label="Öğrenci"><select value={selectedStudentId} onChange={handleStudentSelect} required style={controlStyle}><option value="">Öğrenci seçin</option>{formStudents.map(student => <option key={getStudentId(student)} value={getStudentId(student)}>{getStudentName(student)}</option>)}</select></FormField>
              <FormField label="Ders / çalışma türü"><select value={lessonSubject} onChange={event => setLessonSubject(event.target.value)} style={controlStyle}>{subjectGroups.map(group => <optgroup key={group.label} label={group.label}>{group.options.map(option => <option key={option} value={option}>{option}</option>)}</optgroup>)}</select></FormField>
              <FormField label="Ders tarihi"><input type="date" value={lessonDate} onChange={event => setLessonDate(event.target.value)} required style={controlStyle} /></FormField>
              <FormField label="Ders süresi (dakika)">
                <input type="number" value={lessonDuration} onChange={event => setLessonDuration(event.target.value)} min="1" required style={controlStyle} />
                <div style={{ display: 'flex', gap: '6px', marginTop: '7px', flexWrap: 'wrap' }}>{[40, 60, 80, 100].map(minutes => <button key={minutes} type="button" onClick={() => setLessonDuration(String(minutes))} style={presetStyle(lessonDuration === String(minutes))}>{minutes} dakika</button>)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginRight: '2px' }}>Ders adedi:</span>
                  {[1, 2].map(count => <button key={count} type="button" onClick={() => setLessonCount(count)} style={presetStyle(lessonCount === count)}>{count} ders</button>)}
                  <span style={{ fontSize: '12px', color: '#06b6d4', fontWeight: 600 }}>Toplam: {Number(lessonDuration || 0) * lessonCount} dakika</span>
                </div>
              </FormField>
            </div>
            <FormField label="Not (isteğe bağlı)"><textarea value={lessonNotes} onChange={event => setLessonNotes(event.target.value)} placeholder="Dersle ilgili kısa bir not ekleyebilirsiniz..." style={{ ...controlStyle, resize: 'vertical', minHeight: '76px', fontFamily: 'inherit' }} /></FormField>
            <button type="submit" disabled={submitting} style={submitStyle(submitting)}><Plus size={18} /> {submitting ? 'Kaydediliyor...' : 'Ders Kaydını Kaydet'}</button>
            {loading && <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Kayıtlar yükleniyor...</div>}
            {!loading && teachingLogs.length > 0 && <RecentLogs logs={teachingLogs.slice(0, 10)} onDelete={handleDeleteLog} />}
          </form>
        )}
      </div>
    </div>
  );
};

const Badge = ({ color, children }) => <div style={{ padding: '8px 12px', background: `${color}16`, borderRadius: '8px', color, fontWeight: 600 }}>{children}</div>;
const TabButton = ({ active, color, onClick, children }) => <button type="button" onClick={onClick} style={{ flex: 1, padding: '12px', background: active ? `${color}16` : 'transparent', color: active ? color : 'var(--color-text-muted)', border: 'none', borderBottom: active ? `2px solid ${color}` : '2px solid transparent', cursor: 'pointer', fontWeight: active ? 600 : 400, fontSize: '14px' }}>{children}</button>;
const DateInput = ({ label, value, min, onChange }) => <div><label style={dateLabelStyle}>{label}</label><input type="date" value={value} min={min} onChange={event => onChange(event.target.value)} style={dateInputStyle} /></div>;
const SummaryCard = ({ label, value, color }) => <div style={{ padding: '14px', background: `${color}16`, borderRadius: '8px', borderLeft: `3px solid ${color}` }}><div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{label}</div><div style={{ fontSize: '21px', fontWeight: 700, color }}>{value}</div></div>;
const FormField = ({ label, children }) => <div><label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--color-text-main)', fontWeight: 600 }}>{label}</label>{children}</div>;
const RecentLogs = ({ logs, onDelete }) => <div style={{ marginTop: '8px', paddingTop: '18px', borderTop: '1px solid var(--color-border)' }}><h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--color-text-main)' }}>Son ders kayıtları</h3><div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>{logs.map(log => <div key={log.id} style={recentLogStyle}><div><strong>{log.student_name}</strong> · {log.subject || 'Ders'} · {formatDuration(log.duration_minutes)}<br /><span style={{ color: 'var(--color-text-muted)' }}>{log.lesson_date}</span></div><button type="button" onClick={() => onDelete(log.id)} aria-label="Ders kaydını sil" style={deleteStyle}><Trash2 size={14} /></button></div>)}</div></div>;

const headerStyle = { padding: '20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' };
const rangeBoxStyle = { padding: '14px', background: 'rgba(255,255,255,.03)', border: '1px solid var(--color-border)', borderRadius: '10px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' };
const navButtonStyle = { width: '34px', height: '34px', padding: 0, borderRadius: '7px', border: '1px solid var(--color-border)', background: 'rgba(255,255,255,.05)', color: 'var(--color-text-main)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
const dateLabelStyle = { fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' };
const dateInputStyle = { padding: '8px', borderRadius: '6px', border: '1px solid var(--color-border)', background: 'var(--color-bg-deep)', color: 'white', fontSize: '12px' };
const thStyle = { padding: '11px 14px', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 };
const tdStyle = { padding: '12px 14px', fontSize: '13px', verticalAlign: 'middle' };
const avatarStyle = active => ({ width: '30px', height: '30px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: active ? 'rgba(6,182,212,.16)' : 'rgba(255,255,255,.06)', color: active ? '#06b6d4' : 'var(--color-text-muted)' });
const smallButtonStyle = { padding: '7px 10px', border: 'none', borderRadius: '7px', background: 'rgba(6,182,212,.14)', color: '#06b6d4', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600 };
const controlStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg-deep)', color: 'white', fontSize: '14px', boxSizing: 'border-box' };
const presetStyle = active => ({ padding: '5px 9px', borderRadius: '6px', border: `1px solid ${active ? '#06b6d4' : 'var(--color-border)'}`, background: active ? 'rgba(6,182,212,.12)' : 'transparent', color: active ? '#06b6d4' : 'var(--color-text-muted)', cursor: 'pointer', fontSize: '11px' });
const submitStyle = disabled => ({ padding: '12px', background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' });
const errorStyle = { padding: '12px', background: 'rgba(239,68,68,.1)', color: '#ef4444', borderRadius: '8px', fontSize: '14px' };
const successStyle = { padding: '12px', background: 'rgba(16,185,129,.1)', color: '#10b981', borderRadius: '8px', fontSize: '14px' };
const recentLogStyle = { padding: '10px', background: 'rgba(255,255,255,.03)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontSize: '13px' };
const deleteStyle = { background: 'rgba(239,68,68,.16)', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center' };

export default TeachingHoursTracker;
