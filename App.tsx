import MainApplication from "./MainApplication";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BackendManagement } from "./pages/BackendManagement";
import { ThemeProvider } from "./contexts/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainApplication />} />
          <Route path="/BackendManagement" element={<BackendManagement />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}