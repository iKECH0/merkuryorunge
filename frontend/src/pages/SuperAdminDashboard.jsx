import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminStats, approveTeacher, deleteTeacher, addTeacherByAdmin, getDeletionRequests, deleteDeletionRequest, downloadPlatformBackup, getConsultingRequests, updateConsultingRequestStatus, getAdminBillingStudents, updateAdminBillingStudent } from '../api';
import { Users, CheckCircle, LogOut, RefreshCw, BarChart2, Trash2, PlusCircle, X, User, Key, Briefcase, ShieldAlert, AlertTriangle, Database, Download, Phone, Mail, GraduationCap, CreditCard, Gift, CalendarPlus } from 'lucide-react';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [consultingRequests, setConsultingRequests] = useState([]);
  const [billingData, setBillingData] = useState({ billingEnabled: false, trialDays: 3, students: [] });
  const [billingUpdatingId, setBillingUpdatingId] = useState(null);
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
      const [stats, requests, consulting, billing] = await Promise.all([
        getAdminStats(),
        getDeletionRequests(),
        getConsultingRequests(),
        getAdminBillingStudents()
      ]);
      setData(stats);
      setDeletionRequests(requests);
      setConsultingRequests(consulting);
      setBillingData(billing);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.removeItem('superAdminAuth');
        localStorage.removeItem('superAdminToken');
        if (localStorage.getItem('teacherId') === 'ALL') {
          localStorage.removeItem('teacherAuth');
          localStorage.removeItem('teacherId');
          localStorage.removeItem('teacherName');
        }
        navigate('/');
        return;
      }
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

  const handleBillingAction = async (studentId, action) => {
    const labels = {
      grant_complimentary: 'Bu öğrenciye süresiz ücretsiz erişim vermek',
      grant_30_days: 'Bu öğrenciye 30 gün manuel erişim eklemek',
      grant_365_days: 'Bu öğrenciye 1 yıl manuel erişim eklemek',
      clear_manual_access: 'Bu öğrencinin manuel/ücretsiz erişimini kaldırmak'
    };
    if (!window.confirm(`${labels[action]} istediğinize emin misiniz?`)) return;
    setBillingUpdatingId(studentId);
    try {
      const result = await updateAdminBillingStudent(studentId, action);
      setBillingData((current) => ({
        ...current,
        students: current.students.map((student) => student.id === studentId ? result.student : student)
      }));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Abonelik işlemi tamamlanamadı.');
    } finally {
      setBillingUpdatingId(null);
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
        {billingData.students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-muted)' }}>Kayıtlı öğrenci bulunmuyor.</div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {billingData.students.map((student) => {
              const manualActive = student.manual_access_active;
              const playActive = student.subscription_active;
              const statusLabel = student.billing_exempt ? 'Süresiz ücretsiz' : manualActive ? `Manuel erişim: ${new Date(student.manual_access_expires_at).toLocaleDateString('tr-TR')}` : playActive ? `Google Play: ${new Date(student.subscription_expires_at).toLocaleDateString('tr-TR')}` : student.trial_started_at ? 'Deneme / ödeme bekliyor' : 'Henüz deneme başlamadı';
              const statusColor = student.billing_exempt || manualActive || playActive ? '#34d399' : '#fbbf24';
              return (
                <div key={student.id} style={{ padding: '18px', borderRadius: '15px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', alignItems: 'center', gap: '14px' }}>
                  <div>
                    <strong style={{ color: '#fff', display: 'block' }}>{student.full_name}</strong>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>@{student.username}{student.class_name ? ` · ${student.class_name}` : ''}</span>
                  </div>
                  <div>
                    <span style={{ display: 'inline-block', padding: '6px 10px', borderRadius: '100px', color: statusColor, background: `${statusColor}18`, border: `1px solid ${statusColor}45`, fontSize: '12px', fontWeight: 700 }}>{statusLabel}</span>
                    {student.billing_override_note && <div style={{ color: 'var(--color-text-muted)', fontSize: '11px', marginTop: '5px' }}>{student.billing_override_note}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                    <button disabled={billingUpdatingId === student.id} onClick={() => handleBillingAction(student.id, 'grant_complimentary')} className="btn" style={{ padding: '7px 10px', fontSize: '12px', color: '#34d399', background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)' }}><Gift size={13} /> Ücretsiz</button>
                    <button disabled={billingUpdatingId === student.id} onClick={() => handleBillingAction(student.id, 'grant_30_days')} className="btn" style={{ padding: '7px 10px', fontSize: '12px' }}><CalendarPlus size={13} /> +30 gün</button>
                    <button disabled={billingUpdatingId === student.id} onClick={() => handleBillingAction(student.id, 'grant_365_days')} className="btn" style={{ padding: '7px 10px', fontSize: '12px' }}><CalendarPlus size={13} /> +1 yıl</button>
                    {(student.billing_exempt || manualActive) && <button disabled={billingUpdatingId === student.id} onClick={() => handleBillingAction(student.id, 'clear_manual_access')} className="btn" style={{ padding: '7px 10px', fontSize: '12px', color: '#fca5a5', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)' }}>Erişimi kaldır</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Consulting Requests */}
      <div className="glass-card slide-up" style={{ padding: '32px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#22d3ee', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GraduationCap size={24} /> Eğitim Danışmanlığı Başvuruları
          </h2>
          <span style={{ padding: '6px 12px', borderRadius: '100px', color: '#67e8f9', background: 'rgba(6,182,212,.1)', border: '1px solid rgba(6,182,212,.25)', fontSize: '13px' }}>
            {consultingRequests.filter((request) => request.status === 'new').length} yeni başvuru
          </span>
        </div>
        {consultingRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>Henüz eğitim danışmanlığı başvurusu yok.</div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {consultingRequests.map((request) => (
              <div key={request.id} style={{ padding: '20px', borderRadius: '16px', background: 'rgba(6,182,212,.045)', border: '1px solid rgba(6,182,212,.16)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '18px', alignItems: 'center' }}>
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
                <select className="input-field" value={request.status} onChange={(event) => handleConsultingStatus(request.id, event.target.value)} aria-label={`${request.student_name} başvuru durumu`}>
                  <option value="new">Yeni</option>
                  <option value="contacted">İletişime geçildi</option>
                  <option value="converted">Öğrenci oldu</option>
                  <option value="closed">Kapatıldı</option>
                </select>
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
