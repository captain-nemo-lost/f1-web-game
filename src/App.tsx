import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion } from 'framer-motion';

import IntroSequence from './components/IntroSequence';
import UIOverlay from './components/UIOverlay';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';

const Scene = React.lazy(() => import('./components/Scene'));


import { useTransitionStore } from './store/useTransitionStore';

export default function App() {
  const isIntroComplete = useTransitionStore((state) => state.isIntroComplete);
  const coins = useTransitionStore((state) => state.coins);
  const isGameOver = useTransitionStore((state) => state.isGameOver);
  const highScore = useTransitionStore((state) => state.highScore);
  const resetGame = useTransitionStore((state) => state.resetGame);
  const returnToHome = useTransitionStore((state) => state.returnToHome);
  const controlMode = useTransitionStore((state) => state.controlMode);
  const setControlMode = useTransitionStore((state) => state.setControlMode);

  return (
    <div className="w-screen h-screen bg-[#080808] overflow-hidden relative selection:bg-[#E10600] selection:text-white font-mono">

      {/* Persisted Hero Canvas Strip */}
      <motion.div
        animate={{ height: '100vh' }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 w-full z-0 overflow-hidden"
      >
        <ErrorBoundary>
          <Canvas
            camera={{ position: [0, 1.8, 20], fov: 80 }}
            dpr={[1, 2]}
            gl={{ antialias: true }}
            style={{ opacity: 1 }}
          >
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </Canvas>
        </ErrorBoundary>
      </motion.div>

      {/* Coin Counter HUD */}
      {isIntroComplete && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="fixed top-8 right-8 md:top-10 md:right-12 z-50 pointer-events-none flex flex-col items-end gap-1"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-yellow-500 border-2 border-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.5)] flex items-center justify-center">
              <span className="text-black font-black text-sm">$</span>
            </div>
            <span className="text-white text-3xl font-black tabular-nums tracking-tighter drop-shadow-lg">
              {coins}
            </span>
          </div>
          {highScore > 0 && (
            <span className="text-white/50 text-xs font-bold uppercase tracking-widest mt-1 mb-4">
              High Score: {highScore}
            </span>
          )}


        </motion.div>
      )}

      {/* Game Over Screen */}
      {isGameOver && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-black/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm pointer-events-auto"
        >
          <motion.h2 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="text-6xl md:text-8xl font-black text-[#E10600] uppercase tracking-tighter mb-4 drop-shadow-[0_0_20px_rgba(225,6,0,0.5)]"
          >
            CRASHED
          </motion.h2>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center"
          >
            <p className="text-white/70 text-lg mb-4 uppercase tracking-widest">
              Final Score: <span className="text-white font-bold text-2xl ml-2">{coins}</span>
            </p>

            <div className="flex items-center gap-4 mb-8 bg-black/50 p-2 rounded-md border border-white/10">
              <span className="text-white/50 text-xs font-bold uppercase tracking-widest">Controls:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setControlMode('mouse')}
                  className={`px-4 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                    controlMode === 'mouse' ? 'bg-[#E10600] text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Mouse
                </button>
                <button
                  onClick={() => setControlMode('keyboard')}
                  className={`px-4 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                    controlMode === 'keyboard' ? 'bg-[#E10600] text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  Keyboard
                </button>
              </div>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={resetGame}
                className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-[#E10600] hover:text-white transition-colors duration-300"
              >
                Restart Engine
              </button>
              <button 
                onClick={returnToHome}
                className="px-8 py-3 bg-transparent border-2 border-white/20 text-white font-bold uppercase tracking-widest hover:border-white hover:bg-white hover:text-black transition-colors duration-300"
              >
                Return to Home
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Global UI Overlay */}
      <UIOverlay />

      <Dashboard />

      {/* Intro Sequence Overlay */}
      <IntroSequence />
    </div>
  );
}
