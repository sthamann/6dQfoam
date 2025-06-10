import React, { useEffect, useRef } from 'react';
import { Card } from './card';

interface EquationDisplayProps {
  coefficients: number[];
  className?: string;
}

export function EquationDisplay({ coefficients, className = "" }: EquationDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation loop
    const animate = () => {
      timeRef.current += 0.01;
      
      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.98)';
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Draw grid
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.offsetWidth; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.offsetHeight);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.offsetHeight; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.offsetWidth, i);
        ctx.stroke();
      }

      // Draw equation parts with animation
      const [c_tt, c_xx, c_yy, c_zz, c_xy] = coefficients;
      
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const centerY = canvas.offsetHeight / 2;
      const startX = 60;
      const spacing = 140;

      // Lagrangian symbol
      ctx.fillStyle = '#60a5fa';
      ctx.font = 'italic bold 32px Georgia, serif';
      ctx.fillText('ℒ', startX, centerY);
      
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui';
      ctx.fillText('=', startX + 40, centerY);

      // Terms with animated glow
      const terms = [
        { coeff: c_tt, text: '(∂ₜφ)²', color: '#ef4444' },
        { coeff: c_xx, text: '(∂ₓφ)²', color: '#10b981' },
        { coeff: c_yy, text: 'φ²', color: '#f59e0b' },
        { coeff: c_zz, text: '(∂ₜφ)²φ²', color: '#8b5cf6' },
        { coeff: c_xy, text: 'F²', color: '#ec4899' }
      ];

      let xPos = startX + 90;
      terms.forEach((term, i) => {
        const glow = Math.sin(timeRef.current + i * 0.5) * 0.3 + 0.7;
        
        // Coefficient
        ctx.fillStyle = term.color;
        ctx.globalAlpha = glow;
        ctx.font = '18px monospace';
        const coeffStr = term.coeff >= 0 && i > 0 ? '+' + term.coeff.toFixed(6) : term.coeff.toFixed(6);
        ctx.fillText(coeffStr, xPos, centerY - 20);
        
        // Operator
        ctx.globalAlpha = 1;
        ctx.font = 'italic 20px Georgia, serif';
        ctx.fillText(term.text, xPos, centerY + 10);
        
        xPos += spacing;
      });

      // Draw wave effects
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 3; i++) {
        const radius = (timeRef.current * 50 + i * 100) % 400;
        const alpha = Math.max(0, 1 - radius / 400);
        ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(canvas.offsetWidth / 2, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [coefficients]);

  return (
    <Card className={`bg-black border-blue-500/30 ${className}`}>
      <canvas 
        ref={canvasRef}
        className="w-full h-32"
      />
    </Card>
  );
} 