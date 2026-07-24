import React, { useState, useEffect } from 'react';
import { Sparkles, Target, Trophy, ArrowRight, CheckCircle2 } from 'lucide-react';

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const nextStep = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      setIsVisible(false);
      setTimeout(onComplete, 400); // Wait for fade out animation
    }
  };

  const steps = [
    {
      icon: <Sparkles size={48} color="var(--color-primary)" />,
      title: "Merkür Yörünge'ye Hoş Geldin",
      desc: "Çalışmalarını takip etmek hiç bu kadar keyifli olmamıştı. Sadece 5 dakikanı ayırarak kendi eğitim serüvenini yönet."
    },
    {
      icon: <Target size={48} color="var(--color-accent)" />,
      title: "Hedefine Odaklan",
      desc: "İster canlı seans ile odaklanarak çalış, ister gün sonunda hızlı raporla çözdüğün soruları kaydet."
    },
    {
      icon: <Trophy size={48} color="#f59e0b" />,
      title: "Sıralamaya Gir",
      desc: "Arkadaşlarınla tatlı bir rekabete gir, haftanın liderlik tablosunda yerini al ve rozetleri topla!"
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(3, 7, 18, 0.95)',
      backdropFilter: 'blur(10px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 0.4s ease'
    }}>
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '40px 24px', position: 'relative' }}>
        
        {/* Progress indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: step === i ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: step >= i ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
              transition: 'all 0.3s ease'
            }} />
          ))}
        </div>

        <div className="slide-up" key={step} style={{ animation: 'slideUp 0.4s ease-out forwards' }}>
          <div style={{ display: 'inline-flex', padding: '20px', borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', marginBottom: '24px' }}>
            {steps[step].icon}
          </div>
          
          <h2 className="title text-gradient" style={{ fontSize: '28px', marginBottom: '16px' }}>
            {steps[step].title}
          </h2>
          
          <p style={{ color: 'var(--color-text-muted)', fontSize: '16px', lineHeight: 1.6, marginBottom: '40px', minHeight: '80px' }}>
            {steps[step].desc}
          </p>
        </div>

        <button className="btn btn-primary" onClick={nextStep} style={{ width: '100%' }}>
          {step === 2 ? (
            <>Maceraya Başla <CheckCircle2 size={20} /></>
          ) : (
            <>Devam Et <ArrowRight size={20} /></>
          )}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
