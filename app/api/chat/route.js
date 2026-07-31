import { sql } from '@vercel/postgres';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

const SYSTEM_PROMPT = `
당신은 고등학생의 물리학 시뮬레이션 생성 도우미 역할을 합니다.
사용자 요청에 따라 p5.js에서 실행할 수 있는 자바스크립트 코드를 생성합니다.
[규칙]
1. 코드에 주석은 하나도 넣지 마세요.
2. 코드를 만들 때는 반드시 위아래로 '+++++' 표시를 넣어 코드 구간을 구분하세요.
3. 모든 코드는 반드시 다음과 같은 형식을 엄격히 지켜야 합니다:
+++++
(p5.js 코드 내용)
+++++
4. 코드를 제공하며 수정에 관한 아주 간략한 설명을 한 줄 이내로 짧게 제공하세요.
5. createCanvas()는 반드시 createCanvas(window.innerWidth, window.innerHeight) 형태로만 사용하세요.
`;

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, number, name, code, topic, userPrompt, messages } = body;

    if (action === 'get_topics') {
      const { rows } = await sql`
        SELECT DISTINCT topic FROM qna_unique 
        WHERE number = ${number} AND name = ${name} AND code = ${code};
      `;
      return Response.json({ topics: rows.map(r => r.topic) });
    }

    if (action === 'load_chat') {
      const { rows } = await sql`
        SELECT chat FROM qna_unique 
        WHERE number = ${number} AND name = ${name} AND code = ${code} AND topic = ${topic};
      `;
      let chatData = [];
      if (rows.length > 0 && rows[0].chat) {
        chatData = typeof rows[0].chat === 'string' ? JSON.parse(rows[0].chat) : rows[0].chat;
      }
      return Response.json({ chat: chatData });
    }

    if (action === 'send_chat') {
      if (!process.env.GOOGLE_API_KEY) {
        throw new Error('GOOGLE_API_KEY 환경 변수가 설정되지 않았습니다.');
      }

      // 안정적인 gemini-2.5-flash 모델 적용
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: SYSTEM_PROMPT
      });

      const rawMessages = Array.isArray(messages) ? messages : [];
      const contents = [];

      // 기존 대화 내역 포맷팅
      for (const m of rawMessages) {
        const role = m.role === 'assistant' ? 'model' : 'user';
        const text = String(m.content || '').trim();
        if (!text) continue;

        if (contents.length === 0 && role === 'model') continue;

        if (contents.length > 0 && contents[contents.length - 1].role === role) {
          contents[contents.length - 1].parts[0].text += `\n${text}`;
        } else {
          contents.push({ role, parts: [{ text }] });
        }
      }

      // 새로 들어온 유저 프롬프트 추가
      contents.push({ role: 'user', parts: [{ text: userPrompt }] });

      const result = await model.generateContent({ contents });
      const assistantText = result.response.text();

      const updatedMessages = [
        ...rawMessages,
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: assistantText }
      ];

      await sql`
        INSERT INTO qna_unique (number, name, code, topic, chat, time)
        VALUES (${number}, ${name}, ${code}, ${topic}, ${JSON.stringify(updatedMessages)}, NOW())
        ON CONFLICT (number, name, code, topic)
        DO UPDATE SET chat = EXCLUDED.chat, time = EXCLUDED.time;
      `;

      return Response.json({ responseText: assistantText, updatedMessages });
    }

    if (action === 'save_log') {
      await sql`
        INSERT INTO qna_unique (number, name, code, topic, chat, time)
        VALUES (${number}, ${name}, ${code}, ${topic}, ${JSON.stringify(messages)}, NOW())
        ON CONFLICT (number, name, code, topic)
        DO UPDATE SET chat = EXCLUDED.chat, time = EXCLUDED.time;
      `;
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[API Error Detail]:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
