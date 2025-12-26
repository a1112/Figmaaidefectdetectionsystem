import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import { BackendManagement } from "./pages/BackendManagement";
import { ThemeProvider } from "./components/ThemeContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route
            path="/BackendManagement"
            element={<BackendManagement />}
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </ErrorBoundary>,
);
  
