import { Moon, Sun } from 'lucide-react';
import { ModeSwitch } from '../ModeSwitch';
import type { Theme } from '../../types/app.types';

interface SettingsPageProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ theme, setTheme }) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6 p-8 border border-border bg-card mt-8">
      <div className="pb-4 border-b border-border">
        <h3 className="text-lg font-medium">SYSTEM CONFIGURATION</h3>
        <p className="text-sm text-muted-foreground">Manage detection parameters and device settings</p>
      </div>
      
      {/* API 模式切换 */}
      <ModeSwitch />
      
      <div className="space-y-4">
        {/* 主题设置 */}
        <div className="grid grid-cols-2 items-center gap-4">
           <label className="text-sm font-medium">THEME / 主题</label>
           <div className="flex items-center gap-2 bg-background border border-border rounded-sm p-1">
             <button
               onClick={() => setTheme('light')}
               className={`flex-1 px-3 py-1.5 text-xs rounded-sm transition-colors flex items-center justify-center gap-1.5 ${
                 theme === 'light'
                   ? 'bg-primary text-primary-foreground'
                   : 'text-muted-foreground hover:text-foreground'
               }`}
             >
               <Sun className="w-3.5 h-3.5" />
               LIGHT
             </button>
             <button
               onClick={() => setTheme('dark')}
               className={`flex-1 px-3 py-1.5 text-xs rounded-sm transition-colors flex items-center justify-center gap-1.5 ${
                 theme === 'dark'
                   ? 'bg-primary text-primary-foreground'
                   : 'text-muted-foreground hover:text-foreground'
               }`}
             >
               <Moon className="w-3.5 h-3.5" />
               DARK
             </button>
           </div>
        </div>
        
        <div className="grid grid-cols-2 items-center gap-4">
           <label className="text-sm font-medium">DETECTION THRESHOLD</label>
           <input type="range" className="w-full accent-primary" />
        </div>
        <div className="grid grid-cols-2 items-center gap-4">
           <label className="text-sm font-medium">CAMERA EXPOSURE</label>
           <input type="range" className="w-full accent-primary" />
        </div>
        <div className="grid grid-cols-2 items-center gap-4">
           <label className="text-sm font-medium">AUTO-ARCHIVE LOGS</label>
           <div className="flex items-center gap-2">
             <input type="checkbox" checked readOnly className="accent-primary w-4 h-4" />
             <span className="text-sm text-muted-foreground">ENABLED</span>
           </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border flex justify-end gap-2">
        <button className="px-4 py-2 border border-border hover:bg-accent text-sm transition-colors">RESET</button>
        <button className="px-4 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">SAVE CHANGES</button>
      </div>
    </div>
  );
};
