import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminStats, approveTeacher, deleteTeacher, addTeacherByAdmin, getDeletionRequests, deleteDeletionRequest, downloadPlatformBackup } from '../api';
import { LayoutDashboard, Users, CheckCircle, Clock, ShieldCheck, LogOut, RefreshCw, BarChart2, Trash2, PlusCircle, X, User, Key, Briefcase, Sparkles, ShieldAlert, AlertTriangle, Database, Download } from 'lucide-react';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
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
    if (!isAuth) {
      navigate('/');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [stats, requests] = await Promise.all([
        getAdminStats(),
        getDeletionRequests()
      ]);
      setData(stats);
      setDeletionRequests(requests);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('superAdminAuth');
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

  if (loading || !data) {
    return <div className="flex-center text-primary animate-pulse-glow" style={{ minHeight: '80vh', fontSize: '20px' }}>Profesyonel Öğretmen Paneli Yükleniyor...</div>;
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
