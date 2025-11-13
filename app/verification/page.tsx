'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

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
  const detectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const modelRef = useRef<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBlinkDetected, setIsBlinkDetected] = useState(false);
  const [isWaitingForBlink, setIsWaitingForBlink] = useState(false);
  const [blinkCount, setBlinkCount] = useState(0);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const earHistoryRef = useRef<number[]>([]);
  const isBlinkDetectedRef = useRef<boolean>(false);
  const autoStartAttemptedRef = useRef<boolean>(false);

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

  // Pre-load model saat komponen mount untuk mengurangi delay
  useEffect(() => {
    // Load model di background saat halaman dimuat
    loadModel().catch((error) => {
      console.error('Failed to pre-load model:', error);
      // Don't set error state here - will be handled when blink detection starts
    });
  }, []); // Run once on mount

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
      
      // Use TensorFlow.js runtime (more reliable, no external dependencies)
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

  // Calculate Eye Aspect Ratio (EAR) - standard formula
  const calculateEAR = (eyeLandmarks: number[][]): number => {
    if (eyeLandmarks.length < 6) return 0.3; // Default if not enough points
    
    // EAR formula: (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
    // Where:
    // p1 (index 0): left corner
    // p2 (index 1): top left
    // p3 (index 2): top right
    // p4 (index 3): right corner
    // p5 (index 4): bottom right
    // p6 (index 5): bottom left
    
    try {
      // Calculate Euclidean distances
      const dist = (p1: number[], p2: number[]) => {
        return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
      };
      
      // Vertical distances (top to bottom)
      const vertical1 = dist(eyeLandmarks[1], eyeLandmarks[5]); // top-left to bottom-left
      const vertical2 = dist(eyeLandmarks[2], eyeLandmarks[4]); // top-right to bottom-right
      
      // Horizontal distance (left to right corner)
      const horizontal = dist(eyeLandmarks[0], eyeLandmarks[3]);
      
      if (horizontal === 0 || horizontal < 1) return 0.3; // Avoid division by zero or too small
      
      const ear = (vertical1 + vertical2) / (2.0 * horizontal);
      
      // Validate result
      if (isNaN(ear) || !isFinite(ear) || ear < 0 || ear > 1) {
        return 0.3; // Default value for invalid EAR
      }
      
      return ear;
    } catch (error) {
      console.warn('EAR calculation error:', error);
      return 0.3; // Default value
    }
  };

  // Detect blink using eye landmarks
  const detectBlink = async (video: HTMLVideoElement): Promise<boolean> => {
    try {
      if (!modelRef.current || !video) return false;

      // Create detection canvas if not exists
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

      // Detect faces
      const faces = await modelRef.current.estimateFaces(canvas, {
        flipHorizontal: false,
        staticImageMode: false,
      });

      if (faces.length === 0) return false;

      const face = faces[0];
      const keypoints = face.keypoints;
      
      // Check if keypoints exist
      if (!keypoints || keypoints.length === 0) {
        return false;
      }
      
      // MediaPipe Face Mesh eye landmark indices (468 total landmarks)
      // Using standard EAR keypoints for more accurate detection
      // Left eye EAR points: [33, 133, 157, 158, 159, 160]
      // - 33: left corner, 133: right corner
      // - 157: top left, 158: top right
      // - 159: bottom left, 160: bottom right
      // Right eye EAR points: [362, 263, 388, 387, 386, 385]
      // - 362: left corner, 263: right corner
      // - 388: top left, 387: top right
      // - 386: bottom left, 385: bottom right
      const leftEyeIndices = [33, 133, 157, 158, 159, 160];
      const rightEyeIndices = [362, 263, 388, 387, 386, 385];

      // Get eye landmarks from keypoints array
      const getPoint = (idx: number): [number, number] => {
        if (keypoints && keypoints.length > idx && keypoints[idx]) {
          const point = keypoints[idx];
          // TensorFlow.js returns normalized coordinates (0-1)
          const x = point.x * canvas.width;
          const y = point.y * canvas.height;
          return [x, y];
        }
        return [0, 0];
      };

      const leftEyePoints = leftEyeIndices.map(idx => getPoint(idx));
      const rightEyePoints = rightEyeIndices.map(idx => getPoint(idx));

      // Check if we have valid points (not all zeros)
      const hasValidPoints = (points: number[][]) => {
        return points.some(p => p[0] !== 0 || p[1] !== 0);
      };

      if (!hasValidPoints(leftEyePoints) || !hasValidPoints(rightEyePoints)) {
        return false;
      }

      // Calculate EAR for both eyes
      const leftEyeEAR = calculateEAR(leftEyePoints);
      const rightEyeEAR = calculateEAR(rightEyePoints);
      const avgEAR = (leftEyeEAR + rightEyeEAR) / 2.0;

      // Store EAR history
      earHistoryRef.current.push(avgEAR);
      if (earHistoryRef.current.length > 10) {
        earHistoryRef.current.shift();
      }

      // Blink detection - maximum sensitivity for natural blinks
      // Using very low thresholds and multiple detection methods
      const MIN_BASELINE_EAR = 0.2; // Very low minimum baseline
      const MIN_ABSOLUTE_DROP = 0.015; // Ultra low absolute drop (0.015)
      const MIN_RELATIVE_DROP = 0.02; // 2% relative drop (very sensitive)
      const MIN_FRAME_DROP = 0.015; // Frame-to-frame drop (very sensitive)
      
      if (earHistoryRef.current.length >= 2) {
        const currentEAR = earHistoryRef.current[earHistoryRef.current.length - 1];
        // Get baseline from last 2-3 frames (very short window)
        const baseline = earHistoryRef.current.slice(-3, -1);
        if (baseline.length < 1) return false;
        
        const avgBaseline = baseline.length > 0 
          ? baseline.reduce((a, b) => a + b, 0) / baseline.length 
          : currentEAR;
        
        // Calculate drops
        const relativeDrop = avgBaseline > 0 ? (avgBaseline - currentEAR) / avgBaseline : 0;
        const absoluteDrop = avgBaseline - currentEAR;
        
        // Frame-to-frame comparison (most sensitive)
        const prevEAR = earHistoryRef.current[earHistoryRef.current.length - 2] || avgBaseline;
        const frameDrop = prevEAR - currentEAR;
        
        // Also compare with 2 frames ago for more stability
        const prev2EAR = earHistoryRef.current.length >= 3 
          ? earHistoryRef.current[earHistoryRef.current.length - 3] 
          : prevEAR;
        const twoFrameDrop = prev2EAR - currentEAR;
        
        // Log for debugging (every frame for maximum visibility)
        console.log('EAR Debug:', {
          current: currentEAR.toFixed(3),
          baseline: avgBaseline.toFixed(3),
          prev: prevEAR.toFixed(3),
          prev2: prev2EAR.toFixed(3),
          absoluteDrop: absoluteDrop.toFixed(3),
          frameDrop: frameDrop.toFixed(3),
          twoFrameDrop: twoFrameDrop.toFixed(3),
          relativeDrop: (relativeDrop * 100).toFixed(1) + '%',
          thresholds: {
            abs: MIN_ABSOLUTE_DROP.toFixed(3),
            rel: (MIN_RELATIVE_DROP * 100).toFixed(0) + '%',
            frame: MIN_FRAME_DROP.toFixed(3)
          }
        });
        
        // Maximum sensitivity: ANY drop condition triggers blink
        // Condition 1: Absolute drop >= 0.015
        // Condition 2: Relative drop >= 2%
        // Condition 3: Frame-to-frame drop >= 0.015
        // Condition 4: Two-frame drop >= 0.02 (catches slower blinks)
        // Condition 5: Current EAR is lower than baseline (even slightly)
        const hasAbsoluteDrop = absoluteDrop >= MIN_ABSOLUTE_DROP;
        const hasRelativeDrop = relativeDrop >= MIN_RELATIVE_DROP;
        const hasFrameDrop = frameDrop >= MIN_FRAME_DROP;
        const hasTwoFrameDrop = twoFrameDrop >= 0.02;
        const isLower = currentEAR < avgBaseline;
        
        // Blink detected if baseline is valid AND any drop condition is met AND current is lower
        if (avgBaseline >= MIN_BASELINE_EAR && 
            (hasAbsoluteDrop || hasRelativeDrop || hasFrameDrop || hasTwoFrameDrop) &&
            isLower) {
          console.log('✅ Blink detected!', {
            currentEAR: currentEAR.toFixed(3),
            baseline: avgBaseline.toFixed(3),
            prevEAR: prevEAR.toFixed(3),
            absoluteDrop: absoluteDrop.toFixed(3),
            frameDrop: frameDrop.toFixed(3),
            twoFrameDrop: twoFrameDrop.toFixed(3),
            relativeDrop: (relativeDrop * 100).toFixed(1) + '%',
            condition: hasAbsoluteDrop ? 'absolute' : hasRelativeDrop ? 'relative' : hasFrameDrop ? 'frame' : 'two-frame'
          });
          return true; // Blink detected
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
      // Set waiting state immediately for better UX
      setIsWaitingForBlink(true);
      setError(null); // Clear previous errors
      
      // Wait for model to load if it's still loading (but only if not already loaded)
      if (isModelLoading && !isModelLoaded && !modelRef.current) {
        console.log('Waiting for model to finish loading...');
        // Wait up to 10 seconds for model to load
        let waitCount = 0;
        while (isModelLoading && !isModelLoaded && !modelRef.current && waitCount < 100) {
          await new Promise(resolve => setTimeout(resolve, 100));
          waitCount++;
        }
      }
      
      // Load model if not loaded yet and not currently loading
      if (!modelRef.current && !isModelLoading) {
        try {
          await loadModel();
        } catch (modelError: any) {
          console.error('Model loading error:', modelError);
          setError(`Gagal memuat model: ${modelError.message || 'Unknown error'}. Silakan coba refresh halaman.`);
          setIsWaitingForBlink(false);
          return;
        }
      }
      
      // If model is still loading after wait, show error
      if (isModelLoading && !modelRef.current) {
        setError('Model masih dimuat. Mohon tunggu sebentar.');
        setIsWaitingForBlink(false);
        return;
      }

      // Verify model is loaded
      if (!modelRef.current) {
        setError('Model tidak dapat dimuat. Silakan refresh halaman.');
        setIsWaitingForBlink(false);
        return;
      }

      setIsBlinkDetected(false);
      isBlinkDetectedRef.current = false;
      setBlinkCount(0);
      earHistoryRef.current = [];

      const detectLoop = async () => {
        // Check if we should stop
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
            console.log('🎉 Blink detected! Stopping detection and starting verification...');
            isBlinkDetectedRef.current = true;
            setIsBlinkDetected(true);
            setIsWaitingForBlink(false);
            setBlinkCount(prev => prev + 1);
            
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
              animationFrameRef.current = null;
            }
            
            // Auto trigger verification after blink detected
            setTimeout(() => {
              handleStartVerification();
            }, 300);
          } else {
            // Continue detection loop - use setTimeout for async operations
            setTimeout(() => {
              if (!isBlinkDetectedRef.current && isCameraActive) {
                animationFrameRef.current = requestAnimationFrame(detectLoop);
              }
            }, 100); // Check every 100ms (10 FPS for detection)
          }
        } catch (error) {
          console.error('Error in detection loop:', error);
          // Continue loop even if there's an error
          setTimeout(() => {
            if (!isBlinkDetectedRef.current && isCameraActive) {
              animationFrameRef.current = requestAnimationFrame(detectLoop);
            }
          }, 100);
        }
      };

      // Start detection loop
      console.log('Starting blink detection loop...');
      detectLoop();
    } catch (error: any) {
      console.error('Error starting blink detection:', error);
      const errorMessage = error?.message || 'Unknown error';
      setError(`Gagal memulai deteksi kedipan: ${errorMessage}. Silakan refresh halaman.`);
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

      // Set video constraints untuk landscape mode
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
    stopBlinkDetection();
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  // Capture dan validate - Only called after blink is detected
  const handleStartVerification = async () => {
    if (!videoRef.current || !isCameraActive) {
      setError('Kamera belum aktif. Silakan aktifkan kamera terlebih dahulu.');
      return;
    }

    if (!person || !type) {
      setError('Data tidak lengkap. Silakan kembali ke dashboard.');
      return;
    }

    // Ensure blink was detected before verification (mandatory)
    if (!isBlinkDetected && !isBlinkDetectedRef.current) {
      console.warn('Verification attempted without blink detection');
      setError('Harus berkedip terlebih dahulu sebelum verifikasi.');
      return;
    }

    // Stop blink detection before verification
    stopBlinkDetection();

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

  // Auto-start blink detection when camera is active and video is playing
  useEffect(() => {
    if (isCameraActive && videoRef.current && !verificationResult && !isWaitingForBlink && !isBlinkDetected && !autoStartAttemptedRef.current) {
      const video = videoRef.current;
      
      // Check if video is actually playing and model is ready - faster retry
      const checkAndStart = () => {
        // Check if model is loaded (or at least not loading anymore)
        const modelReady = isModelLoaded || (!isModelLoading && modelRef.current);
        
        // More lenient check - just need video to be ready and model to be ready
        if (video.readyState >= 2 && modelReady) {
          console.log('Video and model are ready, auto-starting blink detection...');
          autoStartAttemptedRef.current = true;
          
          // Minimal delay to ensure video stream is stable
          setTimeout(async () => {
            if (isCameraActive && videoRef.current && !isWaitingForBlink && !isBlinkDetected) {
              try {
                await startBlinkDetection();
              } catch (error) {
                console.error('Error auto-starting blink detection:', error);
                autoStartAttemptedRef.current = false; // Reset on error to allow retry
              }
            }
          }, 200); // Reduced from 800ms to 200ms for faster start
        } else {
          // Faster retry - check every 50ms
          setTimeout(checkAndStart, 50);
        }
      };

      // Start checking immediately (reduced from 500ms)
      checkAndStart();
    }
    
    // Reset auto-start flag when camera is turned off
    if (!isCameraActive) {
      autoStartAttemptedRef.current = false;
    }
  }, [isCameraActive, verificationResult, isWaitingForBlink, isBlinkDetected, isModelLoaded, isModelLoading]);

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
              <div 
                className="relative w-full max-w-lg mx-auto bg-gray-900 rounded-2xl overflow-hidden" 
                style={{ 
                  aspectRatio: '4/3', 
                  maxHeight: 'calc(100vh - 400px)', 
                  minHeight: '300px' 
                }}
              >
                {/* Video Element - Always render but conditionally show */}
                <div className={`relative w-full h-full ${!isCameraActive || verificationResult?.success ? 'hidden' : ''}`}>
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
                      className="flex-1 h-11 font-medium bg-gradient-to-r from-purple-600 to-blue-600 text-white opacity-75"
                    >
                      Memindai Wajah...
                    </Button>
                  )}
                  {!isWaitingForBlink && !isScanning && !verificationResult && (
                    <Button
                      disabled
                      className="flex-1 h-11 font-medium bg-gray-400 text-white opacity-75"
                    >
                      Menyiapkan Deteksi...
                    </Button>
                  )}
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
                  onClick={async () => {
                    setVerificationResult(null);
                    setError(null);
                    setIsBlinkDetected(false);
                    isBlinkDetectedRef.current = false;
                    setIsWaitingForBlink(false);
                    autoStartAttemptedRef.current = false;
                    stopBlinkDetection();
                    
                    // Restart camera and auto-start blink detection
                    if (isCameraActive) {
                      stopCamera();
                      await new Promise(resolve => setTimeout(resolve, 300));
                      await startCamera();
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

