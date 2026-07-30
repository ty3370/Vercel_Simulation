'use client';

import { useState, useEffect } from 'react';

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
        html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
        canvas { display: block; }
      </style>
    </head>
    <body>
      <script>${code}</script>
    </body>
    </html>
  `;

  if (step === 1) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>🚀 물리학 시뮬레이션 제작 AI</h2>
        <input style={{ width: '100%', marginBottom: '10px', padding: '8px' }} placeholder="학번" onChange={e => setUserInfo({ ...userInfo, number: e.target.value })} />
        <input style={{ width: '100%', marginBottom: '10px', padding: '8px' }} placeholder="이름" onChange={e => setUserInfo({ ...userInfo, name: e.target.value })} />
        <input style={{ width: '100%', marginBottom: '10px', padding: '8px' }} type="password" placeholder="식별코드" onChange={e => setUserInfo({ ...userInfo, code: e.target.value })} />
        <button style={{ width: '100%', padding: '10px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '4px' }} onClick={handleLogin}>접속하기</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ width: '250px', borderRight: '1px solid #ccc', padding: '15px' }}>
        <h3>📂 프로젝트 관리</h3>
        <input style={{ width: '100%', marginBottom: '10px' }} placeholder="새 프로젝트 제목" id="newTopic" />
        <button onClick={() => {
          const val = document.getElementById('newTopic').value;
          if (val) loadChat(val);
        }}>생성 / 불러오기</button>
        <hr />
        <h4>기존 프로젝트</h4>
        {topics.map(t => (
          <div key={t} style={{ cursor: 'pointer', padding: '5px 0' }} onClick={() => loadChat(t)}>📌 {t}</div>
        ))}
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        <h2>Project: {currentTopic}</h2>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1, border: '1px solid #eee', padding: '10px', height: '400px', overflowY: 'auto' }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{ marginBottom: '10px', textAlign: m.role === 'user' ? 'right' : 'left' }}>
                <strong>{m.role}: </strong>{m.content.replace(/\+{5}[\s\S]*?\+{5}/g, '[시뮬레이션 코드 생성 완료]')}
              </div>
            ))}
          </div>
          <div style={{ width: '300px' }}>
            <textarea style={{ width: '100%', height: '100px' }} value={inputPrompt} onChange={e => setInputPrompt(e.target.value)} placeholder="시뮬레이션 설명..." />
            <button style={{ width: '100%', padding: '10px' }} onClick={handleSend} disabled={loading}>{loading ? '생성 중...' : 'AI에게 요청'}</button>
          </div>
        </div>

        <hr style={{ margin: '20px 0' }} />

        <h3>🖥️ Simulation Preview</h3>
        {currentCode ? (
          <iframe srcDoc={renderP5Html(currentCode)} style={{ width: '100%', height: '500px', border: 'none' }} title="p5" />
        ) : <p>코드가 생성되면 이곳에 나타납니다.</p>}

        <h3>📝 시뮬레이션 일지</h3>
        <textarea style={{ width: '100%', height: '60px' }} placeholder="평가" value={evaluation} onChange={e => setEvaluation(e.target.value)} />
        <textarea style={{ width: '100%', height: '60px' }} placeholder="수정 계획" value={revisionPlan} onChange={e => setRevisionPlan(e.target.value)} />
        <button onClick={handleSaveLog}>일지 저장</button>
      </div>
    </div>
  );
}
