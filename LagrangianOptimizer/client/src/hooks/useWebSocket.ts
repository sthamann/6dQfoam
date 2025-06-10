/* ------------------------------------------------------------------
 * useWebSocket.ts – react-hook für robuste GA-Updates
 * ------------------------------------------------------------------
 * • saubere URL-Ermittlung (Hostname + Port ≠ undefined)
 * • Heart-Beat-Ping, Auto-Reconnect, Fehler-Handling
 * • debounce optional, falls du spä­ter throtteln willst
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import type { GAUpdate } from "@shared/schema";

/** Interval in ms, nach dem wir den Server anpingen, um Idle-Timeouts zu verhindern. */
const HEARTBEAT_MS = 25_000;
/** Wartezeit bis zum nächsten Reconnect-Versuch (exponentiell hochgezählt). */
const BASE_RECONNECT_MS = 3_000;

export function useWebSocket(
  onUpdate: (update: GAUpdate) => void,
  path = "/ws", // ggf. anpassen, falls dein Backend einen anderen End-Point nutzt
) {
  const socketRef = useRef<WebSocket | null>(null);
  const beatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);

  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<
    "Disconnected" | "Connected" | "Reconnecting" | "Error"
  >("Disconnected");
  const reconnectAttempt = useRef(0); // exponentielles Back-off

  /* ----------------------------------------------------------------
   * Hilfs-Funktionen
   * -------------------------------------------------------------- */
  const clearTimers = () => {
    if (beatRef.current) {
      clearInterval(beatRef.current);
      beatRef.current = null;
    }
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    }
  };

  const buildWsURL = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Use host as provided by the current location (includes port if any)
    const host = window.location.host; // e.g. localhost:5173 (dev) or myapp.com

    // Construct final URL (no artificial port override)
    const url = `${protocol}//${host}${path}`;
    console.log(`[WS] Building WebSocket URL for path "${path}": ${url}`);
    return url;
  };

  /* ----------------------------------------------------------------
   * Kern-Connect-Prozedur
   * -------------------------------------------------------------- */
  const connect = () => {
    clearTimers(); // safety

    try {
      const wsURL = buildWsURL();
      const sock = new WebSocket(wsURL);
      socketRef.current = sock;

      /* -----  OPEN  ------------------------------------------------ */
      sock.onopen = () => {
        console.info("[WS] ↔ connected →", wsURL);
        setConnected(true);
        setStatus("Connected");
        reconnectAttempt.current = 0; // Reset Back-off

        /*  Heart-Beat-Ping, damit Replit / Heroku nicht nach Idle kappt */
        beatRef.current = setInterval(() => {
          if (sock.readyState === WebSocket.OPEN) {
            sock.send("__ping__");
          }
        }, HEARTBEAT_MS);
      };

      /* -----  MESSAGE  --------------------------------------------- */
      sock.onmessage = (ev) => {
        if (ev.data === "__pong__") return; // optionaler Pong
        try {
          const msg: GAUpdate = JSON.parse(ev.data);
          onUpdate(msg);
        } catch (e) {
          console.warn("[WS] JSON-Parse-Fehler:", e);
        }
      };

      /* -----  CLOSE & ERROR  --------------------------------------- */
      const scheduleReconnect = () => {
        if (reconnectRef.current) return; // bereits geplant
        setConnected(false);
        setStatus("Reconnecting");
        const delay =
          BASE_RECONNECT_MS * Math.min(6, ++reconnectAttempt.current);
        console.warn(
          `[WS] 🚧 Verbindung verloren – versuche in ${delay} ms erneut …`,
        );
        reconnectRef.current = setTimeout(() => connect(), delay);
      };

      sock.onclose = scheduleReconnect;
      sock.onerror = (ev) => {
        console.error("[WS] error", ev);
        setStatus("Error");
        scheduleReconnect();
      };
    } catch (err) {
      console.error("[WS] Konstruktion fehlgeschlagen:", err);
      setStatus("Error");
      /* Sofortiger Reconnect-Versuch in 5 s */
      reconnectRef.current = setTimeout(() => connect(), 5_000);
    }
  };

  /* ----------------------------------------------------------------
   * Lifecycle
   * -------------------------------------------------------------- */
  useEffect(() => {
    connect(); // initial

    return () => {
      clearTimers();
      socketRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------- */
  return { connected, status, isConnected: connected, connectionStatus: status, socket: socketRef.current };
}
