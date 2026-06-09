"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from '@/lib/theme-context';
import {
  FiUsers, FiHash, FiShield, FiUserPlus, FiUserMinus, FiActivity,
  FiTrendingUp, FiMessageSquare, FiAward
} from 'react-icons/fi';

export default function DashboardHome() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guild");
  const { accentColor } = useTheme();

  const [stats, setStats] = useState({ members: null, channels: null, roles: null });
  const [activity, setActivity] = useState({
    joinedToday: null, leftToday: null, active7days: null,
    activityTrend: [], topChannels: [], topUsers: []
  });
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    if (!guildId) return;

    fetch('/api/proxy/api/guilds/' + guildId + '/stats')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setStats(data))
      .catch(() => setStats({ members: "—", channels: "—", roles: "—" }));

    Promise.all([
      fetch('/api/proxy/api/guilds/' + guildId + '/activity/joined-today').then(r => r.json()).catch(() => ({})),
      fetch('/api/proxy/api/guilds/' + guildId + '/activity/left-today').then(r => r.json()).catch(() => ({})),
      fetch('/api/proxy/api/guilds/' + guildId + '/activity/active-7days').then(r => r.json()).catch(() => ({})),
      fetch('/api/proxy/api/guilds/' + guildId + '/activity/trend').then(r => r.json()).catch(() => ({})),
      fetch('/api/proxy/api/guilds/' + guildId + '/activity/top-channels').then(r => r.json()).catch(() => ({})),
      fetch('/api/proxy/api/guilds/' + guildId + '/activity/top-users').then(r => r.json()).catch(() => ({})),
    ]).then(([joined, left, active, trend, channels, users]) => {
      setActivity({
        joinedToday: joined.count ?? 0,
        leftToday: left.count ?? 0,
        active7days: active.count ?? 0,
        activityTrend: trend.trend ?? [],
        topChannels: channels.channels ?? [],
        topUsers: users.users ?? [],
      });
    }).catch(() => {}).finally(() => {
      setLoading(false);
      setTrendLoading(false);
    });
  }, [guildId]);

  if (!guildId) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      Wybierz serwer z lewego menu.
    </div>
  );

  const isLoading = stats.members === null;
  const maxTrend = activity.activityTrend.length > 0
    ? Math.max(...activity.activityTrend.map(d => d.count))
    : 0;

  return (
    <div className="dashboard-home">
      <div className="stats-grid">
        {[
          { icon: <FiUsers />,      label: 'Członkowie',         val: stats.members },
          { icon: <FiHash />,       label: 'Kanały',             val: stats.channels },
          { icon: <FiShield />,     label: 'Role',               val: stats.roles },
          { icon: <FiUserPlus />,   label: 'Dołączenia dzisiaj', val: activity.joinedToday },
          { icon: <FiUserMinus />,  label: 'Opuściły dzisiaj',   val: activity.leftToday },
          { icon: <FiActivity />,   label: 'Aktywni (7 dni)',    val: activity.active7days },
        ].map((item, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: accentColor + '20', color: accentColor }}>
              {item.icon}
            </div>
            <div className="stat-content">
              <div className="stat-title">{item.label}</div>
              <div className="stat-value">{isLoading ? '—' : (item.val ?? '—')}</div>
            </div>
          </div>
        ))}
      </div>

      {!trendLoading && activity.activityTrend.length > 0 && (
        <div className="trend-section">
          <div className="section-header" style={{ color: accentColor }}>
            <FiTrendingUp /> Trend aktywności (ostatnie 7 dni)
          </div>
          <div className="trend-bars">
            {activity.activityTrend.map((day, idx) => (
              <div key={idx} className="trend-item">
                <div className="trend-label">{day.label}</div>
                <div className="trend-bar-container">
                  <div className="trend-bar" style={{ width: (maxTrend ? (day.count / maxTrend) * 100 : 0) + '%', background: accentColor }} />
                </div>
                <div className="trend-count">{day.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="two-columns">
        <div className="card-list">
          <div className="section-header" style={{ color: accentColor }}>
            <FiMessageSquare /> Najbardziej aktywne kanały
          </div>
          {activity.topChannels.length === 0 ? (
            <div className="empty-list">Brak danych</div>
          ) : activity.topChannels.map((ch, idx) => (
            <div key={idx} className="list-item">
              <span className="list-rank" style={{ color: accentColor }}>#{idx + 1}</span>
              <span className="list-name">#{ch.name}</span>
              <span className="list-value">{ch.count} wiadomości</span>
            </div>
          ))}
        </div>

        <div className="card-list">
          <div className="section-header" style={{ color: accentColor }}>
            <FiAward /> Top użytkownicy
          </div>
          {activity.topUsers.length === 0 ? (
            <div className="empty-list">Brak danych</div>
          ) : activity.topUsers.map((user, idx) => (
            <div key={idx} className="list-item">
              <span className="list-rank" style={{ color: accentColor }}>{idx + 1}</span>
              <div className="list-avatar">
                {user.avatar
                  ? <img src={'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.png'} alt="" />
                  : <div className="avatar-placeholder" style={{ background: accentColor }}>{(user.username || 'U').charAt(0).toUpperCase()}</div>
                }
              </div>
              <span className="list-name">{user.username || 'Nieznany'}</span>
              <span className="list-value">{user.count} wiadomości</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .dashboard-home {
          padding: 1.5rem;
          max-width: 1100px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .stat-card {
          background: rgba(var(--surface-rgb), var(--tab-opacity));
          border-radius: var(--border-radius);
          padding: 1.25rem;
          border: 1px solid var(--border-color);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 1rem;
          backdrop-filter: blur(12px);
        }
        .stat-card:hover {
          border-color: var(--accent-color);
          transform: translateY(-2px);
        }
        .stat-icon {
          font-size: 1.5rem;
          width: 48px;
          height: 48px;
          border-radius: var(--border-radius);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stat-content { flex: 1; }
        .stat-title {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-muted);
          margin-bottom: 0.25rem;
        }
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-color);
        }
        .trend-section {
          background: rgba(var(--surface-rgb), var(--tab-opacity));
          border-radius: var(--border-radius);
          padding: 1.2rem;
          margin-bottom: 1.5rem;
          border: 1px solid var(--border-color);
          backdrop-filter: blur(12px);
        }
        .section-header {
          font-size: 0.95rem;
          font-weight: 600;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .trend-bars { display: flex; flex-direction: column; gap: 0.5rem; }
        .trend-item { display: flex; align-items: center; gap: 0.75rem; }
        .trend-label { width: 45px; font-size: 0.75rem; color: var(--text-muted); }
        .trend-bar-container {
          flex: 1;
          height: 8px;
          background: var(--border-color);
          border-radius: 99px;
          overflow: hidden;
        }
        .trend-bar { height: 100%; border-radius: 99px; transition: width 0.3s; }
        .trend-count { width: 30px; font-size: 0.75rem; text-align: right; color: var(--text-muted); }
        .two-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .card-list {
          background: rgba(var(--surface-rgb), var(--tab-opacity));
          border-radius: var(--border-radius);
          padding: 1.2rem;
          border: 1px solid var(--border-color);
          backdrop-filter: blur(12px);
        }
        .list-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border-color);
        }
        .list-item:last-child { border-bottom: none; }
        .list-rank { font-size: 0.8rem; font-weight: 700; width: 28px; }
        .list-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }
        .list-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: bold;
          color: white;
        }
        .list-name {
          flex: 1;
          font-size: 0.85rem;
          color: var(--text-color);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .list-value { font-size: 0.75rem; color: var(--text-muted); }
        .empty-list {
          text-align: center;
          padding: 1.5rem;
          color: var(--text-muted);
          font-size: 0.85rem;
        }
        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .two-columns { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
