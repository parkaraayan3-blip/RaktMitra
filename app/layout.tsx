import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RaktMitra AI | When Every Second Matters',
  description:
    'AI-assisted emergency blood donor coordination. Transform unstructured emergency messages into coordinated action with Gemini-powered extraction and WhatsApp outreach.',
  keywords: ['blood donation', 'emergency', 'AI', 'blood bank', 'donor matching', 'India'],
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'RaktMitra AI | Emergency Blood Coordination',
    description: 'From an emergency message to coordinated action.',
    type: 'website',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'RaktMitra AI Official Logo' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#0B0D12" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
