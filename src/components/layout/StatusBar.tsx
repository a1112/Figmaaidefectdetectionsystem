import { Server, Wifi, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const StatusBar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-6 bg-primary text-primary-foreground flex items-center justify-between px-3 text-[10px] uppercase tracking-wider shrink-0">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1"><Server className="w-3 h-3" /> SERVER: ONLINE (42ms)</span>
        <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> SIGNAL: STRONG</span>
      </div>
      <div className="flex items-center gap-3">
        <span>
          USER: OPERATOR_01 | SESSION: #882910
        </span>
        <button
          type="button"
          onClick={() => navigate('/BackendManagement')}
          className="flex items-center gap-1 px-2 py-0.5 border border-primary-foreground/40 rounded-sm text-[9px] hover:bg-primary-foreground hover:text-primary transition-colors"
        >
          <Shield className="w-3 h-3" />
          后台管理
        </button>
      </div>
    </div>
  );
};
