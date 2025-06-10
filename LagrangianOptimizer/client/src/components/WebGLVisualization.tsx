// -----------------------------------------------------------------------------
// File: src/components/WebGLDynamicUniverse.tsx (drop‑in replacement)
// A cinematic, interactive visualiser that reacts to the GA physics signal.
// -----------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw, Orbit, Atom, Layers3 } from "lucide-react";

import { DynamicUniverseRenderer } from "@/lib/universe-renderer";
import PhysicsHUD from "@/components/PhysicsHUD";
import type { GAUpdate } from "@shared/schema";

/**
 * Props
 */
interface WebGLDynamicUniverseProps {
  gaUpdate: GAUpdate;
}

/**
 * A React wrapper around DynamicUniverseRenderer. Handles mounting, resizing and
 * translating GA updates → renderer.updatePhysics().
 */
export default function WebGLDynamicUniverse({
  gaUpdate,
}: WebGLDynamicUniverseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<DynamicUniverseRenderer | null>(null);

  const [quality, setQuality] = useState<"low" | "medium" | "high">("medium");
  const [autoRotate, setAutoRotate] = useState(true);
  const [showBrane, setShowBrane] = useState(true);

  /* ─────────────────────────────
   * Mount / Un‑mount
   * ───────────────────────────*/
  useEffect(() => {
    if (!canvasRef.current) return;

    // Instantiate with initial quality level
    rendererRef.current = new DynamicUniverseRenderer(
      canvasRef.current,
      quality,
    );

    const handleResize = () => rendererRef.current?.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
    // We only want to run this once on mount → empty dep array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─────────────────────────────
   * Forward GA updates to renderer
   * ───────────────────────────*/
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || !gaUpdate?.best) return;

    const { fitness, delta_c, delta_alpha, delta_g, g_model, coefficients } = gaUpdate.best;

    r.updatePhysics({
      fitness,
      deltaC: delta_c,
      deltaAlpha: delta_alpha,
      deltaG: delta_g || 0,
      gModel: g_model || 0,
      generation: gaUpdate.generation,
      coefficients,
    });
  }, [gaUpdate]);

  /* ─────────────────────────────
   * React to quality selector
   * ───────────────────────────*/
  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.setQuality(quality);
  }, [quality]);

  /* ─────────────────────────────
   * UI
   * ───────────────────────────*/
  return (
    <Card className="relative w-full h-full bg-black/90 border-carbon-700 flex flex-col overflow-hidden">
      {/* Header */}
      <CardHeader className="flex-none border-b border-carbon-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-carbon-10 flex items-center gap-2 text-lg">
            <Atom className="text-cyan-400" />
            6‑D Quantum‑Foam Universe
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* Quality selector */}
            <Select value={quality} onValueChange={(v) => setQuality(v as any)}>
              <SelectTrigger className="w-28 h-8 text-xs bg-carbon-800 border-carbon-600">
                <SelectValue placeholder="Quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>

            {/* Autorotation */}
            <Button
              size="icon"
              variant={autoRotate ? "secondary" : "outline"}
              title="Toggle auto‑rotation"
              onClick={() => {
                setAutoRotate((p) => !p);
                rendererRef.current?.toggleAutoRotate();
              }}
            >
              <Orbit className="h-4 w-4" />
            </Button>

            {/* Brane toggle */}
            <Button
              size="icon"
              variant={showBrane ? "secondary" : "outline"}
              title="Toggle brane visibility"
              onClick={() => {
                setShowBrane((p) => !p);
                rendererRef.current?.toggleBraneVisibility();
              }}
            >
              <Layers3 className="h-4 w-4" />
            </Button>

            {/* Reset camera */}
            <Button
              size="icon"
              variant="outline"
              title="Reset camera"
              onClick={() => rendererRef.current?.resetCamera()}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Canvas & overlay HUD */}
      <CardContent className="relative flex-grow p-0">
        <canvas ref={canvasRef} className="w-full h-full block" />

        <PhysicsHUD
          gaUpdate={gaUpdate}
          deltaC={gaUpdate.best?.delta_c ?? 0}
          deltaAlpha={gaUpdate.best?.delta_alpha ?? 0}
          deltaG={gaUpdate.best?.delta_g ?? 0}
        />
      </CardContent>
    </Card>
  );
}
