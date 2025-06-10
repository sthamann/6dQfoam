# Ultra Mode Bugfix - Konsistente g_em = c₃ Durchsetzung

## Problem

Nach der Aktivierung des Ultra Modes fand der GA keine neuen gültigen Kandidaten mehr. Die Evolution war "eingefroren".

## Ursache

Die g_em = c₃ Regel wurde inkonsistent angewendet:
- In der `mutate()` Funktion wurde g_em am Anfang auf c₃ gesetzt
- Dann wurde c₃ mutiert, aber g_em blieb auf dem alten Wert
- Die resultierende Physik war inkonsistent und scheiterte an den Constraints

## Lösung

Die g_em = c₃ Regel wird jetzt an allen kritischen Stellen konsistent durchgesetzt:

1. **Nach der Mutation**: Am Ende von `mutate()` wird g_em = c₃ wiederhergestellt
2. **Nach dem Crossover**: Beide Kinder erhalten g_em = c₃
3. **Bei der Erstellung**: Neue Individuen respektieren die Regel wenn Ultra Mode aktiv

## Implementierte Änderungen

### mutate() Funktion
```typescript
private mutate(individual: number[]): void {
  // Mutationen durchführen (g_em wird übersprungen)
  for (let i = 0; i < individual.length; i++) {
    if (this.isUltraModeActive && i === 4) continue; // Skip g_em
    // ... normale Mutation
  }
  
  // KRITISCH: Nach ALLEN Mutationen g_em = c₃ wiederherstellen
  if (this.isUltraModeActive) {
    individual[4] = individual[3];
  }
}
```

### Aktivierung
- `useUltraMode` ist jetzt standardmäßig `true`
- Der automatische Wechsel erfolgt bei α ≥ 5 und G ≥ 5 Digits

## Ergebnis

Der Ultra Mode funktioniert jetzt korrekt:
- Die Evolution bleibt nach der Aktivierung flüssig
- Die g_em = c₃ Beziehung wird konsistent eingehalten
- Die Optimierung fokussiert sich erfolgreich auf die verbleibenden Parameter 