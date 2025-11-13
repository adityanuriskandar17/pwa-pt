'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SelectClubPage() {
  const router = useRouter();
  const [clubs, setClubs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // 5 cards per row x 2 rows = 10 cards per page

  useEffect(() => {
    // Check if user is logged in
    const userData = sessionStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    // Fetch list of club names
    const fetchClubs = async () => {
      try {
        const response = await fetch('/api/clubs');
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
          setClubs(result.data);
        } else {
          // If no clubs, redirect to dashboard
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching clubs:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchClubs();
  }, [router]);

  // Filter clubs based on search query
  const filteredClubs = clubs.filter((club) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return club.toLowerCase().includes(query);
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredClubs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClubs = filteredClubs.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSelectClub = (clubName: string) => {
    // Save selected club to sessionStorage
    sessionStorage.setItem('selectedClub', clubName);
    // Redirect to dashboard
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div 
        className="flex min-h-screen items-center justify-center relative"
        style={{
          backgroundImage: 'url(https://bimamedia-cms.ap-south-1.linodeobjects.com/fitclub.id/2024/03/13/l-2023-08-21-1jpg20240313101247.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 text-white font-medium">Memuat...</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative p-6"
      style={{
        backgroundImage: 'url(https://bimamedia-cms.ap-south-1.linodeobjects.com/fitclub.id/2024/03/13/l-2023-08-21-1jpg20240313101247.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay untuk readability */}
      <div className="absolute inset-0 bg-black/50"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">Pilih Club</h1>
          <p className="text-white/90 drop-shadow-md">Pilih club yang ingin Anda kelola</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 max-w-md mx-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <Input
              type="text"
              placeholder="Cari club..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 w-full border-gray-300 bg-white/95 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500 shadow-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Club Cards Grid */}
        {filteredClubs.length === 0 ? (
          <Card className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg">
            <CardContent className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-500 font-medium">Tidak ada club ditemukan</p>
              <p className="text-sm text-gray-400 mt-1">Coba gunakan kata kunci lain</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
              {paginatedClubs.map((club, index) => (
                <Button
                  key={index}
                  onClick={() => handleSelectClub(club)}
                  className="h-auto p-0 flex flex-col items-center justify-center border border-white/20 hover:border-amber-400/60 transition-all duration-300 text-center group aspect-square overflow-hidden relative shadow-lg hover:shadow-2xl hover:scale-105"
                  style={{
                    backgroundImage: 'url(https://ftlgym.com/wp-content/uploads/2025/07/resized_Akses-ke-Semua-Klub-FTL-GYM-dan-Klub-STRIDE.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  {/* Overlay elegan dengan gradient hitam halus */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70 group-hover:from-black/50 group-hover:via-black/40 group-hover:to-black/60 transition-all duration-300"></div>
                  
                  {/* Border glow effect saat hover */}
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-amber-400/40 rounded-sm transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
                  
                  {/* Content */}
                  <div className="relative z-10 p-6 w-full h-full flex flex-col items-center justify-center">
                    {/* Icon dengan background elegan */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 backdrop-blur-md border border-amber-400/30 flex items-center justify-center mb-4 group-hover:from-amber-500/30 group-hover:to-amber-600/40 group-hover:border-amber-400/50 transition-all duration-300 shadow-lg">
                      <svg className="w-7 h-7 text-amber-300 group-hover:text-amber-200 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <span className="font-semibold text-white text-sm leading-tight tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-amber-100 transition-colors duration-300 px-2 text-center">
                      {club}
                    </span>
                  </div>
                </Button>
              ))}
            </div>

            {/* Pagination */}
            {filteredClubs.length > itemsPerPage && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                <div className="text-sm text-white drop-shadow-md">
                  Menampilkan <span className="font-semibold">{startIndex + 1}</span> - <span className="font-semibold">{Math.min(endIndex, filteredClubs.length)}</span> dari <span className="font-semibold">{filteredClubs.length}</span> club
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Sebelumnya
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className={`h-9 w-9 p-0 ${
                            currentPage === pageNum
                              ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-lg"
                              : "border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20"
                          }`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Selanjutnya
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

