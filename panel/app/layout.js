import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const metadata = {
  title: "LukRon Bot Panel",
  description: "Panel zarządzania botem Discord",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body style={{ margin: 0 }}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
