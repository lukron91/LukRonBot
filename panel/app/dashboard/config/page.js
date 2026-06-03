"use client";
import { Suspense, useEffect, useState } from "react";

function ConfigContent() {
  const [guildId, setGuildId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const guild = params.get('guild');
    
    if (!guild) {
      window.location.href = '/dashboard';
      return;
    }
    
    setGuildId(guild);

    fetch(`/api/config?guildId=${guild}`)
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Config load error:', err);
        window.location.href = '/dashboard';
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId, config }),
      });
      
      if (res.ok) {
        alert('Zapisano konfigurację!');
      } else {
        alert('Błąd zapisu!');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Błąd zapisu!');
    } finally {
      setSaving(false);
    }
  };

  const updateModule = (module, value) => {
    setConfig(prev => ({
      ...prev,
      modules: { ...prev.modules, [module]: value }
    }));
  };

  const updateTicket = (key, value) => {
    setConfig(prev => ({
      ...prev,
      tickets: { ...prev.tickets, [key]: value }
    }));
  };

  const updateAutomod = (key, value) => {
    setConfig(prev => ({
      ...prev,
      automod: { ...prev.automod, [key]: value }
    }));
  };

  const addBadWord = () => {
    const word = prompt('Wpisz słowo do zablokowania:');
    if (word && !config.automod.badWords.includes(word)) {
      updateAutomod('badWords', [...config.automod.badWords, word]);
    }
  };

  const removeBadWord = (word) => {
    updateAutomod('badWords', config.automod.badWords.filter(w => w !== word));
  };

  if (loading || !config) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#1a1d20", color: "#fff" }}>
        <p>Ładowanie konfiguracji...</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#1a1d20", minHeight: "100vh", color: "#fff", padding: "32px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "32px", marginBottom: "24px", color: "#5865f2" }}>Kon
