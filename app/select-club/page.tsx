'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SelectClubPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const userData = sessionStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    
    // Redirect semua user ke dashboard (select-club sudah tidak digunakan)
    router.push('/dashboard');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-gray-600 font-medium">Mengalihkan ke dashboard...</div>
    </div>
  );
}

