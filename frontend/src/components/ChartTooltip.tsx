import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ChartTooltip = ({ active, x, y, content }) => {
  if (!active || !content) return null;

  return (
    <div 
      className="fixed pointer-events-none z-[100]"
      style={{ left: x + 15, top: y + 15 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#553a34] text-white p-3 rounded-sm shadow-2xl border border-[#974726] border-opacity-30 min-w-[140px]"
      >
        {content}
      </motion.div>
    </div>
  );
};

export default ChartTooltip;
