import { useEffect, useRef } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

interface LorentzVisualizationProps {
  epsilon: number | null;
}

export default function LorentzVisualization({
  epsilon,
}: LorentzVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Retina support
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth * dpr;
    const height = canvas.clientHeight * dpr;
    canvas.width = width;
    canvas.height = height;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    if (epsilon === null) {
      ctx.fillStyle = "#6b7280";
      ctx.font = "16px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        "Click ‘Start Analysis’",
        canvas.clientWidth / 2,
        canvas.clientHeight / 2,
      );
      return;
    }

    const cx = canvas.clientWidth / 2;
    const cy = canvas.clientHeight / 2;
    const baseR = Math.min(cx, cy) * 0.7;
    const maxViolation = 1e-2;
    const norm = Math.min(epsilon / maxViolation, 1);
    const violR = baseR + norm * baseR * 0.3;

    // draw gradient light-cone region
    const grad = ctx.createRadialGradient(cx, cy, baseR * 0.1, cx, cy, baseR);
    grad.addColorStop(0, "rgba(74,222,128,0.6)");
    grad.addColorStop(1, "rgba(74,222,128,0.1)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, baseR, 0, 2 * Math.PI);
    ctx.fill();

    // violation ring
    if (epsilon > 0) {
      ctx.strokeStyle = "rgba(239,68,68,0.8)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, violR, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // perfect-cone outline
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(cx, cy, baseR, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);

    // axes
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    // x
    ctx.beginPath();
    ctx.moveTo(cx - baseR, cy);
    ctx.lineTo(cx + baseR, cy);
    ctx.stroke();
    // y
    ctx.beginPath();
    ctx.moveTo(cx, cy - baseR);
    ctx.lineTo(cx, cy + baseR);
    ctx.stroke();
    ctx.setLineDash([]);

    // labels
    ctx.fillStyle = "#d1d5db";
    ctx.font = "12px monospace";
    ctx.fillText("Light Cone", cx, cy - baseR - 10);
    ctx.fillStyle = epsilon < 1e-6 ? "#4ade80" : "#ef4444";
    ctx.fillText(
      `ε = ${epsilon.toExponential(6)}`,
      canvas.clientWidth - 10,
      canvas.clientHeight - 10,
    );
  }, [epsilon]);

  return (
    <Card className="h-full flex flex-col bg-carbon-800 border-carbon-700">
      <CardTitle>Isotropy Test</CardTitle>
      <CardContent className="flex-1 p-2">
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded bg-carbon-900 shadow-inner"
          style={{ imageRendering: "auto" }}
        />
      </CardContent>
      <p className="text-xs text-carbon-400 text-center pb-2">
        Green gradient = perfect relativity region&nbsp;&nbsp;
        <span className="text-rose-400">Red ring</span> = violation
      </p>
    </Card>
  );
}
