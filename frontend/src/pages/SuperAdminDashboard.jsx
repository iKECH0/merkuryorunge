import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminStats, approveTeacher, deleteTeacher, addTeacherByAdmin, getDeletionRequests, deleteDeletionRequest, downloadPlatformBackup, getConsultingRequests, updateConsultingRequestStatus, deleteConsultingRequest, deleteConsultingRequests, getAdminBillingStudents, updateAdminBillingStudent, importAdminBillingReport } from '../api';
import { Users, CheckCircle, LogOut, RefreshCw, BarChart2, Trash2, PlusCircle, X, User, Key, Briefcase, ShieldAlert, AlertTriangle, Database, Download, Phone, Mail, GraduationCap, CreditCard, Gift, CalendarPlus, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseBillingReport } from '../billingReportImport';

const amountLabel = (minor, currency, divisor = 100) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(Number(minor) / divisor);

const billingCategory = (student) => {
  const reason = student.billing?.reason;
  if (reason === 'complimentary' || reason === 'manual') return 'free';
  return reason || 'unknown';
};

const billingDisplay = (student) => {
  const billing = student.billing || {};
  const date = value => value ? new Date(value).toLocaleDateString('tr-TR') : '';
  switch (billing.reason) {
    case 'trial': return { label: `Denemede · ${date(billing.trialEndsAt)} bitiyor`, color: '#67e8f9' };
    case 'payment_required': return { label: 'Deneme bitti · Ödeme bekleniyor', color: '#fbbf24' };
    case 'subscription': return { label: `${billing.provider === 'apple' ? 'Apple' : 'Google Play'} aboneliği · ${date(billing.expiresAt)}`, color: '#34d399' };
    case 'manual': return { label: `Manuel erişim · ${date(billing.expiresAt)}`, color: '#34d399' };
    case 'complimentary': return { label: 'Süresiz ücretsiz', color: '#34d399' };
    case 'disabled': return { label: 'Ödeme sistemi pasif', color: '#fbbf24' };
    default: return { label: 'Durum belirlenemedi', color: '#94a3b8' };
  }
};

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [consultingRequests, setConsultingRequests] = useState([]);
  const [selectedConsultingIds, setSelectedConsultingIds] = useState([]);
  const [billingData, setBillingData] = useState({ billingEnabled: false, trialDays: 3, students: [], financialReports: [] });
  const [reportStore, setReportStore] = useState('google_play');
  const [reportPeriod, setReportPeriod] = useState(() => { const date = new Date(); date.setMonth(date.getMonth() - 1); return date.toISOString().slice(0, 7); });
  const [reportImporting, setReportImporting] = useState(false);
  const [billingUpdatingId, setBillingUpdatingId] = useState(null);
  const [billingFilter, setBillingFilter] = useState('all');
  const [billingSearch, setBillingSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Add Teacher Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeacherFullName, setNewTeacherFullName] = useState('');
  const [newTeacherUsername, setNewTeacherUsername] = useState('');
  const [newTeacherPassword, setNewTeacherPassword] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  useEffect(() => {
    const isAuth = localStorage.getItem('superAdminAuth');
    if (!isAuth || !localStorage.getItem('superAdminToken')) {
      localStorage.removeItem('superAdminAuth');
      navigate('/');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsRefreshing(true);
    setLoadError('');
    try {
      const results = await Promise.allSettled([
        getAdminStats(),
        getDeletionRequests(),
        getConsultingRequests(),
        getAdminBillingStudents()
      ]);
      const [statsResult, requestsResult, consultingResult, billingResult] = results;
      const authFailure = results.find(result => result.status === 'rejected' && result.reason?.response?.status === 401);
      if (authFailure) {
        localStorage.removeItem('superAdminAuth');
        localStorage.removeItem('superAdminToken');
        navigate('/');
        return;
      }
      if (statsResult.status === 'fulfilled') setData(statsResult.value);
      if (requestsResult.status === 'fulfilled') setDeletionRequests(requestsResult.value);
      if (consultingResult.status === 'fulfilled') setConsultingRequests(consultingResult.value);
      if (billingResult.status === 'fulfilled') setBillingData(billingResult.value);
      const failedSections = [
        statsResult.status === 'rejected' && 'istatistikler',
        requestsResult.status === 'rejected' && 'silme talepleri',
        billingResult.status === 'rejected' && 'abonelikler'
      ].filter(Boolean);
      if (failedSections.length) setLoadError(`Bazı bölümler yüklenemedi: ${failedSections.join(', ')}. Başvurular bölümü ayrı olarak güncellendi.`);
    } catch (err) {
      console.error(err);
      setLoadError(err.response?.data?.error || 'Panel verileri alınamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('superAdminAuth');
    localStorage.removeItem('superAdminToken');
    if (localStorage.getItem('teacherId') === 'ALL') {
      localStorage.removeItem('teacherAuth');
      localStorage.removeItem('teacherId');
      localStorage.removeItem('teacherName');
    }
    navigate('/');
  };

  const handleBackupDownload = async () => {
    setIsBackingUp(true);
    try {
      const backup = await downloadPlatformBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Istanbul' }).replace(/[ :]/g, '-');
      link.href = url;
      link.download = `merkuryorunge-yedek-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      alert(`Yedek indirildi. ${backup.counts.students || 0} öğrenci ve ${backup.counts.teachers || 0} öğretmen kaydı içeriyor.`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Yedek indirilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleApprove = async (teacherId) => {
    try {
      await approveTeacher(teacherId);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Onaylama sırasında bir hata oluştu.');
    }
  };

  const handleDelete = async (teacherId) => {
    if (!window.confirm('Bu öğretmeni silmek istediğinize emin misiniz?')) return;
    try {
      await deleteTeacher(teacherId);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Silme işlemi sırasında bir hata oluştu.');
    }
  };

  const handleResolveDeletion = async (id) => {
    if (!window.confirm('Bu talebi çözüldü olarak işaretlemek ve listeden kaldırmak istediğinize emin misiniz?')) return;
    try {
      await deleteDeletionRequest(id);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Hata oluştu.');
    }
  };

  const handleConsultingStatus = async (id, status) => {
    try {
      const updated = await updateConsultingRequestStatus(id, status);
      setConsultingRequests((current) => current.map((request) => request.id === id ? updated : request));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Başvuru durumu güncellenemedi.');
    }
  };

  const toggleConsultingSelection = (id) => {
    setSelectedConsultingIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
  };

  const handleDeleteConsultingRequest = async (id) => {
    if (!window.confirm('Bu başvuruyu kalıcı olarak silmek istediğinize emin misiniz?')) return;
    try {
      await deleteConsultingRequest(id);
      setConsultingRequests((current) => current.filter((request) => request.id !== id));
      setSelectedConsultingIds((current) => current.filter((selectedId) => selectedId !== id));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Başvuru silinemedi.');
    }
  };

  const handleBulkDeleteConsultingRequests = async () => {
    if (!selectedConsultingIds.length) return;
    if (!window.confirm(`${selectedConsultingIds.length} başvuruyu kalıcı olarak silmek istediğinize emin misiniz?`)) return;
    try {
      const result = await deleteConsultingRequests(selectedConsultingIds);
      const deleted = new Set(result.deletedIds || selectedConsultingIds);
      setConsultingRequests((current) => current.filter((request) => !deleted.has(request.id)));
      setSelectedConsultingIds([]);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Seçili başvurular silinemedi.');
    }
  };

  const handleExportConsultingRequests = () => {
    if (!consultingRequests.length) return;
    const rows = consultingRequests.map((request) => ({
      ID: request.id,
      Tarih: new Date(request.created_at).toLocaleString('tr-TR'),
      Veli: request.parent_name,
      Öğrenci: request.student_name,
      Telefon: request.phone,
      'E-posta': request.email || '',
      'Sınıf / Sınav': request.school_level || '',
      Şehir: request.city || '',
      Notlar: request.notes || '',
      Durum: ({ new: 'Yeni', contacted: 'İletişime geçildi', converted: 'Öğrenci oldu', closed: 'Kapatıldı' })[request.status] || request.status
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [{ wch: 8 }, { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 42 }, { wch: 20 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Başvurular');
    XLSX.writeFile(workbook, `egitim-danismanligi-basvurulari-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleBillingAction = async (studentId, action) => {
    const labels = {
      grant_complimentary: 'Bu öğrenciye süresiz ücretsiz erişim vermek',
      grant_30_days: 'Bu öğrenciye 30 gün manuel erişim eklemek',
      grant_365_days: 'Bu öğrenciye 1 yıl manuel erişim eklemek',
      clear_manual_access: 'Bu öğrencinin manuel/ücretsiz erişimini kaldırmak',
      expire_trial: 'Bu öğrencinin deneme süresini hemen sonlandırmak'
    };
    if (!window.confirm(`${labels[action]} istediğinize emin misiniz?`)) return;
    setBillingUpdatingId(studentId);
    try {
      const result = await updateAdminBillingStudent(studentId, action);
      setBillingData((current) => ({
        ...current,
        students: current.students.map((student) => student.id === studentId ? { ...student, ...result.student, billing: result.billing } : student)
      }));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Abonelik işlemi tamamlanamadı.');
    } finally {
      setBillingUpdatingId(null);
    }
  };

  const handleBillingReportFile = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(reportPeriod)) { alert('Geçerli bir rapor dönemi seçin.'); return; }
    setReportImporting(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: true });
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });
      const lines = parseBillingReport(rows, reportStore);
      const totals = lines.reduce((result, line) => { result[line.currency] = (result[line.currency] || 0) + line.grossMinor; return result; }, {});
      const summary = Object.entries(totals).map(([currency, minor]) => amountLabel(minor, currency)).join(' · ');
      if (!window.confirm(`${file.name} içindeki ${lines.length} abonelik satırı ${reportPeriod} dönemi için içe aktarılacak. Önceki aynı dönem raporu değiştirilecek. Toplam: ${summary}. Devam edilsin mi?`)) return;
      await importAdminBillingReport(reportStore, reportPeriod, lines);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Rapor okunamadı.');
    } finally {
      setReportImporting(false);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    setAddLoading(true);

    try {
      if (!newTeacherFullName || !newTeacherUsername || !newTeacherPassword) {
        setAddError('Tüm alanları doldurun.');
        setAddLoading(false);
        return;
      }
      
      await addTeacherByAdmin(newTeacherFullName.trim(), newTeacherUsername.trim().toLowerCase(), newTeacherPassword);
      setAddSuccess('Öğretmen başarıyla eklendi ve anında onaylandı!');
      setNewTeacherFullName('');
      setNewTeacherUsername('');
      setNewTeacherPassword('');
      fetchData();
      
      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess('');
      }, 2000);
    } catch (err) {
      setAddError(err.response?.data?.error || 'Öğretmen eklenirken hata oluştu.');
    } finally {
      setAddLoading(false);
    }
  };

  if (loading) {
    return <div className="flex-center text-primary animate-pulse-glow" style={{ minHeight: '80vh', fontSize: '20px' }}>Profesyonel Öğretmen Paneli Yükleniyor...</div>;
  }

  if (loadError || !data) {
    return (
      <div className="flex-center" style={{ minHeight: '80vh', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
        <AlertTriangle size={42} color="#f59e0b" />
        <div style={{ color: 'var(--color-text)', fontSize: '18px' }}>{loadError || 'Panel verileri alınamadı.'}</div>
        <button className="btn btn-primary" onClick={fetchData}><RefreshCw size={16} /> Tekrar dene</button>
      </div>
    );
  }

  const { teachers, platformTotals } = data;

  const billingCounts = billingData.students.reduce((counts, student) => {
    const category = billingCategory(student);
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});
  const visibleBillingStudents = billingData.students.filter((student) => {
    const query = billingSearch.trim().toLocaleLowerCase('tr-TR');
    const matchesSearch = !query || `${student.full_name} ${student.username}`.toLocaleLowerCase('tr-TR').includes(query);
    return matchesSearch && (billingFilter === 'all' || billingCategory(student) === billingFilter);
  });
  const revenueTotals = (billingData.financialReports || []).reduce((totals, report) => {
    const key = `${report.store}|${report.currency}`;
    totals[key] = (totals[key] || 0) + Number(report.gross_minor);
    return totals;
  }, {});

  return (
    <div className="fade-in" style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', marginTop: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(245, 158, 11, 0.1))', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <ShieldAlert size={32} color="#ef4444" />
          </div>
          <div>
            <h1 className="title" style={{ margin: 0, fontSize: '32px', color: '#ef4444' }}>Profesyonel Öğretmen Paneli</h1>
            <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-muted)', fontSize: '15px' }}>Merkür Yörünge Platform Özeti</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }} 
            onClick={handleLogout}
          >
            <LogOut size={16} /> Çıkış Yap
          </button>
          <button 
            className="btn btn-primary" 
            style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }} 
            onClick={() => setShowAddModal(true)}
          >
            <PlusCircle size={16} /> Öğretmen Ekle
          </button>
          <button 
            className="btn btn-primary" 
            style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)' }} 
            onClick={() => {
              localStorage.setItem('teacherAuth', 'true');
              localStorage.setItem('teacherId', 'ALL');
              localStorage.setItem('teacherName', 'Profesyonel Öğretmen');
              navigate('/teacher');
            }}
          >
            <BarChart2 size={16} /> Tüm Öğrenci Verilerini Görüntüle
          </button>
          <button
            className="btn btn-primary"
            style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd', border: '1px solid rgba(139, 92, 246, 0.35)' }}
            onClick={handleBackupDownload}
            disabled={isBackingUp}
            title="Öğrenci, öğretmen ve tüm çalışma verilerini JSON olarak indirir"
          >
            {isBackingUp ? <RefreshCw size={16} className="animate-pulse" /> : <Database size={16} />} {isBackingUp ? 'Yedek Hazırlanıyor...' : 'JSON Yedek İndir'}
          </button>
          <button 
            className="btn btn-primary" 
            style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px', background: '#ef4444', border: '1px solid #ef4444' }} 
            onClick={fetchData}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-pulse' : ''} style={{ transform: isRefreshing ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.5s ease' }} /> 
            Yenile
          </button>
          <button
            className="btn btn-primary"
            style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34, 211, 238, 0.12)', color: '#67e8f9', border: '1px solid rgba(34, 211, 238, 0.35)' }}
            onClick={() => document.getElementById('consulting-requests')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <GraduationCap size={16} /> Başvurulara Git
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '18px 22px', marginBottom: '28px', border: '1px solid rgba(139, 92, 246, 0.25)', background: 'rgba(139, 92, 246, 0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <Download size={20} color="#c4b5fd" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <strong style={{ color: '#ede9fe' }}>Günlük yedek önerisi</strong>
            <p style={{ margin: '6px 0 0', color: 'var(--color-text-muted)', fontSize: '13px', lineHeight: 1.55 }}>Her gün bu panelden JSON yedeğini indirip güvenli bir klasörde saklayın. Dosya, gerektiğinde öğrenci ve öğretmen hesaplarıyla çalışma kayıtlarının geri yüklenebilmesi için parola özetlerini de içerir; kesinlikle WhatsApp veya e-posta ile paylaşmayın.</p>
          </div>
        </div>
      </div>

      {/* Platform Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div className="glass-card" style={{ padding: '32px', borderLeft: '4px solid #ef4444' }}>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={20} /> Toplam Öğretmen (Sınıf)</h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#fff' }}>{teachers.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '32px', borderLeft: '4px solid #3b82f6' }}>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart2 size={20} /> Platform Toplam Çalışma Süresi</h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#fff' }}>
            {Math.floor(platformTotals.total_duration / 60)}s {platformTotals.total_duration % 60}d
          </div>
        </div>
        <div className="glass-card" style={{ padding: '32px', borderLeft: '4px solid #10b981' }}>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart2 size={20} /> Platform Toplam Çözülen Soru</h3>
          <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#fff' }}>{platformTotals.total_questions}</div>
        </div>
      </div>

      <div className="glass-card slide-up" style={{ padding: '32px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: '20px', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '8px' }}><CreditCard size={23} /> Öğrenci Abonelik Yönetimi</h2>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '13px' }}>Mevcut öğrenciler ücretsiz erişimde korunur. Yeni öğrenciler için deneme süresi {billingData.trialDays} gündür.</p>
          </div>
          <span style={{ padding: '7px 13px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, color: billingData.billingEnabled ? '#6ee7b7' : '#fcd34d', background: billingData.billingEnabled ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)', border: `1px solid ${billingData.billingEnabled ? 'rgba(16,185,129,.3)' : 'rgba(245,158,11,.3)'}` }}>
            Ödeme sistemi: {billingData.billingEnabled ? 'Aktif' : 'Güvenli biçimde pasif'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {[
            ['all', 'Tüm öğrenciler', billingData.students.length],
            ['trial', 'Denemede', billingCounts.trial || 0],
            ['payment_required', 'Ödeme bekleyen', billingCounts.payment_required || 0],
            ['subscription', 'Abone', billingCounts.subscription || 0],
            ['free', 'Ücretsiz erişim', billingCounts.free || 0]
          ].map(([value, label, count]) => (
            <button key={value} type="button" onClick={() => setBillingFilter(value)}
              aria-pressed={billingFilter === value}
              style={{ padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', color: billingFilter === value ? '#042f2e' : '#cbd5e1', background: billingFilter === value ? '#67e8f9' : 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', fontWeight: 700 }}>
              {label} · {count}
            </button>
          ))}
        </div>
        <div style={{ padding: '16px', border: '1px solid rgba(34,211,238,.25)', borderRadius: '14px', marginBottom: '18px', background: 'rgba(8,145,178,.06)' }}>
          <strong style={{ color: '#a5f3fc' }}>Mağaza cirosu · içe aktarılan mali raporlar</strong>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', margin: '6px 0 12px' }}>İadeler düşülür. Para birimleri ayrı gösterilir. Mağaza kesintileri düşülmez; bu tutarlar banka ödemesi değildir.</p>
          {Object.entries(revenueTotals).length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              {Object.entries(revenueTotals).map(([key, minor]) => {
                const [store, currency] = key.split('|');
                return <span key={key} style={{ padding: '10px 13px', borderRadius: '10px', background: 'rgba(255,255,255,.06)', color: '#fff' }}><b>{store === 'apple' ? 'App Store' : 'Google Play'}</b> · {amountLabel(minor, currency)}</span>;
              })}
            </div>
          ) : <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Henüz mağaza kazanç raporu eklenmedi; ciro hesabı gösterilmiyor.</p>}
          {(billingData.financialReports || []).length > 0 && <div style={{ color: 'var(--color-text-muted)', fontSize: '11px', marginBottom: '12px' }}>Dönemler: {(billingData.financialReports || []).map(report => `${report.store === 'apple' ? 'Apple' : 'Play'} ${report.period} ${report.currency}`).join(' · ')}</div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            <select className="input-field" aria-label="Rapor mağazası" value={reportStore} onChange={event => setReportStore(event.target.value)} style={{ width: 'auto' }}><option value="google_play">Google Play kazanç raporu</option><option value="apple">App Store mali raporu</option></select>
            <input className="input-field" type="month" aria-label="Rapor dönemi" value={reportPeriod} onChange={event => setReportPeriod(event.target.value)} style={{ width: 'auto' }} />
            <label className="btn" style={{ cursor: reportImporting ? 'wait' : 'pointer', padding: '9px 13px' }}><FileSpreadsheet size={15} /> {reportImporting ? 'İçe aktarılıyor...' : 'Rapor içe aktar'}<input type="file" accept=".csv,.tsv,.txt,.xlsx" disabled={reportImporting} onChange={handleBillingReportFile} style={{ display: 'none' }} /></label>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '11px', margin: '10px 0 0' }}>Google Play için Kazanç raporu, Apple için Mali rapor seçin. Bu alan şu anda rapor yüklendiğinde güncellenir.</p>
        </div>
        <input className="input-field" type="search" value={billingSearch} onChange={event => setBillingSearch(event.target.value)}
          placeholder="Öğrenci adı veya kullanıcı adı ara" aria-label="Abonelik listesinde öğrenci ara"
          style={{ width: '100%', marginBottom: '18px' }} />
        {billingData.students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-muted)' }}>Kayıtlı öğrenci bulunmuyor.</div>
        ) : visibleBillingStudents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-muted)' }}>Bu filtrede öğrenci bulunmuyor.</div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {visibleBillingStudents.map((student) => {
              const { label: statusLabel, color: statusColor } = billingDisplay(student);
              return (
                <div key={student.id} style={{ padding: '18px', borderRadius: '15px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', alignItems: 'center', gap: '14px' }}>
                  <div>
                    <strong style={{ color: '#fff', display: 'block' }}>{student.full_name}</strong>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>@{student.username}{student.class_name ? ` · ${student.class_name}` : ''}</span>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '11px', marginTop: '6px' }}>
                      {student.created_at ? `${new Date(student.created_at).toLocaleDateString('tr-TR')} kayıt` : 'Kayıt tarihi yok'} · {student.teacher_name ? `Öğretmen: ${student.teacher_name}` : 'Bağımsız kayıt'}
                    </div>
                  </div>
                  <div>
                    <span style={{ display: 'inline-block', padding: '6px 10px', borderRadius: '100px', color: statusColor, background: `${statusColor}18`, border: `1px solid ${statusColor}45`, fontSize: '12px', fontWeight: 700 }}>{statusLabel}</span>
                    {student.billing_override_note && <div style={{ color: 'var(--color-text-muted)', fontSize: '11px', marginTop: '5px' }}>{student.billing_override_note}</div>}
                    {student.billing?.reason === 'subscription' && <div style={{ color: 'var(--color-text-muted)', fontSize: '11px', marginTop: '6px' }}>
                      {student.billing.provider === 'apple' ? 'App Store' : 'Google Play'} · {student.play_base_plan_id === 'yillik' || student.play_product_id?.endsWith('_yillik') ? 'Yıllık' : 'Aylık'} plan
                      {student.subscription_last_verified_at && ` · Son doğrulama ${new Date(student.subscription_last_verified_at).toLocaleDateString('tr-TR')}`}
                      {student.billing.provider === 'apple' && student.apple_price_milliunits != null && student.apple_price_currency && <span> · Son işlem {amountLabel(student.apple_price_milliunits, student.apple_price_currency, 1000)}</span>}
                      {student.billing.provider === 'google_play' && student.reported_amounts?.map(amount => <span key={amount.currency}> · Rapordaki son sipariş {amountLabel(amount.gross_minor, amount.currency)}</span>)}
                    </div>}
                  </div>
                  <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                    <button disabled={billingUpdatingId === student.id} onClick={() => handleBillingAction(student.id, 'grant_complimentary')} className="btn" style={{ padding: '7px 10px', fontSize: '12px', color: '#34d399', background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)' }}><Gift size={13} /> Ücretsiz</button>
                    <button disabled={billingUpdatingId === student.id} onClick={() => handleBillingAction(student.id, 'grant_30_days')} className="btn" style={{ padding: '7px 10px', fontSize: '12px' }}><CalendarPlus size={13} /> +30 gün</button>
                    <button disabled={billingUpdatingId === student.id} onClick={() => handleBillingAction(student.id, 'grant_365_days')} className="btn" style={{ padding: '7px 10px', fontSize: '12px' }}><CalendarPlus size={13} /> +1 yıl</button>
                    <button disabled={billingUpdatingId === student.id} onClick={() => handleBillingAction(student.id, 'expire_trial')} className="btn" style={{ padding: '7px 10px', fontSize: '12px', color: '#fbbf24', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)' }}>Denemeyi bitir</button>
                    {(student.billing_exempt || student.manual_access_active) && <button disabled={billingUpdatingId === student.id} onClick={() => handleBillingAction(student.id, 'clear_manual_access')} className="btn" style={{ padding: '7px 10px', fontSize: '12px', color: '#fca5a5', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)' }}>Erişimi kaldır</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Consulting Requests */}
      <div id="consulting-requests" className="glass-card slide-up" style={{ padding: '32px', marginBottom: '40px', scrollMarginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#22d3ee', display: 'flex', alignItems: 'center', gap: '8px' }}><GraduationCap size={24} /> Eğitim Danışmanlığı Başvuruları</h2>
            <span style={{ display: 'inline-block', marginTop: '8px', padding: '6px 12px', borderRadius: '100px', color: '#67e8f9', background: 'rgba(6,182,212,.1)', border: '1px solid rgba(6,182,212,.25)', fontSize: '13px' }}>{consultingRequests.filter((request) => request.status === 'new').length} yeni başvuru</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn" onClick={handleExportConsultingRequests} disabled={!consultingRequests.length} style={{ padding: '9px 13px', fontSize: '12px', color: '#86efac', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)' }}><FileSpreadsheet size={15} /> Excel'e Aktar</button>
            <button className="btn" onClick={handleBulkDeleteConsultingRequests} disabled={!selectedConsultingIds.length} style={{ padding: '9px 13px', fontSize: '12px', color: '#fca5a5', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)' }}><Trash2 size={15} /> Seçilenleri Sil ({selectedConsultingIds.length})</button>
          </div>
        </div>
        {consultingRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>Henüz eğitim danışmanlığı başvurusu yok.</div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
              <input type="checkbox" checked={selectedConsultingIds.length === consultingRequests.length} onChange={(event) => setSelectedConsultingIds(event.target.checked ? consultingRequests.map((request) => request.id) : [])} />
              Tümünü seç
            </label>
            {consultingRequests.map((request) => (
              <div key={request.id} style={{ padding: '20px', borderRadius: '16px', background: 'rgba(6,182,212,.045)', border: '1px solid rgba(6,182,212,.16)', display: 'grid', gridTemplateColumns: 'auto repeat(auto-fit, minmax(190px, 1fr)) auto', gap: '18px', alignItems: 'center' }}>
                <input type="checkbox" checked={selectedConsultingIds.includes(request.id)} onChange={() => toggleConsultingSelection(request.id)} aria-label={`${request.student_name} başvurusunu seç`} />
                <div>
                  <h3 style={{ margin: '0 0 6px', color: '#fff', fontSize: '17px' }}>{request.student_name}</h3>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Veli: {request.parent_name}</div>
                  {request.school_level && <div style={{ color: '#67e8f9', fontSize: '13px', marginTop: '5px' }}>{request.school_level}{request.city ? ` · ${request.city}` : ''}</div>}
                </div>
                <div style={{ display: 'grid', gap: '6px', minWidth: 0 }}>
                  <a href={`tel:${request.phone}`} style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '7px' }}><Phone size={14} color="#22d3ee" /> {request.phone}</a>
                  {request.email && <a href={`mailto:${request.email}`} style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px', overflowWrap: 'anywhere' }}><Mail size={14} /> {request.email}</a>}
                  {request.notes && <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', lineHeight: 1.45, marginTop: '5px' }}>{request.notes}</div>}
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '11px', marginTop: '4px' }}>{new Date(request.created_at).toLocaleString('tr-TR')}</div>
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <select className="input-field" value={request.status} onChange={(event) => handleConsultingStatus(request.id, event.target.value)} aria-label={`${request.student_name} başvuru durumu`}>
                    <option value="new">Yeni</option><option value="contacted">İletişime geçildi</option><option value="converted">Öğrenci oldu</option><option value="closed">Kapatıldı</option>
                  </select>
                  <button className="btn" onClick={() => handleDeleteConsultingRequest(request.id)} style={{ padding: '8px 10px', fontSize: '12px', color: '#fca5a5', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)' }}><Trash2 size={14} /> Sil</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deletion Requests */}
      <div className="glass-card slide-up" style={{ padding: '32px', marginBottom: '40px' }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={24} /> Hesap Silme Talepleri
        </h2>
        {deletionRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>Bekleyen hesap silme talebi yok.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {deletionRequests.map((req) => (
              <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#fff' }}>{req.name}</h3>
                  {req.email && <div style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>E-posta: {req.email}</div>}
                  {req.reason && <div style={{ fontSize: '13px', color: '#fca5a5' }}>Neden: {req.reason}</div>}
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                    Tarih: {new Date(req.created_at).toLocaleString('tr-TR')}
                  </div>
                </div>
                <div>
                  <button 
                    onClick={() => handleResolveDeletion(req.id)}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981', border: 'none' }}
                  >
                    <CheckCircle size={14} /> Çözüldü İşaretle
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Teachers List */}
      <div className="glass-card slide-up" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>Kayıtlı Öğretmenler ve Sınıfları</h2>
          <button 
            className="btn btn-primary" 
            style={{ padding: '10px 20px', fontSize: '14px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setShowAddModal(true)}
          >
            <PlusCircle size={16} /> Öğretmen Ekle
          </button>
        </div>
        
        {teachers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>Henüz sisteme kayıtlı bir öğretmen bulunmuyor.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {teachers.map((teacher) => (
              <div key={teacher.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4', fontWeight: 'bold', fontSize: '20px' }}>
                    {teacher.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#fff' }}>{teacher.full_name}</h3>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Davet Kodu: <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>{teacher.invite_code}</span></div>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {!teacher.is_approved ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ padding: '6px 12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '100px', fontSize: '12px', fontWeight: 'bold', border: '1px solid rgba(245, 158, 11, 0.2)' }}>Bekliyor</span>
                      <button 
                        onClick={() => handleApprove(teacher.id)}
                        className="btn"
                        style={{ padding: '6px 12px', fontSize: '13px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                        title="Onayla"
                      >
                        <CheckCircle size={14} /> Onayla
                      </button>
                      <button 
                        onClick={() => handleDelete(teacher.id)}
                        className="btn"
                        style={{ padding: '6px 12px', fontSize: '13px', background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                        title="Sil"
                      >
                        <Trash2 size={14} /> Sil
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{teacher.student_count}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Aktif Öğrenci</div>
                      </div>
                      <button 
                        onClick={() => handleDelete(teacher.id)}
                        style={{ padding: '8px', background: 'transparent', color: 'var(--color-text-muted)', border: 'none', cursor: 'pointer', opacity: 0.5, transition: 'all 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.opacity = 1; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.opacity = 0.5; }}
                        title="Öğretmeni Sil"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Teacher Modal */}
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
              <PlusCircle size={24} color="var(--color-primary)" /> Yeni Öğretmen
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '14px' }}>Profesyonel Öğretmen tarafından eklenen öğretmenler direkt onaylanır.</p>
            
            <form onSubmit={handleAddTeacher} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Briefcase size={16} /> Ad Soyad</label>
                <input type="text" className="input-field" placeholder="Örn: Veli Yılmaz" value={newTeacherFullName} onChange={(e) => setNewTeacherFullName(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><User size={16} /> Kullanıcı Adı</label>
                <input type="text" className="input-field" placeholder="Örn: velihoca" value={newTeacherUsername} onChange={(e) => setNewTeacherUsername(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Key size={16} /> Şifre</label>
                <input type="password" className="input-field" placeholder="••••••••" value={newTeacherPassword} onChange={(e) => setNewTeacherPassword(e.target.value)} required />
              </div>

              {addError && <div style={{ color: '#ef4444', fontSize: '14px', background: 'rgba(239,68,68,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>{addError}</div>}
              {addSuccess && <div style={{ color: '#10b981', fontSize: '14px', background: 'rgba(16,185,129,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>{addSuccess}</div>}

              <button type="submit" className="btn btn-primary" disabled={addLoading} style={{ padding: '14px', marginTop: '8px' }}>
                {addLoading ? 'Kaydediliyor...' : 'Öğretmeni Kaydet'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
