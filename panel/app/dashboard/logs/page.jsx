"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from '@/lib/theme-context';
import { FiDatabase, FiTable, FiChevronRight, FiChevronDown, FiSearch, FiRefreshCw } from 'react-icons/fi';
import LoadingScreen from '@/components/LoadingScreen';

export default function DatabaseExplorer() {
  const { accentColor } = useTheme();
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guild");

  const [databases, setDatabases] = useState([]);
  const [selectedDb, setSelectedDb] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [customQuery, setCustomQuery] = useState("");
  const [queryResult, setQueryResult] = useState(null);
  const limit = 50;

  // Załaduj listę baz
  useEffect(() => {
    fetch('/api/proxy/api/database/list')
      .then(r => r.json())
      .then(d => { if (d.success) setDatabases(d.databases); })
      .catch(() => {});
  }, []);

  // Wybierz bazę — automatycznie dla obecnego serwera
  useEffect(() => {
    if (guildId) {
      const dbName = databases.find(d => d.name.includes(guildId));
      if (dbName) setSelectedDb(dbName.name);
    }
  }, [guildId, databases]);

  // Załaduj tabele po wybraniu bazy
  useEffect(() => {
    if (!selectedDb) { setTables([]); setSelectedTable(null); return; }
    const gId = selectedDb.includes('_') ? selectedDb.split('_').slice(1).join('_') : selectedDb;
    fetch(`/api/proxy/api/database/${gId}/tables`)
      .then(r => r.json())
      .then(d => { if (d.success) setTables(d.tables); })
      .catch(() => {});
  }, [selectedDb]);

  // Załaduj dane tabeli
  useEffect(() => {
    if (!selectedTable || !selectedDb) return;
    loadTableData();
  }, [selectedTable, offset]);

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

  const dbName = selectedDb ? selectedDb.replace(/^(test|main)_/, '') : '—';

  return (
    <div className="db-explorer">
      <div className="db-explorer-header">
        <h2><FiDatabase style={{ marginRight: 8 }} />Eksplorator bazy danych</h2>
        <span className="db-env-badge">{selectedDb?.startsWith('test') ? 'TEST' : selectedDb?.startsWith('main') ? 'MAIN' : ''}</span>
      </div>

      <div className="db-explorer-layout">
        {/* Panel lewy — lista baz i tabel */}
        <div className="db-sidebar">
          <div className="db-section-title">BAZY DANYCH</div>
          <div className="db-list">
            {databases.map(db => (
              <div
                key={db.name}
                className={`db-item ${selectedDb === db.name ? 'active' : ''}`}
                onClick={() => { setSelectedDb(db.name); setSelectedTable(null); setTableData(null); setOffset(0); }}
                style={{ borderLeftColor: selectedDb === db.name ? accentColor : 'transparent' }}
              >
                <FiDatabase size={14} />
                <div className="db-item-info">
                  <span className="db-item-name">{db.name.replace(/^(test|main)_/, '')}</span>
                  <span className="db-item-size">{(db.size / 1024).toFixed(1)} KB</span>
                </div>
              </div>
            ))}
            {databases.length === 0 && <div className="db-empty">Brak baz danych</div>}
          </div>

          {tables.length > 0 && (
            <>
              <div className="db-section-title" style={{ marginTop: 16 }}>TABELE</div>
              <div className="db-list">
                {tables.map(t => (
                  <div
                    key={t}
                    className={`db-item ${selectedTable === t ? 'active' : ''}`}
                    onClick={() => { setSelectedTable(t); setOffset(0); setQueryResult(null); }}
                    style={{ borderLeftColor: selectedTable === t ? accentColor : 'transparent' }}
                  >
                    <FiTable size={14} />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Panel prawy — podgląd danych */}
        <div className="db-content">
          {!selectedTable && !customQuery && (
            <div className="db-welcome">
              <FiDatabase size={48} style={{ color: accentColor, opacity: 0.5 }} />
              <h3>Eksplorator bazy SQLite</h3>
              <p>Wybierz bazę danych i tabelę po lewej stronie, aby przeglądać dane.</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Baza: {dbName}</p>
            </div>
          )}

          {/* Własne zapytanie SQL */}
          <div className="db-query-bar">
            <input
              type="text"
              placeholder="SELECT * FROM table WHERE ..."
              value={customQuery}
              onChange={e => setCustomQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runQuery()}
              className="db-query-input"
            />
            <button onClick={runQuery} className="db-query-btn" style={{ background: accentColor }} disabled={loading}>
              <FiSearch /> Wykonaj
            </button>
            <button onClick={() => { setCustomQuery(''); setQueryResult(null); }} className="db-query-btn db-query-btn-clear">
              Wyczyść
            </button>
          </div>

          {/* Wynik zapytania */}
          {queryResult && (
            <div className="db-query-result">
              {queryResult.error ? (
                <div className="db-error">{queryResult.error}</div>
              ) : (
                <TableView data={queryResult.rows} accentColor={accentColor} />
              )}
            </div>
          )}

          {/* Dane tabeli */}
          {tableData && !queryResult && (
            <div className="db-table-view">
              <div className="db-table-header">
                <div className="db-table-title">
                  <FiTable /> {selectedTable}
                  <span className="db-row-count">({tableData.total} wierszy)</span>
                </div>
                <div className="db-table-actions">
                  <button onClick={() => loadTableData()} className="db-refresh-btn" style={{ color: accentColor }}>
                    <FiRefreshCw /> Odśwież
                  </button>
                </div>
              </div>

              {/* Kolumny */}
              <div className="db-columns-info">
                {tableData.columns.map(col => (
                  <span key={col.name} className="db-column-badge" style={{ borderColor: accentColor, color: accentColor }}>
                    {col.name}: {col.type}
                  </span>
                ))}
              </div>

              {/* Tabela */}
              <TableView data={tableData.rows} accentColor={accentColor} />

              {/* Paginacja */}
              <div className="db-pagination">
                <button
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  className="db-page-btn"
                >
                  Poprzednie
                </button>
                <span>Wiersze {offset + 1}–{Math.min(offset + limit, tableData.total)} z {tableData.total}</span>
                <button
                  disabled={offset + limit >= tableData.total}
                  onClick={() => setOffset(offset + limit)}
                  className="db-page-btn"
                >
                  Następne
                </button>
              </div>
            </div>
          )}

          {loading && <LoadingScreen />}
        </div>
      </div>

      <style jsx>{`
        .db-explorer { padding: 1.5rem; height: calc(100vh - 200px); display: flex; flex-direction: column; }
        .db-explorer-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .db-explorer-header h2 { margin: 0; font-size: 1.3rem; display: flex; align-items: center; }
        .db-env-badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; background: var(--accent); color: #fff; font-weight: 600; text-transform: uppercase; }
        .db-explorer-layout { display: flex; gap: 16px; flex: 1; overflow: hidden; }
        .db-sidebar { width: 280px; flex-shrink: 0; overflow-y: auto; background: var(--card-bg); border-radius: 8px; padding: 12px; border: 1px solid var(--border-color); }
        .db-section-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 8px; font-weight: 600; }
        .db-list { display: flex; flex-direction: column; gap: 2px; }
        .db-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; cursor: pointer; border-left: 3px solid transparent; font-size: 0.85rem; color: var(--text-color); transition: all 0.15s; }
        .db-item:hover { background: var(--hover-bg); }
        .db-item.active { background: var(--hover-bg); font-weight: 600; }
        .db-item-info { display: flex; flex-direction: column; gap: 1px; overflow: hidden; }
        .db-item-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .db-item-size { font-size: 0.7rem; color: var(--text-muted); }
        .db-empty { font-size: 0.85rem; color: var(--text-muted); padding: 8px; }
        .db-content { flex: 1; overflow-y: auto; background: var(--card-bg); border-radius: 8px; padding: 16px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 12px; }
        .db-welcome { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; text-align: center; color: var(--text-muted); gap: 8px; }
        .db-welcome h3 { margin: 0; color: var(--text-color); }
        .db-welcome p { margin: 0; }
        .db-query-bar { display: flex; gap: 8px; }
        .db-query-input { flex: 1; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-color); font-family: monospace; font-size: 0.85rem; }
        .db-query-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: none; border-radius: 6px; color: #fff; cursor: pointer; font-size: 0.85rem; white-space: nowrap; }
        .db-query-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .db-query-btn-clear { background: var(--border-color); color: var(--text-color); }
        .db-query-result { border-top: 1px solid var(--border-color); padding-top: 12px; }
        .db-error { color: #ef4444; font-size: 0.85rem; padding: 8px; background: rgba(239,68,68,0.1); border-radius: 6px; }
        .db-table-view { display: flex; flex-direction: column; gap: 12px; }
        .db-table-header { display: flex; justify-content: space-between; align-items: center; }
        .db-table-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.95rem; }
        .db-row-count { font-weight: 400; font-size: 0.8rem; color: var(--text-muted); }
        .db-refresh-btn { display: flex; align-items: center; gap: 4px; background: none; border: none; cursor: pointer; font-size: 0.8rem; }
        .db-columns-info { display: flex; flex-wrap: wrap; gap: 6px; }
        .db-column-badge { font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; border: 1px solid; font-family: monospace; }
        .db-pagination { display: flex; justify-content: center; align-items: center; gap: 16px; padding: 12px 0; font-size: 0.85rem; color: var(--text-muted); }
        .db-page-btn { padding: 6px 14px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-color); color: var(--text-color); cursor: pointer; font-size: 0.85rem; }
        .db-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .db-loading { text-align: center; padding: 20px; color: var(--text-muted); }
      `}</style>
    </div>
  );
}

function TableView({ data, accentColor }) {
  if (!data || data.length === 0) return <div className="db-empty" style={{ textAlign: 'center', padding: 20 }}>Brak danych</div>;
  const columns = Object.keys(data[0]);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="db-data-table">
        <thead>
          <tr>
            {columns.map(col => <th key={col} style={{ color: accentColor }}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map(col => (
                <td key={col}>{formatValue(row[col])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <style jsx>{`
        .db-data-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; font-family: monospace; }
        .db-data-table th, .db-data-table td { padding: 6px 10px; text-align: left; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
        .db-data-table th { position: sticky; top: 0; background: var(--card-bg); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; }
        .db-data-table tr:hover td { background: var(--hover-bg); }
      `}</style>
    </div>
  );
}

function formatValue(val) {
  if (val === null || val === undefined) return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>NULL</span>;
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}
