import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Shield, 
  Palette, 
  Factory, 
  Network, 
  X, 
  ArrowLeft,
  ChevronRight,
  Database
} from "lucide-react";
import { UserPermissions } from "../components/backend/UserPermissions";
import { UISettings } from "../components/backend/UISettings";
import { ProductionLineEditor } from "../components/backend/ProductionLineEditor";
import { ProxySettings } from "../components/backend/ProxySettings";
import { MockDataEditor } from "../components/backend/MockDataEditor";
import { useTheme } from "../contexts/ThemeContext";

type MenuKey = "permissions" | "ui" | "production" | "proxy" | "mockdata";

interface MenuItem {
  key: MenuKey;
  label: string;
  icon: React.ReactNode;
}

const menuItems: MenuItem[] = [
  { key: "permissions", label: "用户权限", icon: <Shield className="w-5 h-5" /> },
  { key: "ui", label: "UI设置", icon: <Palette className="w-5 h-5" /> },
  { key: "production", label: "产线编辑", icon: <Factory className="w-5 h-5" /> },
  { key: "proxy", label: "代理设置", icon: <Network className="w-5 h-5" /> },
  { key: "mockdata", label: "测试数据", icon: <Database className="w-5 h-5" /> },
];

export const BackendManagement: React.FC = () => {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const [activeMenu, setActiveMenu] = useState<MenuKey>("permissions");

  const handleClose = () => {
    navigate("/");
  };

  const renderContent = () => {
    switch (activeMenu) {
      case "permissions":
        return <UserPermissions />;
      case "ui":
        return <UISettings />;
      case "production":
        return <ProductionLineEditor />;
      case "proxy":
        return <ProxySettings />;
      case "mockdata":
        return <MockDataEditor />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-full bg-background text-foreground flex flex-col overflow-hidden font-mono">
      {/* Title Bar */}
      <div className="h-10 bg-muted border-b border-border flex items-center justify-between px-4 select-none shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="p-1 hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
            title="返回主界面"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm tracking-wider">后台管理系统</span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-red-500/80 rounded transition-colors"
          title="关闭"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden gap-[2px] bg-border/20">
        {/* Left Sidebar - Menu */}
        <div className="w-64 bg-muted/30 border-r border-border flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveMenu(item.key)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors rounded-sm ${
                    activeMenu === item.key
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {activeMenu === item.key && (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Info */}
          <div className="border-t border-border p-4 space-y-2">
            <div className="text-xs text-muted-foreground">
              <div>系统版本: v2.0.1</div>
              <div>管理员: Admin</div>
              <div>服务地址: {window.location.hostname || 'localhost'}</div>
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-auto bg-background/50">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};