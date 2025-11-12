'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

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

export default function VerificationPage() {
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

  // Validate face dengan API
  const validateFace = async (imageBase64: string) => {
    const response = await fetch('http://127.0.0.1:8088/api/validate-face', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_b64: imageBase64,
      }),
    });

    if (!response.ok) {
      throw new Error('Network error');
    }

    return await response.json();
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

    setIsScanning(true);
    setVerificationResult(null);
    setError(null);

    try {
      const imageBase64 = captureFrameFromVideo(videoRef.current);
      const response = await validateFace(imageBase64);

      if (response.ok && response.matched) {
        // ✅ SUCCESS - Wajah terdaftar dan cocok!
        setVerificationResult({
          success: true,
          message: 'Wajah terverifikasi!',
          user: response.candidate,
          score: response.best_score,
        });
        stopCamera();
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
      setError('Network error: ' + (err.message || 'Tidak dapat terhubung ke server'));
      setVerificationResult({
        success: false,
        message: 'Terjadi kesalahan saat verifikasi',
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
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b-2 border-purple-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Verifikasi Face Recognition
            </h1>
            <Button
              onClick={handleBack}
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              Kembali ke Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Card */}
        <Card className="shadow-xl border-2 border-purple-200 bg-white/90 backdrop-blur-sm mb-6">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-t-lg -m-6 mb-4">
            <CardTitle className="text-xl text-white">Informasi Booking</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Nomor</p>
                <p className="font-semibold text-gray-900">{nomor}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Member</p>
                <p className="font-semibold text-gray-900">{member}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Personal Trainer</p>
                <p className="font-semibold text-gray-900">{pt}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    status === 'Valid'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {status}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Card */}
        <Card className="shadow-xl border-2 border-purple-200 bg-white/90 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-t-lg -m-6 mb-4">
            <CardTitle className="text-2xl text-white">Verifikasi Face Recognition</CardTitle>
            <CardDescription className="text-purple-100">
              Verifikasi untuk {type === 'member' ? 'Member' : 'Personal Trainer'}: {person}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Selected Person Info */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border-2 border-purple-200">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  type === 'member' 
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-500'
                }`}>
                  <span className="text-3xl">{type === 'member' ? '👤' : '💪'}</span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    {type === 'member' ? 'Member' : 'Personal Trainer'}
                  </p>
                  <p className="text-xl font-bold text-gray-900">{person}</p>
                </div>
              </div>
            </div>

            {/* Face Recognition Area */}
            <div className="space-y-3">
              <Label className="text-base font-bold text-gray-700">Face Recognition</Label>
              <div className="border-2 border-dashed border-purple-300 rounded-xl p-4 bg-gradient-to-br from-purple-50 to-blue-50 min-h-[400px] flex flex-col items-center justify-center">
                {/* Video Element - Always render but conditionally show */}
                <div className={`relative w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden border-4 border-purple-400 shadow-2xl ${!isCameraActive || verificationResult?.success ? 'hidden' : ''}`}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }} // Mirror effect
                  />
                  {isScanning && (
                    <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center z-10">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 mx-auto border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-white font-semibold text-lg">Memindai wajah...</p>
                        <p className="text-white/80 text-sm">Harap tetap melihat ke kamera</p>
                      </div>
                    </div>
                  )}
                  {!isScanning && isCameraActive && (
                    <div className="absolute bottom-4 left-0 right-0 text-center z-10">
                      <p className="text-white bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-semibold inline-block">
                        Posisikan wajah di dalam frame
                      </p>
                    </div>
                  )}
                </div>

                {/* Initial State - No Camera */}
                {!isCameraActive && !verificationResult && (
                  <div className="text-center space-y-4">
                    <div className="w-24 h-24 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-5xl">📷</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-700">Siap untuk verifikasi</p>
                    <p className="text-sm text-gray-600">Aktifkan kamera untuk memulai face recognition</p>
                  </div>
                )}

                {/* Success Result */}
                {verificationResult?.success && (
                  <div className="w-full max-w-md p-6 bg-green-50 border-2 border-green-400 rounded-xl">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-3">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-green-800 font-bold text-xl">Verifikasi Berhasil!</h3>
                    </div>
                    <div className="space-y-2 text-green-700">
                      <p className="font-semibold text-lg">
                        Selamat datang, {verificationResult.user?.name}!
                      </p>
                      <p className="text-sm">
                        Email: {verificationResult.user?.email}
                      </p>
                      {verificationResult.score && (
                        <p className="text-xs text-green-600">
                          Confidence Score: {(verificationResult.score * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Failed Result */}
                {verificationResult && !verificationResult.success && (
                  <div className="w-full max-w-md p-6 bg-yellow-50 border-2 border-yellow-400 rounded-xl">
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mr-3">
                        <span className="text-2xl">⚠️</span>
                      </div>
                      <h3 className="text-yellow-800 font-bold text-xl">Verifikasi Gagal</h3>
                    </div>
                    <p className="text-yellow-800">{verificationResult.message}</p>
                  </div>
                )}

                {/* Hidden Canvas for capture */}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-300 text-red-700 rounded-xl text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              {!isCameraActive ? (
                <Button
                  onClick={startCamera}
                  className="flex-1 h-12 text-base font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  Aktifkan Kamera
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleStartVerification}
                    disabled={isScanning}
                    className="flex-1 h-12 text-base font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    {isScanning ? 'Memindai...' : 'Mulai Verifikasi'}
                  </Button>
                  {!verificationResult?.success && (
                    <Button
                      onClick={stopCamera}
                      variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      Matikan Kamera
                    </Button>
                  )}
                </>
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
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

