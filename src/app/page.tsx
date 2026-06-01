'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import BrandLogo from '@/components/ui/BrandLogo';
import styles from './page.module.css';

export default function Home() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated' && session;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <BrandLogo className={styles.logoIcon} size={30} />
          <span className={styles.logoText}>PickMemo</span>
        </div>
        <nav className={styles.nav}>
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className={styles.dashboardLink}>대시보드</Link>
              <button className={styles.logoutButton} onClick={() => signOut({ callbackUrl: '/' })}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className={styles.loginLink}>로그인</Link>
              <Link href="/auth/register" className={styles.registerBtn}>무료로 시작하기</Link>
            </>
          )}
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>
            뇌를 자극하는<br />
            <span className={styles.highlight}>디지털 학습 가이드</span>
          </h1>
          <p className={styles.heroSub}>
            배운 것을 오래 기억하도록 돕는<br />
            간격 반복 기반 장기 기억 전환 학습 플랫폼입니다.
          </p>
          <div className={styles.heroActions}>
            <Link href={isAuthenticated ? '/dashboard' : '/auth/register'} className={styles.primaryBtn}>
              {isAuthenticated ? '대시보드로 이동' : '지금 바로 시작하기'}
            </Link>
          </div>
          
          {/* 장식용 떠다니는 종이 조각들 */}
          <div className={styles.floatingPapers}>
            <div className={`${styles.paper} ${styles.p1}`}></div>
            <div className={`${styles.paper} ${styles.p2}`}></div>
            <div className={`${styles.paper} ${styles.p3}`}></div>
          </div>
        </section>

        <section className={styles.features}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📝</div>
            <h3>적극적 인출 연습</h3>
            <p>단순히 읽는 것을 넘어, 머릿속에서 강제로 답을 떠올리는 과정을 통해 뇌에 깊이 각인시킵니다.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🔄</div>
            <h3>스마트 복습 주기</h3>
            <p>망각 곡선 알고리즘에 따라 당신이 잊을 만할 때 정확히 다시 복습하도록 타이밍을 제안합니다.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🧠</div>
            <h3>메타인지 향상</h3>
            <p>스스로 얼마나 잘 알고 있는지 4단계 피드백으로 평가하며 학습 효율을 극대화하세요.</p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>© 2026 PickMemo. All rights reserved.</p>
      </footer>
    </div>
  );
}
