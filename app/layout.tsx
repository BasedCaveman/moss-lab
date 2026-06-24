import Providers from './providers';

export const metadata = { title: 'MOSS Lab — wallet eval for Kalma' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0D1710', color: '#E9E2D6', fontFamily: 'system-ui, sans-serif' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
