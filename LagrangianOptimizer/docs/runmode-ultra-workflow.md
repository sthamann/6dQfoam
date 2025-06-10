# Runmode Ultra Workflow

## Überblick

Der "Runmode Ultra" ist ein spezieller Optimierungsmodus für den Genetischen Algorithmus (GA), der die Beziehung `g_em = c₃` zwischen der elektromagnetischen Kopplung und dem Selbst-Interaktionsterm erzwingt. Dies reduziert die Anzahl der freien Parameter und fokussiert die Optimierung auf die verbleibenden Parameter, insbesondere die Gravitationskopplung ξ.

## Workflow

### Option A: Automatische Aktivierung (Empfohlen)

1. **Vorbereitung**
   - Stellen Sie sicher, dass der "Runmode Ultra" Toggle in der UI **aktiviert** ist (gelber Schalter)
   - Der Toggle zeigt an: "When α and G reach 5+ digits precision, enforces g_em=c₃"

2. **GA starten**
   - Klicken Sie auf "Start GA"
   - Der GA läuft zunächst im **normalen Modus** ohne Einschränkungen
   - In der UI sehen Sie den aktuellen Präzisionsstatus für α und G

3. **Automatischer Übergang**
   - Sobald sowohl α als auch G mindestens 5 Digits Präzision erreichen, aktiviert sich Ultra Mode automatisch
   - Sie sehen dann:
     - Gelbes "Ultra Mode Active" Badge im Evolution Progress Header
     - Gelbes "Ultra Mode" Badge im linken Sidebar
     - Die Anzeige "g_em = c₃ enforced" bei den Coupling Constants

4. **Fortgesetzte Optimierung**
   - Der GA nutzt nun die bestehende Population und konvertiert sie
   - Alle Individuen werden so angepasst, dass g_em = c₃
   - Die Optimierung fokussiert sich auf die verbleibenden Parameter

### Option B: Manueller Toggle während des Laufs

1. **GA im normalen Modus starten**
   - Deaktivieren Sie zunächst den Ultra Mode Toggle
   - Starten Sie den GA

2. **Beobachten Sie die Präzision**
   - Warten Sie, bis α und G beide 5+ Digits erreichen
   - Die Präzision wird im UI-Panel angezeigt

3. **Manuell aktivieren**
   - Aktivieren Sie den Ultra Mode Toggle **während der GA läuft**
   - Der Server prüft die Präzisionsbedingungen
   - Bei Erfolg wird die Population konvertiert

## Visuelle Indikatoren

### Normal Mode
- Kein spezielles Badge
- Coupling Constants werden normal angezeigt
- Toggle zeigt Wartetext wenn aktiviert aber Bedingungen nicht erfüllt

### Ultra Mode Active
- Gelbes "Ultra Mode Active" Badge mit Blitz-Icon
- "Ultra Mode" Badge im Sidebar
- g_em wird gelb hervorgehoben mit "= c₃" Annotation
- Header zeigt "(g_em = c₃ enforced)"

## Wichtige Hinweise

1. **Keine Fortschrittsverluste**: Der Wechsel zu Ultra Mode behält alle bisherigen Erkenntnisse
2. **Population-Konvertierung**: Alle Individuen werden sanft angepasst, nicht neu generiert
3. **Deaktivierung**: Ultra Mode kann jederzeit deaktiviert werden, aber die Population behält die g_em=c₃ Beziehung

## Fehlerbehandlung

- **Zu frühe Aktivierung**: Wenn α oder G noch nicht 5+ Digits haben, wird eine Warnung angezeigt
- **Kein bester Kandidat**: Ultra Mode kann nicht aktiviert werden, wenn noch kein gültiger Kandidat gefunden wurde

## Empfohlene Strategie

1. Aktivieren Sie Ultra Mode von Anfang an für automatischen Übergang
2. Lassen Sie den GA die optimale Zeit für den Wechsel selbst bestimmen
3. Beobachten Sie die Präzisionsentwicklung im UI-Panel
4. Nach Ultra Mode Aktivierung: Fokus auf ξ-Optimierung für Gravitationskonstante 