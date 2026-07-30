export const metadata = {
  title: '물리학 시뮬레이션 제작 AI',
  description: 'p5.js 생성 도우미',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: 'sans-serif' }}>{children}</body>
    </html>
  );
}
