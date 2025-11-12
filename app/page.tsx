'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const userData = sessionStorage.getItem('user');
    const selectedClub = sessionStorage.getItem('selectedClub');
    
    if (userData && selectedClub) {
      router.push('/dashboard');
    } else if (userData) {
      router.push('/select-club');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-zinc-600 dark:text-zinc-400">Memuat...</div>
    </div>
  );
}
