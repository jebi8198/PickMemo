'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from './page.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.push('/auth/login');
    }, 1000);
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