import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log('!!! RENDERER_BOOT_START !!!');

const container = document.getElementById("root");
if (!container) {
  console.error("!!! ROOT_CONTAINER_MISSING !!!");
} else {
  try {
    createRoot(container).render(<App />);
    console.log('!!! RENDER_CALL_SENT !!!');
  } catch (e) {
    console.error("!!! RENDER_CRASH !!!", e);
  }
}
