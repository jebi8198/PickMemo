'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 새 공책 만들기는 대시보드의 모달로 이동했습니다.
export default function NewNotebookRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return null;
}
