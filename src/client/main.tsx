import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { tsr } from "./tsr";
import { App } from "./App";
import { installGtm } from "./analytics";
import "./index.css";

installGtm();

const queryClient = new QueryClient();

function start() {
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <QueryClientProvider client={queryClient}>
      <tsr.ReactQueryProvider>
        <App />
      </tsr.ReactQueryProvider>
    </QueryClientProvider>,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
