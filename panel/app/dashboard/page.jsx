"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FiUsers, FiHash, FiShield, FiUserPlus, FiUserMinus, FiActivity,
  FiTrendingUp, FiMessageSquare, FiAward, FiCalendar
} from 'react-icons/fi';

export default function DashboardHome() {
  const searchParams = useSearchParams();
  const guildId = searchParams.get("guild");
  
  const [stats, setStats] = useState({ members: null, channels: null, roles: null });
  const [activity, setActivity] = useState({
    joinedToday: null,
    leftToday: null,
    active7days: null,
    activityTrend: [],
    topChannels: [],
    topUsers: []
  });
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);

  useEffect(() => {
    if (!guildId) return;

    // Podstawowe statystyki
    fetch(`http://localhost:3001/api/guilds/${guildId}/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => setStats({ members: "Błąd", channels: "Błąd", roles: "Błąd" }));

    // Statystyki aktywności
    Promise.all([
      fetch(`http://localhost:3001/api/guilds/${guildId}/activity/joined-today`).then(r => r.json()),
      fetch(`http://localhost:3001/api/guilds/${guildId}/activity/left-today`).then(r => r.json()),
      fetch(`http://localhost:3001/api/guilds/${guildId}/activity/active-7days`).then(r => r.json()),
      fetch(`http://localhost:3001/api/guilds/${guildId}/activity/trend`).then(r => r.json()),
      fetch(`http://localhost:3001/api/guilds/${guildId}/activity/top-channels`).then(r => r.json()),
      fetch(`http://localhost:3001/api/guilds/${guildId}/activity/top-users`).then(r => r.json())
    ]).then(([joined, left, active, trend, channels, users]) => {
      setActivity({
        joinedToday: joined.count ?? 0,
        leftToday: left.count ?? 0,
        active7days: active.count ?? 0,
        activityTrend: trend.trend ?? [],
        topChannels: channels.channels ?? [],
        topUsers: users.users ?? []
      });
      setTrendLoading(false);
    }).catch(err => {
      console.error("Błąd pobierania aktywności:", err);
      setTrendLoading(false);
    }).finally(() => setLoading(false));
  }, [guildId]);

  if (!guildId) {
    return <div className="text-center" style={{ marginTop: "3rem", color: "#6b6b76" }}>Wybierz serwer z lewego menu.</div>;
  }

  const isLoading = stats.members === null;
  const maxTrend = activity.activityTrend.length > 0
    ? Math.max(...activity.activityTrend.map(d => d.count))
    : 0;

  return (
    <div>
      {/* Karty podstawowe */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FiUsers /></div>
          <div className="stat-content">
            <div className="stat-title">Członkowie</div>
            <div className="stat-value">{isLoading ? "—" : stats.members}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FiHash /></div>
          <div className="stat-content">
            <div className="stat-title">Kanały</div>
            <div className="stat-value">{isLoading ? "—" : stats.channels}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FiShield /></div>
          <div className="stat-content">
            <div className="stat-title">Role</div>
            <div className="stat-value">{isLoading ? "—" : stats.roles}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FiUserPlus /></div>
          <div className="stat-content">
            <div className="stat-title">Dołączenia dzisiaj</div>
            <div className="stat-value">{activity.joinedToday ?? "—"}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FiUserMinus /></div>
          <div className="stat-content">
            <div className="stat-title">Opuściła dzisiaj</div>
            <div className="stat-value">{activity.leftToday ?? "—"}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FiActivity /></div>
          <div className="stat-content">
            <div className="stat-title">Aktywni (7 dni)</div>
            <div className="stat-value">{activity.active7days ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* Trend aktywności */}
      {!trendLoading && activity.activityTrend.length > 0 && (
        <div className="trend-section">
          <div className="section-header">
            <FiTrendingUp /> Trend aktywności (ostatnie 7 dni)
          </div>
          <div className="trend-bars">
            {activity.activityTrend.map((day, idx) => (
              <div key={idx} className="trend-item">
                <div className="trend-label">{day.label}</div>
                <div className="trend-bar-container">
                  <div 
                    className="trend-bar" 
                    style={{ width: `${maxTrend ? (day.count / maxTrend) * 100 : 0}%` }}
                  />
                </div>
                <div className="trend-count">{day.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Najbardziej aktywne kanały i top użytkownicy */}
      <div className="two-columns">
        <div className="card-list">
          <div className="section-header">
            <FiMessageSquare /> Najbardziej aktywne kanały
          </div>
          {activity.topChannels.length === 0 ? (
            <div className="empty-list">Brak danych</div>
          ) : (
            activity.topChannels.map((ch, idx) => (
              <div key={idx} className="list-item">
                <span className="list-rank">#{idx + 1}</span>
                <span className="list-name">#{ch.name}</span>
                <span className="list-value">{ch.count} wiadomości</span>
              </div>
            ))
          )}
        </div>
        <div className="card-list">
          <div className="section-header">
            <FiAward /> Top użytkownicy
          </div>
          {activity.topUsers.length === 0 ? (
            <div className="empty-list">Brak danych</div>
          ) : (
            activity.topUsers.map((user, idx) => (
              <div key={idx} className="list-item">
                <span className="list-rank">{idx + 1}</span>
                <div className="list-avatar">
                  {user.avatar ? (
                    <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} alt="" />
                  ) : (
                    <div className="avatar-placeholder">{(user.username || 'U').charAt(0).toUpperCase()}</div>
                  )}
                </div>
                <span className="list-name">{user.username || 'Nieznany użytkownik'}</span>
                <span className="list-value">{user.count} wiadomości</span>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          background: #14141c;
          border-radius: 1rem;
          padding: 1rem;
          border: 1px solid #25252d;
          transition: all 0.2s;
          display: flex;
          align-items: center; 
          gap: 1rem;
        }
        .stat-card:hover {
          border-color: #5865f2;
          transform: translateY(-2px);
        }
        .stat-icon {
          font-size: 2rem;
          width: 48px;
          height: 48px;
          background: rgba(88,101,242,0.15);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-content {
          flex: 1;
        }
        .stat-title {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #9c9ca7;
          margin-bottom: 0.25rem;
        }
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
        }
        .trend-section {
          background: #14141c;
          border-radius: 1rem;
          padding: 1.2rem;
          margin-bottom: 1.5rem;
          border: 1px solid #25252d;
        }
        .section-header {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #a5b4fc;
        }
        .trend-bars {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .trend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .trend-label {
          width: 45px;
          font-size: 0.7rem;
          color: #8b8ba0;
        }
        .trend-bar-container {
          flex: 1;
          height: 8px;
          background: #2a2a30;
          border-radius: 4px;
          overflow: hidden;
        }
        .trend-bar {
          height: 100%;
          background: linear-gradient(90deg, #5865f2, #a5b4fc);
          border-radius: 4px;
          transition: width 0.3s;
        }
        .trend-count {
          width: 40px;
          font-size: 0.7rem;
          text-align: right;
          color: #e1e1e6;
        }
        .two-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .card-list {
          background: #14141c;
          border-radius: 1rem;
          padding: 1.2rem;
          border: 1px solid #25252d;
        }
        .list-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0;
          border-bottom: 1px solid #1e1e26;
        }
        .list-item:last-child {
          border-bottom: none;
        }
        .list-rank {
          font-size: 0.8rem;
          font-weight: bold;
          color: #5865f2;
          width: 30px;
        }
        .list-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }
        .list-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .avatar-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #5865f2, #4752c4);
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
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .list-value {
          font-size: 0.7rem;
          color: #8b8ba0;
        }
        .empty-list {
          text-align: center;
          padding: 1rem;
          color: #6b6b76;
          font-size: 0.8rem;
        }
        @media (max-width: 768px) {
          .two-columns {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}