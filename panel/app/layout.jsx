export const metadata = {
  title: 'LukRon Bot - Panel',
  description: 'Zarządzaj swoim botem Discord',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body style={{ backgroundColor: '#1a1d20', color: '#ffffff', fontFamily: 'sans-serif', margin: 0, minHeight: '100vh' }}>
        <nav style={{ borderBottom: '1px solid #333', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#23272A' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#5865F2' }}>LukRon Bot</div>
          <button style={{ backgroundColor: '#5865F2', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
            Zaloguj przez Discord
          </button>
        </nav>
        <main style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
