
import React from 'react';

const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 honeycomb-bg overflow-hidden pointer-events-none">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 via-amber-50/30 to-white"></div>
      {/* Decorative Buzzing Bees */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute text-amber-600 opacity-10 animate-buzz"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`
          }}
        >
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z" />
          </svg>
        </div>
      ))}
    </div>
  );
};

export default Background;
