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
  title: 'PickMemo',
  description:
    '복습 최적 시점을 자동 계산해 배운 것을 장기 기억으로 전환하는 간격 반복 학습 플랫폼.',
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
    <html
      lang="ko"
      className={`${inter.variable} ${lora.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
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
