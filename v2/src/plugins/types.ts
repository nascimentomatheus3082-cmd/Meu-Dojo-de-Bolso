export type PluginPermission = "profile:read" | "progress:read" | "progress:write" | "lessons:read" | "ai:invoke" | "media:read";
export type PluginStatus = "available" | "beta" | "planned";
export interface PluginContext { userId: string; permissions: PluginPermission[]; }
export interface DojoPlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  category: "learning" | "assessment" | "ai" | "community" | "admin";
  status: PluginStatus;
  permissions: PluginPermission[];
  enabledByDefault: boolean;
}
