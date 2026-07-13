import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useTransitionStore } from '../store/useTransitionStore';

export default function UIOverlay() {
  const { isIntroComplete } = useTransitionStore();

  if (!isIntroComplete) return null;

  const navContainerVars: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 2.3 }
    }
  };

  const navItemVars: Variants = {
    hidden: { opacity: 0, y: -10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } } 
  };

  return (
    <>
      {/* Top Navigation Bar - Global */}
      <motion.div 
        variants={navContainerVars}
        initial="hidden"
        animate="show"
        className="fixed inset-x-0 top-0 z-40 p-8 md:p-10 pointer-events-none flex justify-center items-center text-[10px] tracking-[0.2em] uppercase font-mono"
      >
        <motion.div variants={navItemVars} className="pointer-events-auto cursor-pointer">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d="M12 2L9 9H3L7.5 13.5L5.5 21L12 17L18.5 21L16.5 13.5L21 9H15L12 2Z" />
          </svg>
        </motion.div>
      </motion.div>
    </>
  );
}
