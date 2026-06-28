import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/nova-square/400.css";
import "./style.css";
import "./i18n/config";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { optimizeThreeJS } from "./utils/three/setup";
import { StarknetProvider } from "./lib/starknet-provider";

const queryClient = new QueryClient();

optimizeThreeJS();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StarknetProvider>
      <GoogleOAuthProvider
        clientId={import.meta.env.VITE_REACT_APP_GOOGLE_CLIENT_ID}
      >
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </GoogleOAuthProvider>
    </StarknetProvider>
  </React.StrictMode>,
);
