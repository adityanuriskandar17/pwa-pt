'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login gagal');
        setLoading(false);
        return;
      }

      // Simpan user data ke sessionStorage
      sessionStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect ke dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError('Terjadi kesalahan: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div 
      className="flex min-h-screen items-center justify-center px-4 py-12 relative"
      style={{
        backgroundImage: 'url(https://ftlgym.com/wp-content/uploads/2024/09/image-2024-09-26T084541.837.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay untuk readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/70 via-blue-900/70 to-purple-800/70"></div>
      
      <div className="w-full max-w-md relative z-10 animate-in fade-in-0 zoom-in-95 duration-500">
        {/* Card dengan border gradient effect */}
        <div className="relative p-[2px] rounded-2xl bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 shadow-2xl">
          <Card className="border-0 bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl">
            <CardHeader className="text-center space-y-3 pb-6 pt-8">
              <div className="mx-auto mb-4 flex items-center justify-center">
                <img 
                  src="https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/59/86/27/598627f5-2f2a-a6a4-52b6-937cbff0ada5/AppIcon-0-0-1x_U007emarketing-0-7-0-0-85-220.png/1200x630wa.jpg"
                  alt="FTL Logo"
                  className="w-24 h-24 rounded-2xl object-cover shadow-xl border-4 border-white"
                />
              </div>
              <CardTitle className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                Dashboard Booking PT
              </CardTitle>
              <CardDescription className="text-base text-gray-600 font-medium">
                Silakan login untuk melanjutkan
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <span className="text-purple-600">📧</span>
                    Email
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="nama@email.com"
                      disabled={loading}
                      className="h-14 pl-4 pr-4 text-base border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="password" className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <span className="text-blue-600">🔒</span>
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      disabled={loading}
                      className="h-14 pl-4 pr-4 text-base border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3.5 rounded-xl text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
                    <span>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 text-base font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Memproses...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>🚀</span>
                      Login
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

