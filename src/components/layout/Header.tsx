'use client';
import React from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import BrandLogo from '@/components/ui/BrandLogo';
import styles from './Header.module.css';

export const Header = () => {
  const { data: session, status } = useSession();
  const logoHref = status === 'authenticated' && session ? '/dashboard' : '/';

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href={logoHref} className={styles.logo}>
          <BrandLogo size={30} />
          <span>PickMemo</span>
        </Link>
        
        <nav className={styles.nav}>
          <Link href="/dashboard" className={styles.navLink}>
            대시보드
          </Link>
        </nav>

        <div className={styles.userMenu}>
          {status === 'authenticated' && session ? (
            <>
              <span className={styles.userName}>{session.user?.name}님</span>
              <button className={styles.logoutButton} onClick={() => signOut({ callbackUrl: '/' })}>
                로그아웃
              </button>
            </>
          ) : (
            <Link href="/auth/login" className={styles.loginLink}>
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
