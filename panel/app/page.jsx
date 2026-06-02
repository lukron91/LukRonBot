export default function Dashboard() {
  const mockServers = [
    { id: '1', name: 'Mój Super Serwer', canManage: true },
    { id: '2', name: 'Serwer Testowy', canManage: false },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px', color: 'white' }}>Panel Zarządzania</h1>
      
      <div style={{ backgroundColor: '#23272A', padding: '24px', borderRadius: '8px', border: '1px solid #333', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: 'white' }}>Twoje serwery</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
          {mockServers.map((server) => (
            <div key={server.id} style={{ backgroundColor: '#2C2F33', padding: '16px', borderRadius: '8px', border: '1px solid #444' }}>
              <h3 style={{ fontWeight: 'bold', marginBottom: '4px', color: 'white' }}>{server.name}</h3>
              <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '12px' }}>
                {server.canManage ? 'Masz uprawnienia zarządcy' : 'Brak uprawnień'}
              </p>
              
              {server.canManage ? (
                <button style={{ width: '100%', backgroundColor: '#5865F2', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>
                  Zarządzaj botem
                </button>
              ) : (
                <button disabled style={{ width: '100%', backgroundColor: '#444', color: '#888', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'not-allowed' }}>
                  Brak dostępu
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: '#23272A', padding: '24px', borderRadius: '8px', border: '1px solid #333' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: 'white' }}>Szybkie akcje</h2>
        <p style={{ color: '#aaa', marginBottom: '16px' }}>Dodaj bota do nowego serwera, aby rozpocząć konfigurację.</p>
        <a 
          href="https://discord.com/api/oauth2/authorize?client_id=TWOJE_CLIENT_ID&permissions=8&scope=bot%20applications.commands" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ display: 'inline-block', backgroundColor: '#23a559', color: 'white', padding: '12px 24px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' }}
        >
          + Dodaj bota do serwera
        </a>
      </div>
    </div>
  )
}
