<div style={{ padding: "16px", borderTop: "1px solid #1e2029", display: "flex", alignItems: "center", gap: "12px" }}>
  {user?.avatar && (
    <img 
      src={`https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png`}
      style={{ width: "36px", height: "36px", borderRadius: "50%" }}
    />
  )}
  <div style={{ flex: 1, overflow: "hidden" }}>
    <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.username}</p>
    <p style={{ margin: 0, fontSize: "11px", color: "#6d7280" }}>Online</p>
  </div>
  <button 
    onClick={handleLogout} 
    style={{
      padding: "8px 14px",
      backgroundColor: "#ed4245",
      border: "none",
      borderRadius: "8px",
      color: "#fff",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: "600",
      whiteSpace: "nowrap"
    }}
  >
     Wyloguj
  </button>
</div>
