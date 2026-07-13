import { motion, AnimatePresence } from 'framer-motion';
import { useTransitionStore } from '../store/useTransitionStore';
import { Trophy, Settings, HelpCircle, ChevronRight, Flag } from 'lucide-react';

export default function Dashboard() {
  const isSceneLoaded = useTransitionStore((state) => state.isSceneLoaded);
  const hasStartedGame = useTransitionStore((state) => state.hasStartedGame);
  const startGame = useTransitionStore((state) => state.startGame);
  const highScore = useTransitionStore((state) => state.highScore);
  const coins = useTransitionStore((state) => state.coins);
  const isInspectMode = useTransitionStore((state) => state.isInspectMode);
  const exitInspectMode = useTransitionStore((state) => state.exitInspectMode);

  // If the scene isn't loaded yet, show a simple loading state
  if (!isSceneLoaded) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#080808]">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin mb-4" />
          <p className="text-white/50 uppercase tracking-[0.3em] font-bold text-sm">Loading Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {!hasStartedGame && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          className="absolute inset-0 z-40 pointer-events-none"
        >
          {/* Overlay Gradient for readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

          {/* Top Bar */}
          <div className="absolute top-8 left-8 md:top-12 md:left-12 flex justify-between w-[calc(100%-4rem)] md:w-[calc(100%-6rem)]">
            <div className="flex items-center gap-3 px-4 py-2 bg-black/50 border border-white/10 rounded-md backdrop-blur-md">
              <div className="flex gap-1 text-[#E10600]">
                <div className="w-2 h-4 bg-current transform -skew-x-12" />
                <div className="w-2 h-4 bg-current transform -skew-x-12" />
                <div className="w-2 h-4 bg-current transform -skew-x-12" />
              </div>
              <span className="text-white font-bold tracking-widest text-sm uppercase">Speed Run</span>
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black text-xs">
                  $
                </div>
                <span className="text-white font-black text-xl tabular-nums">{coins}</span>
              </div>
              <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
                High Score: {highScore}
              </span>
            </div>
          </div>

          {/* Main Content (Left Aligned) */}
          <div className={`absolute top-1/2 -translate-y-1/2 left-8 md:left-24 flex flex-col pointer-events-auto transition-opacity duration-500 ${isInspectMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            
            {/* Title Block */}
            <div className="mb-6 relative">
              <motion.h1 
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="text-7xl md:text-9xl font-black text-white italic tracking-tighter uppercase leading-[0.85]"
              >
                SPEED
              </motion.h1>
              <motion.h1 
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="text-7xl md:text-9xl font-black text-[#E10600] italic tracking-tighter uppercase leading-[0.85] flex items-center gap-4"
              >
                <div className="flex gap-2">
                  <div className="w-16 md:w-32 h-4 md:h-8 bg-[#E10600] transform -skew-x-[20deg]" />
                  <div className="w-4 md:w-8 h-4 md:h-8 bg-[#E10600] transform -skew-x-[20deg]" />
                </div>
                RUN
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-white/80 font-bold tracking-[0.3em] uppercase mt-6 text-sm md:text-lg"
              >
                Race. Collect. <span className="text-[#E10600]">Dominate.</span>
              </motion.p>
            </div>

            {/* Action Buttons */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col gap-4 max-w-md"
            >
              <button 
                onClick={startGame}
                className="group relative flex items-center justify-between w-full p-4 bg-gradient-to-r from-white/10 to-transparent border border-white/20 hover:border-[#E10600] transition-colors overflow-hidden rounded-md backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-[#E10600] translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300 ease-in-out" />
                
                <div className="flex items-center gap-4 relative z-10">
                  <Flag className="w-6 h-6 text-white" />
                  <span className="text-white font-black text-xl tracking-widest uppercase">Play Game</span>
                </div>
                
                <ChevronRight className="w-6 h-6 text-[#E10600] group-hover:text-white relative z-10 transition-colors" />
              </button>

              <div className="grid grid-cols-3 gap-3">
                <button className="flex flex-col items-center justify-center gap-2 p-3 bg-black/40 border border-white/10 hover:border-white/30 rounded-md transition-colors group">
                  <HelpCircle className="w-5 h-5 text-white/50 group-hover:text-white" />
                  <span className="text-[10px] font-bold text-white/50 group-hover:text-white uppercase tracking-wider">How to Play</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 p-3 bg-black/40 border border-white/10 hover:border-white/30 rounded-md transition-colors group">
                  <Trophy className="w-5 h-5 text-white/50 group-hover:text-white" />
                  <span className="text-[10px] font-bold text-white/50 group-hover:text-white uppercase tracking-wider">Leaderboard</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 p-3 bg-black/40 border border-white/10 hover:border-white/30 rounded-md transition-colors group">
                  <Settings className="w-5 h-5 text-white/50 group-hover:text-white" />
                  <span className="text-[10px] font-bold text-white/50 group-hover:text-white uppercase tracking-wider">Settings</span>
                </button>
              </div>
            </motion.div>
          </div>

          {/* Inspect Mode Overlay */}
          <AnimatePresence>
            {isInspectMode && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-between p-8 md:p-12"
              >
                <div className="flex justify-end pointer-events-auto">
                  <button 
                    onClick={exitInspectMode}
                    className="px-6 py-2 bg-[#E10600] text-white font-bold tracking-widest uppercase rounded-md hover:bg-white hover:text-[#E10600] transition-colors"
                  >
                    Close Inspection
                  </button>
                </div>
                <div className="flex justify-center mb-8">
                  <span className="text-white/50 tracking-[0.5em] text-sm uppercase font-bold animate-pulse">
                    Drag to Rotate
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Bar */}
          <div className={`absolute bottom-8 left-8 md:bottom-12 md:left-12 flex justify-end w-[calc(100%-4rem)] md:w-[calc(100%-6rem)] transition-opacity duration-500 ${isInspectMode ? 'opacity-0' : 'opacity-100'}`}>
            <div className="text-white/40 text-[10px] font-bold tracking-widest uppercase">
              A <span className="text-[#E10600]">Web Game</span> Experience
            </div>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
