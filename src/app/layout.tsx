import type { Metadata } from 'next';
import { Inter, Lora } from 'next/font/google';
import AuthProvider from '@/components/providers/AuthProvider';
import { ConfirmProvider } from '@/components/providers/ConfirmProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const lora = Lora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lora',
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'PickMemo — 나무와 공책',
  description:
    '나무 서재에서 공책을 펼치듯 지식을 꺼내세요. 인출 연습 기반 장기 기억 전환 학습 플랫폼.',
  keywords: ['학습', '암기', '스페이스드 리피티션', '인출 연습', '메모', '플래시카드'],
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png' }],
    shortcut: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${inter.variable} ${lora.variable}`} data-scroll-behavior="smooth">
      <body>
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
