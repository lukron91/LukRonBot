import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'LukRon Bot Panel',
  description: 'Panel zarządzania botem Discord',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}