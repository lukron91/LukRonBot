"use client";
import { useEffect, useState } from "react";
import { FiDatabase, FiServer, FiGlobe, FiTerminal, FiRefreshCw, FiChevronRight, FiChevronDown, FiFolder, FiTable } from 'react-icons/fi';

// Mapowanie tabel na kategorie (foldery)
const TABLE_CATEGORIES = {
  'Konfiguracja': ['config', 'guild_config'],
  'Moderacja': ['moderation_settings', 'punishments'],
  'Aktywność': ['activities'],
  'Powitania': ['welcome_settings'],
  'Role': ['role_groups'],
  'Ticketi': ['tickets'],
};

function getCategory(tableName) {
  for (const [cat, tables] of Object.entries(TABLE_CATEGORIES)) {
    if (tables.includes(tableName)) return cat;
  }
  return 'Inne';
}

export default function DatabaseExplorer({ guildId, accentColor }) {
  const [databases, setDatabases] = useState([]);
  const [guildNames, setGuildNames] = useState({});
  const [selectedDb, setSelectedDb] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [customQuery, setCustomQuery] = useState("");
  const [queryResult, setQueryResult] = useState(null);
  const [globalInfo, setGlobalInfo] = useState(null);
  const [expandedServers, setExpandedServers] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const limit = 50;

  useEffect(() => {
    fetch('/api/proxy/api/database/list')
      .then(r => r.json())
      .then(d => { if (d.success) setDatabases(d.databases); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/proxy/api/guilds')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const map = {};
          d.guilds.forEach(g => { map[g.id] = g.name; });
          setGuildNames(map);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (databases.length === 0) return;
    const globalDb = databases.find(d => d.name.includes('global'));
    if (globalDb) {
      fetch('/api/proxy/api/database/global/tables')
        .then(r => r.json())
        .then(d => {
          if (d.success && d.tables.includes('global_config')) {
            fetch('/api/proxy/api/database/global/global_config?limit=50&offset=0')
              .then(r => r.json())
              .then(d2 => {
                if (d2.success) setGlobalInfo(d2);
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [databases]);

  useEffect(() => {
    if (!selectedDb) { setTables([]); setSelectedTable(null); return; }
    const gId = selectedDb.includes('_') ? selectedDb.split('_').slice(1).join('_') : selectedDb;
    fetch(`/api/proxy/api/database/${gId}/tables`)
      .then(r => r.json())
      .then(d => { if (d.success) setTables(d.tables); })
      .catch(() => {});
  }, [selectedDb]);

  useEffect(() => {
    if (!selectedTable || !selectedDb) return;
    loadTableData();
  }, [selectedTable, selectedDb, offset]);

  function loadTableData() {
    setLoading(true);
    const gId = selectedDb.includes('_') ? selectedDb.split('_').slice(1).join('_') : selectedDb;
    fetch(`/api/proxy/api/database/${gId}/${selectedTable}?limit=${limit}&offset=${offset}`)
      .then(r => r.json())
      .then(d => { if (d.success) setTableData(d); else setTableData(null); })
      .catch(() => setTableData(null))
      .finally(() => setLoading(false));
  }

  function runQuery() {
    if (!customQuery.trim() || !selectedDb) return;
    setLoading(true);
    const gId = selectedDb.includes('_') ? selectedDb.split('_').slice(1).join('_') : selectedDb;
    fetch('/api/proxy/api/database/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId: gId, sql: customQuery }),
    })
      .then(r => r.json())
      .then(d => setQueryResult(d))
      .catch(() => setQueryResult({ error: 'Błąd zapytania' }))
      .finally(() => setLoading(false));
  }

  function getGuildName(dbName) {
    const gId = dbName.includes('_') ? dbName.split('_').slice(1).join('_') : dbName;
    if (gId === 'global') return '🌐 Globalne';
    return guildNames[gId] || gId;
  }

  function getGuildId(dbName) {
    return dbName.includes('_') ? dbName.split('_').slice(1).join('_') : dbName;
  }

  function toggleServer(dbName) {
    setExpandedServers(prev => ({ ...prev, [dbName]: !prev[dbName] }));
  }

  function toggleCategory(cat) {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  }

  // Grupuj tabele według kategorii
  const categorizedTables = {};
  tables.forEach(t => {
    const cat = getCategory(t);
    if (!categorizedTables[cat]) categorizedTables[cat] = [];
    categorizedTables[cat].push(t);
  });

  const dbEnv = selectedDb?.startsWith('test') ? 'TEST' : selectedDb?.startsWith('main') ? 'MAIN' : '—';

  return (
    <div className="section">
      <h2 style={{ color: accentColor, display: 'flex', alignItems: 'center', gap: 8 }}>
        <FiDatabase /> Baza danych
        {selectedDb && <span className="db-env-badge">{dbEnv}</span>}
      </h2>

      {/* --- GLOBALNE DANE TECHNICZNE --- */}
      {globalInfo && (
        <div className="db-global-section">
          <h3 style={{ color: accentColor, fontSize: '0.9rem', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiServer /> Globalna konfiguracja bota
          </h3>
          <div className="db-global-grid">
            {globalInfo.rows?.map((row, i) => (
              <div key={i} className="db-global-card">
                <span className="db-global-key">{row.key}</span>
                <span className="db-global-val">{formatValue(row.value)}</span>
                <span className="db-global-time">{row.updated_at}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- UKŁAD DWUKOLUMNOWY --- */}
      <div className="db-layout">
        {/* LEWA KOLUMNA — DRZEWO */}
        <div className="db-tree-section">
          <h3 style={{ color: accentColor, fontSize: '0.9rem', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiGlobe /> Serwery
          </h3>
          <div className="db-tree">
            {databases
              .filter(db => db.name !== 'global')
              .map(db => {
                const isExpanded = expandedServers[db.name];
                const isActive = selectedDb === db.name;
                const gId = getGuildId(db.name);
                return (
                  <div key={db.name} className="db-tree-item">
                    <div
                      className={`db-tree-node ${isActive ? 'active' : ''}`}
                      onClick={() => { toggleServer(db.name); setSelectedDb(db.name); setSelectedTable(null); setTableData(null); setOffset(0); setQueryResult(null); }}
                      style={{ borderLeftColor: isActive ? accentColor : 'transparent' }}
                    >
                      {isExpanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                      <FiFolder size={16} className="db-folder-icon" />
                      <div className="db-tree-node-info">
                        <span className="db-tree-name">{getGuildName(db.name)}</span>
                        <span className="db-tree-id">{gId}</span>
                      </div>
                      <span className="db-tree-meta">
                        <span className="db-tree-env">{db.name.startsWith('test') ? 'TEST' : 'MAIN'}</span>
                        <span className="db-tree-size">{(db.size / 1024).toFixed(1)} KB</span>
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="db-tree-children">
                        {/* Kategorie (foldery) */}
                        {Object.entries(categorizedTables).map(([cat, catTables]) => {
                          const isCatExpanded = expandedCategories[cat] !== false;
                          return (
                            <div key={cat} className="db-tree-category">
                              <div
                                className="db-tree-category-header"
                                onClick={() => toggleCategory(cat)}
                              >
                                {isCatExpanded ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
                                <FiFolder size={14} className="db-cat-icon" />
                                <span>{cat}</span>
                                <span className="db-cat-count">{catTables.length}</span>
                              </div>
                              {isCatExpanded && (
                                <div className="db-tree-category-children">
                                  {catTables.map(t => (
                                    <div
                                      key={t}
                                      className={`db-tree-leaf ${selectedTable === t && selectedDb === db.name ? 'active' : ''}`}
                                      onClick={() => { setSelectedDb(db.name); setSelectedTable(t); setOffset(0); setQueryResult(null); }}
                                      style={{ color: selectedTable === t && selectedDb === db.name ? accentColor : undefined }}
                                    >
                                      <FiTable size={13} />
                                      {t}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {tables.length === 0 && (
                          <div className="db-tree-leaf" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                            Brak tabel
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            {databases.filter(db => db.name !== 'global').length === 0 && (
              <div className="db-empty" style={{ padding: 16, textAlign: 'center' }}>Brak baz danych serwerów</div>
            )}
          </div>
        </div>

        {/* PRAWA KOLUMNA — DANE */}
        <div className="db-data-section">
          <div className="db-query-bar">
            <input
              type="text"
              placeholder="SELECT * FROM table WHERE ..."
              value={customQuery}
              onChange={e => setCustomQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runQuery()}
              className="db-query-input"
            />
            <button onClick={runQuery} className="btn-base btn-standard" disabled={loading} style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}>
              <FiTerminal /> Wykonaj
            </button>
            <button onClick={() => { setCustomQuery(''); setQueryResult(null); }} className="btn-base btn-dnd" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}>
              Wyczyść
            </button>
          </div>

          {queryResult && (
            <div className="db-query-result">
              {queryResult.error ? (
                <div className="db-error">{queryResult.error}</div>
              ) : (
                <TableView data={queryResult.rows} accentColor={accentColor} />
              )}
            </div>
          )}

          {tableData && !queryResult && (
            <div className="db-table-view">
              <div className="db-table-header">
                <div className="db-table-title">
                  <FiTable /> {selectedTable}
                  <span className="db-row-count">({tableData.total} wierszy)</span>
                </div>
                <button onClick={() => loadTableData()} className="btn-base btn-standard" style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}>
                  <FiRefreshCw /> Odśwież
                </button>
              </div>

              <div className="db-columns-info">
                {tableData.columns?.map(col => (
                  <span key={col.name} className="db-column-badge" style={{ borderColor: accentColor, color: accentColor }}>
                    {col.name}: {col.type}
                  </span>
                ))}
              </div>

              <div className="db-table-scroll">
                <TableView data={tableData.rows} accentColor={accentColor} />
              </div>

              <div className="db-pagination">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  className="btn-base btn-standard"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
                >Poprzednie</button>
                <span>Wiersze {offset + 1}–{Math.min(offset + limit, tableData.total)} z {tableData.total}</span>
                <button
                  disabled={offset + limit >= tableData.total}
                  onClick={() => setOffset(offset + limit)}
                  className="btn-base btn-standard"
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
                >Następne</button>
              </div>
            </div>
          )}

          {!selectedTable && !queryResult && !loading && (
            <div className="db-welcome">
              <FiDatabase size={48} style={{ color: accentColor, opacity: 0.5 }} />
              <h3 style={{ margin: '8px 0 4px', color: 'var(--text-color)' }}>Eksplorator bazy danych</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                Wybierz tabelę z drzewa po lewej lub wpisz własne zapytanie SQL.
              </p>
            </div>
          )}

          {loading && <div className="db-loading">Ładowanie...</div>}
        </div>
      </div>

      <style jsx>{`
        .db-global-section {
          background: var(--bg-color);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .db-global-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 8px;
        }
        .db-global-card {
          background: var(--surface-color);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .db-global-key { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 600; }
        .db-global-val { font-size: 0.85rem; color: var(--text-color); font-family: monospace; word-break: break-all; }
        .db-global-time { font-size: 0.65rem; color: var(--text-muted); }

        .db-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 16px;
          align-items: start;
        }

        .db-tree-section {
          background: var(--bg-color);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 16px;
        }
        .db-tree {
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-height: 500px;
          overflow-y: auto;
        }
        .db-tree-item { display: flex; flex-direction: column; }
        .db-tree-node {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 6px;
          cursor: pointer;
          border-left: 3px solid transparent;
          font-size: 0.85rem;
          transition: all 0.15s;
        }
        .db-tree-node:hover { background: var(--hover-bg); }
        .db-tree-node.active { background: var(--hover-bg); font-weight: 600; }
        .db-folder-icon { color: var(--text-muted); flex-shrink: 0; }
        .db-tree-node-info { display: flex; flex-direction: column; min-width: 0; flex: 1; }
        .db-tree-name { font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .db-tree-id { font-size: 0.6rem; color: var(--text-muted); font-family: monospace; }
        .db-tree-meta { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .db-tree-size { font-size: 0.65rem; color: var(--text-muted); }
        .db-tree-env { font-size: 0.55rem; padding: 1px 5px; border-radius: 3px; background: var(--accent); color: #fff; font-weight: 600; }

        .db-tree-children { margin-left: 24px; display: flex; flex-direction: column; gap: 1px; }
        .db-tree-leaf {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          color: var(--text-color);
          transition: all 0.15s;
        }
        .db-tree-leaf:hover { background: var(--hover-bg); }
        .db-tree-leaf.active { background: var(--hover-bg); font-weight: 600; }

        .db-tree-category { display: flex; flex-direction: column; }
        .db-tree-category-header {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.78rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .db-tree-category-header:hover { background: var(--hover-bg); }
        .db-cat-icon { color: var(--text-muted); }
        .db-cat-count { font-size: 0.65rem; color: var(--text-muted); margin-left: auto; }
        .db-tree-category-children { margin-left: 20px; display: flex; flex-direction: column; gap: 1px; }

        .db-data-section {
          background: var(--bg-color);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 16px;
          min-height: 300px;
          overflow: hidden;
        }
        .db-query-bar { display: flex; gap: 8px; margin-bottom: 12px; }
        .db-query-input {
          flex: 1;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          background: var(--surface-color);
          color: var(--text-color);
          font-family: monospace;
          font-size: 0.85rem;
        }
        .db-query-result { border-top: 1px solid var(--border-color); padding-top: 12px; }
        .db-error { color: #ef4444; font-size: 0.85rem; padding: 8px; background: rgba(239,68,68,0.1); border-radius: 6px; }
        .db-table-view { display: flex; flex-direction: column; gap: 12px; }
        .db-table-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
        .db-table-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.95rem; }
        .db-row-count { font-weight: 400; font-size: 0.8rem; color: var(--text-muted); }
        .db-columns-info { display: flex; flex-wrap: wrap; gap: 6px; }
        .db-column-badge { font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; border: 1px solid; font-family: monospace; }
        .db-pagination { display: flex; justify-content: center; align-items: center; gap: 16px; padding: 12px 0; font-size: 0.85rem; color: var(--text-muted); }
        .db-table-scroll { overflow-x: auto; max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; }
        .db-loading { text-align: center; padding: 40px; color: var(--text-muted); }
        .db-welcome { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--text-muted); gap: 4px; min-height: 250px; }
        .db-empty { color: var(--text-muted); }
        .db-env-badge { font-size: 0.65rem; padding: 2px 8px; border-radius: 4px; background: var(--accent); color: #fff; font-weight: 600; text-transform: uppercase; }
      `}</style>
    </div>
  );
}

function TableView({ data, accentColor }) {
  if (!data || data.length === 0) return <div className="db-empty" style={{ textAlign: 'center', padding: 20 }}>Brak danych</div>;
  const columns = Object.keys(data[0]);
  return (
    <div className="db-table-wrap">
      {data.map((row, i) => (
        <div key={i} className="db-record-card">
          <div className="db-record-header" style={{ color: accentColor }}>
            Rekord #{i + 1}
          </div>
          <div className="db-record-rows">
            {columns.map(col => (
              <div key={col} className="db-record-row">
                <span className="db-record-key">{col}</span>
                <span className="db-record-val">{formatValue(row[col])}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <style jsx>{`
        .db-table-wrap { display: flex; flex-direction: column; gap: 12px; }
        .db-record-card {
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
        }
        .db-record-header {
          padding: 6px 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background: var(--surface-color);
          border-bottom: 1px solid var(--border-color);
        }
        .db-record-rows { display: flex; flex-direction: column; }
        .db-record-row {
          display: grid;
          grid-template-columns: 200px 1fr;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.8rem;
          font-family: monospace;
        }
        .db-record-row:last-child { border-bottom: none; }
        .db-record-key {
          padding: 6px 12px;
          color: var(--text-muted);
          font-weight: 600;
          background: var(--bg-color);
          border-right: 1px solid var(--border-color);
          white-space: nowrap;
        }
        .db-record-val {
          padding: 6px 12px;
          color: var(--text-color);
          word-break: break-all;
        }
      `}</style>
    </div>
  );
}

function formatValue(val) {
  if (val === null || val === undefined) return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>NULL</span>;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}
