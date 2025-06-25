'use client'

import { useState, useRef } from 'react'

interface AnalysisResult {
  summary: string
  testSteps?: Array<{
    order: number
    description: string
    expected_outcome?: string
  }>
  suggestions?: string[]
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
  const [frameCount, setFrameCount] = useState(5)
  const [showSettings, setShowSettings] = useState(false)
  const [extractedFrames, setExtractedFrames] = useState<string[]>([])
  const [showFrames, setShowFrames] = useState(false)
  
  // Settings state for UI Test generation
  const [settings, setSettings] = useState({
    frameCount: 5,
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

  const analyzeVideo = async () => {
    if (!recordedVideo) return

    setIsAnalyzing(true)
    setError(null)

    try {
      console.log(`🎬 Starting frame extraction with settings:`, {
        frameCount: settings.frameCount,
        skipBlankFrames: settings.skipBlankFrames,
        frameStartPercent: settings.frameStartPercent,
        frameEndPercent: settings.frameEndPercent
      })
      
      // Extract multiple frames from video for UI test generation
      const frames = await extractMultipleFramesFromVideo(recordedVideo, settings.frameCount)
      
      console.log(`🎬 Frame extraction completed: ${frames?.length || 0} frames extracted`)
      
      if (!frames || frames.length === 0) {
        throw new Error('Failed to extract frames from video')
      }

      // Store frames for display
      setExtractedFrames(frames)

      // Send frames to API for analysis
      const analysisResponse = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frames: frames,
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
            
            const captureIntervalTime = Math.max(100, (duration * 1000) / (frameCount * 2)) // Capture more frequently than needed
            const targetFrames = frameCount
            let lastCapturedTime = -1
            const minTimeBetweenCaptures = duration / frameCount * 0.8 // Ensure good spacing
            
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
              // Only capture if we've moved forward enough
              if (currentTime - lastCapturedTime >= minTimeBetweenCaptures) {
                const frame = captureCurrentFrame()
                if (frame) {
                  frames.push(frame)
                  lastCapturedTime = currentTime
                  console.log(`📸 Captured frame ${frames.length}/${targetFrames} at ${currentTime.toFixed(2)}s during playback`)
                }
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
        
        if (playbackSuccess && frames.length >= frameCount * 0.8) {
          console.log(`✅ Playback capture successful: ${frames.length} frames captured`)
          
          // Check frame diversity
          const uniqueFrames = new Set(frames)
          console.log(`🔍 Frame diversity: ${uniqueFrames.size}/${frames.length} unique frames`)
          
          resolve(frames)
          return
        }
        
        console.log(`⚠️ Playback capture incomplete (${frames.length}/${frameCount}), falling back to seeking...`)
        
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
        console.log(`  - Extracting ${frameCount} frames...`)
        
        const timePositions: number[] = []
        for (let i = 0; i < frameCount; i++) {
          const timePosition = frameCount > 1 ? startTime + (interval * i) : startTime
          timePositions.push(timePosition)
        }
        
        console.log(`📍 Frame positions:`, timePositions.map(t => t.toFixed(2) + 's').join(', '))
        
        for (let i = 0; i < frameCount; i++) {
          const timePosition = timePositions[i]
          console.log(`🎯 Extracting frame ${i + 1}/${frameCount} at ${timePosition.toFixed(2)}s`)
          const frame = await captureFrame(timePosition)
          if (frame) {
            frames.push(frame)
            console.log(`✅ Successfully captured frame ${i + 1}/${frameCount} at ${timePosition.toFixed(2)}s`)
          } else {
            console.log(`❌ Failed to capture frame ${i + 1}/${frameCount} at ${timePosition.toFixed(2)}s`)
          }
        }
        
        console.log(`🎬 Final result: captured ${frames.length}/${frameCount} frames total`)
        console.log(`📊 Success rate: ${((frames.length / frameCount) * 100).toFixed(1)}%`)
        
        // Check if frames are actually different
        if (frames.length > 1) {
          const uniqueFrames = new Set(frames)
          console.log(`🔍 Frame diversity: ${uniqueFrames.size}/${frames.length} unique frames`)
          if (uniqueFrames.size === 1) {
            console.warn(`⚠️ WARNING: All frames appear to be identical! This suggests the video might be very short or seeking is not working properly.`)
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
    setRecordedVideo(null)
    setAnalysis(null)
    setError(null)
    setRecordingTime(0)
    setExtractedFrames([])
    setShowFrames(false)
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
          />
          
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
                disabled={isAnalyzing}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing {settings.frameCount} frames...
                  </>
                ) : (
                  <>🧪 Generate UI Test ({settings.frameCount} frames)</>
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
            🖼️ Frames Sent to AI ({extractedFrames.length}/{settings.frameCount} requested)
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
            🧠 AI Analysis Results
          </h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">📋 Summary:</h4>
              <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
            </div>
            
            {analysis.testSteps && analysis.testSteps.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">🧪 Generated UI Test Steps:</h4>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 text-sm font-mono">
                    {JSON.stringify(analysis.testSteps, null, 2)}
                  </pre>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(analysis.testSteps, null, 2))
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
            
            {analysis.suggestions && analysis.suggestions.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">💡 Suggestions:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {analysis.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-gray-700">{suggestion}</li>
                  ))}
                </ul>
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