'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface User {
  id: number;
  email: string;
  [key: string]: any;
}

interface TableData {
  nomor: number;
  member: string;
  pt: string; // Personal Trainer name
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [selectedRow, setSelectedRow] = useState<TableData | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const userData = sessionStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      // Mock data - replace with actual API call
      setTableData([
        { nomor: 1, member: 'John Doe', pt: 'Budi Santoso', status: 'Valid' },
        { nomor: 2, member: 'Jane Smith', pt: 'Siti Nurhaliza', status: 'Valid' },
        { nomor: 3, member: 'Bob Johnson', pt: 'Ahmad Fauzi', status: 'Belum Validasi' },
        { nomor: 4, member: 'Alice Brown', pt: 'Dewi Lestari', status: 'Valid' },
        { nomor: 5, member: 'Charlie Wilson', pt: 'Rizki Pratama', status: 'Belum Validasi' },
      ]);
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

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
    const personName = type === 'member' ? row.member : row.pt;
    router.push(`/verification?nomor=${row.nomor}&member=${encodeURIComponent(row.member)}&pt=${encodeURIComponent(row.pt)}&status=${encodeURIComponent(row.status)}&type=${type}&person=${encodeURIComponent(personName)}`);
  };

  const handleCloseModal = () => {
    setSelectedRow(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-500 to-blue-600">
        <div className="text-white font-semibold text-lg">Memuat...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-purple-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b-2 border-purple-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              FTL Dashboard
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700 bg-purple-100 px-4 py-2 rounded-full">
                {user.email}
              </span>
              <Button
                onClick={handleLogout}
                variant="destructive"
                size="sm"
                className="shadow-md hover:shadow-lg transition-all"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-xl border-2 border-purple-200 bg-white/90 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-t-lg -m-6 mb-4">
            <CardTitle className="text-2xl text-white">Data Member</CardTitle>
            <CardDescription className="text-purple-100">
              Daftar member dan status booking
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-lg border border-purple-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-purple-100 to-blue-100">
                    <TableHead className="font-bold text-purple-700">Nomor</TableHead>
                    <TableHead className="font-bold text-purple-700">Member</TableHead>
                    <TableHead className="font-bold text-purple-700">Personal Trainer</TableHead>
                    <TableHead className="font-bold text-purple-700">Status</TableHead>
                    <TableHead className="font-bold text-purple-700 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((row) => (
                    <TableRow key={row.nomor} className="hover:bg-purple-50/50 transition-colors">
                      <TableCell className="font-medium">{row.nomor}</TableCell>
                      <TableCell>{row.member}</TableCell>
                      <TableCell>{row.pt}</TableCell>
                      <TableCell>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            row.status === 'Valid'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {row.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          onClick={() => handleAction(row)}
                          size="sm"
                          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                        >
                          Action
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Selection Modal */}
      {selectedRow && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Pilih yang akan divalidasi
              </h2>
              <Button
                onClick={handleCloseModal}
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </Button>
            </div>
            <p className="text-gray-600 mb-6">
              Pilih Member atau Personal Trainer untuk verifikasi face recognition
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Member Card */}
              <Card
                className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-purple-500"
                onClick={() => handleSelectType('member', selectedRow)}
              >
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-4xl">👤</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Member</h3>
                    <p className="text-lg font-semibold text-purple-600">{selectedRow.member}</p>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
                    Pilih Member
                  </Button>
                </CardContent>
              </Card>

              {/* PT Card */}
              <Card
                className="cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-500"
                onClick={() => handleSelectType('pt', selectedRow)}
              >
                <CardContent className="p-6 text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-4xl">💪</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Personal Trainer</h3>
                    <p className="text-lg font-semibold text-blue-600">{selectedRow.pt}</p>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                    Pilih PT
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

