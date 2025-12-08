import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import Webcam from 'react-webcam';
import { Camera, Maximize2, Minimize2, Hand, Volume2, VolumeX } from 'lucide-react';
import ParticleSystem from './components/ParticleSystem';
import { useHandTracking } from './hooks/useHandTracking';
import { generateCreativePhrases } from './services/geminiService';
import { audioService } from './services/audioService';
import { CelestialBodyConfig } from './types';
import { CELESTIAL_BODIES } from './data';

const App: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // State
  const [expansion, setExpansion] = useState(1); // 0 = Planet, 1 = Universe
  const [isHandOpen, setIsHandOpen] = useState(true);
  const [currentPhrase, setCurrentPhrase] = useState<string>("Breathe with the universe.");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [phrasesCache, setPhrasesCache] = useState<string[]>([]);
  const [showUI, setShowUI] = useState(true);
  
  // Audio Interaction State
  const [isMuted, setIsMuted] = useState(false);
  
  // Celestial Body State
  const [currentBody, setCurrentBody] = useState<CelestialBodyConfig>(CELESTIAL_BODIES[0]); 

  const [handRotation, setHandRotation] = useState({ x: 0, y: 0 });

  const lastPhraseTime = useRef<number>(0);

  // Handle hand status update from the hook
  const handleHandUpdate = (isOpen: boolean, score: number, position: { x: number, y: number }) => {
    const target = isOpen ? 1 : 0;
    
    // Smooth transition for expansion
    setExpansion(prev => prev + (target - prev) * 0.1);
    
    // Logic triggered when state CHANGES
    if (!isHandOpen && isOpen) {
       // Hand OPENED
       triggerNewPhrase();
       if (!isMuted) audioService.playExpand();
    } else if (isHandOpen && !isOpen) {
       // Hand CLOSED
       if (!isMuted) audioService.playContract();
       changeCelestialBody(); // Pick a new planet
    }
    
    setIsHandOpen(isOpen);

    // Rotation Logic
    const rotX = (0.5 - position.x) * 2; 
    const rotY = (position.y - 0.5) * 2; 
    setHandRotation({ x: rotX, y: rotY });
  };

  const changeCelestialBody = () => {
    // Pick random body, but try not to pick the same one immediately
    let newBody;
    do {
       const idx = Math.floor(Math.random() * CELESTIAL_BODIES.length);
       newBody = CELESTIAL_BODIES[idx];
    } while (newBody.name === currentBody.name);
    
    setCurrentBody(newBody);
  };

  const { isReady, error } = useHandTracking({
    videoRef: videoRef,
    onHandUpdate: handleHandUpdate
  });

  // Keep videoRef synced with webcam
  useEffect(() => {
    if (webcamRef.current?.video) {
      videoRef.current = webcamRef.current.video;
    }
  }, [webcamRef.current]);

  const triggerNewPhrase = async () => {
    const now = Date.now();
    if (now - lastPhraseTime.current < 3000) return; // Cooldown 3s
    lastPhraseTime.current = now;

    if (phrasesCache.length > 0) {
      const next = phrasesCache[0];
      setPhrasesCache(prev => prev.slice(1));
      setCurrentPhrase(next);
      
      if (phrasesCache.length < 3) {
        const newPhrases = await generateCreativePhrases(5);
        setPhrasesCache(prev => [...prev, ...newPhrases]);
      }
    } else {
      setCurrentPhrase("Drifting in starlight...");
      const newPhrases = await generateCreativePhrases(3);
      if (newPhrases.length > 0) {
        setCurrentPhrase(newPhrases[0]);
        setPhrasesCache(newPhrases.slice(1));
      }
    }
  };

  useEffect(() => {
    generateCreativePhrases(5).then(phrases => setPhrasesCache(phrases));
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Try to start audio on interaction
  const handleInteraction = () => {
      audioService.startAmbient().catch(() => {});
  };

  const toggleMute = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isMuted) {
          audioService.setVolume(0.4);
          setIsMuted(false);
          audioService.startAmbient(); // Ensure it starts if it hasn't
      } else {
          audioService.setVolume(0);
          setIsMuted(true);
      }
  };

  return (
    <div 
      className="relative w-full h-screen bg-black overflow-hidden font-sans selection:bg-purple-500 selection:text-white"
      onClick={handleInteraction}
      onPointerDown={handleInteraction}
    >
      
      {/* 1. The 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[0, 0, 0]} intensity={1.5} color="#ffaa00" />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />
          <Suspense fallback={null}>
            <ParticleSystem expansion={expansion} rotationInfluence={handRotation} bodyConfig={currentBody} />
          </Suspense>
          <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
        </Canvas>
      </div>

      {/* 2. Hidden Webcam for Processing */}
      <div className="absolute opacity-0 pointer-events-none">
        <Webcam
          ref={webcamRef}
          width={640}
          height={480}
          mirrored
          screenshotFormat="image/jpeg"
          videoConstraints={{ facingMode: "user" }}
        />
      </div>

      {/* 3. UI Overlay */}
      <div className={`absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6 transition-opacity duration-500 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Top Header */}
        <header className="flex justify-between items-start">
          <div className="flex flex-col">
             {/* Dynamic Name of the Planet - Fades in when contracted */}
             <div className={`transition-all duration-700 ${expansion < 0.3 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                <h2 className="text-3xl font-thin tracking-[0.2em] text-white/80 uppercase">
                  {currentBody.name === "Sun" ? "Solar System" : currentBody.name}
                </h2>
             </div>
          </div>
          
          <div className="flex gap-4 pointer-events-auto">
            {/* Removed Status Indicator to remove 'Startup' feel */}
            
            <button 
                onClick={toggleMute}
                className="p-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-full transition-all backdrop-blur-sm"
                title={isMuted ? "Unmute" : "Mute"}
            >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            <button 
              onClick={toggleFullscreen}
              className="p-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-full transition-all backdrop-blur-sm"
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
          </div>
        </header>

        {/* Center Phrase */}
        <main className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="max-w-2xl px-6">
            <p className={`text-2xl md:text-4xl lg:text-5xl font-light leading-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-yellow-200 to-yellow-500 drop-shadow-2xl transition-all duration-1000 transform ${expansion > 0.5 ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-50 translate-y-4'}`}>
              "{currentPhrase}"
            </p>
          </div>
        </main>

        {/* Bottom Controls / Info */}
        <footer className="flex justify-between items-end">
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 bg-black/20 backdrop-blur-sm p-3 rounded-lg border border-white/5 w-fit">
              <Camera className="w-5 h-5 text-purple-400/50" />
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Gesture</span>
                <span className="text-sm font-light text-white/80 flex items-center gap-2">
                  {isHandOpen ? (
                    <>
                      <Hand className="w-4 h-4 text-blue-400/70" /> Palm Open: Expand
                    </>
                  ) : (
                    <>
                      <Hand className="w-4 h-4 text-orange-400/70 rotate-90" /> Fist Closed: Focus
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
          
          <div className="pointer-events-auto">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowUI(false); }} 
                className="text-xs text-gray-600 hover:text-white/50 transition-colors"
              >
                Hide UI
              </button>
          </div>
        </footer>
      </div>
      
      {!showUI && (
        <div className="absolute bottom-6 right-6 z-20 pointer-events-auto">
            <button 
            onClick={(e) => { e.stopPropagation(); setShowUI(true); }} 
            className="text-xs text-white/20 hover:text-white/80 bg-black/10 p-2 rounded backdrop-blur transition-colors"
            >
            Show UI
            </button>
        </div>
      )}
    </div>
  );
};

export default App;