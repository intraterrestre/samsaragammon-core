# SAMSARAGAMMON — TRANSFERENCIA PARA SIGUIENTE SESIÓN
### 2026-07-30

---

## REPOSITORIO
- GitHub: https://github.com/intraterrestre/samsaragammon-core
- Token: TOKEN_EN_MAC_LOCAL (expira Aug 28 2026)
- Deploy: samsaragammon-core-samsaragammon.vercel.app
- Supabase: restaurado y activo
- Ruta local Mac: /Users/federico/samsaragammon-core

---

## ÚLTIMO COMMIT
832594a — fix: ocultar maraPainting y MoveEmanations durante Genesis

---

## QUÉ SE IMPLEMENTÓ HOY

### Karma Engine v2
- actorProfiles.ts: animalAffinity + venomKarmaModifier por Avatar
- Bruno+Cerdo=1.4x, Whitman+Cerdo=0.4x
- Cada Avatar expresa cada Veneno con distinto peso kármico

### Mecánica de Venenos (DECISIÓN CRÍTICA)
Los Venenos son fichas físicas permanentes con posición propia.
El destino se calcula desde la posición del VENENO, no del Avatar.
Cuando un Avatar usa un Veneno, AMBOS viajan al destino.
Hasta 9 combinaciones posibles por turno (3 Avatares × 3 Venenos en posiciones distintas).

### Movimiento en sentidos opuestos
- P1: horario (clockwise)
- P2: antihorario (counterclockwise)
- preview.ts v2: normalizeBoardPosition((pos % 24 + 24) % 24)

### Orquestador de Progresión (NUEVO MÓDULO)
- src/game/orchestrator/Orchestrator.ts
- evaluateOrchestrator() con umbrales D-020:
  - Bruno→Margot: minTurns:10, captureRateMin:0.15, hysteresisTurns:2
  - Margot→Oriol: minTurns:20, captureRateMin:0.20, hysteresisTurns:2
  - Oriol→Marino: minTurns:35, captureRateMin:0.25, hysteresisTurns:3
  - Marino→Rufus: minTurns:50, captureRateMin:0.25, hysteresisTurns:3
  - Rufus→Whitman: minTurns:65, sharedCaptureRateMin:0.30, hysteresisTurns:4

### GameConfig
type GameConfig = {
  skipGenesis: boolean;
  victoryMode: "4x1" | "2x2";
  transitionEventSelection: "round_robin" | "context_based" | "random";
}

### Dados de Piedra Real
- src/assets/dice/stone_white_1-6.webp (P1)
- src/assets/dice/stone_black_1-6.webp (P2)
- eraDiceSkins.ts actualizado

### Genesis Visual (SISTEMA COMPLETO)
src/assets/genesis/ contiene 47 archivos:
- genesis_dados.mp4 — video intro explosión sideral
- genesis_f0.webp ... genesis_f20.webp — frames nebulosa/bastidores
- genesis_cv01.webp ... genesis_cv24.webp — casillas verdes ancestrales

GenesisReveal.tsx:
- Fases: VIDEO → NEBULA → CASILLAS → COMPLETE
- VIDEO: video dados girando (automático)
- NEBULA: 22 frames que avanzan con cada lance
- CASILLAS: casillas verdes de 4 en 4 por lance
- COMPLETE: tablero real aparece
- Usa import.meta.glob para assets (funciona en producción)
- rollCount relativo (startRoll) — siempre empieza desde 0

### UI durante Genesis (OCULTO)
Durante genesisComplete=false están ocultos:
- maraPainting (imagen tablero completo)
- renderedPieces (fichas)
- MoveEmanations (líneas de movimiento)
- nidanaLivingBanner
- ghostWord
- Buda Dharma Emergencies
- FandangoKarma
- SacredProgress (Yin-Yang)
- MaraPanel

boardLayer: opacity:0 durante Genesis, visible al completar

### Otros cambios UI
- Borde verde eliminado
- Letras Nidana: blancas con borde negro
- DicePopup: dados 72px, fondo transparente

---

## TABLA DE REINOS CORRECTA (Canon v1.3)

| Avatar | Reino Budista | Era | Color |
|--------|--------------|-----|-------|
| Bruno | Hungry Ghost | Paleolítico | Negro |
| Margot | Hell/Infierno | Neolítico | Morado |
| Oriol | Animals/Animales | Edad Metales | Amarillo/Oro |
| Marino | Humans/Humanos | Antigüedad | Azul |
| Rufus | Asuras/Semidioses | Renacimiento | Rojo |
| Whitman | Devas/Dioses | Iluminación | Blanco |

---

## REGLAS DEL JUEGO

### Dos fases
FASE 1 (hasta Oriol): Venenos capturan Venenos
FASE 2 (desde Oriol): Avatares capturan Avatares, Venenos=funciones

### Bloqueo (igual a Backgammon)
- 0 fichas → libre
- 1+ propias → apilamiento permitido
- 1 rival → captura (va a Mara)
- 2+ rivales → bloqueado

### Mara: 6 turnos para todos (validado en pruebas)

### Apilamiento: 2 Avatares propios = invulnerables

### Condiciones de victoria
Requiere Whitman activo:
- Camino A (4x1): 4 Avatares en 4 casillas distintas de Humans
- Camino A (2x2): 2 pares apilados en 2 casillas de Humans
- Camino B: 3 Avatares en Humans + 1 en Mara

---

## PENDIENTES

1. Verificar que glitch del tablero está resuelto (commit 832594a)
2. Video intro a veces no dispara — issue de autoplay del browser
3. Calibrar umbrales del Orquestador con partidas reales
4. Los Venenos deben calcular destino desde su posición, no del Avatar
   → getMoveOptionsForPlayer.ts necesita actualización para Fase 2
5. Cara de Mara revelación progresiva (cuadro a cuadro con cada Avatar)
6. Vestigium — no implementado

---

## DOCUMENTOS DE DISEÑO (en Google Drive)
- SAMSARAGAMMON_CANON_v1.3.md
- SAMSARAGAMMON_RFC_v0.9.md
- SAMSARAGAMMON_TRANSICIONES_v1.0.md
- SAMSARAGAMMON_ACTUALIZACION_VENENOS_v1.0.md

