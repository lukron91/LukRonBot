import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";

const styles = {
  container: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" },
  title: { fontSize: "3rem", color: "#5865F2", marginBottom: "1rem" },
  subtitle: { color: "#99aab5", marginBottom: "2rem" },
  button: { backgroundColor: "#5865F2", color: "white", padding: "12px 24px", borderRadius: "6px", textDecoration: "none", fontWeight: "bold" }
};

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🤖 LukRon Bot</h1>
      <p style={styles.subtitle}>Zaloguj się, aby zarządzać botem</p>
      <Link href="/api/auth/signin" style={styles.button}>
        Zaloguj przez Discord
      </Link>
    </div>
  );
}
