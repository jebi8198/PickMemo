'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { getResponseError } from '@/lib/http';
import styles from './page.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        throw new Error(await getResponseError(res, '회원가입에 실패했습니다.'));
      }

      showToast('회원가입이 완료되었습니다. 로그인해주세요.', 'success');
      router.push('/auth/login');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '회원가입에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>회원가입</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input 
            label="이름" 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
          />
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
            가입하기
          </Button>
        </form>
        <p className={styles.footer}>
          이미 계정이 있으신가요? <Link href="/auth/login">로그인</Link>
        </p>
      </div>
    </div>
  );
}
