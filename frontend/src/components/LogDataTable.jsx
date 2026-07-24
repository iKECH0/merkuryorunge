import React from 'react';

const LogDataTable = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center text-muted" style={{ padding: '40px' }}>Henüz veri bulunmuyor.</div>;
  }

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', { 
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
    }).format(d);
  };

  return (
    <div className="table-container slide-up">
      <table className="data-table">
        <thead>
          <tr>
            <th>Öğrenci</th>
            <th>Ders</th>
            <th>Süre</th>
            <th>Soru</th>
            <th>Tarih</th>
          </tr>
        </thead>
        <tbody>
          {data.map((log, index) => (
            <tr key={log.id} style={{ animationDelay: `${index * 0.05}s` }} className="fade-in">
              <td style={{ fontWeight: '600', color: 'var(--color-primary-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(6,182,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                    {log.student_name.charAt(0).toUpperCase()}
                  </div>
                  {log.student_name}
                </div>
              </td>
              <td>
                <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', fontSize: '13px' }}>
                  {log.subject}
                </span>
              </td>
              <td style={{ fontWeight: '700', color: '#fff', fontFamily: 'var(--font-primary)' }}>{log.duration_minutes} dk</td>
              <td style={{ color: 'var(--color-text-muted)' }}>{log.questions_solved || '-'}</td>
              <td style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{formatDate(log.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LogDataTable;
