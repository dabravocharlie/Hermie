import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.jsx";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.error(
    "Missing VITE_CLERK_PUBLISHABLE_KEY. Add it to frontend/.env (and your Vercel env vars)."
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={{ variables: { colorPrimary: "#6E2EF5" } }}
    >
      <App />
    </ClerkProvider>
  </React.StrictMode>
);
