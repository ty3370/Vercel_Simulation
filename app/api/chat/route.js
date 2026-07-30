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
      return Response.json({ chat: rows.length > 0 ? rows[0].chat : [] });
    }

    if (action === 'send_chat') {
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: SYSTEM_PROMPT
      });

      const history = (messages || []).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const chatSession = model.startChat({ history });
      const result = await chatSession.sendMessage(userPrompt);
      const assistantText = result.response.text();

      const updatedMessages = [
        ...messages,
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
    return Response.json({ error: error.message }, { status: 500 });
  }
}
