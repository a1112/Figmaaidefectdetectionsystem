import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { BackendManagement } from "./pages/BackendManagement";
import TraditionalMode from "./pages/traditional/TraditionalMode";
import { toast } from "sonner@2.0.3";
import { ThemeProvider } from "./components/ThemeContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  // 全局非阻塞错误处理
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global Error Caught:", event.error);
      toast.error("系统运行错误", {
        description: event.error?.message || "发生未知错误，请检查控制台。",
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled Rejection:", event.reason);
      toast.error("数据加载失败", {
        description: event.reason?.message || "后端接口未响应，请检查网络连接。",
      });
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/BackendManagement"
              element={<BackendManagement />}
            />
            <Route path="/TraditionalMode" element={<TraditionalMode />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}