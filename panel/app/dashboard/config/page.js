"use client";
import { Suspense, useEffect, useState } from "react";

function ConfigContent() {
  const [guildId, setGuildId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const currentUrl = window.location.href;
    alert('URL: ' + currentUrl);
    
    const search = window.location.search;
    alert('Search: ' + search);
    
    const params = new URLSearchParams(search);
    const guild = params.get('guild');
    alert('Guild from URL: ' + guild);
    
    if (!guild) {
      alert('NO GUILD! Redirecting to dashboard');
      window.location.href = '/dashboard';
      return;
    }
    
    alert('Guild ID: ' + guild);
    setGuildId(guild);

    fetch('/api/config?guildId=' + guild)
      .then(res => res.json())
      .then(data => {
        alert('Data received!');
        setConfig(data);
        setLoading(false);
      })
      .catch(err => {
        alert('Error: ' + err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{color: 'white'}}>Ładowanie...</div>;
  }

  if (!config) {
    return <div style={{color: 'white'}}>Brak config</div>;
  }

  return (
    <div style={{padding: '20px', color: 'white'}}>
      <h1>Config dla serwera: {guildId}</h1>
      <pre>{JSON.stringify(config, null, 2)}</pre>
    </div>
  );
}

export default function ConfigPage() {
  return (
    <Suspense fallback={<div style={{color: 'white'}}>Loading...</div>}>
      <ConfigContent />
    </Suspense>
  );
}
