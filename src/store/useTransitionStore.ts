import { create } from 'zustand';

export interface TransitionStore {
  isSceneLoaded: boolean;
  hasStartedGame: boolean;
  isIntroComplete: boolean;
  isScrollLocked: boolean;
  isTransitioning: boolean;
  brakeLightsActive: boolean;
  streakSpeedMultiplier: number;
  coins: number;
  isGameOver: boolean;
  highScore: number;
  isInspectMode: boolean;
  customTilt: number;
  customScale: number;
  customX: number;
  customY: number;
  isDevPaused: boolean;
  setSceneLoaded: () => void;
  setInspectMode: () => void;
  exitInspectMode: () => void;
  setCustomTilt: (val: number) => void;
  setCustomScale: (val: number) => void;
  setCustomX: (val: number) => void;
  setCustomY: (val: number) => void;
  setDevPaused: (val: boolean) => void;
  startGame: () => void;
  setIntroComplete: () => void;
  unlockScroll: () => void;
  triggerTransition: () => void;
  triggerBrakeLights: () => void;
  incrementCoins: () => void;
  setGameOver: () => void;
  resetGame: () => void;
  returnToHome: () => void;
}

export const useTransitionStore = create<TransitionStore>((set) => ({
  isSceneLoaded: false,
  hasStartedGame: false,
  isIntroComplete: false,
  isScrollLocked: true,
  isTransitioning: false,
  brakeLightsActive: false,
  streakSpeedMultiplier: 1,
  coins: 0,
  isGameOver: false,
  highScore: 0,

  isInspectMode: false,
  customTilt: -0.01,
  customScale: 1.29,
  customX: 0,
  customY: 0,
  isDevPaused: false,

  setInspectMode: () => set({ isInspectMode: true }),
  exitInspectMode: () => set({ isInspectMode: false }),
  setCustomTilt: (val) => set({ customTilt: val }),
  setCustomScale: (val) => set({ customScale: val }),
  setCustomX: (val) => set({ customX: val }),
  setCustomY: (val) => set({ customY: val }),
  setDevPaused: (val) => set({ isDevPaused: val }),
  setSceneLoaded: () => set({ isSceneLoaded: true }),
  startGame: () => set({ hasStartedGame: true }),
  setIntroComplete: () => set({ isIntroComplete: true }),
  unlockScroll: () => set({ isScrollLocked: false }),

  triggerTransition: () => {
    set({ isTransitioning: true });
    setTimeout(() => {
      set({ isTransitioning: false });
    }, 300); // 300ms red horizontal sweep duration
  },

  triggerBrakeLights: () => {
    set({ brakeLightsActive: true, streakSpeedMultiplier: 4 });
    setTimeout(() => {
      set({ brakeLightsActive: false, streakSpeedMultiplier: 1 });
    }, 400); // Speed * 4 and brakes flash for 400ms
  },

  incrementCoins: () => set((state) => ({ coins: state.coins + 1 })),
  
  setGameOver: () => set((state) => {
    const newHighScore = state.coins > state.highScore ? state.coins : state.highScore;
    return { isGameOver: true, highScore: newHighScore };
  }),

  resetGame: () => set({ isGameOver: false, coins: 0 }),
  returnToHome: () => set({ isGameOver: false, hasStartedGame: false, coins: 0, isIntroComplete: false }),
}));
