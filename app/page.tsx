'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const userData = sessionStorage.getItem('user');
    let selectedClub = sessionStorage.getItem('selectedClub');
    
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        
        // Jika role_id = 11 (Personal Trainer) dan ada clubName, gunakan clubName
        if (parsedUser.roleId === 11 && parsedUser.clubName) {
          selectedClub = parsedUser.clubName;
          // Auto-set selectedClub ke sessionStorage jika belum ada
          if (!sessionStorage.getItem('selectedClub')) {
            sessionStorage.setItem('selectedClub', parsedUser.clubName);
          }
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    
    // Semua user langsung ke dashboard (tidak perlu select-club)
    if (userData) {
      router.push('/dashboard');
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
