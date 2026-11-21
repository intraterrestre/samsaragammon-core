# Pendientes de diseño (no son errores del motor)

## 666 — Square Karma: rechazar no cuesta nada (21 nov 2026)

Quien recibe una apuesta 666 puede rechazarla sin ningún coste
(`REFUSE_SNAKE_BET` en `src/game/state/reducer.ts`). Aceptar solo le
expone a que el apostador gane un loto; rechazar no le quita nada.

Consecuencia: contra Buddha el 666 funciona (Buddha acepta según su
estrategia), pero entre personas un jugador que piense un poco puede
rechazar siempre, y el 666 casi desaparecería.

Decisión de Federico: NO cambiar la regla todavía. Revisar el incentivo
estratégico más adelante. Los carteles ya muestran con claridad qué pasa al
aceptar y al rechazar.
