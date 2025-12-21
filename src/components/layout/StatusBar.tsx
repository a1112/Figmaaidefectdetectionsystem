import { Server, Wifi } from 'lucide-react';

export const StatusBar: React.FC = () => {
  return (
    <div className="h-6 bg-primary text-primary-foreground flex items-center justify-between px-3 text-[10px] uppercase tracking-wider shrink-0">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1"><Server className="w-3 h-3" /> SERVER: ONLINE (42ms)</span>
        <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> SIGNAL: STRONG</span>
      </div>
      <div>
        USER: OPERATOR_01 | SESSION: #882910
      </div>
    </div>
  );
};
