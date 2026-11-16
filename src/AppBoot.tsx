import { useState } from "react";
import App from "./App";
import Intro from "./UI/Intro";

// 16 nov 2026 — quien llega con un enlace de invitación (?partida=CÓDIGO)
// entra directo a la partida: sin la intro de la rueda ni el video.
const hasInvite =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("partida");

export default function AppBoot() {
  const [showIntro, setShowIntro] = useState(!hasInvite);

  return showIntro ? (
    <Intro onEnd={() => setShowIntro(false)} />
  ) : (
    <App />
  );
}