import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { getLogs, getStats, getAdminStats, addStudentByTeacher, updateStudent, deleteStudentByTeacher, changeTeacherPassword } from '../api';
import StudentReportPDF from '../components/StudentReportPDF';
import CurriculumManager from '../components/CurriculumManager';
import TeachingHoursTracker from '../components/TeachingHoursTracker';
import { LayoutDashboard, RefreshCw, Users, Clock, Hash, BookOpen, Download, LogOut, Copy, CheckCircle2, PlusCircle, X, User, Key, GraduationCap, Pencil, Trash2, KeyRound, Eye, EyeOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [generatingStudent, setGeneratingStudent] = useState(null);
  const [pdfTargetStudent, setPdfTargetStudent] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showCurriculum, setShowCurriculum] = useState(false);

  // Edit Student Modal State
  const [editingStudent, setEditingStudent] = useState(null); // { id, name, class_name, school_level }
  const [editClassName, setEditClassName] = useState('');
  const [editSchoolLevel, setEditSchoolLevel] = useState('Lise (YKS)');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Add Student Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentFullName, setNewStudentFullName] = useState('');
  const [newStudentUsername, setNewStudentUsername] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [newStudentSchoolLevel, setNewStudentSchoolLevel] = useState('Lise (YKS)');
  const [newStudentClassName, setNewStudentClassName] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [leaderTeachers, setLeaderTeachers] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  // Delete Student Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  // Change Password Modal State
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [cpCurrentPassword, setCpCurrentPassword] = useState('');
  const [cpNewPassword, setCpNewPassword] = useState('');
  const [cpConfirmPassword, setCpConfirmPassword] = useState('');
  const [cpShowCurrent, setCpShowCurrent] = useState(false);
  const [cpShowNew, setCpShowNew] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState('');
  const [cpSuccess, setCpSuccess] = useState('');

  const teacherId = localStorage.getItem('teacherId');
  const teacherName = localStorage.getItem('teacherName') || 'Öğretmen';
  const inviteCode = localStorage.getItem('teacherInviteCode') || '------';
  
  const inviteLink = `${window.location.origin}/?invite=${inviteCode}`;

  useEffect(() => {
    if (!teacherId) {
      navigate('/ogretmen');
      return;
    }
    fetchData();
    if (teacherId === 'ALL') {
      getAdminStats()
        .then(data => setLeaderTeachers((data.teachers || []).filter(teacher => teacher.is_approved)))
        .catch(err => console.error(err));
    }
  }, [teacherId]);

  const handleLogout = () => {
    localStorage.removeItem('teacherAuth');
    localStorage.removeItem('teacherId');
    localStorage.removeItem('teacherName');
    localStorage.removeItem('teacherInviteCode');
    navigate('/ogretmen');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [logsData, statsData] = await Promise.all([
        getLogs(teacherId),
        getStats(teacherId)
      ]);
      setLogs(logsData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    setAddLoading(true);

    try {
      if (!newStudentFullName || !newStudentUsername || !newStudentPassword) {
        setAddError('Tüm alanları doldurun.');
        setAddLoading(false);
        return;
      }
      
      const teacherIdForAdd = teacherId === 'ALL' ? selectedTeacherId : teacherId;
      if (teacherId === 'ALL' && !selectedTeacherId) {
        setAddError('Lütfen öğrencinin bağlı olacağı öğretmeni seçin.');
        setAddLoading(false);
        return;
      }

      await addStudentByTeacher(newStudentFullName.trim(), newStudentUsername.trim().toLowerCase(), newStudentPassword, teacherIdForAdd, newStudentSchoolLevel, newStudentClassName.trim() || null);
      setAddSuccess('Öğrenci başarıyla eklendi!');
      setNewStudentFullName('');
      setNewStudentUsername('');
      setNewStudentPassword('');
      setNewStudentClassName('');
      setNewStudentSchoolLevel('Lise (YKS)');
      setSelectedTeacherId('');
      fetchData(); // Refresh list to show new student (will appear once they have a log, or we can just show success)
      
      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess('');
      }, 2000);
    } catch (err) {
      setAddError(err.response?.data?.error || 'Öğrenci eklenirken hata oluştu.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteStudent = async (e) => {
    e.preventDefault();
    setDeleteError('');
    setDeleteSuccess('');
    setDeleteLoading(true);

    try {
      if (!studentToDelete) {
        setDeleteError('Lütfen silinecek öğrenciyi seçin.');
        setDeleteLoading(false);
        return;
      }
      
      await deleteStudentByTeacher(studentToDelete);
      setDeleteSuccess('Öğrenci başarıyla silindi!');
      fetchData();
      
      setTimeout(() => {
        setShowDeleteModal(false);
        setDeleteSuccess('');
        setStudentToDelete('');
      }, 2000);
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Öğrenci silinirken hata oluştu.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setCpError('');
    setCpSuccess('');
    if (cpNewPassword !== cpConfirmPassword) {
      setCpError('Yeni şifre ve onay şifresi eşleşmiyor.');
      return;
    }
    if (cpNewPassword.length < 6) {
      setCpError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }
    setCpLoading(true);
    try {
      await changeTeacherPassword(teacherId, cpCurrentPassword, cpNewPassword);
      setCpSuccess('Şifreniz başarıyla güncellendi! 🎉');
      setCpCurrentPassword('');
      setCpNewPassword('');
      setCpConfirmPassword('');
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setCpSuccess('');
      }, 2000);
    } catch (err) {
      setCpError(err.response?.data?.error || 'Şifre güncellenirken hata oluştu.');
    } finally {
      setCpLoading(false);
    }
  };

  const groupedStudents = useMemo(() => {
    const map = {};
    
    // First, populate all students from stats (so even students with 0 logs show up)
    if (stats?.allStudents) {
      stats.allStudents.forEach(student => {
        map[student.name] = {
          id: student.id,
          username: student.username,
          name: student.name,
          totalDuration: 0,
          totalQuestions: 0,
          subjects: {},
          sessions: 0
        };
      });
    }

    // Then aggregate logs
    logs.forEach(log => {
      if (!map[log.student_name]) {
        map[log.student_name] = {
          name: log.student_name,
          totalDuration: 0,
          totalQuestions: 0,
          subjects: {},
          sessions: 0
        };
      }
      map[log.student_name].totalDuration += log.duration_minutes;
      map[log.student_name].totalQuestions += log.questions_solved;
      map[log.student_name].sessions += 1;
      map[log.student_name].subjects[log.subject] = (map[log.student_name].subjects[log.subject] || 0) + log.duration_minutes;
    });
    return Object.values(map).sort((a, b) => b.totalDuration - a.totalDuration);
  }, [logs, stats]);

  const handleGenerateReport = (student) => {
    setPdfTargetStudent(student);
    setGeneratingStudent(student.name);
  };

  const downloadExcel = () => {
    // 1. Detaylı Rapor Sayfası (Mevcut Loglar)
    const title = ["Merkür Yörünge Akademi - Detaylı Gelişim Raporu"];
    const infoRow = [`Öğretmen: ${teacherName}`, `Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}`];
    const headers = ['Öğrenci Adı', 'Ders', 'Süre (Dk)', 'Çözülen Soru', 'İşlem Tarihi'];
    
    const dataRows = logs.map(log => [
      log.student_name,
      log.subject,
      log.duration_minutes,
      log.questions_solved,
      new Date(log.created_at).toLocaleString('tr-TR')
    ]);

    const logsSheetData = [
      title,
      infoRow,
      [], // Boş satır
      headers,
      ...dataRows
    ];
    const logsSheet = XLSX.utils.aoa_to_sheet(logsSheetData);
    
    // Merge Cells for logs
    logsSheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }, // Info part 1
      { s: { r: 1, c: 3 }, e: { r: 1, c: 4 } }  // Info part 2
    ];

    logsSheet['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 22 }
    ];

    // 2. Öğrenci Özeti Sayfası (Grouped Students)
    const summaryTitle = ["Merkür Yörünge Akademi - Öğrenci Özet Raporu"];
    const summaryHeaders = ['Öğrenci Adı', 'Toplam Süre (Dk)', 'Saat Bazında Süre', 'Çözülen Toplam Soru', 'Favori Ders'];
    
    const summaryRows = groupedStudents.map(student => [
      student.name,
      student.totalDuration,
      `${Math.floor(student.totalDuration / 60)}s ${student.totalDuration % 60}d`,
      student.totalQuestions,
      Object.entries(student.subjects).sort((a,b) => b[1]-a[1])[0]?.[0] || '-'
    ]);

    // Toplam satırı
    const totalDuration = groupedStudents.reduce((acc, s) => acc + s.totalDuration, 0);
    const totalQuestions = groupedStudents.reduce((acc, s) => acc + s.totalQuestions, 0);
    summaryRows.push([
      'GENEL TOPLAM',
      totalDuration,
      `${Math.floor(totalDuration / 60)}s ${totalDuration % 60}d`,
      totalQuestions,
      '-'
    ]);

    const summarySheetData = [
      summaryTitle,
      infoRow,
      [],
      summaryHeaders,
      ...summaryRows
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summarySheetData);
    
    summarySheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }, // Info part 1
      { s: { r: 1, c: 3 }, e: { r: 1, c: 4 } }  // Info part 2
    ];

    summarySheet['!cols'] = [
      { wch: 25 }, { wch: 18 }, { wch: 20 }, { wch: 22 }, { wch: 18 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Öğrenci Özeti");
    XLSX.utils.book_append_sheet(workbook, logsSheet, "Detaylı Kayıtlar");
    
    const safeTeacherName = teacherName.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ ]/g, '').replace(/\s+/g, '_');
    XLSX.writeFile(workbook, `Merkur_Yorunge_Rapor_${safeTeacherName}.xlsx`);
  };

  const renderSummaryCard = (title, value, subtitle, icon, color, delay) => (
    <div className="glass-card fade-in" style={{ padding: '24px', animationDelay: delay, display: 'flex', flexDirection: 'column', gap: '16px', borderBottom: `3px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
      {/* Hafif arka plan parlaması (Glow Effect) */}
      <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: color, filter: 'blur(40px)', opacity: 0.15, borderRadius: '50%' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <div>
           <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-primary)', fontWeight: '600' }}>{title}</h3>
           <div style={{ fontSize: '36px', fontWeight: '800', color: '#ffffff', fontFamily: 'var(--font-primary)', marginTop: '8px', letterSpacing: '-1px' }}>{value}</div>
        </div>
        <div style={{ padding: '14px', background: `${color}15`, borderRadius: '16px', border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
      </div>
      
      <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto' }}>
        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }}></span>
          {subtitle}
        </div>
      </div>
    </div>
  );

  const customTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--color-border)', padding: '12px 16px', borderRadius: '8px', color: '#fff' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>{label || payload[0].name}</p>
          <p style={{ margin: 0, color: 'var(--color-primary-light)' }}>
            {payload[0].value} {payload[0].name === 'duration' || payload[0].dataKey === 'value' ? 'Dk' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fade-in" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', marginTop: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(59,130,246,0.1))', borderRadius: '20px', border: '1px solid rgba(6,182,212,0.2)' }}>
            <LayoutDashboard size={32} color="var(--color-primary)" />
          </div>
          <div>
            <h1 className="title text-gradient" style={{ margin: 0, fontSize: '32px' }}>
              {teacherId === 'ALL' ? 'Lider Öğretmen Paneli' : `${teacherName} - Paneli`}
            </h1>
            <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-muted)', fontSize: '15px' }}>
              {teacherId === 'ALL' ? 'Sistemdeki tüm öğrenci ve çalışma verileri' : 'Sınıfınızın istatistikleri'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <>
            <button 
                className="btn btn-primary" 
                style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }} 
                onClick={() => { setShowAddModal(true); setAddError(''); setAddSuccess(''); }}
              >
                <PlusCircle size={16} /> Öğrenci Ekle
            </button>
            {teacherId !== 'ALL' && (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }} 
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 size={16} /> Öğrenci Sil
              </button>
            )}
          </>
          <button
            className="btn btn-primary"
            style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px', background: showCurriculum ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.3)' }}
            onClick={() => setShowCurriculum(v => !v)}
          >
            <GraduationCap size={16} /> {showCurriculum ? 'Paneli Gizle' : 'Müfredat Yönetimi'}
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }} 
            onClick={() => setShowChangePasswordModal(true)}
            title="Şifremi Değiştir"
          >
            <KeyRound size={16} /> Şifremi Değiştir
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }} 
            onClick={handleLogout}
            title="Güvenli Çıkış"
          >
            <LogOut size={16} /> Çıkış Yap
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px' }} 
            onClick={downloadExcel}
          >
            <Download size={16} /> Excel İndir
          </button>
          <button 
            className="btn btn-primary" 
            style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px' }} 
            onClick={fetchData}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-pulse' : ''} style={{ transform: isRefreshing ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.5s ease' }} /> 
            {isRefreshing ? 'Güncelleniyor...' : 'Yenile'}
          </button>
        </div>
      </div>

      {/* Invite Code Banner */}
      <div className="glass-card slide-up" style={{ padding: '16px 24px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)', border: '1px solid rgba(59, 130, 246, 0.2)', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={18} color="var(--color-primary)" /> Sınıf Davet Kodunuz</h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>Öğrencileriniz kayıt olurken bu kodu girmelidir veya aşağıdaki linki onlara gönderebilirsiniz.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 20px', borderRadius: '12px', fontSize: '20px', fontWeight: 'bold', color: 'var(--color-primary-light)', letterSpacing: '4px' }}>
            {inviteCode}
          </div>
          <button 
            onClick={copyToClipboard}
            className="btn"
            style={{ background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', color: copied ? '#10b981' : '#fff', padding: '12px 20px', border: copied ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.3s' }}
          >
            {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
            {copied ? 'Kopyalandı!' : 'Linki Kopyala'}
          </button>
        </div>
      </div>

      {/* Curriculum Manager Panel */}
      {showCurriculum && (
        <div className="slide-up" style={{ marginBottom: '32px' }}>
          <CurriculumManager />
        </div>
      )}

      {loading || !stats ? (
        <div className="text-center text-primary animate-pulse-glow" style={{ padding: '60px', fontSize: '18px' }}>
          Analitikler Yükleniyor...
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            {renderSummaryCard('Toplam Öğrenci', stats.summary?.total_students || 0, 'Sisteme kayıtlı aktif kullanıcı', <Users size={28} color="#0ea5e9" />, '#0ea5e9', '0.1s')}
            {renderSummaryCard('Toplam Çalışma', `${Math.floor((stats.summary?.total_duration || 0)/60)}s ${((stats.summary?.total_duration || 0)%60)}d`, 'Uygulamada geçirilen süre', <Clock size={28} color="#8b5cf6" />, '#8b5cf6', '0.2s')}
            {renderSummaryCard('Çözülen Soru', stats.summary?.total_questions || 0, 'Sisteme girilen toplam soru', <Hash size={28} color="#10b981" />, '#10b981', '0.3s')}
            {renderSummaryCard('Favori Ders', stats.subjects?.[0]?.name || '-', 'En çok odaklanılan branş', <BookOpen size={28} color="#f59e0b" />, '#f59e0b', '0.4s')}
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            
            {/* Bar Chart - Top Students */}
            <div className="glass-card slide-up" style={{ padding: '24px' }}>
              <h3 className="title" style={{ fontSize: '18px', marginBottom: '24px' }}>En Çok Çalışanlar (Dk)</h3>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topStudents} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={customTooltip} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="duration" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart - Subjects */}
            <div className="glass-card slide-up" style={{ padding: '24px', animationDelay: '0.2s' }}>
              <h3 className="title" style={{ fontSize: '18px', marginBottom: '24px' }}>Ders Dağılımı (Dk)</h3>
              <div style={{ height: '300px', width: '100%', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.subjects}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {stats.subjects.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={customTooltip} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Legend */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {stats.subjects.slice(0, 4).map((entry, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[index % COLORS.length] }} />
                      {entry.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Teaching Hours Tracker Component */}
          {teacherId && teacherId !== 'ALL' && (
            <TeachingHoursTracker teacherId={teacherId} students={groupedStudents} />
          )}

          {/* Data Table -> Horizontal Grid */}
          <div className="glass-card slide-up" style={{ padding: '32px', animationDelay: '0.4s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className="title" style={{ margin: 0, fontSize: '20px' }}>Öğrenci Yönetim Paneli</h2>
              <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>Toplam {groupedStudents.length} Kayıt</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {groupedStudents.map((student, index) => (
                <div key={index} style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                  padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '16px'
                }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#fff' }}>{student.name}</h3>
                    <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{student.sessions} Seans Tamamlandı</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '32px', flex: '2 1 300px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Toplam Süre</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-primary-light)' }}>
                        {Math.floor(student.totalDuration / 60)}s {student.totalDuration % 60}d
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Çözülen Soru</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>{student.totalQuestions}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Favori Ders</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>
                        {Object.entries(student.subjects).sort((a,b) => b[1]-a[1])[0]?.[0] || '-'}
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: '1 1 100%', display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '13px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                      onClick={() => {
                        const studentInfo = stats?.allStudents?.find(s => s.name === student.name);
                        setEditingStudent(studentInfo || { name: student.name });
                        setEditClassName(studentInfo?.class_name || '');
                        setEditSchoolLevel(studentInfo?.school_level || 'Lise (YKS)');
                        setEditError('');
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '13px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--color-primary)', border: '1px solid rgba(6, 182, 212, 0.3)' }}
                      onClick={() => handleGeneratePDF(student)}
                      disabled={generatingStudent === student.name}
                    >
                      {generatingStudent === student.name ? 'Hazırlanıyor...' : 'PDF İndir'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <StudentReportPDF 
            student={pdfTargetStudent} 
            isGenerating={!!generatingStudent} 
            onComplete={() => setGeneratingStudent(null)} 
          />
        </>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
          <div className="glass-card slide-up" style={{ width: '100%', maxWidth: '400px', padding: '32px', position: 'relative' }}>
            <button 
              onClick={() => { setShowAddModal(false); setAddError(''); setAddSuccess(''); }}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <h2 className="title" style={{ fontSize: '24px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PlusCircle size={24} color="var(--color-primary)" /> Yeni Öğrenci
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>{teacherId === 'ALL' ? 'Öğrencinin bağlı olacağı öğretmeni seçerek kayıt oluşturun.' : 'Sınıfınıza manuel olarak öğrenci kaydedin.'}</p>
            
            <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={16} /> Ad Soyad</label>
                <input type="text" className="input-field" placeholder="Örn: Ali Yılmaz" value={newStudentFullName} onChange={(e) => setNewStudentFullName(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={16} /> Kullanıcı Adı</label>
                <input type="text" className="input-field" placeholder="Örn: aliyilmaz" value={newStudentUsername} onChange={(e) => setNewStudentUsername(e.target.value)} required />
              </div>
              {teacherId === 'ALL' && (
                <div className="form-group">
                  <label>Bağlı Olacağı Öğretmen</label>
                  <select className="input-field" value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} required style={{ appearance: 'auto' }}>
                    <option value="">Öğretmen seçin</option>
                    {leaderTeachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Erişim Şifresi (Sizin belirlediğiniz)</label>
                <input type="text" className="input-field" placeholder="Örn: gizlisifre123" value={newStudentPassword} onChange={(e) => setNewStudentPassword(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Sınıf <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, fontSize: '12px' }}>(İsteğe Bağlı)</span></label>
                <input type="number" min="1" max="12" className="input-field" placeholder="Örn: 9, 10, 11" value={newStudentClassName} onChange={(e) => setNewStudentClassName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Eğitim Kademesi</label>
                <select className="input-field" value={newStudentSchoolLevel} onChange={(e) => setNewStudentSchoolLevel(e.target.value)} style={{ appearance: 'auto' }}>
                  <option value="İlkokul">İlkokul</option>
                  <option value="Ortaokul (LGS)">Ortaokul (LGS)</option>
                  <option value="Lise (YKS)">Lise (YKS)</option>
                </select>
              </div>

              {addError && <div style={{ color: '#ef4444', fontSize: '14px', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>{addError}</div>}
              {addSuccess && <div style={{ color: '#10b981', fontSize: '14px', background: 'rgba(16,185,129,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>{addSuccess}</div>}

              <button type="submit" className="btn btn-primary" disabled={addLoading} style={{ padding: '14px', marginTop: '8px' }}>
                {addLoading ? 'Kaydediliyor...' : 'Öğrenciyi Kaydet'}
              </button>
            </form>
          </div>
        </div>
      )}


      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
          <div className="glass-card slide-up" style={{ width: '100%', maxWidth: '380px', padding: '32px', position: 'relative' }}>
            <button onClick={() => setEditingStudent(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
            <h2 className="title" style={{ fontSize: '20px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Pencil size={20} color="#f59e0b" /> Öğrenci Düzenle
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '24px' }}>{editingStudent.name}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Sınıf Numarası <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, fontSize: '12px' }}>(İsteğe Bağlı)</span></label>
                <input
                  type="number" min="1" max="12"
                  className="input-field"
                  placeholder="Örn: 9, 10, 11"
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Eğitim Kademesi</label>
                <select className="input-field" value={editSchoolLevel} onChange={(e) => setEditSchoolLevel(e.target.value)} style={{ appearance: 'auto' }}>
                  <option value="İlkokul">İlkokul</option>
                  <option value="Ortaokul (LGS)">Ortaokul (LGS)</option>
                  <option value="Lise (YKS)">Lise (YKS)</option>
                </select>
              </div>

              {editError && <div style={{ color: '#ef4444', fontSize: '14px', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px' }}>{editError}</div>}

              <button
                className="btn btn-primary"
                disabled={editLoading || !editingStudent.id}
                style={{ padding: '14px' }}
                onClick={async () => {
                  if (!editingStudent.id) { setEditError('Öğrenci ID bulunamadı. Sayfayı yenileyin.'); return; }
                  setEditLoading(true);
                  try {
                    await updateStudent(editingStudent.id, editClassName || null, editSchoolLevel);
                    setEditingStudent(null);
                    fetchData();
                  } catch (e) {
                    setEditError('Güncelleme başarısız oldu.');
                  } finally {
                    setEditLoading(false);
                  }
                }}
              >
                {editLoading ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Student Modal */}
      {showDeleteModal && (
        <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
          <div className="glass-card slide-up" style={{ width: '100%', maxWidth: '400px', padding: '32px', position: 'relative', border: '1px solid rgba(239,68,68,0.3)' }}>
            <button 
              onClick={() => { setShowDeleteModal(false); setDeleteError(''); setDeleteSuccess(''); setStudentToDelete(''); }}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <h2 className="title" style={{ fontSize: '24px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
              <Trash2 size={24} color="#ef4444" /> Öğrenci Sil
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>
              Silmek istediğiniz öğrenciyi seçin. Bu işlem geri alınamaz ve tüm verileri siler.
            </p>
            
            <form onSubmit={handleDeleteStudent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={16} /> Öğrenci Seçin</label>
                <select 
                  className="input-field" 
                  value={studentToDelete} 
                  onChange={(e) => setStudentToDelete(e.target.value)} 
                  required
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <option value="" style={{ color: '#000' }}>Öğrenci Seçin...</option>
                  {groupedStudents.map(s => (
                    <option key={s.id} value={s.id} style={{ color: '#000' }}>{s.name}</option>
                  ))}
                </select>
              </div>

              {deleteError && <div style={{ color: '#ef4444', fontSize: '14px', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>{deleteError}</div>}
              {deleteSuccess && <div style={{ color: '#10b981', fontSize: '14px', background: 'rgba(16,185,129,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>{deleteSuccess}</div>}

              <button type="submit" className="btn btn-secondary" disabled={deleteLoading} style={{ padding: '14px', marginTop: '8px', background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.5)' }}>
                {deleteLoading ? 'Siliniyor...' : 'Kalıcı Olarak Sil'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(10px)' }}>
          <div className="glass-card slide-up" style={{ width: '100%', maxWidth: '400px', padding: '32px', position: 'relative', border: '1px solid rgba(139,92,246,0.3)' }}>
            <button 
              onClick={() => { setShowChangePasswordModal(false); setCpError(''); setCpSuccess(''); setCpCurrentPassword(''); setCpNewPassword(''); setCpConfirmPassword(''); }}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            <h2 className="title" style={{ fontSize: '22px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <KeyRound size={22} color="#a78bfa" /> Şifremi Değiştir
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>
              Hesabınızı güvende tutmak için güçlü bir şifre seçin.
            </p>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Key size={14} /> Mevcut Şifre</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={cpShowCurrent ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Mevcut şifrenizi girin"
                    value={cpCurrentPassword}
                    onChange={(e) => setCpCurrentPassword(e.target.value)}
                    required
                    style={{ paddingRight: '44px' }}
                  />
                  <button type="button" onClick={() => setCpShowCurrent(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                    {cpShowCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><KeyRound size={14} /> Yeni Şifre</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={cpShowNew ? 'text' : 'password'}
                    className="input-field"
                    placeholder="En az 6 karakter"
                    value={cpNewPassword}
                    onChange={(e) => setCpNewPassword(e.target.value)}
                    required
                    style={{ paddingRight: '44px' }}
                  />
                  <button type="button" onClick={() => setCpShowNew(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                    {cpShowNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><KeyRound size={14} /> Yeni Şifre Tekrar</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Yeni şifreyi tekrar girin"
                  value={cpConfirmPassword}
                  onChange={(e) => setCpConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {cpError && <div style={{ color: '#ef4444', fontSize: '14px', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>{cpError}</div>}
              {cpSuccess && <div style={{ color: '#10b981', fontSize: '14px', background: 'rgba(16,185,129,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>{cpSuccess}</div>}

              <button type="submit" className="btn btn-primary" disabled={cpLoading} style={{ padding: '14px', marginTop: '8px', background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(109,40,217,0.2))', border: '1px solid rgba(139,92,246,0.4)', color: '#c4b5fd' }}>
                {cpLoading ? 'Güncelleniyor...' : '🔐 Şifremi Güncelle'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeacherDashboard;
