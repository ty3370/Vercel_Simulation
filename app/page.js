'use client';

import { useState } from 'react';

export default function Home() {
  const [step, setStep] = useState(1);
  const [userInfo, setUserInfo] = useState({ number: '', name: '', code: '' });
  const [topics, setTopics] = useState([]);
  const [currentTopic, setCurrentTopic] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [evaluation, setEvaluation] = useState('');
  const [revisionPlan, setRevisionPlan] = useState('');

  const fetchTopics = async () => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ action: 'get_topics', ...userInfo })
    });
    const data = await res.json();
    if (data.topics) setTopics(data.topics);
  };

  const handleLogin = async () => {
    if (userInfo.number && userInfo.name && userInfo.code) {
      setStep(2);
      await fetchTopics();
    } else {
      alert('모든 정보를 입력하세요.');
    }
  };

  const loadChat = async (topic) => {
    setCurrentTopic(topic);
    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ action: 'load_chat', ...userInfo, topic })
    });
    const data = await res.json();
    setMessages(data.chat || []);
    extractCodeSnippets(data.chat || []);
  };

  const extractCodeSnippets = (chatMsgs) => {
    const snippets = [];
    chatMsgs.forEach(m => {
      const matches = m.content.match(/\+{5}([\s\S]*?)\+{5}/g);
      if (matches) {
        matches.forEach(match => snippets.push(match.replace(/\+{5}/g, '').trim()));
      }
    });
    if (snippets.length > 0) {
      setCurrentCode(snippets[snippets.length - 1]);
    }
  };

  const handleSend = async () => {
    if (!inputPrompt.trim() || !currentTopic) return;
    setLoading(true);

    const res = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        action: 'send_chat',
        ...userInfo,
        topic: currentTopic,
        userPrompt: inputPrompt,
        messages
      })
    });

    const data = await res.json();
    setLoading(false);
    if (data.updatedMessages) {
      setMessages(data.updatedMessages);
      setInputPrompt('');
      extractCodeSnippets(data.updatedMessages);
    }
  };

  const handleSaveLog = async () => {
    if (!evaluation || !revisionPlan) return alert('평가와 수정 계획을 모두 작성하세요.');
    const logContent = `[평가] ${evaluation}\n[수정계획] ${revisionPlan}`;
    const updatedMessages = [...messages, { role: 'user', content: logContent }];

    await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        action: 'save_log',
        ...userInfo,
        topic: currentTopic,
        messages: updatedMessages
      })
    });

    setMessages(updatedMessages);
    setEvaluation('');
    setRevisionPlan('');
    alert('일지가 저장되었습니다.');
  };

  const renderP5Html = (code) => `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
      <style>
        html, body { margin: 0; padding: 0; overflow: hidden; background: #0f172a; display: flex; justify-content: center; align-items: center; height: 100vh; }
        canvas { border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }
      </style>
    </head>
    <body>
      <script>${code}</script>
    </body>
    </html>
  `;

  // --- 1. 로그인 스크린 (모던 다크 스타일) ---
  if (step === 1) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          backgroundColor: '#1e293b',
          padding: '40px',
          borderRadius: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          width: '100%',
          maxWidth: '400px',
          border: '1px solid #334155'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span style={{ fontSize: '48px' }}>⚛️</span>
            <h1 style={{ color: '#f8fafc', fontSize: '24px', fontWeight: '700', marginTop: '12px', marginBotton: '8px' }}>물리학 시뮬레이터</h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>p5.js 기반 AI 시뮬레이션 연구소</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input 
              style={{ padding: '14px', borderRadius: '12px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '15px', outline: 'none' }} 
              placeholder="학번 (예: 20101)" 
              onChange={e => setUserInfo({ ...userInfo, number: e.target.value })} 
            />
            <input 
              style={{ padding: '14px', borderRadius: '12px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '15px', outline: 'none' }} 
              placeholder="이름" 
              onChange={e => setUserInfo({ ...userInfo, name: e.target.value })} 
            />
            <input 
              style={{ padding: '14px', borderRadius: '12px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '15px', outline: 'none' }} 
              type="password" 
              placeholder="식별 코드" 
              onChange={e => setUserInfo({ ...userInfo, code: e.target.value })} 
            />
            <button 
              style={{
                marginTop: '10px',
                padding: '16px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }} 
              onClick={handleLogin}
            >
              시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. 메인 대시보드 스크린 ---
  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* 좌측 사이드바 */}
      <div style={{ width: '280px', backgroundColor: '#1e293b', borderRight: '1px solid #334155', padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <span style={{ fontSize: '24px' }}>🧪</span>
          <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>프로젝트 목록</h2>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input 
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px' }} 
            placeholder="새 프로젝트 주제" 
            id="newTopic" 
          />
          <button 
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
            onClick={() => {
              const val = document.getElementById('newTopic').value;
              if (val) loadChat(val);
            }}
          >
            + 새 주제 생성
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '10px' }}>저장된 프로젝트</p>
          {topics.map(t => (
            <div 
              key={t} 
              style={{ 
                padding: '12px', 
                borderRadius: '8px', 
                backgroundColor: currentTopic === t ? '#334155' : 'transparent',
                color: currentTopic === t ? '#38bdf8' : '#94a3b8',
                cursor: 'pointer',
                fontSize: '14px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }} 
              onClick={() => loadChat(t)}
            >
              <span>📂</span> {t}
            </div>
          ))}
        </div>

        <div style={{ padding: '12px', backgroundColor: '#0f172a', borderRadius: '8px', fontSize: '12px', color: '#94a3b8' }}>
          👤 {userInfo.number} {userInfo.name} 학생
        </div>
      </div>

      {/* 우측 메인 영역 */}
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* 상단 헤더 & 채팅/요청 영역 */}
        <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '16px', border: '1px solid #334155' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#38bdf8' }}>
            {currentTopic ? `📌 ${currentTopic}` : '👈 좌측에서 프로젝트를 선택하거나 신규 생성하세요.'}
          </h2>

          <div style={{ display: 'flex', gap: '20px' }}>
            {/* 대화 내역 상자 */}
            <div style={{ flex: 1, backgroundColor: '#0f172a', borderRadius: '12px', padding: '16px', height: '260px', overflowY: 'auto', border: '1px solid #334155' }}>
              {messages.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', marginTop: '100px' }}>AI에게 물리 시뮬레이션 생성을 요청해 보세요.</p>
              ) : (
                messages.map((m, idx) => (
                  <div key={idx} style={{ marginBottom: '12px', textAlign: m.role === 'user' ? 'right' : 'left' }}>
                    <span style={{ 
                      display: 'inline-block',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      maxWidth: '80%',
                      fontSize: '14px',
                      backgroundColor: m.role === 'user' ? '#2563eb' : '#334155',
                      color: '#ffffff'
                    }}>
                      {m.content.replace(/\+{5}[\s\S]*?\+{5}/g, '⚡ [p5.js 시뮬레이션 코드 동작 중]')}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* 프롬프트 입력 및 전송 버튼 */}
            <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <textarea 
                style={{ flex: 1, width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '14px', resize: 'none', boxSizing: 'border-box', outline: 'none' }} 
                value={inputPrompt} 
                onChange={e => setInputPrompt(e.target.value)} 
                placeholder="예: 질량이 서로 다른 두 공이 충돌할 때 운동량 보존 법칙 시뮬레이션 만들어줘" 
              />
              <button 
                style={{ 
                  padding: '14px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  backgroundColor: loading ? '#475569' : '#10b981', 
                  color: '#fff', 
                  fontWeight: '700', 
                  fontSize: '15px', 
                  cursor: loading ? 'not-allowed' : 'pointer' 
                }} 
                onClick={handleSend} 
                disabled={loading}
              >
                {loading ? '✨ AI 시뮬레이션 코딩 중...' : '🚀 AI에게 생성 요청'}
              </button>
            </div>
          </div>
        </div>

        {/* 하단 시뮬레이션 미리보기 & 일지 작성 */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          
          {/* p5.js 미리보기 영역 */}
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '16px', border: '1px solid #334155' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🖥️ 실시간 p5.js 시뮬레이션 Canvas
            </h3>
            <div style={{ width: '100%', height: '420px', backgroundColor: '#0f172a', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {currentCode ? (
                <iframe srcDoc={renderP5Html(currentCode)} style={{ width: '100%', height: '100%', border: 'none' }} title="p5" />
              ) : (
                <p style={{ color: '#64748b', fontSize: '14px' }}>시뮬레이션 코드가 생성되면 이곳에서 바로 실행됩니다.</p>
              )}
            </div>
          </div>

          {/* 시뮬레이션 일지 작성 영역 */}
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '16px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#f8fafc' }}>📝 탐구 일지</h3>
            
            <label style={{ fontSize: '12px', color: '#94a3b8' }}>시뮬레이션 평가</label>
            <textarea 
              style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '13px', boxSizing: 'border-box', resize: 'none', outline: 'none' }} 
              placeholder="시뮬레이션의 정확성 및 만족도 평가..." 
              value={evaluation} 
              onChange={e => setEvaluation(e.target.value)} 
            />

            <label style={{ fontSize: '12px', color: '#94a3b8' }}>다음 수정 및 물리적 개선 계획</label>
            <textarea 
              style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '13px', boxSizing: 'border-box', resize: 'none', outline: 'none' }} 
              placeholder="추가하고 싶은 물리학 변수나 기능..." 
              value={revisionPlan} 
              onChange={e => setRevisionPlan(e.target.value)} 
            />

            <button 
              style={{ marginTop: 'auto', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#8b5cf6', color: '#fff', fontWeight: '600', cursor: 'pointer' }} 
              onClick={handleSaveLog}
            >
              💾 탐구 일지 저장하기
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
