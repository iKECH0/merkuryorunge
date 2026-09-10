import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const MerkurAIChat = ({ studentName, studentData }) => {
  const apiBaseUrl = import.meta.env.PROD ? 'https://backend-three-khaki-37.vercel.app' : (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Selam ${studentName}! 👋 Ben Merkür AI, kişisel eğitim koçun. Derslerine, çalışma sürenize ve hedeflerine bakıyorum — konuşmaya hazırım! Ne hakkında konuşalım? 🚀` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Filter history to start with user role (Gemini requirement)
      const filteredHistory = [...messages];
      while (filteredHistory.length > 0 && filteredHistory[0].role !== 'user') {
        filteredHistory.shift();
      }

      // Check if user wants analysis
      const isAnalysisRequest = userMessage.toLowerCase().includes('analiz') || 
                                userMessage.toLowerCase().includes('rapor') ||
                                userMessage.toLowerCase().includes('özet');

      let endpoint = `${apiBaseUrl}/api/ai?action=chat`;
      let requestBody = {
        studentName,
        message: userMessage,
        history: filteredHistory,
        studentData: studentData || null
      };

      if (isAnalysisRequest) {
        endpoint = `${apiBaseUrl}/api/ai?action=analyze`;
        
        // Prepare analysis request with structured data
        const subjects = studentData ? Object.entries(studentData.subjects || {}).map(([subject, data]) => ({
          subject,
          minutes: data.minutes || 0,
          hours: ((data.minutes || 0) / 60).toFixed(2),
          questions: data.questions || 0,
          percent: studentData.totalMinutes > 0 ? Math.round((data.minutes / studentData.totalMinutes) * 100) : 0
        })) : [];

        const strongest = subjects.length > 0 ? subjects.sort((a, b) => b.minutes - a.minutes)[0] : null;
        const weakest = subjects.length > 0 ? subjects.sort((a, b) => a.minutes - b.minutes)[0] : null;

        requestBody = {
          studentName,
          schoolLevel: studentData?.schoolLevel || null,
          className: studentData?.className || null,
          goal: studentData?.goal || 0,
          totalMinutes: studentData?.totalMinutes || 0,
          totalHours: studentData ? (studentData.totalMinutes / 60).toFixed(2) : "0",
          totalQuestions: studentData?.totalQuestions || 0,
          totalSessions: studentData ? Object.values(studentData.subjects || {}).length : 0,
          activeDaysCount: 7, // Assuming 7-day window
          subjects,
          strongest: strongest?.subject || 'Belirsiz',
          weakest: weakest?.subject || 'Belirsiz'
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const data = await res.json();
      
      if (data.error && !data.reply && !data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Hata: ${data.error}` }]);
      } else {
        const aiResponse = data.reply || data.message || 'Bir sorun oluştu.';
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Üzgünüm, şu an bağlantı kuramıyorum. Lütfen daha sonra tekrar dene! 🥲' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card slide-up" style={{ height: '600px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '20px', background: 'rgba(168, 85, 247, 0.1)', borderBottom: '1px solid rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ padding: '10px', background: 'var(--color-bg-deep)', borderRadius: '12px', color: '#a855f7' }}>
          <Sparkles size={24} />
        </div>
        <div>
          <h2 className="title" style={{ fontSize: '20px', margin: 0, color: 'var(--color-text-main)' }}>Merkür AI</h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>Kişisel Eğitim Koçun</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
              background: msg.role === 'user' ? 'var(--color-primary)' : 'rgba(168, 85, 247, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: msg.role === 'user' ? 'white' : '#a855f7'
            }}>
              {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            
            <div style={{
              background: msg.role === 'user' ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '16px',
              borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
              borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
              maxWidth: '80%',
              fontSize: '15px',
              lineHeight: 1.5
            }}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
              <Loader2 size={20} className="animate-spin" />
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Merkür AI yazıyor...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} style={{ padding: '16px', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-deep)', display: 'flex', gap: '12px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Merkür AI'a mesaj gönder..."
          className="input-field"
          style={{ flex: 1, margin: 0 }}
          disabled={isLoading}
        />
        <button type="submit" className="btn btn-primary" style={{ padding: '0 20px', borderRadius: '12px' }} disabled={isLoading || !input.trim()}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default MerkurAIChat;
