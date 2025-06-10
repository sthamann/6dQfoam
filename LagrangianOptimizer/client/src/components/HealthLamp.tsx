import { useEffect, useState } from "react";

export default function HealthLamp() {
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/diagnostics/evaluator")
      .then(r => r.json())
      .then(data => setOk(data.ok))
      .catch(() => setOk(false));
  }, []);

  const colour = ok === null   ? "bg-gray-400"
              : ok === true   ? "bg-green-500"
              :                 "bg-red-600";

  const title  = ok === null ? "checking…" : ok ? "evaluators in sync" : "⚠ math mismatch";

  return <div className={`w-3 h-3 rounded-full ${colour}`} title={title} />;
}