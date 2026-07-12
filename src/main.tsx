import React from "react";
import ReactDOM from "react-dom/client";
import AppBoot from "./AppBoot";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <AppBoot />
);

// Solo registramos el service worker en producción. En desarrollo (npm run
// dev) el SW se queda "pegado" en el móvil y sigue sirviendo la versión
// vieja cacheada aunque el código cambie y se refresque la página.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}