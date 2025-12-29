import { useEffect, useState } from "react";
import { FileText, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { CodeHighlight } from "../ui/code-highlight";
import { getNginxConfig, type NginxConfigPayload } from "../../src/api/admin";

export const ProxySettings: React.FC = () => {
  const [config, setConfig] = useState<NginxConfigPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const payload = await getNginxConfig();
      setConfig(payload);
    } catch (err) {
      setConfig(null);
      setError(err instanceof Error ? err.message : "Failed to load nginx config");
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl">代理设置</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            当前从后端读取的 Nginx 配置内容
          </p>
        </div>
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadConfig}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            {isRefreshing ? "加载中..." : "刷新"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Nginx 配置文件
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && (
            <div className="text-xs text-muted-foreground">
              正在加载 Nginx 配置...
            </div>
          )}
          {!isLoading && error && (
            <div className="text-xs text-destructive">
              {error}
            </div>
          )}
          {!isLoading && !error && config && (
            <>
              <div className="text-xs text-muted-foreground">
                路径: {config.path}
              </div>
              <CodeHighlight code={config.content} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
