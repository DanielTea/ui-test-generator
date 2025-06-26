'use client'

import { useState, useRef } from 'react'

interface AnalysisResult {
  title?: string
  summary: string
  steps?: Array<{
    order: number
    description: string
    expected_outcome?: string
  }>
  testSteps?: Array<{
    order: number
    description: string
    expected_outcome?: string
  }>
  variables?: string[]
}

export default function ScreenRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [frameCount, setFrameCount] = useState(30)
  const [showSettings, setShowSettings] = useState(false)
  const [extractedFrames, setExtractedFrames] = useState<string[]>([])
  const [showFrames, setShowFrames] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [videoLoading, setVideoLoading] = useState(false)
  
  // Video trimming state
  const [videoDuration, setVideoDuration] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null)
  const [showTrimmer, setShowTrimmer] = useState(false)
  const [previewFrames, setPreviewFrames] = useState<{start: string | null, end: string | null}>({start: null, end: null})
  const [showPreview, setShowPreview] = useState(false)
  const [trimmedVideo, setTrimmedVideo] = useState<string | null>(null)
  const [isTrimming, setIsTrimming] = useState(false)
  const [videoFullyLoaded, setVideoFullyLoaded] = useState(false)
  const [videoLoadingProgress, setVideoLoadingProgress] = useState(0)
  
  // Settings state for UI Test generation
  const [settings, setSettings] = useState({
    frameCount: 30, // Changed default to 30
    videoQuality: 0.8,
    maxRecordingTime: 300, // 5 minutes
    customPrompt: '',
    skipBlankFrames: true,
    frameStartPercent: 10,
    frameEndPercent: 90
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const checkPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      })
      stream.getTracks().forEach(track => track.stop())
      setPermissionGranted(true)
      setError(null)
    } catch (err: any) {
      setError(`Permission denied: ${err.message}. Please allow screen sharing to continue.`)
      setPermissionGranted(false)
    }
  }

  const startRecording = async () => {
    try {
      setError(null)
      
      // Clear any previous recording data when starting new recording
      if (recordedVideo) {
        URL.revokeObjectURL(recordedVideo)
      }
      setRecordedVideo(null)
      setAnalysis(null)
      setExtractedFrames([])
      setShowFrames(false)
      setRecordingTime(0)
      setVideoReady(false)
      setVideoLoading(false)
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      })

      streamRef.current = stream
      chunksRef.current = []

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm'
      })

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        const videoUrl = URL.createObjectURL(blob)
        setRecordedVideo(videoUrl)
        setIsRecording(false)
        setRecordingTime(0)
        setVideoReady(false)
        setVideoLoading(true)
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
      }

      // Handle stream ending (user stops sharing)
      stream.getVideoTracks()[0].onended = () => {
        stopRecording()
      }

      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (err: any) {
      setError(`Failed to start recording: ${err.message}`)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  // Function to intelligently select unique frames
  const selectUniqueFrames = (allFrames: string[], targetCount: number): string[] => {
    if (allFrames.length === 0) return []
    
    // Create a map to track unique frames with their first occurrence index
    const uniqueFrameMap = new Map<string, number>()
    const uniqueFrames: string[] = []
    
    // First pass: identify unique frames and their positions
    allFrames.forEach((frame, index) => {
      if (!uniqueFrameMap.has(frame)) {
        uniqueFrameMap.set(frame, index)
        uniqueFrames.push(frame)
      }
    })
    
    console.log(`📊 Found ${uniqueFrames.length} unique frames from ${allFrames.length} total`)
    
    // If we have fewer unique frames than requested, return all unique frames
    if (uniqueFrames.length <= targetCount) {
      console.log(`✅ Using all ${uniqueFrames.length} unique frames (requested ${targetCount})`)
      return uniqueFrames
    }
    
    // If we have more unique frames than needed, select evenly distributed ones
    const selectedFrames: string[] = []
    const step = (uniqueFrames.length - 1) / (targetCount - 1)
    
    for (let i = 0; i < targetCount; i++) {
      const index = Math.round(i * step)
      selectedFrames.push(uniqueFrames[index])
    }
    
    console.log(`🎯 Selected ${selectedFrames.length} frames evenly distributed from ${uniqueFrames.length} unique frames`)
    return selectedFrames
  }

  const analyzeVideo = async () => {
    if (!recordedVideo || !videoReady) {
      setError('Video is not ready for analysis yet. Please wait for the video to finish loading.')
      return
    }

    setIsAnalyzing(true)
    setError(null)

    try {
      console.log(`🎬 Starting frame extraction with settings:`, {
        frameCount: settings.frameCount,
        skipBlankFrames: settings.skipBlankFrames,
        frameStartPercent: settings.frameStartPercent,
        frameEndPercent: settings.frameEndPercent
      })
      
      // Use trimmed video if available, otherwise use original
      let videoToAnalyze = trimmedVideo || recordedVideo
      console.log(`🎬 Analyzing ${trimmedVideo ? 'trimmed' : 'original'} video`)
      
      // Extract multiple frames from video for UI test generation
      const frames = await extractMultipleFramesFromVideo(videoToAnalyze, settings.frameCount)
      
      console.log(`🎬 Frame extraction completed: ${frames?.length || 0} frames extracted`)
      
      if (!frames || frames.length === 0) {
        throw new Error('Failed to extract frames from video')
      }

      // Select unique frames intelligently
      const uniqueFrames = selectUniqueFrames(frames, settings.frameCount)
      console.log(`🎯 Selected ${uniqueFrames.length} unique frames from ${frames.length} total frames`)
      
      // Store frames for display
      setExtractedFrames(uniqueFrames)

      // Send frames to API for analysis
      const analysisResponse = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frames: uniqueFrames,
          settings: settings,
        }),
      })

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const result = await analysisResponse.json()
      setAnalysis(result)
    } catch (err: any) {
      setError(`Analysis failed: ${err.message}`)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Helper function to extract multiple frames from video for mouse tracking
  const extractMultipleFramesFromVideo = (videoUrl: string, frameCount: number): Promise<string[]> => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const frames: string[] = []
      let captureCount = 0
      let captureInterval: NodeJS.Timeout | null = null

      // Function to capture current frame during playback
      const captureCurrentFrame = (): string | null => {
        try {
          if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
            // Clear canvas first
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            // Draw the video frame
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            
            // Check if we actually drew something (not a black frame)
            const imageData = ctx.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height))
            const data = imageData.data
            let hasContent = false
            
            // Quick check for non-black pixels
            for (let i = 0; i < data.length; i += 40) { // Sample every 10th pixel
              if (data[i] > 20 || data[i + 1] > 20 || data[i + 2] > 20) {
                hasContent = true
                break
              }
            }
            
            if (hasContent || !settings.skipBlankFrames) {
              const base64 = canvas.toDataURL('image/jpeg', settings.videoQuality).split(',')[1]
              return base64
            }
          }
          return null
        } catch (error) {
          console.error('Error capturing frame:', error)
          return null
        }
      }

      const captureFrame = (timePosition: number): Promise<string | null> => {
        return new Promise((frameResolve) => {
          let timeoutId: NodeJS.Timeout
          
          const onSeeked = () => {
            clearTimeout(timeoutId)
            try {
              console.log(`Seeked to ${video.currentTime.toFixed(2)}s (requested ${timePosition.toFixed(2)}s)`)
              
              // Wait longer to ensure frame is fully loaded and rendered
              setTimeout(() => {
                if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
                  // Clear canvas first
                  ctx.clearRect(0, 0, canvas.width, canvas.height)
                  // Draw the video frame
                  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                  
                  // Check if we actually drew something (not a black frame)
                  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                  const data = imageData.data
                  let hasContent = false
                  let nonBlackPixels = 0
                  
                  // Check if there are non-black pixels
                  for (let i = 0; i < data.length; i += 4) {
                    if (data[i] > 10 || data[i + 1] > 10 || data[i + 2] > 10) {
                      hasContent = true
                      nonBlackPixels++
                      if (nonBlackPixels > 100) break // Early exit if we have enough content
                    }
                  }
                  
                  console.log(`Frame at ${timePosition.toFixed(2)}s: ${hasContent ? `✓ has content (${nonBlackPixels}+ pixels)` : '✗ appears black'}`)
                  
                  if (hasContent || !settings.skipBlankFrames) {
                    const base64 = canvas.toDataURL('image/jpeg', settings.videoQuality).split(',')[1]
                    frameResolve(base64)
                  } else {
                    console.log(`Frame at ${timePosition}s appears to be black, skipping`)
                    frameResolve(null)
                  }
                } else {
                  console.log(`Invalid video dimensions: ${video.videoWidth}x${video.videoHeight}`)
                  frameResolve(null)
                }
              }, 300) // Increased wait time
            } catch (error) {
              console.error('Error capturing frame:', error)
              frameResolve(null)
            }
            video.removeEventListener('seeked', onSeeked)
          }
          
          video.addEventListener('seeked', onSeeked)
          
          // Timeout fallback in case seeking gets stuck
          timeoutId = setTimeout(() => {
            console.log(`Seek timeout for position ${timePosition.toFixed(2)}s`)
            video.removeEventListener('seeked', onSeeked)
            frameResolve(null)
          }, 2000)
          
          // Set the time position
          if (isFinite(timePosition) && timePosition >= 0) {
            console.log(`Seeking to ${timePosition.toFixed(2)}s...`)
            video.currentTime = timePosition
          } else {
            clearTimeout(timeoutId)
            frameResolve(null)
          }
        })
      }

      // Wait for video to be fully ready
      const waitForVideoReady = () => {
        return new Promise<void>((readyResolve) => {
          const checkReady = () => {
            if (video.readyState >= 3) { // HAVE_FUTURE_DATA or better
              console.log(`Video ready state: ${video.readyState} (${['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'][video.readyState]})`)
              readyResolve()
            } else {
              console.log(`Video not ready yet, state: ${video.readyState}`)
              setTimeout(checkReady, 100)
            }
          }
          checkReady()
        })
      }

      video.onloadedmetadata = async () => {
        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        
        console.log(`Video metadata loaded: ${video.videoWidth}x${video.videoHeight}, duration: ${video.duration}s`)
        console.log(`Video ready state: ${video.readyState}`)
        console.log(`Requested frame count: ${frameCount}`)
        
        // Wait for video to be fully ready
        console.log('Waiting for video to be ready...')
        await waitForVideoReady()
        
        // Try playback-based capture first (more reliable for MediaRecorder videos)
        console.log('🎬 Attempting playback-based frame capture...')
        
        // Set up interval capture during playback
        const captureFramesDuringPlayback = async (): Promise<boolean> => {
          return new Promise((playbackResolve) => {
            let duration = video.duration
            if (!isFinite(duration)) {
              // Estimate duration for videos with Infinity duration
              duration = 30 // Assume max 30 seconds
            }
            
            const captureIntervalTime = Math.max(100, (duration * 1000) / (frameCount * 6)) // Capture even more frequently
            const targetFrames = frameCount * 2 // Capture more frames than needed to get good variety
            let lastCapturedTime = -999 // Start with a very negative value to allow first capture
            const minTimeBetweenCaptures = Math.max(0.3, duration / (frameCount * 2)) // Much smaller spacing to get more frames
            
            console.log(`📹 Starting playback capture: ${targetFrames} frames over ~${duration.toFixed(1)}s`)
            console.log(`  - Capture interval: ${captureIntervalTime.toFixed(0)}ms`)
            console.log(`  - Min time between captures: ${minTimeBetweenCaptures.toFixed(2)}s`)
            
            // Clear any existing frames
            frames.length = 0
            
            // Start capturing frames during playback
            captureInterval = setInterval(() => {
              if (frames.length >= targetFrames) {
                if (captureInterval) {
                  clearInterval(captureInterval)
                  captureInterval = null
                }
                return
              }
              
              const currentTime = video.currentTime
              console.log(`🎥 Playback check: currentTime=${currentTime.toFixed(2)}s, lastCaptured=${lastCapturedTime.toFixed(2)}s, diff=${(currentTime - lastCapturedTime).toFixed(2)}s`)
              
              // Only capture if we've moved forward enough
              if (currentTime - lastCapturedTime >= minTimeBetweenCaptures) {
                console.log(`🎯 Attempting capture at ${currentTime.toFixed(2)}s`)
                const frame = captureCurrentFrame()
                if (frame) {
                  frames.push(frame)
                  lastCapturedTime = currentTime
                  console.log(`📸 Captured frame ${frames.length}/${targetFrames} at ${currentTime.toFixed(2)}s during playback`)
                } else {
                  console.log(`❌ Failed to capture frame at ${currentTime.toFixed(2)}s`)
                }
              } else {
                console.log(`⏭️ Skipping capture - not enough time elapsed (need ${minTimeBetweenCaptures.toFixed(2)}s)`)
              }
            }, captureIntervalTime)
            
            // Handle playback end
            video.onended = () => {
              console.log(`🏁 Playback ended at ${video.currentTime.toFixed(2)}s`)
              if (captureInterval) {
                clearInterval(captureInterval)
                captureInterval = null
              }
              playbackResolve(frames.length > 0)
            }
            
            // Start playing
            video.playbackRate = Math.min(4, Math.max(1, duration / 5)) // Speed up for long videos
            console.log(`▶️ Starting playback at ${video.playbackRate}x speed`)
            video.play().catch(err => {
              console.error('Playback failed:', err)
              if (captureInterval) {
                clearInterval(captureInterval)
                captureInterval = null
              }
              playbackResolve(false)
            })
            
            // Timeout fallback
            setTimeout(() => {
              if (captureInterval) {
                clearInterval(captureInterval)
                captureInterval = null
              }
              video.pause()
              playbackResolve(frames.length > 0)
            }, Math.min(15000, duration * 1000 / video.playbackRate + 2000))
          })
        }
        
        // Try playback-based capture
        const playbackSuccess = await captureFramesDuringPlayback()
        
        if (playbackSuccess && frames.length >= frameCount * 0.6) {
          console.log(`✅ Playback capture successful: ${frames.length} frames captured`)
          
          // Check frame diversity
          const uniqueFrames = new Set(frames)
          console.log(`🔍 Frame diversity: ${uniqueFrames.size}/${frames.length} unique frames`)
          
          if (uniqueFrames.size > 1) {
            console.log(`✅ Good diversity, using playback frames`)
            resolve(frames)
            return
          } else {
            console.log(`⚠️ Poor diversity in playback frames, trying seeking approach`)
            frames.length = 0 // Clear frames for seeking approach
          }
        } else {
          console.log(`⚠️ Playback capture incomplete (${frames.length}/${frameCount}), falling back to seeking...`)
        }
        
        // Reset video for seeking approach
        video.pause()
        video.currentTime = 0
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Try to get a better duration estimate if duration is Infinity
        let actualDuration = video.duration
        if (!isFinite(video.duration)) {
          console.log('Duration is Infinity, trying to estimate actual duration...')
          // Try seeking to different positions to find the actual end
          const testPositions = [1, 2, 5, 10, 15, 20, 30, 60]
          for (const pos of testPositions) {
            try {
              const originalTime = video.currentTime
              video.currentTime = pos
              await new Promise(resolve => setTimeout(resolve, 200))
              if (video.currentTime < pos && video.currentTime > originalTime) {
                actualDuration = video.currentTime
                console.log(`Estimated duration: ${actualDuration}s (video stopped at ${pos}s seek)`)
                break
              }
            } catch (e) {
              console.log(`Failed to seek to ${pos}s`)
            }
          }
          // Reset to beginning
          video.currentTime = 0
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        if (!isFinite(actualDuration) || actualDuration <= 0) {
          console.log('Invalid duration, trying progressive seeking to find video length')
          
          // Try to find the actual video length by progressive seeking
          let foundDuration = 0
          const testPositions = [0.5, 1, 2, 3, 5, 8, 10, 15, 20, 30, 45, 60, 90, 120]
          
          for (const pos of testPositions) {
            try {
              video.currentTime = pos
              await new Promise(resolve => setTimeout(resolve, 200))
              if (video.currentTime >= pos - 0.1) {
                foundDuration = pos
                console.log(`Video can seek to ${pos}s`)
              } else {
                console.log(`Video stops at ${video.currentTime.toFixed(2)}s when seeking to ${pos}s`)
                foundDuration = Math.max(foundDuration, video.currentTime)
                break
              }
            } catch (e) {
              console.log(`Cannot seek to ${pos}s`)
              break
            }
          }
          
          if (foundDuration > 0) {
            console.log(`Found video duration: ${foundDuration}s`)
            actualDuration = foundDuration
            // Reset to beginning
            video.currentTime = 0
            await new Promise(resolve => setTimeout(resolve, 200))
          } else {
            console.log('Could not determine video duration, using small time intervals')
            // Try very small intervals near the beginning
            const smallIntervals = []
            for (let i = 0; i < frameCount; i++) {
              smallIntervals.push(i * 0.1) // 0.0s, 0.1s, 0.2s, etc.
            }
            
            console.log(`Trying small intervals:`, smallIntervals.map(t => t.toFixed(1)))
            
            for (let i = 0; i < smallIntervals.length; i++) {
              console.log(`Small interval: trying frame ${i + 1}/${smallIntervals.length} at ${smallIntervals[i].toFixed(1)}s`)
              const frame = await captureFrame(smallIntervals[i])
              if (frame) {
                frames.push(frame)
                console.log(`✓ Small interval frame ${i + 1} captured successfully`)
              }
            }
            console.log(`Small intervals captured ${frames.length}/${frameCount} frames`)
            resolve(frames)
            return
          }
        }

        // Handle very short videos (less than 1 second)
        if (actualDuration < 1.0) {
          console.log(`Very short video (${actualDuration}s), extracting frames at fixed intervals`)
          const timeStep = actualDuration / frameCount
          for (let i = 0; i < frameCount; i++) {
            const timePosition = Math.min(timeStep * i, actualDuration - 0.1)
            console.log(`Short video: extracting frame at ${timePosition.toFixed(2)}s`)
            const frame = await captureFrame(timePosition)
            if (frame) {
              frames.push(frame)
              console.log(`Successfully captured short video frame ${i + 1}`)
            }
          }
          console.log(`Short video captured ${frames.length} frames total`)
          resolve(frames)
          return
        }

        // Extract frames at regular intervals for normal videos
        const startTime = Math.max(0.1, actualDuration * (settings.frameStartPercent / 100)) // Start at configured % or 0.1s
        const endTime = Math.min(actualDuration - 0.2, actualDuration * (settings.frameEndPercent / 100)) // End at configured % with more buffer
        const availableTime = endTime - startTime
        const interval = frameCount > 1 ? availableTime / (frameCount - 1) : 0
        
        console.log(`🎬 Video Analysis Setup:`)
        console.log(`  - Actual duration: ${actualDuration.toFixed(2)}s`)
        console.log(`  - Start time: ${startTime.toFixed(2)}s (${settings.frameStartPercent}%)`)
        console.log(`  - End time: ${endTime.toFixed(2)}s (${settings.frameEndPercent}%)`)
        console.log(`  - Available time span: ${availableTime.toFixed(2)}s`)
        console.log(`  - Interval between frames: ${interval.toFixed(2)}s`)
        
        // Capture more frames than needed for better variety
        const extraFrameCount = Math.min(frameCount * 3, 100) // Capture up to 3x more frames, max 100
        const extraInterval = frameCount > 1 ? availableTime / (extraFrameCount - 1) : 0
        
        console.log(`  - Extracting ${extraFrameCount} frames for selection...`)
        
        const timePositions: number[] = []
        for (let i = 0; i < extraFrameCount; i++) {
          const timePosition = extraFrameCount > 1 ? startTime + (extraInterval * i) : startTime
          timePositions.push(timePosition)
        }
        
        console.log(`📍 Frame positions:`, timePositions.map(t => t.toFixed(2) + 's').join(', '))
        
        for (let i = 0; i < extraFrameCount; i++) {
          const timePosition = timePositions[i]
          console.log(`🎯 Extracting frame ${i + 1}/${extraFrameCount} at ${timePosition.toFixed(2)}s`)
          const frame = await captureFrame(timePosition)
          if (frame) {
            frames.push(frame)
            console.log(`✅ Successfully captured frame ${i + 1}/${extraFrameCount} at ${timePosition.toFixed(2)}s`)
          } else {
            console.log(`❌ Failed to capture frame ${i + 1}/${extraFrameCount} at ${timePosition.toFixed(2)}s`)
          }
        }
        
        console.log(`🎬 Final result: captured ${frames.length}/${frameCount} frames total`)
        console.log(`📊 Success rate: ${((frames.length / frameCount) * 100).toFixed(1)}%`)
        
        // Check if frames are actually different
        if (frames.length > 1) {
          const uniqueFrames = new Set(frames)
          console.log(`🔍 Frame diversity: ${uniqueFrames.size}/${frames.length} unique frames`)
          if (uniqueFrames.size === 1) {
            console.warn(`⚠️ WARNING: All frames appear to be identical! Trying alternative capture method...`)
            
            // Try one more approach: capture frames by playing and pausing at specific intervals
            frames.length = 0
            video.currentTime = 0
            await new Promise(resolve => setTimeout(resolve, 200))
            
            // Capture more frames than needed for better variety
            const extraFrameCount = Math.min(frameCount * 3, 100) // Capture up to 3x more frames, max 100
            
            console.log(`🔄 Attempting play-pause capture method for ${extraFrameCount} frames...`)
            for (let i = 0; i < extraFrameCount; i++) {
              const targetTime = (actualDuration / extraFrameCount) * i
              console.log(`⏯️ Play-pause capture ${i + 1}/${extraFrameCount} at ${targetTime.toFixed(2)}s`)
              
              video.currentTime = targetTime
              await new Promise(resolve => setTimeout(resolve, 200)) // Reduced wait time
              
              // Play briefly to ensure frame updates
              try {
                await video.play()
                await new Promise(resolve => setTimeout(resolve, 100))
                video.pause()
                await new Promise(resolve => setTimeout(resolve, 100))
                
                const frame = captureCurrentFrame()
                if (frame) {
                  frames.push(frame)
                  console.log(`✅ Play-pause captured frame ${i + 1}`)
                }
              } catch (e) {
                console.log(`❌ Play-pause failed for frame ${i + 1}`)
              }
            }
            
            const finalUniqueFrames = new Set(frames)
            console.log(`🔍 Play-pause diversity: ${finalUniqueFrames.size}/${frames.length} unique frames`)
            
          } else if (uniqueFrames.size < frames.length * 0.5) {
            console.warn(`⚠️ WARNING: Many frames appear to be duplicates (${uniqueFrames.size}/${frames.length} unique)`)
          } else {
            console.log(`✅ Good frame diversity: ${uniqueFrames.size} unique frames out of ${frames.length}`)
          }
        }
        
        resolve(frames)
      }

      video.oncanplaythrough = () => {
        console.log('Video can play through')
      }

      video.onerror = (e) => {
        console.error('Video loading error:', e)
        resolve(frames)
      }

      // Set video properties for better compatibility
      video.muted = true
      video.crossOrigin = 'anonymous'
      video.preload = 'auto' // Changed from 'metadata' to 'auto' for full loading
      video.src = videoUrl
      
      // Force load and wait for it to be ready
      video.load()
      
      // Also listen for canplaythrough event
      video.addEventListener('canplaythrough', () => {
        console.log('Video can play through - fully loaded')
      })
      
      video.addEventListener('loadeddata', () => {
        console.log('Video data loaded')
      })
      
      // Increased timeout for better reliability
      setTimeout(() => {
        console.log(`Timeout reached after 15s, returning ${frames.length} frames`)
        resolve(frames)
      }, 15000)
    })
  }

  const resetRecording = () => {
    if (recordedVideo) {
      URL.revokeObjectURL(recordedVideo)
    }
    if (trimmedVideo) {
      URL.revokeObjectURL(trimmedVideo)
    }
    setRecordedVideo(null)
    setTrimmedVideo(null)
    setAnalysis(null)
    setError(null)
    setRecordingTime(0)
    setExtractedFrames([])
    setShowFrames(false)
    setVideoReady(false)
    setVideoLoading(false)
    setShowTrimmer(false)
    setTrimStart(0)
    setTrimEnd(0)
    setVideoDuration(0)
    setPreviewFrames({start: null, end: null})
    setIsTrimming(false)
    setVideoFullyLoaded(false)
    setVideoLoadingProgress(0)
  }

  // Video loading and trimming functions
  const waitForVideoToFullyLoad = async (video: HTMLVideoElement): Promise<boolean> => {
    console.log('⏳ Waiting for video to fully load...')
    setVideoFullyLoaded(false)
    setVideoLoadingProgress(0)
    
    return new Promise((resolve) => {
      let progressInterval: NodeJS.Timeout
      let timeoutId: NodeJS.Timeout
      let resolved = false
      
      const cleanup = () => {
        if (progressInterval) clearInterval(progressInterval)
        if (timeoutId) clearTimeout(timeoutId)
      }
      
      let resolveOnce = (success: boolean) => {
        if (resolved) return
        resolved = true
        cleanup()
        setVideoFullyLoaded(success)
        if (success) setVideoLoadingProgress(100)
        resolve(success)
      }
      
      // Timeout after 30 seconds
      timeoutId = setTimeout(() => {
        console.log('⏰ Video loading timeout')
        resolveOnce(false)
      }, 30000)
      
      // Progress simulation (visual feedback)
      progressInterval = setInterval(() => {
        setVideoLoadingProgress(prev => Math.min(prev + 1, 90))
      }, 200)
      
      // Multiple event listeners for different loading stages
      const onLoadedMetadata = () => {
        console.log('📊 Metadata loaded, duration:', video.duration)
        setVideoLoadingProgress(30)
      }
      
      const onLoadedData = () => {
        console.log('📦 Data loaded, readyState:', video.readyState)
        setVideoLoadingProgress(60)
      }
      
      const onCanPlay = () => {
        console.log('▶️ Can play, duration:', video.duration)
        setVideoLoadingProgress(80)
      }
      
      const onCanPlayThrough = () => {
        console.log('🎬 Can play through - video fully loaded!')
        console.log('📊 Final stats - Duration:', video.duration, 'ReadyState:', video.readyState)
        
        if (isFinite(video.duration) && video.duration > 0) {
          resolveOnce(true)
        } else {
          console.log('❌ Duration still invalid after full load')
          resolveOnce(false)
        }
      }
      
      const onProgress = () => {
        if (video.buffered.length > 0) {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1)
          const progress = Math.min((bufferedEnd / video.duration) * 70 + 20, 90)
          setVideoLoadingProgress(progress)
        }
      }
      
      // Add all event listeners
      video.addEventListener('loadedmetadata', onLoadedMetadata)
      video.addEventListener('loadeddata', onLoadedData)
      video.addEventListener('canplay', onCanPlay)
      video.addEventListener('canplaythrough', onCanPlayThrough)
      video.addEventListener('progress', onProgress)
      
      // Cleanup function
      const removeListeners = () => {
        video.removeEventListener('loadedmetadata', onLoadedMetadata)
        video.removeEventListener('loadeddata', onLoadedData)
        video.removeEventListener('canplay', onCanPlay)
        video.removeEventListener('canplaythrough', onCanPlayThrough)
        video.removeEventListener('progress', onProgress)
      }
      
      // Clean up listeners when done
      const originalResolve = resolveOnce
      resolveOnce = (success: boolean) => {
        removeListeners()
        originalResolve(success)
      }
      
      // Check if already loaded
      if (video.readyState >= 4 && isFinite(video.duration) && video.duration > 0) {
        console.log('✅ Video already fully loaded')
        resolveOnce(true)
      }
    })
  }

  const initializeTrimmer = async (video: HTMLVideoElement) => {
    console.log('🎬 Initializing trimmer...')
    
    // First, wait for video to fully load
    const fullyLoaded = await waitForVideoToFullyLoad(video)
    
    if (!fullyLoaded) {
      console.log('❌ Video failed to load properly')
      return false
    }
    
    console.log('✅ Video fully loaded, initializing trimmer with duration:', video.duration)
    setVideoDuration(video.duration)
    setTrimStart(0)
    setTrimEnd(video.duration)
    setShowTrimmer(true)
    
    // Capture initial frames for start and end positions
    setTimeout(async () => {
      const startFrame = await captureFrameAtTime(0)
      const endFrame = await captureFrameAtTime(video.duration)
      setPreviewFrames({
        start: startFrame,
        end: endFrame
      })
    }, 500) // Small delay to ensure video is ready
    
    return true
  }

  const handleVideoLoadedMetadata = async (video: HTMLVideoElement) => {
    console.log('📹 Video metadata event triggered')
    await initializeTrimmer(video)
  }

  const handleTrimmerMouseDown = (type: 'start' | 'end', e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(type)
  }

  const handleTrimmerMouseMove = async (e: React.MouseEvent) => {
    if (!isDragging || !isFinite(videoDuration) || videoDuration <= 0) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return
    
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    const time = percentage * videoDuration
    
    setShowPreview(true)
    
    if (isDragging === 'start') {
      const newStartTime = Math.min(time, trimEnd - 0.1) // Ensure start is before end
      setTrimStart(newStartTime)
      
      // Capture preview frame for start position
      const frame = await captureFrameAtTime(newStartTime)
      if (frame) {
        setPreviewFrames(prev => ({ ...prev, start: frame }))
      }
    } else if (isDragging === 'end') {
      const newEndTime = Math.max(time, trimStart + 0.1) // Ensure end is after start
      setTrimEnd(newEndTime)
      
      // Capture preview frame for end position
      const frame = await captureFrameAtTime(newEndTime)
      if (frame) {
        setPreviewFrames(prev => ({ ...prev, end: frame }))
      }
    }
  }

  const handleTrimmerMouseUp = () => {
    setIsDragging(null)
    setShowPreview(false)
  }

  // Function to capture frame at specific time
  const captureFrameAtTime = async (timePosition: number): Promise<string | null> => {
    return new Promise((resolve) => {
      const video = document.querySelector('video') as HTMLVideoElement
      if (!video || !recordedVideo) {
        resolve(null)
        return
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }

      const originalTime = video.currentTime
      
      const onSeeked = () => {
        try {
          canvas.width = video.videoWidth || 320
          canvas.height = video.videoHeight || 240
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1]
          
          // Restore original time
          video.currentTime = originalTime
          video.removeEventListener('seeked', onSeeked)
          resolve(base64)
        } catch (error) {
          console.error('Error capturing preview frame:', error)
          video.removeEventListener('seeked', onSeeked)
          resolve(null)
        }
      }

      video.addEventListener('seeked', onSeeked)
      video.currentTime = timePosition
      
      // Timeout fallback
      setTimeout(() => {
        video.removeEventListener('seeked', onSeeked)
        resolve(null)
      }, 1000)
    })
  }

  const performVideoTrim = async (): Promise<void> => {
    if (!recordedVideo || !isFinite(videoDuration) || videoDuration <= 0) return

    setIsTrimming(true)
    console.log(`✂️ Starting video trim from ${formatTimeForTrimmer(trimStart)} to ${formatTimeForTrimmer(trimEnd)}`)

    try {
      // Use FFmpeg-like approach with MediaRecorder for better quality
      const video = document.createElement('video')
      video.src = recordedVideo
      video.muted = true
      
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve
      })

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      const chunks: Blob[] = []
      const stream = canvas.captureStream(30)
      const recorder = new MediaRecorder(stream, { 
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
      })

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      recorder.onstop = () => {
        const trimmedBlob = new Blob(chunks, { type: 'video/webm' })
        const trimmedUrl = URL.createObjectURL(trimmedBlob)
        
        // Clean up old trimmed video if it exists
        if (trimmedVideo) {
          URL.revokeObjectURL(trimmedVideo)
        }
        
        setTrimmedVideo(trimmedUrl)
        console.log('✅ Video trimmed successfully')
        setIsTrimming(false)
      }

      // Start recording
      recorder.start()
      
      // Seek to start position and play
      video.currentTime = trimStart
      
      const startTime = Date.now()
      const expectedDuration = (trimEnd - trimStart) * 1000 // Convert to milliseconds
      
      const drawFrame = () => {
        const elapsed = Date.now() - startTime
        
        if (elapsed >= expectedDuration || video.currentTime >= trimEnd) {
          recorder.stop()
          video.pause()
          return
        }
        
        if (video.readyState >= 2) { // HAVE_CURRENT_DATA
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        }
        
        requestAnimationFrame(drawFrame)
      }

      video.oncanplay = () => {
        video.play()
        drawFrame()
      }

    } catch (error) {
      console.error('Error trimming video:', error)
      setIsTrimming(false)
    }
  }

  const formatTimeForTrimmer = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) {
      return '00:00'
    }
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    if (key === 'frameCount') {
      setFrameCount(value)
    }
  }

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'screen-recorder-settings.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target?.result as string)
          setSettings(importedSettings)
          setFrameCount(importedSettings.frameCount || 5)
        } catch (error) {
          setError('Failed to import settings: Invalid JSON file')
        }
      }
      reader.readAsText(file)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Permission Check */}
      {!permissionGranted && (
        <div className="text-center mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            🔒 Screen Permission Required
          </h3>
          <p className="text-yellow-700 mb-4">
            We need permission to access your screen for recording.
          </p>
          <button
            onClick={checkPermissions}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Grant Permission
          </button>
        </div>
      )}

      {/* Settings Panel */}
      <div className="mb-6">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
        >
          <span>{showSettings ? '🔽' : '▶️'}</span>
          ⚙️ Recording & Analysis Settings
        </button>
        
        {showSettings && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
                             {/* UI Test Generation Settings */}
               <div className="space-y-3">
                 <h4 className="font-semibold text-gray-800">🧪 UI Test Settings</h4>
                
                                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     Frame Count ({settings.frameCount} frames)
                   </label>
                   <input
                     type="range"
                     min="3"
                     max="50"
                     value={settings.frameCount}
                     onChange={(e) => updateSetting('frameCount', Number(e.target.value))}
                     className="w-full"
                   />
                   <div className="flex justify-between text-xs text-gray-500 mt-1">
                     <span>3 frames</span>
                     <span>50 frames</span>
                   </div>
                   <div className="text-xs mt-1">
                     <span className={settings.frameCount <= 15 ? "text-green-600" : settings.frameCount <= 25 ? "text-yellow-600" : "text-red-600"}>
                       Est. cost: ~${(settings.frameCount * 0.015).toFixed(2)}
                       {settings.frameCount > 25 && " ⚠️ High cost"}
                       {settings.frameCount > 35 && " 💰 Very expensive"}
                     </span>
                   </div>
                 </div>

                                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     Test Detail Level
                   </label>
                   <select
                     value={settings.frameCount}
                     onChange={(e) => updateSetting('frameCount', Number(e.target.value))}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                   >
                     <option value={3}>Basic (3 frames)</option>
                     <option value={5}>Standard (5 frames)</option>
                     <option value={10}>Detailed (10 frames)</option>
                     <option value={15}>Comprehensive (15 frames)</option>
                     <option value={20}>High Detail (20 frames)</option>
                     <option value={30}>Ultra Detail (30 frames)</option>
                   </select>
                 </div>
              </div>

              {/* Recording Settings */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800">🎥 Recording Settings</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Video Quality ({Math.round(settings.videoQuality * 100)}%)
                  </label>
                  <input
                    type="range"
                    min="0.3"
                    max="1"
                    step="0.1"
                    value={settings.videoQuality}
                    onChange={(e) => updateSetting('videoQuality', Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Recording Time ({Math.round(settings.maxRecordingTime / 60)} min)
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="600"
                    step="30"
                    value={settings.maxRecordingTime}
                    onChange={(e) => updateSetting('maxRecordingTime', Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frame Range
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={settings.frameStartPercent}
                      onChange={(e) => updateSetting('frameStartPercent', Number(e.target.value))}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <span className="text-sm text-gray-500">% to</span>
                    <input
                      type="number"
                      min="50"
                      max="100"
                      value={settings.frameEndPercent}
                      onChange={(e) => updateSetting('frameEndPercent', Number(e.target.value))}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
              </div>
            </div>

                         {/* Advanced Settings */}
             <div className="border-t pt-4">
               <h4 className="font-semibold text-gray-800 mb-3">🔬 Advanced Options</h4>
               
               <div className="space-y-3">
                 <label className="flex items-center gap-2">
                   <input
                     type="checkbox"
                     checked={settings.skipBlankFrames}
                     onChange={(e) => updateSetting('skipBlankFrames', e.target.checked)}
                     className="rounded"
                   />
                   <span className="text-sm text-gray-700">Skip blank/black frames</span>
                 </label>

                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     Additional Test Instructions (optional)
                   </label>
                   <textarea
                     value={settings.customPrompt}
                     onChange={(e) => updateSetting('customPrompt', e.target.value)}
                     placeholder="e.g., 'Focus on login workflow', 'Include data validation steps'..."
                     className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm h-20"
                   />
                 </div>

                 {/* Cost Warning */}
                 {settings.frameCount > 20 && (
                   <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                     <div className="flex items-start gap-2">
                       <span className="text-yellow-600">⚠️</span>
                       <div className="text-sm">
                         <p className="font-medium text-yellow-800">High Detail Analysis</p>
                         <p className="text-yellow-700">
                           Using {settings.frameCount} frames will cost ~${(settings.frameCount * 0.015).toFixed(2)} per test generation.
                         </p>
                       </div>
                     </div>
                   </div>
                 )}
               </div>
             </div>

            {/* Settings Import/Export */}
            <div className="border-t pt-4 flex gap-2">
              <button
                onClick={exportSettings}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
              >
                📤 Export Settings
              </button>
              <label className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 cursor-pointer">
                📥 Import Settings
                <input
                  type="file"
                  accept=".json"
                  onChange={importSettings}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">❌ {error}</p>
        </div>
      )}

      {/* Recording Controls */}
      {permissionGranted && (
        <div className="text-center mb-6">
          {!isRecording && !recordedVideo && (
            <button
              onClick={startRecording}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 mx-auto"
            >
              🔴 Start Recording
            </button>
          )}

          {isRecording && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-lg font-mono">{formatTime(recordingTime)}</span>
                <span className="text-gray-600">Recording...</span>
              </div>
              <button
                onClick={stopRecording}
                className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                ⏹️ Stop Recording
              </button>
            </div>
          )}
        </div>
      )}

      {/* Video Player */}
      {recordedVideo && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">📹 Recorded Video</h3>
          <video
            controls
            className="w-full max-w-2xl mx-auto rounded-lg shadow-md"
            src={recordedVideo}
            onLoadedData={() => {
              console.log('Video data loaded')
              setVideoLoading(false)
            }}
            onCanPlay={async (e) => {
              const video = e.target as HTMLVideoElement
              console.log('📺 Video can play, duration:', video.duration)
              setVideoReady(true)
              if (videoDuration === 0) {
                await initializeTrimmer(video)
              }
            }}
            onCanPlayThrough={() => {
              console.log('Video can play through - fully ready')
              setVideoReady(true)
            }}
            onLoadedMetadata={(e) => {
              const video = e.target as HTMLVideoElement
              handleVideoLoadedMetadata(video)
            }}
            onDurationChange={async (e) => {
              const video = e.target as HTMLVideoElement
              console.log('⏱️ Duration changed:', video.duration)
              if (videoDuration === 0) {
                await initializeTrimmer(video)
              }
            }}
            onError={(e) => {
              console.error('Video error:', e)
              setVideoLoading(false)
              setVideoReady(false)
            }}
          />
          
          {/* Video Loading Progress */}
          {!videoFullyLoaded && videoLoadingProgress > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-blue-800 font-medium">Processing video...</span>
                <span className="text-blue-600 text-sm">{Math.round(videoLoadingProgress)}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${videoLoadingProgress}%` }}
                ></div>
              </div>
              <p className="text-blue-700 text-sm mt-2">
                Please wait while the video is being processed. The trimmer and analysis will be available once ready.
              </p>
            </div>
          )}
          
          {/* Video Trimmer */}
          {showTrimmer && videoFullyLoaded && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">✂️ Trim Video</h4>
                <span className="text-sm text-gray-600">
                  {formatTimeForTrimmer(trimEnd - trimStart)} selected
                </span>
              </div>
              
              <div className="mb-3">
                <div 
                  className="relative w-full h-8 bg-gray-300 rounded-lg cursor-pointer select-none"
                  onMouseMove={handleTrimmerMouseMove}
                  onMouseUp={handleTrimmerMouseUp}
                  onMouseLeave={handleTrimmerMouseUp}
                >
                  {/* Video timeline background */}
                  <div className="absolute inset-0 bg-blue-200 rounded-lg"></div>
                  
                  {/* Selected range */}
                  <div 
                    className="absolute top-0 bottom-0 bg-blue-500 rounded-lg"
                    style={{
                      left: `${(trimStart / videoDuration) * 100}%`,
                      width: `${((trimEnd - trimStart) / videoDuration) * 100}%`
                    }}
                  ></div>
                  
                  {/* Start handle */}
                  <div
                    className="absolute top-0 bottom-0 w-3 bg-blue-700 rounded-l-lg cursor-ew-resize hover:bg-blue-800 transition-colors"
                    style={{ left: `${(trimStart / videoDuration) * 100}%` }}
                    onMouseDown={(e) => handleTrimmerMouseDown('start', e)}
                  >
                    <div className="absolute top-1/2 left-1/2 w-1 h-4 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                  </div>
                  
                  {/* End handle */}
                  <div
                    className="absolute top-0 bottom-0 w-3 bg-blue-700 rounded-r-lg cursor-ew-resize hover:bg-blue-800 transition-colors"
                    style={{ left: `${(trimEnd / videoDuration) * 100 - 3}%` }}
                    onMouseDown={(e) => handleTrimmerMouseDown('end', e)}
                  >
                    <div className="absolute top-1/2 left-1/2 w-1 h-4 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-4">
                  <span>Start: {formatTimeForTrimmer(trimStart)}</span>
                  <span>End: {formatTimeForTrimmer(trimEnd)}</span>
                  <span className="text-blue-600 font-medium">
                    Duration: {formatTimeForTrimmer(trimEnd - trimStart)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setTrimStart(0)
                    setTrimEnd(videoDuration)
                    setPreviewFrames({start: null, end: null})
                    if (trimmedVideo) {
                      URL.revokeObjectURL(trimmedVideo)
                      setTrimmedVideo(null)
                    }
                  }}
                  className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                >
                  Reset
                </button>
              </div>
              
              {/* Trim Action Buttons */}
              <div className="flex items-center justify-center gap-3 mb-3">
                <button
                  onClick={performVideoTrim}
                  disabled={isTrimming || (trimStart === 0 && trimEnd === videoDuration)}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    isTrimming || (trimStart === 0 && trimEnd === videoDuration)
                      ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isTrimming ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Trimming...
                    </>
                  ) : (
                    <>✂️ Trim Video</>
                  )}
                </button>
                
                {trimmedVideo && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <span>✅</span>
                    <span>Video trimmed successfully!</span>
                  </div>
                )}
              </div>
              
              {/* Frame Previews */}
              {showPreview && (isDragging === 'start' && previewFrames.start || isDragging === 'end' && previewFrames.end) && (
                <div className="mt-3 p-3 bg-white border border-gray-300 rounded-lg">
                  <div className="text-xs font-medium text-gray-700 mb-2">
                    {isDragging === 'start' ? '🎬 Start Frame Preview' : '🎬 End Frame Preview'}
                  </div>
                  <div className="flex justify-center">
                    <img
                      src={`data:image/jpeg;base64,${isDragging === 'start' ? previewFrames.start : previewFrames.end}`}
                      alt={`${isDragging} frame preview`}
                      className="max-w-32 max-h-24 rounded border border-gray-200 shadow-sm"
                    />
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-1">
                    {isDragging === 'start' ? formatTimeForTrimmer(trimStart) : formatTimeForTrimmer(trimEnd)}
                  </div>
                </div>
              )}
              
              {/* Static Frame Previews when not dragging */}
              {!showPreview && (previewFrames.start || previewFrames.end) && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {previewFrames.start && (
                    <div className="p-2 bg-white border border-gray-300 rounded-lg">
                      <div className="text-xs font-medium text-gray-700 mb-1">Start Frame</div>
                      <img
                        src={`data:image/jpeg;base64,${previewFrames.start}`}
                        alt="Start frame"
                        className="w-full max-h-20 object-cover rounded border border-gray-200"
                      />
                      <div className="text-xs text-gray-500 text-center mt-1">
                        {formatTimeForTrimmer(trimStart)}
                      </div>
                    </div>
                  )}
                  {previewFrames.end && (
                    <div className="p-2 bg-white border border-gray-300 rounded-lg">
                      <div className="text-xs font-medium text-gray-700 mb-1">End Frame</div>
                      <img
                        src={`data:image/jpeg;base64,${previewFrames.end}`}
                        alt="End frame"
                        className="w-full max-h-20 object-cover rounded border border-gray-200"
                      />
                      <div className="text-xs text-gray-500 text-center mt-1">
                        {formatTimeForTrimmer(trimEnd)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Video Loading Status */}
          {videoLoading && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-blue-700">Processing video...</span>
              </div>
            </div>
          )}
          
          {!videoLoading && !videoReady && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-yellow-600">⏳</span>
                <span className="text-yellow-700">Video not ready for analysis yet</span>
              </div>
            </div>
          )}
          
          {/* Trimmed Video Preview */}
          {trimmedVideo && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">✂️ Trimmed Video Preview</h4>
              <video
                src={trimmedVideo}
                controls
                className="w-full max-w-md mx-auto rounded-lg shadow-md"
              />
              <div className="text-center mt-2 text-sm text-green-700">
                This trimmed video will be used for analysis
              </div>
            </div>
          )}
          
          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 p-2 bg-gray-100 border border-gray-300 rounded text-xs">
              <strong>Debug:</strong> videoDuration: {videoDuration}, showTrimmer: {showTrimmer.toString()}, 
              trimStart: {trimStart}, trimEnd: {trimEnd}
            </div>
          )}
          
          {videoReady && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  <span className="text-green-700">Video ready for analysis!</span>
                </div>
                {!showTrimmer && !videoFullyLoaded && videoLoadingProgress === 0 && (
                  <button
                    onClick={async () => {
                      const videoEl = document.querySelector('video') as HTMLVideoElement
                      if (videoEl) {
                        console.log('🔧 Manual trimmer activation, duration:', videoEl.duration)
                        const success = await initializeTrimmer(videoEl)
                        if (!success) {
                          // Force show with estimated duration
                          console.log('🔧 Forcing trimmer with estimated duration')
                          setVideoDuration(30) // Default 30 seconds
                          setTrimStart(0)
                          setTrimEnd(30)
                          setShowTrimmer(true)
                          setVideoFullyLoaded(true) // Allow usage
                        }
                      }
                    }}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    ✂️ Force Show Trimmer
                  </button>
                )}
              </div>
            </div>
          )}
          
                      <div className="space-y-4">
            {/* Frame Count and Preview */}
            <div className="flex items-center justify-center gap-4">
              <label className="text-sm font-medium text-gray-700">Test Detail:</label>
              <select
                value={settings.frameCount}
                onChange={(e) => updateSetting('frameCount', Number(e.target.value))}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value={3}>Basic (3 frames - ~$0.05)</option>
                <option value={5}>Standard (5 frames - ~$0.08)</option>
                <option value={10}>Detailed (10 frames - ~$0.15)</option>
                <option value={15}>Comprehensive (15 frames - ~$0.25)</option>
                <option value={20}>High Detail (20 frames - ~$0.30)</option>
                <option value={30}>Ultra Detail (30 frames - ~$0.45)</option>
              </select>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              >
                ⚙️ Settings
              </button>
              {extractedFrames.length > 0 && (
                <button
                  onClick={() => setShowFrames(!showFrames)}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                >
                  🖼️ {showFrames ? 'Hide' : 'Show'} Frames ({extractedFrames.length})
                </button>
              )}
            </div>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={analyzeVideo}
                disabled={isAnalyzing || !videoReady || !videoFullyLoaded}
                className={`px-6 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  isAnalyzing || !videoReady || !videoFullyLoaded
                    ? 'bg-gray-400 cursor-not-allowed text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing {settings.frameCount} frames...
                  </>
                ) : !videoFullyLoaded ? (
                  <>⏳ Processing video... ({Math.round(videoLoadingProgress)}%)</>
                ) : !videoReady ? (
                  <>⏳ Waiting for video to be ready...</>
                ) : (
                  <>
                    🧪 Generate UI Test ({settings.frameCount} frames)
                    {trimmedVideo && <span className="text-blue-200 text-xs ml-2">(trimmed)</span>}
                  </>
                )}
              </button>
              
              <button
                onClick={resetRecording}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                🔄 New Recording
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Frames Preview */}
      {extractedFrames.length > 0 && showFrames && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">
            🖼️ Unique Frames Sent to AI ({extractedFrames.length} selected from captured frames)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {extractedFrames.map((frame, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <img
                  src={`data:image/jpeg;base64,${frame}`}
                  alt={`Frame ${index + 1}`}
                  className="w-full h-32 object-cover"
                />
                <div className="p-2 bg-gray-50 text-center">
                  <span className="text-xs text-gray-600">Frame {index + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UI Test Results */}
      {analysis && (
        <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <h3 className="text-xl font-semibold mb-4 text-blue-900">
            🧠 {analysis.title || 'UI Test Analysis Results'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">📋 Summary:</h4>
              <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
            </div>
            
            {(analysis.steps || analysis.testSteps) && (analysis.steps || analysis.testSteps)!.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">🧪 Generated UI Test Steps:</h4>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 text-sm font-mono">
                    {JSON.stringify({
                      title: analysis.title,
                      summary: analysis.summary,
                      steps: analysis.steps || analysis.testSteps,
                      variables: analysis.variables
                    }, null, 2)}
                  </pre>
                </div>
                <button
                  onClick={() => {
                    const testData = {
                      title: analysis.title,
                      summary: analysis.summary,
                      steps: analysis.steps || analysis.testSteps,
                      variables: analysis.variables
                    }
                    navigator.clipboard.writeText(JSON.stringify(testData, null, 2))
                    // You could add a toast notification here
                  }}
                  className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                >
                  📋 Copy Test JSON
                </button>
              </div>
            )}

            {analysis.variables && analysis.variables.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">🔧 Detected Variables:</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.variables.map((variable, index) => (
                    <span key={index} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-mono">
                      {variable}
                    </span>
                  ))}
                </div>
              </div>
            )}
            

          </div>
        </div>
      )}

      {/* Instructions */}
            {!recordedVideo && permissionGranted && !isRecording && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">🧪 How to Generate UI Tests:</h4>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            <li>Click "Start Recording" to capture your screen</li>
            <li>Perform the UI workflow you want to test (login, navigation, etc.)</li>
            <li>Click "Stop Recording" when finished</li>
            <li>Choose test detail level (more frames = more detailed steps)</li>
            <li>Click "Generate UI Test" to create your test script</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="font-semibold text-blue-800 mb-2">🎯 Test Generation:</h5>
            <p className="text-blue-700 text-sm">
              The AI analyzes key frames from your recording to generate step-by-step UI test scripts. 
              The generated tests include exact element descriptions, variable placeholders, and expected outcomes.
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 