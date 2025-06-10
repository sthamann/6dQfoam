import { Badge } from "@/components/ui/badge";
import type { GAUpdate } from "@shared/schema";

export default function PhysConstHealth({ ga }: { ga: GAUpdate }) {
  if (!ga.best) return null;
  const bad = ga.best.delta_c > 1e-4 || ga.best.delta_alpha > 1e-2;
  return (
    <Badge variant={bad ? "destructive" : "default"}>
      {bad ? "❌ physics check failed" : "✅ constants OK"}
    </Badge>
  );
}