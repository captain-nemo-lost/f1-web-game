import { motion } from 'framer-motion';

export default function HeroTypography() {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex items-center px-8 md:px-16 lg:px-32">
      <div className="max-w-2xl text-left pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 5.5 }} // Appears after stage 1 reveal
        >
          <h1 className="text-5xl md:text-7xl lg:text-[5rem] font-bold tracking-tighter text-white mb-6 leading-[1.05]">
            ABHIMANYU <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-titanium via-white to-titanium">SHARMA</span>
          </h1>
          
          <div className="flex flex-wrap gap-4 mb-8 text-[10px] md:text-xs font-bold tracking-[0.25em] text-titanium uppercase">
            <span>Software Engineer</span>
            <span className="text-racing opacity-70">•</span>
            <span>Full Stack Developer</span>
            <span className="text-racing opacity-70">•</span>
            <span>AI Enthusiast</span>
            <span className="text-racing opacity-70">•</span>
            <span>Problem Solver</span>
          </div>

          <p className="text-titanium/80 text-sm md:text-base leading-relaxed mb-12 max-w-md font-light">
            Building scalable software, intelligent systems, and meaningful digital experiences.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <button className="group relative px-8 py-4 bg-white text-carbon text-xs font-bold tracking-[0.2em] uppercase overflow-hidden transition-transform duration-500 hover:scale-[1.02] active:scale-[0.98]">
              <span className="relative z-10 transition-colors duration-300 group-hover:text-white">Enter The Paddock</span>
              <div className="absolute inset-0 bg-racing transform scale-x-0 origin-left transition-transform duration-500 ease-out group-hover:scale-x-100 z-0"></div>
            </button>
            
            <button className="text-xs font-bold tracking-[0.2em] uppercase text-white hover:text-racing transition-colors duration-300 relative group py-4">
              View Resume
              <span className="absolute bottom-2 left-0 w-full h-[1px] bg-racing scale-x-0 origin-left transition-transform duration-500 ease-out group-hover:scale-x-100"></span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
