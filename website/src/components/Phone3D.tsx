import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import './Phone3D.css';

interface PhoneScreen {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface Phone3DProps {
  screens: PhoneScreen[];
  activeIndex: number;
}

export default function Phone3D({ screens, activeIndex }: Phone3DProps) {
  const phoneRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();

  const rotateY = useTransform(scrollYProgress, [0, 0.15, 0.5, 0.85, 1], [12, -5, 0, 5, -8]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [8, 0, -5]);
  const scale = useTransform(scrollYProgress, [0, 0.1, 0.5, 0.9, 1], [0.9, 1, 1.05, 1, 0.95]);

  return (
    <div className="phone-3d-wrapper" ref={phoneRef}>
      {/* Glow effect behind phone */}
      <div className="phone-glow" />

      <motion.div
        className="phone-3d"
        style={{
          rotateY,
          rotateX,
          scale,
        }}
      >
        {/* Phone frame */}
        <div className="phone-frame">
          {/* Notch / Dynamic Island */}
          <div className="phone-notch">
            <div className="phone-camera" />
          </div>

          {/* Screen area */}
          <div className="phone-screen">
            {screens.map((screen, i) => (
              <motion.div
                key={screen.id}
                className="phone-screen-content"
                initial={false}
                animate={{
                  opacity: i === activeIndex ? 1 : 0,
                  scale: i === activeIndex ? 1 : 0.92,
                  y: i === activeIndex ? 0 : i > activeIndex ? 30 : -30,
                }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: i === activeIndex ? 'auto' : 'none',
                }}
              >
                {screen.content}
              </motion.div>
            ))}
          </div>

          {/* Home indicator */}
          <div className="phone-home-indicator" />
        </div>

        {/* Side buttons */}
        <div className="phone-button-right" />
        <div className="phone-button-left-1" />
        <div className="phone-button-left-2" />
      </motion.div>
    </div>
  );
}
