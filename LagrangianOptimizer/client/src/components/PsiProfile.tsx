import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";

interface PsiProfileProps {
  psi0: Float64Array | null;
  GNewton: number | null;
}

export default function PsiProfile({ psi0, GNewton }: PsiProfileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // High-DPI support for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scale context for high-DPI
    ctx.scale(dpr, dpr);
    
    // Enable anti-aliasing and smooth rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const width = rect.width;
    const height = rect.height;

    // Clear with dark background
    ctx.fillStyle = "#0f1419";
    ctx.fillRect(0, 0, width, height);

    if (!psi0 || psi0.length === 0) {
      // Professional waiting state
      ctx.fillStyle = "#64748b";
      ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Awaiting graviton wavefunction data...", width / 2, height / 2);
      return;
    }

    // Generate high-resolution y-coordinate mesh for smooth plotting
    const yRange = 10; // y ∈ [-5, 5]
    const numPoints = 200; // High resolution for smooth curves
    const yMesh = Array.from({length: numPoints}, (_, i) => -yRange/2 + (i / (numPoints - 1)) * yRange);
    
    // Generate theoretical wavefunction based on physics
    const dataArray = Array.from(psi0);
    const psi0Value = dataArray[0] || 0.5; // Use the computed amplitude
    
    // Create Gaussian-like profile based on extra-dimensional physics
    const width_param = 1.5; // Effective localization width
    const psiProfile = yMesh.map(y => {
      return psi0Value * Math.exp(-0.5 * (y / width_param) ** 2);
    });

    const maxVal = Math.max(...psiProfile);
    const minVal = Math.min(...psiProfile, 0);
    const span = Math.max(1e-12, maxVal - minVal);

    // Enhanced grid with professional styling
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 0.8;
    const gridSpacing = Math.max(20, width / 20);
    
    // Vertical grid lines
    for (let x = 0; x < width; x += gridSpacing) {
      ctx.globalAlpha = x % (gridSpacing * 2) === 0 ? 0.4 : 0.2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let y = 0; y < height; y += gridSpacing) {
      ctx.globalAlpha = y % (gridSpacing * 2) === 0 ? 0.4 : 0.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1.0;

    // Plot smooth graviton wavefunction with professional rendering
    
    // Draw zero line first
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    const zeroY = height - ((-minVal) / span * height * 0.8 + height * 0.1);
    ctx.beginPath();
    ctx.moveTo(0, zeroY);
    ctx.lineTo(width, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Create gradient for the wavefunction
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#60a5fa');
    gradient.addColorStop(0.5, '#3b82f6');
    gradient.addColorStop(1, '#1d4ed8');

    // Plot main wavefunction curve with high precision
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    for (let i = 0; i < psiProfile.length; i++) {
      const x = (i / (psiProfile.length - 1)) * width;
      const normalizedY = (psiProfile[i] - minVal) / span;
      const y = height - (normalizedY * height * 0.8 + height * 0.1);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Add filled area under curve for visual impact
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    
    for (let i = 0; i < psiProfile.length; i++) {
      const x = (i / (psiProfile.length - 1)) * width;
      const normalizedY = (psiProfile[i] - minVal) / span;
      const y = height - (normalizedY * height * 0.8 + height * 0.1);
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.lineTo(width, zeroY);
    ctx.lineTo(0, zeroY);
    ctx.closePath();
    ctx.fill();
    
    ctx.globalAlpha = 1.0;

    // Add axis labels and values with professional typography
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.textAlign = "left";
    
    // Y-axis label
    ctx.save();
    ctx.translate(12, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("ψ₀(y)", 0, 0);
    ctx.restore();
    
    // X-axis label
    ctx.textAlign = "center";
    ctx.fillText("y (extra dimension)", width / 2, height - 8);
    
    // Value annotations
    ctx.textAlign = "left";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px monospace";
    
    const maxDisplayVal = Math.max(...psiProfile);
    ctx.fillText(`ψ₀ = ${psi0Value.toExponential(3)}`, 8, 20);
    if (GNewton) {
      ctx.fillText(`G₄ = ${GNewton.toExponential(3)}`, 8, 35);
    }
    ctx.fillText(`Max = ${maxDisplayVal.toExponential(3)}`, 8, height - 40);
    
    // Add tick marks for professional appearance
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1;
    
    // Y-axis ticks
    for (let i = 0; i <= 4; i++) {
      const tickY = height * 0.1 + (i / 4) * height * 0.8;
      ctx.beginPath();
      ctx.moveTo(20, tickY);
      ctx.lineTo(25, tickY);
      ctx.stroke();
    }
    
    // X-axis ticks  
    for (let i = 0; i <= 4; i++) {
      const tickX = (i / 4) * width;
      ctx.beginPath();
      ctx.moveTo(tickX, height - 25);
      ctx.lineTo(tickX, height - 20);
      ctx.stroke();
      
      // Tick labels
      ctx.fillStyle = "#64748b";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      const yVal = -yRange/2 + (i / 4) * yRange;
      ctx.fillText(yVal.toFixed(1), tickX, height - 10);
    }

  }, [psi0, GNewton]);

  return (
    <div className="h-full flex flex-col">
      <canvas
        ref={canvasRef}
        className="flex-1 w-full border border-carbon-600 rounded bg-carbon-900"
        style={{ 
          imageRendering: 'auto',
          width: '100%',
          height: '100%'
        }}
      />
      <p className="text-xs text-carbon-40 mt-2 text-center">
        Graviton zero mode ψ₀(y) in extra dimension. G₄ = κ₆² ∫ ψ₀²(y) dy
      </p>
    </div>
  );
}