'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

export default function LoginPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [isBlinkDetected, setIsBlinkDetected] = useState(false);
  const [isWaitingForBlink, setIsWaitingForBlink] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const earHistoryRef = useRef<number[]>([]);
  const isBlinkDetectedRef = useRef<boolean>(false);
  const autoStartAttemptedRef = useRef<boolean>(false);

  // Pre-load model saat komponen mount
  useEffect(() => {
    loadModel().catch((error) => {
      console.error('Failed to pre-load model:', error);
    });
  }, []);

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
    
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  };

  // Load face landmarks detection model
  const loadModel = async () => {
    try {
      if (modelRef.current) {
        setIsModelLoaded(true);
        return modelRef.current;
      }
      
      setIsModelLoading(true);
      console.log('Loading face detection model...');
      
      await tf.ready();
      const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
      
      const tfjsConfig: faceLandmarksDetection.MediaPipeFaceMeshTfjsModelConfig = {
        runtime: 'tfjs',
        refineLandmarks: true,
        maxFaces: 1,
      };
      
      const detector = await faceLandmarksDetection.createDetector(model, tfjsConfig);
      modelRef.current = detector;
      setIsModelLoaded(true);
      setIsModelLoading(false);
      console.log('Model loaded successfully');
      return detector;
    } catch (error) {
      console.error('Error loading model:', error);
      setIsModelLoading(false);
      setIsModelLoaded(false);
      throw error;
    }
  };

  // Calculate Eye Aspect Ratio (EAR)
  const calculateEAR = (eyeLandmarks: number[][]): number => {
    if (eyeLandmarks.length < 6) return 0.3;
    
    try {
      const dist = (p1: number[], p2: number[]) => {
        return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
      };
      
      const vertical1 = dist(eyeLandmarks[1], eyeLandmarks[5]);
      const vertical2 = dist(eyeLandmarks[2], eyeLandmarks[4]);
      const horizontal = dist(eyeLandmarks[0], eyeLandmarks[3]);
      
      if (horizontal === 0 || horizontal < 1) return 0.3;
      
      const ear = (vertical1 + vertical2) / (2.0 * horizontal);
      
      if (isNaN(ear) || !isFinite(ear) || ear < 0 || ear > 1) {
        return 0.3;
      }
      
      return ear;
    } catch (error) {
      console.warn('EAR calculation error:', error);
      return 0.3;
    }
  };

  // Detect blink using eye landmarks
  const detectBlink = async (video: HTMLVideoElement): Promise<boolean> => {
    try {
      if (!modelRef.current || !video) return false;

      if (!detectionCanvasRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        detectionCanvasRef.current = canvas;
      }

      const canvas = detectionCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const faces = await modelRef.current.estimateFaces(canvas, {
        flipHorizontal: false,
        staticImageMode: false,
      });

      if (faces.length === 0) return false;

      const face = faces[0];
      const keypoints = face.keypoints;
      
      if (!keypoints || keypoints.length === 0) {
        return false;
      }
      
      const leftEyeIndices = [33, 133, 157, 158, 159, 160];
      const rightEyeIndices = [362, 263, 388, 387, 386, 385];

      const getPoint = (idx: number): [number, number] => {
        if (keypoints && keypoints.length > idx && keypoints[idx]) {
          const point = keypoints[idx];
          const x = point.x * canvas.width;
          const y = point.y * canvas.height;
          return [x, y];
        }
        return [0, 0];
      };

      const leftEyePoints = leftEyeIndices.map(idx => getPoint(idx));
      const rightEyePoints = rightEyeIndices.map(idx => getPoint(idx));

      const hasValidPoints = (points: number[][]) => {
        return points.some(p => p[0] !== 0 || p[1] !== 0);
      };

      if (!hasValidPoints(leftEyePoints) || !hasValidPoints(rightEyePoints)) {
        return false;
      }

      const leftEyeEAR = calculateEAR(leftEyePoints);
      const rightEyeEAR = calculateEAR(rightEyePoints);
      const avgEAR = (leftEyeEAR + rightEyeEAR) / 2.0;

      earHistoryRef.current.push(avgEAR);
      if (earHistoryRef.current.length > 10) {
        earHistoryRef.current.shift();
      }

      const MIN_BASELINE_EAR = 0.2;
      const MIN_ABSOLUTE_DROP = 0.015;
      const MIN_RELATIVE_DROP = 0.02;
      const MIN_FRAME_DROP = 0.015;
      
      if (earHistoryRef.current.length >= 2) {
        const currentEAR = earHistoryRef.current[earHistoryRef.current.length - 1];
        const baseline = earHistoryRef.current.slice(-3, -1);
        if (baseline.length < 1) return false;
        
        const avgBaseline = baseline.length > 0 
          ? baseline.reduce((a, b) => a + b, 0) / baseline.length 
          : currentEAR;
        
        const relativeDrop = avgBaseline > 0 ? (avgBaseline - currentEAR) / avgBaseline : 0;
        const absoluteDrop = avgBaseline - currentEAR;
        
        const prevEAR = earHistoryRef.current[earHistoryRef.current.length - 2] || avgBaseline;
        const frameDrop = prevEAR - currentEAR;
        
        const prev2EAR = earHistoryRef.current.length >= 3 
          ? earHistoryRef.current[earHistoryRef.current.length - 3] 
          : prevEAR;
        const twoFrameDrop = prev2EAR - currentEAR;
        
        const hasAbsoluteDrop = absoluteDrop >= MIN_ABSOLUTE_DROP;
        const hasRelativeDrop = relativeDrop >= MIN_RELATIVE_DROP;
        const hasFrameDrop = frameDrop >= MIN_FRAME_DROP;
        const hasTwoFrameDrop = twoFrameDrop >= 0.02;
        const isLower = currentEAR < avgBaseline;
        
        if (avgBaseline >= MIN_BASELINE_EAR && 
            (hasAbsoluteDrop || hasRelativeDrop || hasFrameDrop || hasTwoFrameDrop) &&
            isLower) {
          console.log('✅ Blink detected!');
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Blink detection error:', error);
      return false;
    }
  };

  // Start blink detection loop
  const startBlinkDetection = async () => {
    if (!videoRef.current || !isCameraActive) return;

    try {
      setIsWaitingForBlink(true);
      setError('');
      
      if (isModelLoading && !isModelLoaded && !modelRef.current) {
        let waitCount = 0;
        while (isModelLoading && !isModelLoaded && !modelRef.current && waitCount < 100) {
          await new Promise(resolve => setTimeout(resolve, 100));
          waitCount++;
        }
      }
      
      if (!modelRef.current && !isModelLoading) {
        try {
          await loadModel();
        } catch (modelError: any) {
          setError(`Gagal memuat model: ${modelError.message || 'Unknown error'}. Silakan coba refresh halaman.`);
          setIsWaitingForBlink(false);
          return;
        }
      }

      if (isModelLoading && !modelRef.current) {
        setError('Model masih dimuat. Mohon tunggu sebentar.');
        setIsWaitingForBlink(false);
        return;
      }

      if (!modelRef.current) {
        setError('Model tidak dapat dimuat. Silakan refresh halaman.');
        setIsWaitingForBlink(false);
        return;
      }

      setIsBlinkDetected(false);
      isBlinkDetectedRef.current = false;
      earHistoryRef.current = [];

      const detectLoop = async () => {
        if (!videoRef.current || !isCameraActive || isBlinkDetectedRef.current) {
          setIsWaitingForBlink(false);
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          return;
        }

        try {
          const blinked = await detectBlink(videoRef.current);
          
          if (blinked) {
            console.log('🎉 Blink detected! Starting login...');
            isBlinkDetectedRef.current = true;
            setIsBlinkDetected(true);
            setIsWaitingForBlink(false);
            
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
            
            setTimeout(() => {
              handleLogin();
            }, 300);
          } else {
            setTimeout(() => {
              if (!isBlinkDetectedRef.current && isCameraActive) {
                animationFrameRef.current = requestAnimationFrame(detectLoop);
              }
            }, 100);
          }
        } catch (error) {
          console.error('Error in detection loop:', error);
          setTimeout(() => {
            if (!isBlinkDetectedRef.current && isCameraActive) {
              animationFrameRef.current = requestAnimationFrame(detectLoop);
            }
          }, 100);
        }
      };

      detectLoop();
    } catch (error: any) {
      console.error('Error starting blink detection:', error);
      setError(`Gagal memulai deteksi kedipan: ${error?.message || 'Unknown error'}. Silakan refresh halaman.`);
      setIsWaitingForBlink(false);
      isBlinkDetectedRef.current = false;
    }
  };

  // Stop blink detection
  const stopBlinkDetection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsWaitingForBlink(false);
    isBlinkDetectedRef.current = false;
  };

  // Start camera
  const startCamera = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (!videoRef.current) {
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
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setError(null);
        
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
    stopBlinkDetection();
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  // Handle login dengan face recognition
  const handleLogin = async () => {
    if (!videoRef.current || !isCameraActive) {
      setError('Kamera belum aktif. Silakan aktifkan kamera terlebih dahulu.');
      return;
    }

    if (!isBlinkDetected && !isBlinkDetectedRef.current) {
      setError('Harus berkedip terlebih dahulu sebelum login.');
      return;
    }

    stopBlinkDetection();

    setIsScanning(true);
    setError(null);

    try {
      const imageBase64 = captureFrameFromVideo(videoRef.current);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          image_b64: imageBase64 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login gagal');
        setIsScanning(false);
        return;
      }

      // Simpan user data ke sessionStorage
      sessionStorage.setItem('user', JSON.stringify(data.user));
      
      // Jika role_id = 11 (Personal Trainer) dan ada clubName, set selectedClub
      if (data.user.roleId === 11 && data.user.clubName) {
        sessionStorage.setItem('selectedClub', data.user.clubName);
      }
      
      stopCamera();
      
      // Redirect ke dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError('Terjadi kesalahan: ' + err.message);
      setIsScanning(false);
    }
  };

  // Handle video element when camera becomes active
  useEffect(() => {
    if (isCameraActive && videoRef.current) {
      const video = videoRef.current;
      
      if (!video.srcObject) {
        return;
      }

      const handleLoadedMetadata = () => {
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

  // Auto-start blink detection when camera is active
  useEffect(() => {
    if (isCameraActive && videoRef.current && !isScanning && !isWaitingForBlink && !isBlinkDetected && !autoStartAttemptedRef.current) {
      const video = videoRef.current;
      
      const checkAndStart = () => {
        const modelReady = isModelLoaded || (!isModelLoading && modelRef.current);
        
        if (video.readyState >= 2 && modelReady) {
          console.log('Video and model are ready, auto-starting blink detection...');
          autoStartAttemptedRef.current = true;
          
          setTimeout(async () => {
            if (isCameraActive && videoRef.current && !isWaitingForBlink && !isBlinkDetected) {
              try {
                await startBlinkDetection();
              } catch (error) {
                console.error('Error auto-starting blink detection:', error);
                autoStartAttemptedRef.current = false;
              }
            }
          }, 200);
        } else {
          setTimeout(checkAndStart, 50);
        }
      };

      checkAndStart();
    }
    
    if (!isCameraActive) {
      autoStartAttemptedRef.current = false;
    }
  }, [isCameraActive, isScanning, isWaitingForBlink, isBlinkDetected, isModelLoaded, isModelLoading]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      
      <div className="w-full max-w-md relative z-10">
        <Card className="border border-gray-200/50 bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
          <CardHeader className="text-center space-y-5 pb-6 pt-8 px-8">
            <div className="mx-auto flex items-center justify-center">
              <div className="relative">
                <img 
                  src="/logo-temp.jpg"
                  alt="FTL Logo"
                  className="w-16 h-16 rounded-xl object-cover shadow-md ring-2 ring-gray-100"
                />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold text-gray-900 mb-1.5 tracking-tight">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-sm text-gray-500 font-normal">
                Login dengan Face Recognition
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="space-y-5">
              {/* Video Container */}
              <div 
                className="relative w-full mx-auto bg-gray-900 rounded-2xl overflow-hidden" 
                style={{ 
                  aspectRatio: '4/3', 
                  minHeight: '300px' 
                }}
              >
                {/* Video Element */}
                <div className={`relative w-full h-full ${!isCameraActive || isScanning ? 'hidden' : ''}`}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  {/* Blink Detection Indicator */}
                  {isWaitingForBlink && !isScanning && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center space-y-4 px-6">
                        <div className="relative w-20 h-20 mx-auto">
                          <div className="absolute inset-0 border-4 border-amber-400 rounded-full animate-ping"></div>
                          <div className="absolute inset-2 border-4 border-amber-300 rounded-full"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-10 h-10 text-amber-300 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <p className="text-white font-semibold text-lg mb-1">Berkediplah</p>
                          <p className="text-white/80 text-sm">Sistem sedang mendeteksi kedipan mata Anda</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {isScanning && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="text-center space-y-3">
                        <div className="w-12 h-12 mx-auto border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-white font-medium">Memindai wajah...</p>
                      </div>
                    </div>
                  )}
                  {!isScanning && !isWaitingForBlink && isCameraActive && (
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                      <p className="text-white/90 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-medium inline-block">
                        Posisikan wajah di dalam frame
                      </p>
                    </div>
                  )}
              </div>

                {/* Initial State - No Camera */}
                {!isCameraActive && !isScanning && (
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

                {/* Hidden Canvas for capture */}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50/90 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2.5">
                  <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                {!isCameraActive ? (
              <Button
                    onClick={startCamera}
                    disabled={isModelLoading}
                className="w-full h-11 text-base font-semibold bg-gray-900 hover:bg-gray-800 text-white shadow-sm hover:shadow-md transition-all duration-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                    {isModelLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                        Memuat model...
                  </span>
                    ) : (
                      'Aktifkan Kamera'
                    )}
                  </Button>
                ) : (
                  <div className="flex gap-3">
                    {isWaitingForBlink && !isScanning && (
                      <Button
                        disabled
                        className="flex-1 h-11 font-medium bg-amber-500 text-white opacity-75"
                      >
                        Menunggu Kedipan...
                      </Button>
                    )}
                    {isScanning && (
                      <Button
                        disabled
                        className="flex-1 h-11 font-medium bg-gray-900 text-white opacity-75"
                      >
                        Memindai Wajah...
                      </Button>
                    )}
                    {!isWaitingForBlink && !isScanning && (
                      <Button
                        disabled
                        className="flex-1 h-11 font-medium bg-gray-400 text-white opacity-75"
                      >
                        Menyiapkan Deteksi...
                      </Button>
                    )}
                    <Button
                      onClick={stopCamera}
                      variant="outline"
                      className="h-11 px-4 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Matikan
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
