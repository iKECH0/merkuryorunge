import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { submitConsultingRequest } from '../api';

export default function ConsultingRequest() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ parentName:'', studentName:'', phone:'', email:'', schoolLevel:'', city:'', notes:'' });
  const [accepted, setAccepted] = useState(false);
  const [state, setState] = useState({ loading:false, message:'', error:'' });
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async e => {
    e.preventDefault();
    if (!accepted) return setState({ loading:false, message:'', error:'İletişim iznini onaylamanız gerekiyor.' });
    setState({ loading:true, message:'', error:'' });
    try { await submitConsultingRequest(form); setState({ loading:false, message:'Talebiniz alındı. En kısa sürede sizinle iletişime geçeceğiz.', error:'' }); setForm({ parentName:'', studentName:'', phone:'', email:'', schoolLevel:'', city:'', notes:'' }); }
    catch (err) { setState({ loading:false, message:'', error:err.response?.data?.error || 'Talep gönderilemedi.' }); }
  };
  return <div style={{ maxWidth:620, margin:'30px auto', width:'100%' }}>
    <button onClick={()=>navigate('/')} className="btn btn-secondary"><ArrowLeft size={16}/> Geri</button>
    <div className="glass-card" style={{ padding:28, marginTop:18 }}><h1 className="title">Eğitim Danışmanlığı Ön Başvurusu</h1><p style={{color:'var(--color-text-muted)'}}>Form ücretsizdir; ödeme oluşturmaz. Bilgileriniz yalnızca sizinle iletişim kurmak için kullanılır.</p>
      <form onSubmit={submit} style={{display:'grid',gap:14}}>
        <input className="input-field" name="parentName" value={form.parentName} onChange={change} placeholder="Veli adı soyadı *" required />
        <input className="input-field" name="studentName" value={form.studentName} onChange={change} placeholder="Öğrenci adı soyadı *" required />
        <input className="input-field" name="phone" value={form.phone} onChange={change} placeholder="Telefon *" required />
        <input className="input-field" type="email" name="email" value={form.email} onChange={change} placeholder="E-posta" />
        <select className="input-field" name="schoolLevel" value={form.schoolLevel} onChange={change}><option value="">Sınıf / sınav grubu</option><option>5. Sınıf</option><option>6. Sınıf</option><option>7. Sınıf</option><option>LGS</option><option>9. Sınıf</option><option>10. Sınıf</option><option>11. Sınıf</option><option>12. Sınıf</option><option>YKS</option></select>
        <input className="input-field" name="city" value={form.city} onChange={change} placeholder="Şehir" />
        <textarea className="input-field" name="notes" value={form.notes} onChange={change} placeholder="Hedefleriniz ve destek almak istediğiniz konular" rows="4" />
        <label style={{ display:'flex', gap:10, alignItems:'flex-start', color:'var(--color-text-muted)', fontSize:13, lineHeight:1.45, cursor:'pointer' }}>
          <input type="checkbox" checked={accepted} onChange={(event)=>setAccepted(event.target.checked)} style={{ marginTop:3 }} />
          Başvurumla ilgili telefon veya e-posta üzerinden benimle iletişime geçilmesini kabul ediyorum.
        </label>
        {state.error && <div style={{color:'#f87171'}}>{state.error}</div>}{state.message && <div style={{color:'#34d399'}}>{state.message}</div>}
        <button className="btn btn-primary" disabled={state.loading}><Send size={16}/> {state.loading?'Gönderiliyor...':'Ücretsiz Ön Başvuru Gönder'}</button>
      </form>
    </div>
  </div>;
}
