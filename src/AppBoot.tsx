import { useState } from "react";
import App from "./App";
import Intro from "./UI/Intro";

export default function AppBoot() {
  const [showIntro, setShowIntro] = useState(true);

  return showIntro ? (
    <Intro onEnd={() => setShowIntro(false)} />
  ) : (
    <App />
  );
}