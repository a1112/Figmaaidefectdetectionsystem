import { useEffect, useState } from "react";
import { Shield, RefreshCcw, User, Lock, Plus, Save, Trash2, ChevronDown } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "../ui/dropdown-menu";
import { toast } from "sonner@2.0.3";
import {
  getUsers,
  getRoles,
  getPolicies,
  createUser,
  updateUser,
  deleteUser,
  createRole,
  updateRole,
  deleteRole,
  createPolicy,
  updatePolicy,
  deletePolicy,
  type AdminPolicy,
  type AdminRole,
  type AdminUser,
} from "../../src/api/admin";

export const PermissionsPanel: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [policies, setPolicies] = useState<AdminPolicy[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "roles" | "policies">(
    "users",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userPasswords, setUserPasswords] = useState<Record<number, string>>({});
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    roles: [] as string[],
    is_active: true,
    is_superuser: false,
  });
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const [newPolicy, setNewPolicy] = useState({
    ptype: "p",
    v0: "",
    v1: "",
    v2: "",
    v3: "",
    v4: "",
    v5: "",
  });

  const loadAll = async () => {
    setIsRefreshing(true);
    try {
      const [usersData, rolesData, policiesData] = await Promise.all([
        getUsers(),
        getRoles(),
        getPolicies(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setPolicies(policiesData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "加载权限数据失败";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const roleOptions = roles.map((role) => role.name);
  const formatRoles = (items: string[]) =>
    items.length > 0 ? items.join(", ") : "请选择角色";

  const RoleDropdown: React.FC<{
    value: string[];
    onChange: (next: string[]) => void;
  }> = ({ value, onChange }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-between">
          <span className="truncate">{formatRoles(value)}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {roleOptions.length === 0 ? (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            暂无角色
          </div>
        ) : (
          roleOptions.map((role) => (
            <DropdownMenuCheckboxItem
              key={role}
              checked={value.includes(role)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onChange([...value, role]);
                } else {
                  onChange(value.filter((item) => item !== role));
                }
              }}
            >
              {role}
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const handleUserChange = (id: number, patch: Partial<AdminUser>) => {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, ...patch } : user)));
  };

  const handleSaveUser = async (user: AdminUser) => {
    try {
      const password = userPasswords[user.id]?.trim() || undefined;
      const updated = await updateUser(user.id, {
        username: user.username,
        roles: user.roles,
        is_active: user.is_active,
        is_superuser: user.is_superuser,
        password,
      });
      setUsers((prev) => prev.map((item) => (item.id === user.id ? updated : item)));
      setUserPasswords((prev) => ({ ...prev, [user.id]: "" }));
      toast.success("用户已更新");
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新用户失败";
      toast.error(message);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username.trim() || !newUser.password.trim()) {
      toast.error("用户名和密码不能为空");
      return;
    }
    try {
      const item = await createUser({
        username: newUser.username.trim(),
        password: newUser.password,
        roles: newUser.roles,
        is_active: newUser.is_active,
        is_superuser: newUser.is_superuser,
      });
      setUsers((prev) => [item, ...prev]);
      setNewUser({
        username: "",
        password: "",
        roles: [],
        is_active: true,
        is_superuser: false,
      });
      toast.success("用户已创建");
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建用户失败";
      toast.error(message);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("确定要删除该用户吗？")) return;
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((user) => user.id !== id));
      toast.success("用户已删除");
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除用户失败";
      toast.error(message);
    }
  };

  const handleSaveRole = async (role: AdminRole) => {
    try {
      const updated = await updateRole(role.id, {
        name: role.name,
        description: role.description ?? "",
      });
      setRoles((prev) => prev.map((item) => (item.id === role.id ? updated : item)));
      toast.success("角色已更新");
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新角色失败";
      toast.error(message);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) {
      toast.error("角色名称不能为空");
      return;
    }
    try {
      const item = await createRole({
        name: newRole.name.trim(),
        description: newRole.description || "",
      });
      setRoles((prev) => [item, ...prev]);
      setNewRole({ name: "", description: "" });
      toast.success("角色已创建");
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建角色失败";
      toast.error(message);
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!confirm("确定要删除该角色吗？")) return;
    try {
      await deleteRole(id);
      setRoles((prev) => prev.filter((role) => role.id !== id));
      toast.success("角色已删除");
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除角色失败";
      toast.error(message);
    }
  };

  const handleSavePolicy = async (policy: AdminPolicy) => {
    try {
      const updated = await updatePolicy(policy.id, {
        ptype: policy.ptype,
        v0: policy.v0,
        v1: policy.v1,
        v2: policy.v2,
        v3: policy.v3,
        v4: policy.v4,
        v5: policy.v5,
      });
      setPolicies((prev) => prev.map((item) => (item.id === policy.id ? updated : item)));
      toast.success("策略已更新");
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新策略失败";
      toast.error(message);
    }
  };

  const handleCreatePolicy = async () => {
    if (!newPolicy.ptype.trim()) {
      toast.error("策略类型不能为空");
      return;
    }
    try {
      const item = await createPolicy({
        ptype: newPolicy.ptype.trim(),
        v0: newPolicy.v0 || null,
        v1: newPolicy.v1 || null,
        v2: newPolicy.v2 || null,
        v3: newPolicy.v3 || null,
        v4: newPolicy.v4 || null,
        v5: newPolicy.v5 || null,
      });
      setPolicies((prev) => [item, ...prev]);
      setNewPolicy({
        ptype: "p",
        v0: "",
        v1: "",
        v2: "",
        v3: "",
        v4: "",
        v5: "",
      });
      toast.success("策略已创建");
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建策略失败";
      toast.error(message);
    }
  };

  const handleDeletePolicy = async (id: number) => {
    if (!confirm("确定要删除该策略吗？")) return;
    try {
      await deletePolicy(id);
      setPolicies((prev) => prev.filter((policy) => policy.id !== id));
      toast.success("策略已删除");
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除策略失败";
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        正在加载权限数据...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl">任务权限</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              基于 Casbin 的 RBAC 配置与账户信息
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border bg-muted/30 p-1 text-xs">
            {[
              { key: "users", label: "用户" },
              { key: "roles", label: "角色" },
              { key: "policies", label: "权限" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-3 py-1 rounded-sm transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAll}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            {isRefreshing ? "刷新中..." : "刷新"}
          </Button>
        </div>
      </div>

      {activeTab === "users" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              用户管理
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 rounded-lg border border-border bg-muted/20 p-3 text-xs">
              <Input
                placeholder="用户名"
                value={newUser.username}
                onChange={(e) =>
                  setNewUser((prev) => ({ ...prev, username: e.target.value }))
                }
              />
              <Input
                placeholder="密码"
                type="password"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser((prev) => ({ ...prev, password: e.target.value }))
                }
              />
              <RoleDropdown
                value={newUser.roles}
                onChange={(next) =>
                  setNewUser((prev) => ({ ...prev, roles: next }))
                }
              />
              <div className="flex items-center gap-2 text-xs">
                <Switch
                  checked={newUser.is_active}
                  onCheckedChange={(checked) =>
                    setNewUser((prev) => ({ ...prev, is_active: checked }))
                  }
                />
                启用
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Switch
                  checked={newUser.is_superuser}
                  onCheckedChange={(checked) =>
                    setNewUser((prev) => ({ ...prev, is_superuser: checked }))
                  }
                />
                超管
              </div>
              <Button size="sm" onClick={handleCreateUser} className="flex gap-2">
                <Plus className="w-4 h-4" />
                新增
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户名</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>新密码</TableHead>
                  <TableHead>启用</TableHead>
                  <TableHead>超管</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Input
                        value={user.username}
                        onChange={(e) =>
                          handleUserChange(user.id, { username: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <RoleDropdown
                        value={user.roles}
                        onChange={(next) =>
                          handleUserChange(user.id, { roles: next })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="password"
                        placeholder="留空不修改"
                        value={userPasswords[user.id] || ""}
                        onChange={(e) =>
                          setUserPasswords((prev) => ({
                            ...prev,
                            [user.id]: e.target.value,
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.is_active}
                        onCheckedChange={(checked) =>
                          handleUserChange(user.id, { is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.is_superuser}
                        onCheckedChange={(checked) =>
                          handleUserChange(user.id, { is_superuser: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveUser(user)}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      暂无用户数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === "roles" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4" />
              角色管理
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-lg border border-border bg-muted/20 p-3 text-xs">
              <Input
                placeholder="角色名称"
                value={newRole.name}
                onChange={(e) =>
                  setNewRole((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <Input
                placeholder="角色描述"
                value={newRole.description}
                onChange={(e) =>
                  setNewRole((prev) => ({ ...prev, description: e.target.value }))
                }
              />
              <div className="md:col-span-2 flex items-center">
                <Button size="sm" onClick={handleCreateRole} className="flex gap-2">
                  <Plus className="w-4 h-4" />
                  新增
                </Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>角色名称</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <Input
                        value={role.name}
                        onChange={(e) =>
                          setRoles((prev) =>
                            prev.map((item) =>
                              item.id === role.id
                                ? { ...item, name: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={role.description || ""}
                        onChange={(e) =>
                          setRoles((prev) =>
                            prev.map((item) =>
                              item.id === role.id
                                ? { ...item, description: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveRole(role)}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteRole(role.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {roles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-sm text-muted-foreground">
                      暂无角色数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === "policies" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">权限策略</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-8 gap-2 rounded-lg border border-border bg-muted/20 p-3 text-xs">
              <Input
                placeholder="ptype"
                value={newPolicy.ptype}
                onChange={(e) =>
                  setNewPolicy((prev) => ({ ...prev, ptype: e.target.value }))
                }
              />
              <Input
                placeholder="v0"
                value={newPolicy.v0}
                onChange={(e) =>
                  setNewPolicy((prev) => ({ ...prev, v0: e.target.value }))
                }
              />
              <Input
                placeholder="v1"
                value={newPolicy.v1}
                onChange={(e) =>
                  setNewPolicy((prev) => ({ ...prev, v1: e.target.value }))
                }
              />
              <Input
                placeholder="v2"
                value={newPolicy.v2}
                onChange={(e) =>
                  setNewPolicy((prev) => ({ ...prev, v2: e.target.value }))
                }
              />
              <Input
                placeholder="v3"
                value={newPolicy.v3}
                onChange={(e) =>
                  setNewPolicy((prev) => ({ ...prev, v3: e.target.value }))
                }
              />
              <Input
                placeholder="v4"
                value={newPolicy.v4}
                onChange={(e) =>
                  setNewPolicy((prev) => ({ ...prev, v4: e.target.value }))
                }
              />
              <Input
                placeholder="v5"
                value={newPolicy.v5}
                onChange={(e) =>
                  setNewPolicy((prev) => ({ ...prev, v5: e.target.value }))
                }
              />
              <Button size="sm" onClick={handleCreatePolicy} className="flex gap-2">
                <Plus className="w-4 h-4" />
                新增
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ptype</TableHead>
                  <TableHead>v0</TableHead>
                  <TableHead>v1</TableHead>
                  <TableHead>v2</TableHead>
                  <TableHead>v3</TableHead>
                  <TableHead>v4</TableHead>
                  <TableHead>v5</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell>
                      <Input
                        value={policy.ptype}
                        onChange={(e) =>
                          setPolicies((prev) =>
                            prev.map((item) =>
                              item.id === policy.id
                                ? { ...item, ptype: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={policy.v0 || ""}
                        onChange={(e) =>
                          setPolicies((prev) =>
                            prev.map((item) =>
                              item.id === policy.id
                                ? { ...item, v0: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={policy.v1 || ""}
                        onChange={(e) =>
                          setPolicies((prev) =>
                            prev.map((item) =>
                              item.id === policy.id
                                ? { ...item, v1: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={policy.v2 || ""}
                        onChange={(e) =>
                          setPolicies((prev) =>
                            prev.map((item) =>
                              item.id === policy.id
                                ? { ...item, v2: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={policy.v3 || ""}
                        onChange={(e) =>
                          setPolicies((prev) =>
                            prev.map((item) =>
                              item.id === policy.id
                                ? { ...item, v3: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={policy.v4 || ""}
                        onChange={(e) =>
                          setPolicies((prev) =>
                            prev.map((item) =>
                              item.id === policy.id
                                ? { ...item, v4: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={policy.v5 || ""}
                        onChange={(e) =>
                          setPolicies((prev) =>
                            prev.map((item) =>
                              item.id === policy.id
                                ? { ...item, v5: e.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSavePolicy(policy)}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeletePolicy(policy.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {policies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-sm text-muted-foreground">
                      暂无策略数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
