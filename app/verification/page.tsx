'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface VerificationResult {
  success: boolean;
  message: string;
  user?: {
    member_pk: number;
    gym_member_id: number;
    email: string;
    first_name: string;
    last_name: string;
    name: string;
  };
  score?: number;
}

function VerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nomor = searchParams.get('nomor');
  const member = searchParams.get('member');
  const pt = searchParams.get('pt');
  const status = searchParams.get('status');
  const type = searchParams.get('type') as 'member' | 'pt' | null;
  const person = searchParams.get('person');

  // Redirect back if no type selected
  useEffect(() => {
    if (!type || !person) {
      router.push('/dashboard');
    }
  }, [type, person, router]);

  // Capture frame dari video dan convert ke base64
  const captureFrameFromVideo = (video: HTMLVideoElement): string => {
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvasRef.current = canvas;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1]; // Remove data:image/jpeg;base64, prefix
  };

  // Validate face dengan API melalui Next.js API route (proxy)
  const validateFace = async (imageBase64: string) => {
    try {
      // Gunakan Next.js API route sebagai proxy untuk menghindari CORS dan masalah network
      const response = await fetch('/api/face-validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_b64: imageBase64,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('API Error:', error);
      // Provide more detailed error message
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        throw new Error('Tidak dapat terhubung ke server. Pastikan server face recognition berjalan dan dapat diakses.');
      }
      throw error;
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      // Wait a bit to ensure video element is rendered
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (!videoRef.current) {
        console.error('Video ref is null, retrying...');
        // Retry once after a longer delay
        await new Promise(resolve => setTimeout(resolve, 100));
        if (!videoRef.current) {
          setError('Video element tidak ditemukan. Silakan refresh halaman.');
          return;
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      });
      
      console.log('Setting video stream...');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setError(null);
        
        // Force play after a short delay to ensure stream is ready
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                console.log('Video playing successfully');
              })
              .catch(err => {
                console.error('Error playing video:', err);
                setError('Tidak dapat memutar video dari kamera');
              });
          }
        }, 100);
      }
    } catch (err: any) {
      const errorMessage = err.name === 'NotAllowedError' 
        ? 'Izin kamera ditolak. Silakan berikan izin kamera di pengaturan browser.'
        : err.name === 'NotFoundError'
        ? 'Kamera tidak ditemukan. Pastikan kamera terhubung.'
        : 'Tidak dapat mengakses kamera: ' + (err.message || 'Unknown error');
      setError(errorMessage);
      console.error('Camera error:', err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  // Capture dan validate
  const handleStartVerification = async () => {
    if (!videoRef.current || !isCameraActive) {
      setError('Kamera belum aktif. Silakan aktifkan kamera terlebih dahulu.');
      return;
    }

    if (!person || !type) {
      setError('Data tidak lengkap. Silakan kembali ke dashboard.');
      return;
    }

    setIsScanning(true);
    setVerificationResult(null);
    setError(null);

    try {
      const imageBase64 = captureFrameFromVideo(videoRef.current);
      const response = await validateFace(imageBase64);

      if (response.ok && response.matched) {
        // Validasi: Nama dari face recognition harus sama dengan nama yang dipilih
        const detectedName = response.candidate?.name || '';
        const expectedName = person;
        
        // Normalize names untuk perbandingan (trim, lowercase)
        const normalizeName = (name: string) => name.trim().toLowerCase();
        const detectedNormalized = normalizeName(detectedName);
        const expectedNormalized = normalizeName(expectedName);
        
        // Cek apakah nama cocok
        if (detectedNormalized !== expectedNormalized) {
          // Nama tidak cocok - validasi gagal
          // Log detail ke console untuk debugging
          console.log('Validasi nama gagal:', {
            detected: detectedName,
            expected: expectedName,
            type: type === 'member' ? 'Member' : 'Personal Trainer',
          });
          
          // Tampilkan pesan generic di UI
          setVerificationResult({
            success: false,
            message: 'Nama tidak cocok dengan data yang dipilih',
          });
          return;
        }

        // ✅ SUCCESS - Wajah terdaftar, cocok, dan nama sesuai!
        setVerificationResult({
          success: true,
          message: 'Wajah terverifikasi!',
          user: response.candidate,
          score: response.best_score,
        });
        stopCamera();

        // Simpan status verifikasi ke sessionStorage untuk update di dashboard
        const verificationData = {
          nomor: nomor,
          type: type,
          person: person,
          verified: true,
          timestamp: Date.now(),
        };
        sessionStorage.setItem('lastVerification', JSON.stringify(verificationData));
      } else if (response.ok && !response.matched) {
        // ⚠️ Wajah terdeteksi tapi tidak cocok atau tidak terdaftar
        setVerificationResult({
          success: false,
          message: response.error || 'Wajah tidak terdaftar atau tidak cocok',
        });
      } else {
        // ❌ Error
        setError(response.error || 'Terjadi kesalahan');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      const errorMessage = err.message || 'Tidak dapat terhubung ke server';
      setError(errorMessage);
      setVerificationResult({
        success: false,
        message: errorMessage.includes('Tidak dapat terhubung') 
          ? errorMessage 
          : 'Terjadi kesalahan saat verifikasi',
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Handle video element when camera becomes active
  useEffect(() => {
    if (isCameraActive && videoRef.current) {
      const video = videoRef.current;
      
      // Check if stream is already set
      if (!video.srcObject) {
        console.log('Waiting for stream to be set...');
        return;
      }

      const handleLoadedMetadata = () => {
        console.log('Video metadata loaded, attempting to play...');
        video.play()
          .then(() => {
            console.log('Video playing successfully');
            setError(null);
          })
          .catch(err => {
            console.error('Error playing video:', err);
            setError('Tidak dapat memutar video dari kamera. Pastikan autoplay diizinkan.');
          });
      };

      const handlePlay = () => {
        console.log('Video is playing');
        setError(null);
      };

      const handleError = (e: any) => {
        console.error('Video error:', e);
        setError('Error saat memuat video dari kamera');
      };

      const handleCanPlay = () => {
        console.log('Video can play');
        if (video.paused) {
          video.play().catch(err => {
            console.error('Error in canPlay handler:', err);
          });
        }
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('play', handlePlay);
      video.addEventListener('error', handleError);

      // Try to play immediately if metadata is already loaded
      if (video.readyState >= 2) {
        video.play().catch(err => {
          console.error('Error playing video (readyState >= 2):', err);
        });
      }

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('error', handleError);
      };
    }
  }, [isCameraActive]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleBack = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-purple-100">
      {/* Simple Header */}
      <header className="bg-white/60 backdrop-blur-sm border-b border-purple-100">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Kembali
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Face Recognition</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Compact Info Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                type === 'member' 
                  ? 'bg-purple-100' 
                  : 'bg-blue-100'
              }`}>
                <span className="text-xl">{type === 'member' ? '👤' : '💪'}</span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  {type === 'member' ? 'Member' : 'Personal Trainer'}
                </p>
                <p className="text-lg font-semibold text-gray-900">{person}</p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                status === 'Valid'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {status}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 mb-1">Nomor</p>
              <p className="text-sm font-medium text-gray-900">{nomor}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Member</p>
              <p className="text-sm font-medium text-gray-900">{member}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">PT</p>
              <p className="text-sm font-medium text-gray-900">{pt}</p>
            </div>
          </div>
        </div>

        {/* Verification Card */}
        <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <CardContent className="p-6 space-y-6">

            {/* Face Recognition Area */}
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Verifikasi Wajah</h2>
                <p className="text-sm text-gray-500">Posisikan wajah Anda di depan kamera</p>
              </div>

              {/* Video Container */}
              <div className="relative w-full max-w-lg mx-auto aspect-video bg-gray-900 rounded-2xl overflow-hidden">
                {/* Video Element - Always render but conditionally show */}
                <div className={`relative w-full h-full ${!isCameraActive || verificationResult?.success ? 'hidden' : ''}`}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  {isScanning && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="w-12 h-12 mx-auto border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-white font-medium">Memindai wajah...</p>
                      </div>
                    </div>
                  )}
                  {!isScanning && isCameraActive && (
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                      <p className="text-white/90 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-medium inline-block">
                        Posisikan wajah di dalam frame
                      </p>
                    </div>
                  )}
                </div>

                {/* Initial State - No Camera */}
                {!isCameraActive && !verificationResult && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-700">Kamera belum aktif</p>
                      <p className="text-xs text-gray-500">Klik tombol di bawah untuk memulai</p>
                    </div>
                  </div>
                )}

                {/* Success Result */}
                {verificationResult?.success && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green-50">
                    <div className="text-center space-y-3 px-6">
                      <div className="w-16 h-16 mx-auto bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-green-900 mb-1">Verifikasi Berhasil!</h3>
                        <p className="text-sm text-green-700 font-medium">{verificationResult.user?.name}</p>
                        <p className="text-xs text-green-600 mt-1">{verificationResult.user?.email}</p>
                        {verificationResult.score && (
                          <p className="text-xs text-green-500 mt-2">
                            Confidence: {(verificationResult.score * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Failed Result */}
                {verificationResult && !verificationResult.success && (
                  <div className="absolute inset-0 flex items-center justify-center bg-orange-50">
                    <div className="text-center space-y-3 px-6">
                      <div className="w-16 h-16 mx-auto bg-orange-500 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-orange-900 mb-1">Verifikasi Gagal</h3>
                        <p className="text-sm text-orange-700">{verificationResult.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hidden Canvas for capture */}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm text-center">
                  {error}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-2">
              {!isCameraActive ? (
                <Button
                  onClick={startCamera}
                  className="w-full h-11 font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  Aktifkan Kamera
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button
                    onClick={handleStartVerification}
                    disabled={isScanning}
                    className="flex-1 h-11 font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white disabled:opacity-50"
                  >
                    {isScanning ? 'Memindai...' : 'Verifikasi Sekarang'}
                  </Button>
                  {!verificationResult?.success && (
                    <Button
                      onClick={stopCamera}
                      variant="outline"
                      className="h-11 px-4 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Matikan
                    </Button>
                  )}
                </div>
              )}
              {verificationResult && (
                <Button
                  onClick={() => {
                    setVerificationResult(null);
                    setError(null);
                    if (isCameraActive) {
                      stopCamera();
                    }
                  }}
                  variant="outline"
                  className="w-full h-11 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Coba Lagi
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function VerificationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Memuat...</div>
      </div>
    }>
      <VerificationContent />
    </Suspense>
  );
}

