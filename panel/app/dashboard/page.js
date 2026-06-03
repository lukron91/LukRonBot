import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");

  const res = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  const guilds = await res.json();

  // Filtruj tylko serwery, gdzie masz uprawnienia zarządcy (MANAGE_GUILDS = 0x20)
  const manageableGuilds = guilds.filter(g => (BigInt(g.permissions) & 0x20n) === 0x20n);

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", borderBottom: "1px solid #333", paddingBottom: "1rem" }}>
        <h2>Panel Zarządzania</h2>
        <a href="/api/auth/signout" style={{ color: "#ed4245" }}>Wyloguj</a>
      </header>

      <h3 style={{ marginBottom: "1rem" }}>Wybierz serwer, aby dodać bota:</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
        {manageableGuilds.map((guild) => (
          <div key={guild.id} style={{ backgroundColor: "#23272a", padding: "1.5rem", borderRadius: "8px", border: "1px solid #2c2f33" }}>
            <h4 style={{ margin: "0 0 0.5rem 0" }}>{guild.name}</h4>
            <a
              href={`https://discord.com/api/oauth2/authorize?client_id=${process.env.BOT_CLIENT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", marginTop: "1rem", backgroundColor: "#23a559", color: "white", padding: "8px 16px", borderRadius: "4px", fontWeight: "bold", fontSize: "0.9rem" }}
            >
              Dodaj bota
            </a>
          </div>
        ))}
        {manageableGuilds.length === 0 && <p>Brak serwerów z uprawnieniami zarządcy.</p>}
      </div>
    </div>
  );
}
