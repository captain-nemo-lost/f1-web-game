import { useEffect, useState } from 'react';
import { useTransitionStore } from '../store/useTransitionStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function IntroSequence() {
  const setIntroComplete = useTransitionStore((state) => state.setIntroComplete);
  const isSceneLoaded = useTransitionStore((state) => state.isSceneLoaded);
  const hasStartedGame = useTransitionStore((state) => state.hasStartedGame);
  const unlockScroll = useTransitionStore((state) => state.unlockScroll);
  
  const [showF1Lights, setShowF1Lights] = useState(true);
  const [stage, setStage] = useState<'hidden' | 'boot1' | 'boot2' | 'boot3' | 'boot4' | 'ready' | 'done'>('hidden');

  useEffect(() => {
    // Only start the sequence once the 3D scene finishes loading and compiling
    if (!isSceneLoaded) return;
    
    if (!hasStartedGame) {
      setShowF1Lights(true);
      setStage('hidden');
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = []; 

    // 0.0s - 3.5s: F1 5-Lights Sequence (handled entirely by index.css animations)
    // At 3.5s, the lights instantly disappear (opacity 0 via framer-motion) leaving a pure black screen.

    // 4.0s: 3D Cinematic Begins, pure black screen fades out
    timers.push(setTimeout(() => setShowF1Lights(false), 4000));

    // Timing matches the Scene.tsx GSAP timeline
    // 9.4s: Hero Reveal Hold begins (Boot sequence starts)
    timers.push(setTimeout(() => setStage('boot1'), 9400));
    timers.push(setTimeout(() => setStage('boot2'), 9900));
    timers.push(setTimeout(() => setStage('boot3'), 10400));
    timers.push(setTimeout(() => setStage('boot4'), 10900));
    timers.push(setTimeout(() => setStage('ready'), 11400));

    // 13.1s: Launch (Text hides as car accelerates)
    timers.push(setTimeout(() => setStage('done'), 13100));
    
    // 15.9s: Intro complete (triggers main UI fade in)
    timers.push(setTimeout(() => setIntroComplete(), 15900));

    // 19.0s: Unlock scroll after Hero text (1.6s) and Nav items (0.8s) finish their staggered entrance
    timers.push(setTimeout(() => unlockScroll(), 19000));

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [setIntroComplete, isSceneLoaded, hasStartedGame, unlockScroll]);

  if (stage === 'done') return null;

  // Render nothing until the 3D scene is actually ready to avoid animation desync
  if (!isSceneLoaded) return null;

  return (
    <>
      {/* 5-Lights Overlay (Powered strictly by CSS to avoid React render bugs) */}
      <AnimatePresence>
        {(hasStartedGame && showF1Lights) && (
          <motion.div 
            className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none"
            style={{ backgroundColor: '#020202' }} // Solid black background
            exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeOut' } }} // Fades out at 4.0s
          >
            <motion.div 
              className="flex gap-4 md:gap-8"
              animate={{ opacity: [1, 1, 0, 0] }}
              transition={{ duration: 4.0, times: [0, 0.875, 0.875, 1] }} // Instantly hides at 3.5s
            >
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="p-2 md:p-3 bg-[#111] border border-white/10 rounded-md">
                  <div 
                    className={`w-10 h-10 md:w-16 md:h-16 rounded-full border-2 border-white/20 f1-light-base f1-light-${num}`}
                  />
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Telemetry Boot UI */}
      {stage !== 'hidden' && !showF1Lights && (
        <div 
          className="fixed inset-0 flex flex-col justify-center pl-10 md:pl-24 text-white font-mono pointer-events-none tracking-widest text-xs md:text-sm"
          style={{ zIndex: 9999 }}
        >
          <div className="mb-6 text-[#E10600] font-bold">SYSTEM ONLINE</div>

          <div className="flex flex-col gap-2 mb-10">
            <div className="flex justify-between w-64 opacity-100">
              <span>POWER UNIT</span>
              <span>✓</span>
            </div>
            <div className={`flex justify-between w-64 ${stage === 'boot1' ? 'opacity-0' : 'opacity-100'}`}>
              <span>DRS SYSTEM</span>
              <span>✓</span>
            </div>
            <div className={`flex justify-between w-64 ${['boot1', 'boot2'].includes(stage) ? 'opacity-0' : 'opacity-100'}`}>
              <span>TELEMETRY</span>
              <span>✓</span>
            </div>
            <div className={`flex justify-between w-64 ${['boot1', 'boot2', 'boot3'].includes(stage) ? 'opacity-0' : 'opacity-100'}`}>
              <span>TRACK READY</span>
              <span className="text-[#E10600]">✓</span>
            </div>
          </div>

          <div className={`flex flex-col ${stage !== 'ready' ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
            <span className="text-gray-500 text-[10px] md:text-xs mb-1">MAX VELOCITY</span>
            <span className="text-xl md:text-2xl font-bold">314 KM/H</span>
          </div>
        </div>
      )}
    </>
  );
}
