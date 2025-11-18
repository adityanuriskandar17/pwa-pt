'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

interface User {
  id: number;
  email: string;
  name?: string; // Nama dari face recognition
  roleId?: number | null;
  clubId?: number | null;
  clubName?: string | null;
  [key: string]: any;
}

interface TableData {
  nomor: number;
  member: string;
  pt: string; // Personal Trainer name
  status: string;
  memberVerified: boolean; // Status verifikasi Member
  ptVerified: boolean; // Status verifikasi PT
  bookingId?: number | null;
  memberId?: number | null;
  startDate?: string; // Tanggal start (hari, tanggal)
  startTime?: string; // Waktu start (HH:MM)
  endTime?: string;
  gateVerified?: boolean; // Status verifikasi Gate
  bookingListVerified?: boolean; // Status verifikasi Booking List
  faceVerified?: boolean; // Status verifikasi Face
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [selectedRow, setSelectedRow] = useState<TableData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showStatistics, setShowStatistics] = useState(true);
  const [clubs, setClubs] = useState<string[]>([]);
  const [selectedClub, setSelectedClub] = useState<string>('');
  const [serverTime, setServerTime] = useState<Date | null>(null);
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateInputValue, setDateInputValue] = useState<string>('');
  const datePickerRef = useRef<HTMLInputElement>(null);
  const [filterGateVerified, setFilterGateVerified] = useState<boolean | null>(null); // null = semua, true = hanya yang checklist, false = hanya yang belum

  // Filter data based on search query, date, and gate status
  const filteredData = tableData.filter((row) => {
    // Filter by search query
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || (
      row.member.toLowerCase().includes(query) ||
      row.pt.toLowerCase().includes(query) ||
      row.nomor.toString().includes(query)
    );

    // Filter by date
    let matchesDate = true;
    if (selectedDate && row.startDate) {
      // Extract tanggal dari row.startDate (format: "Kamis, 30/10/2025")
      const dateMatch = row.startDate.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        // Format: YYYY-MM-DD untuk perbandingan
        const rowDateStr = `${year}-${month}-${day}`;
        // selectedDate sudah dalam format YYYY-MM-DD
        matchesDate = rowDateStr === selectedDate;
      } else {
        matchesDate = false;
      }
    }

    // Filter by gate status
    let matchesGate = true;
    if (filterGateVerified !== null) {
      matchesGate = row.gateVerified === filterGateVerified;
    }

    return matchesSearch && matchesDate && matchesGate;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when search query, date filter, or gate filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDate, filterGateVerified]);

  // Calculate statistics based on filtered data
  const totalMembers = tableData.length;
  const validCount = tableData.filter(row => row.status === 'Valid').length;
  const pendingCount = tableData.filter(row => row.status === 'Belum Validasi').length;

  useEffect(() => {
    // Check if user is logged in
    const userData = sessionStorage.getItem('user');
    
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Fetch clubs jika role_id = 1 atau 4
    const fetchClubs = async () => {
      if (parsedUser.roleId === 1 || parsedUser.roleId === 4) {
        try {
          const response = await fetch('/api/clubs');
          const result = await response.json();
          if (result.success && result.data) {
            setClubs(result.data);
            // Set default club jika belum ada selectedClub
            const savedClub = sessionStorage.getItem('selectedClub');
            if (savedClub && result.data.includes(savedClub)) {
              setSelectedClub(savedClub);
            } else if (result.data.length > 0) {
              // Set club pertama sebagai default
              setSelectedClub(result.data[0]);
              sessionStorage.setItem('selectedClub', result.data[0]);
            }
          }
        } catch (error) {
          console.error('Error fetching clubs:', error);
        }
      } else if (parsedUser.roleId === 11 && parsedUser.clubName) {
        // Personal Trainer: gunakan clubName dari user
        setSelectedClub(parsedUser.clubName);
        sessionStorage.setItem('selectedClub', parsedUser.clubName);
      }
    };

    fetchClubs();
  }, [router]);

  // Fetch data ketika selectedClub berubah
  useEffect(() => {
    if (!selectedClub || !user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch data dari API dengan club_name
        // Jika role_id = 11 (Personal Trainer), tambahkan filter pt_name
        // Jika "All Club" dipilih, kirim "All Club" sebagai club_name
        const clubParam = selectedClub === 'All Club' ? 'All Club' : selectedClub;
        let apiUrl = `/api/bookings?club_name=${encodeURIComponent(clubParam)}`;
        if (user.roleId === 11 && user.name) {
          // Personal Trainer: filter berdasarkan nama mereka sendiri
          apiUrl += `&pt_name=${encodeURIComponent(user.name)}`;
        }
        
        const response = await fetch(apiUrl);
        const result = await response.json();
        
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch bookings');
        }

        let initialData: TableData[] = result.data || [];

        // Cek apakah ada verifikasi terbaru dari sessionStorage
        const lastVerification = sessionStorage.getItem('lastVerification');
        if (lastVerification) {
          try {
            const verification = JSON.parse(lastVerification);
            // Update data berdasarkan verifikasi terbaru
            initialData = initialData.map(row => {
              // Match berdasarkan bookingId (bukan nomor urut)
              const rowBookingId = row.bookingId?.toString();
              const verifNomor = verification.nomor?.toString();
              
              if (rowBookingId === verifNomor) {
                if (verification.type === 'member') {
                  // Normalize names untuk perbandingan yang lebih fleksibel
                  const rowMember = row.member.toLowerCase().trim();
                  const verifPerson = verification.person?.toLowerCase().trim();
                  if (rowMember === verifPerson) {
                    return { ...row, memberVerified: true };
                  }
                } else if (verification.type === 'pt') {
                  // Normalize names untuk perbandingan yang lebih fleksibel
                  const rowPT = row.pt.toLowerCase().trim();
                  const verifPerson = verification.person?.toLowerCase().trim();
                  if (rowPT === verifPerson) {
                    return { ...row, ptVerified: true };
                  }
                }
              }
              return row;
            });
            console.log('Updated verification status:', initialData);
          } catch (err) {
            console.error('Error parsing verification data:', err);
          }
        }

        // Update status berdasarkan verifikasi dan update faceVerified
        initialData = initialData.map(row => {
          // Update faceVerified berdasarkan memberVerified && ptVerified
          const faceVerified = row.memberVerified && row.ptVerified;
          
          let status = 'Valid';
          if (!row.memberVerified && !row.ptVerified) {
            status = 'Belum Validasi';
          } else if (!row.memberVerified) {
            status = 'Member Belum Validasi';
          } else if (!row.ptVerified) {
            status = 'Personal Trainer Belum Validasi';
          }
          return { ...row, status, faceVerified };
        });

        setTableData(initialData);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        // Fallback ke empty array jika error
        setTableData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedClub, user]);

  // Fetch server time and update periodically
  useEffect(() => {
    let offsetRef = 0;
    
    const fetchServerTime = async () => {
      try {
        const response = await fetch('/api/server-time');
        const data = await response.json();
        
        if (data.success && data.timestamp) {
          const serverTimestamp = data.timestamp;
          const clientTimestamp = Date.now();
          // Calculate offset between server and client
          offsetRef = serverTimestamp - clientTimestamp;
          setTimeOffset(offsetRef);
          setServerTime(new Date(serverTimestamp));
        }
      } catch (error) {
        console.error('Error fetching server time:', error);
        // Fallback to client time if server time fails
        setServerTime(new Date());
      }
    };

    // Fetch immediately
    fetchServerTime();

    // Update every second
    const interval = setInterval(() => {
      if (offsetRef !== 0) {
        // Use offset to calculate server time
        const currentServerTime = new Date(Date.now() + offsetRef);
        setServerTime(currentServerTime);
      } else {
        // If offset not set yet, fetch again
        fetchServerTime();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format time for display
  const formatTime = (date: Date | null): string => {
    if (!date) return '--:--:--';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '--/--/----';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayName = dayNames[date.getDay()];
    return `${dayName}, ${day}/${month}/${year}`;
  };

  // Format tanggal dengan bulan singkatan: dd/Oct/yyyy
  const formatDateWithMonthAbbr = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Parse format dd/Oct/yyyy menjadi YYYY-MM-DD
  const parseDateFromAbbr = (dateStr: string): string => {
    if (!dateStr) return '';
    
    // Format: dd/Mmm/yyyy atau dd/Mmm/yy
    const match = dateStr.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{4}|\d{2})$/);
    if (!match) return '';
    
    const [, day, monthAbbr, yearStr] = match;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthAbbr.toLowerCase());
    
    if (monthIndex === -1) return '';
    
    const year = yearStr.length === 2 ? `20${yearStr}` : yearStr;
    const month = (monthIndex + 1).toString().padStart(2, '0');
    const dayPadded = day.padStart(2, '0');
    
    return `${year}-${month}-${dayPadded}`;
  };

  // Handle date input change
  const handleDateInputChange = (value: string) => {
    setDateInputValue(value);
    const parsed = parseDateFromAbbr(value);
    if (parsed) {
      setSelectedDate(parsed);
    } else if (!value) {
      setSelectedDate('');
    }
  };

  // Sync dateInputValue when selectedDate changes externally
  useEffect(() => {
    if (selectedDate) {
      const formatted = formatDateWithMonthAbbr(selectedDate);
      if (formatted !== dateInputValue) {
        setDateInputValue(formatted);
      }
    } else if (dateInputValue) {
      setDateInputValue('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    router.push('/login');
  };

  const handleAction = (row: TableData) => {
    // Show card selection modal
    setSelectedRow(row);
  };

  const handleSelectType = (type: 'member' | 'pt', row: TableData) => {
    // Navigate to verification page with selected type
    // Gunakan bookingId untuk nomor (bukan nomor urut)
    const personName = type === 'member' ? row.member : row.pt;
    const bookingId = row.bookingId || row.nomor; // Fallback ke nomor jika bookingId tidak ada
    router.push(`/verification?nomor=${bookingId}&member=${encodeURIComponent(row.member)}&pt=${encodeURIComponent(row.pt)}&status=${encodeURIComponent(row.status)}&type=${type}&person=${encodeURIComponent(personName)}`);
  };

  const handleCloseModal = () => {
    setSelectedRow(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600 font-medium">Memuat...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
                <img 
                  src="/logo-temp.jpg"
                  alt="FTL Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">FTL Dashboard</h1>
                <p className="text-xs text-gray-500">
                  {user.roleId === 11 && user.name
                    ? `${user.name} - ${user.clubName || selectedClub || ''}`
                    : user.roleId === 11 && user.clubName 
                    ? user.clubName 
                    : selectedClub || 'Face Recognition System'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Digital Clock */}
              <div className="hidden sm:flex flex-col items-end px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500 mb-0.5">{formatDate(serverTime)}</div>
                <div className="text-lg font-mono font-semibold text-gray-900">{formatTime(serverTime)}</div>
              </div>
              
              {/* Club Selector untuk role_id = 1 atau 4 */}
              {(user.roleId === 1 || user.roleId === 4) && clubs.length > 0 && (
                <Select
                  value={selectedClub}
                  onValueChange={(value) => {
                    setSelectedClub(value);
                    sessionStorage.setItem('selectedClub', value);
                    setCurrentPage(1); // Reset to page 1 when club changes
                  }}
                >
                  <SelectTrigger className="w-[200px] border-gray-300">
                    <SelectValue placeholder="Pilih Club" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Club">
                      All Club
                    </SelectItem>
                    {clubs.map((club) => (
                      <SelectItem key={club} value={club}>
                        {club}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">{user.email}</span>
              </div>
              <Button
                onClick={() => setShowStatistics(!showStatistics)}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {showStatistics ? (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Sembunyikan Statistik
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Tampilkan Statistik
                  </>
                )}
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Statistics Cards */}
        {showStatistics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Member</p>
                  <p className="text-3xl font-bold text-gray-900">{totalMembers}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Tervalidasi</p>
                  <p className="text-3xl font-bold text-green-600">{validCount}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Belum Validasi</p>
                  <p className="text-3xl font-bold text-orange-600">{pendingCount}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        )}

        {/* Table Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Data Member</h2>
              <p className="text-sm text-gray-500">Daftar member dan status booking</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {/* Gate Filter */}
              <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterGateVerified === true}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilterGateVerified(true);
                      } else {
                        setFilterGateVerified(null);
                      }
                    }}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                  />
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Gate Checked</span>
                  </div>
                </label>
                {filterGateVerified === true && (
                  <button
                    onClick={() => setFilterGateVerified(null)}
                    className="ml-1 text-gray-400 hover:text-gray-600"
                    title="Hapus filter"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {/* Date Filter */}
              <div className="relative w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                {/* Hidden date input for native date picker */}
                <input
                  ref={datePickerRef}
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    if (e.target.value) {
                      setDateInputValue(formatDateWithMonthAbbr(e.target.value));
                    } else {
                      setDateInputValue('');
                    }
                  }}
                  className="sr-only"
                  style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
                />
                <Input
                  type="text"
                  value={dateInputValue}
                  onChange={(e) => handleDateInputChange(e.target.value)}
                  placeholder="dd/Mmm/yyyy"
                  className="pl-10 pr-20 w-full sm:w-auto border-gray-300 focus:border-gray-900 focus:ring-gray-900/20 h-11"
                  title="Format: dd/Mmm/yyyy (contoh: 05/Nov/2025) - Ketik manual atau klik icon kalender"
                />
                <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
                  {dateInputValue && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setDateInputValue('');
                        setSelectedDate('');
                      }}
                      className="flex items-center text-gray-400 hover:text-gray-600 z-30"
                      title="Hapus filter"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (datePickerRef.current) {
                        if (datePickerRef.current.showPicker) {
                          try {
                            datePickerRef.current.showPicker();
                          } catch (err) {
                            datePickerRef.current.focus();
                            datePickerRef.current.click();
                          }
                        } else {
                          datePickerRef.current.focus();
                          datePickerRef.current.click();
                        }
                      }
                    }}
                    className="flex items-center text-gray-400 hover:text-gray-600 z-20"
                    title="Klik untuk membuka date picker"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* Search Input */}
              <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <Input
                  type="text"
                  placeholder="Cari member atau PT..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 w-full border-gray-300 focus:border-gray-900 focus:ring-gray-900/20 h-11"
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
          </div>
          {(searchQuery || selectedDate || filterGateVerified !== null) && (
            <div className="mb-4 text-sm text-gray-600">
              Menampilkan <span className="font-semibold text-gray-900">{filteredData.length}</span> dari <span className="font-semibold text-gray-900">{tableData.length}</span> hasil
              {(selectedDate || searchQuery || filterGateVerified !== null) && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedDate && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {formatDateWithMonthAbbr(selectedDate)}
                    </span>
                  )}
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      "{searchQuery}"
                    </span>
                  )}
                  {filterGateVerified === true && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Gate Checked
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <Card className="bg-white border border-gray-200 shadow-lg overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b-2 border-gray-200">
                    <TableHead className="font-semibold text-gray-700 py-3 px-3 w-16">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-xs">#</span>
                        <span className="text-xs">No</span>
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3 px-3 min-w-[180px]">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-xs">Member</span>
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3 px-3 min-w-[140px] hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span className="text-xs">PT</span>
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3 px-3 min-w-[120px]">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs">Start</span>
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3 px-3 w-20 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs">End</span>
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3 px-3 min-w-[100px]">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 py-3 px-3 text-right w-24">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <p className="text-gray-500 font-medium">Tidak ada data ditemukan</p>
                          <p className="text-sm text-gray-400 mt-1">Coba gunakan kata kunci lain</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((row, index) => (
                    <TableRow 
                      key={row.nomor} 
                      className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors group"
                    >
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center justify-center">
                          <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                            <span className="text-xs font-semibold text-gray-700">{row.nomor}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm font-medium text-gray-900 truncate">{row.member}</span>
                          {row.memberVerified ? (
                            <div className="flex items-center shrink-0" title="Member sudah terverifikasi">
                              <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          ) : (
                            <div className="flex items-center shrink-0" title="Member belum terverifikasi">
                              <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-sm text-gray-700 font-medium truncate">{row.pt}</span>
                          {row.ptVerified ? (
                            <div className="flex items-center shrink-0" title="PT sudah terverifikasi">
                              <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          ) : (
                            <div className="flex items-center shrink-0" title="PT belum terverifikasi">
                              <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div className="flex flex-col gap-0.5 min-w-[100px]">
                          <span className="text-xs text-gray-600 truncate">{row.startDate || '-'}</span>
                          <span className="text-xs font-medium text-gray-900">{row.startTime || '-'}</span>
                          <span className="text-xs text-gray-500 lg:hidden">End: {row.endTime || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3 hidden lg:table-cell">
                        <span className="text-xs font-medium text-gray-900">{row.endTime || '-'}</span>
                      </TableCell>
                      <TableCell className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          {/* Gate Status */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-600">Gate</span>
                            {row.gateVerified ? (
                              <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          {/* Booking List Status */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-600">Booking</span>
                            {row.bookingListVerified ? (
                              <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          {/* Face Status */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-600">Face</span>
                            {row.faceVerified || (row.memberVerified && row.ptVerified) ? (
                              <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-3 text-right">
                        <Button
                          onClick={() => handleAction(row)}
                          size="sm"
                          className="bg-gray-900 hover:bg-gray-800 text-white text-xs px-2.5 py-1.5 h-auto"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="hidden sm:inline">Validasi</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {filteredData.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Menampilkan <span className="font-semibold text-gray-900">{startIndex + 1}</span> - <span className="font-semibold text-gray-900">{Math.min(endIndex, filteredData.length)}</span> dari <span className="font-semibold text-gray-900">{filteredData.length}</span> data
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Per halaman:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
                className="h-9 px-3 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          ? "bg-gray-900 hover:bg-gray-800 text-white border-0"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
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
                className="h-9 px-3 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Selanjutnya
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Selection Modal */}
      {selectedRow && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Pilih yang akan divalidasi</h2>
                  <p className="text-sm text-gray-500 mt-1">Pilih Member atau Personal Trainer</p>
                </div>
                <Button
                  onClick={handleCloseModal}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Member Card */}
                <button
                  onClick={() => handleSelectType('member', selectedRow)}
                  className="group relative p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Member</h3>
                      <p className="text-sm text-gray-600">{selectedRow.member}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                {/* PT Card */}
                <button
                  onClick={() => handleSelectType('pt', selectedRow)}
                  className="group relative p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Personal Trainer</h3>
                      <p className="text-sm text-gray-600">{selectedRow.pt}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

