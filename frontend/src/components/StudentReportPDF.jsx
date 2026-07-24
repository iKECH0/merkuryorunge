import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Sparkles, Trophy, Clock, Target, BookOpen } from 'lucide-react';

const StudentReportPDF = ({ student, isGenerating, onComplete }) => {
  const reportRef = useRef(null);

  // Expose generation function
  React.useEffect(() => {
    if (isGenerating && student) {
      generatePDF();
    }
  }, [isGenerating, student]);

  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a' // match var(--color-bg-deep)
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Merkur_Yorunge_${student.name.replace(/\s+/g, '_')}_Karnesi.pdf`);
    } catch (err) {
      console.error('PDF oluşturulamadı:', err);
      alert('PDF oluşturulurken bir hata meydana geldi.');
    } finally {
      if (onComplete) onComplete();
    }
  };

  if (!student) return null;

  // Find favorite subject
  let favoriteSubject = '-';
  let maxDuration = 0;
  if (student.subjects) {
    Object.entries(student.subjects).forEach(([subj, duration]) => {
      if (duration > maxDuration) {
        maxDuration = duration;
        favoriteSubject = subj;
      }
    });
  }

  return (
    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
      <div 
        ref={reportRef} 
        style={{ 
          width: '794px', 
          minHeight: '1123px', // A4 proportions at 96 DPI
          padding: '60px 40px', 
          background: '#0f172a', 
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <div>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '60px', gap: '20px' }}>
            <div style={{ padding: '20px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '24px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
              <Sparkles size={48} color="#06b6d4" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{ margin: 0, fontSize: '40px', color: '#06b6d4', letterSpacing: '-0.5px' }}>Merkür Yörünge</h1>
              <p style={{ margin: '8px 0 0 0', fontSize: '20px', color: '#94a3b8' }}>Bireysel Gelişim Analizi</p>
            </div>
          </div>

          {/* Student Name */}
          <div style={{ textAlign: 'center', padding: '32px', background: 'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.05))', borderRadius: '24px', marginBottom: '60px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '2px' }}>Öğrenci</p>
            <h2 style={{ margin: 0, fontSize: '48px', color: '#ffffff', fontWeight: '800' }}>{student.name}</h2>
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <div style={{ padding: '32px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '24px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}>
                  <Clock size={28} color="#3b82f6" />
                </div>
                <h3 style={{ margin: 0, fontSize: '22px', color: '#94a3b8' }}>Toplam Süre</h3>
              </div>
              <p style={{ margin: 0, fontSize: '40px', fontWeight: 'bold', color: '#ffffff' }}>
                {Math.floor(student.totalDuration / 60)}s {student.totalDuration % 60}d
              </p>
            </div>

            <div style={{ padding: '32px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '24px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px' }}>
                  <Target size={28} color="#10b981" />
                </div>
                <h3 style={{ margin: 0, fontSize: '22px', color: '#94a3b8' }}>Çözülen Soru</h3>
              </div>
              <p style={{ margin: 0, fontSize: '40px', fontWeight: 'bold', color: '#ffffff' }}>
                {student.totalQuestions}
              </p>
            </div>

            <div style={{ padding: '32px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '24px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px' }}>
                  <BookOpen size={28} color="#f59e0b" />
                </div>
                <h3 style={{ margin: 0, fontSize: '22px', color: '#94a3b8' }}>Favori Ders</h3>
              </div>
              <p style={{ margin: 0, fontSize: '40px', fontWeight: 'bold', color: '#ffffff' }}>
                {favoriteSubject}
              </p>
            </div>

            <div style={{ padding: '32px', background: 'rgba(236, 72, 153, 0.05)', borderRadius: '24px', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '12px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '12px' }}>
                  <Trophy size={28} color="#ec4899" />
                </div>
                <h3 style={{ margin: 0, fontSize: '22px', color: '#94a3b8' }}>Toplam Oturum</h3>
              </div>
              <p style={{ margin: 0, fontSize: '40px', fontWeight: 'bold', color: '#ffffff' }}>
                {student.sessions}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingBottom: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '32px' }}>
          <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>Bu belge Merkür Yörünge Akademi Sistemi tarafından otomatik olarak oluşturulmuştur.</p>
          <p style={{ color: '#475569', fontSize: '14px', marginTop: '12px' }}>Tarih: {new Date().toLocaleDateString('tr-TR')} | Saat: {new Date().toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}</p>
        </div>
      </div>
    </div>
  );
};

export default StudentReportPDF;
