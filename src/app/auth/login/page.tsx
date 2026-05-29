'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        showToast('이메일 또는 비밀번호를 확인해주세요.', 'error');
        return;
      }

      showToast('로그인했습니다.', 'success');
      router.push('/dashboard');
      router.refresh();
    } catch {
      showToast('로그인 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>로그인</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input 
            label="이메일" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <Input 
            label="비밀번호" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <Button type="submit" loading={isLoading} className={styles.submitBtn}>
            로그인
          </Button>
        </form>
        <p className={styles.footer}>
          계정이 없으신가요? <Link href="/auth/register">회원가입</Link>
        </p>
      </div>
    </div>
  );
}
