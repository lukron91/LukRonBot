import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'LukRon Bot Panel',
  description: 'Panel zarządzania botem Discord',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body style={{ margin: 0, padding: 0 }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}