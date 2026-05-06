export type UazApiConfig = {
  baseUrl: string;
  token: string; // instance-specific token (or admin token for init)
  adminToken?: string;
};

type FetchOptions = {
  method: "GET" | "POST" | "DELETE";
  pathCandidates: string[];
  body?: unknown;
  timeoutMs?: number;
};

type UazApiResult = {
  ok: boolean;
  status: number;
  data: any;
  pathUsed: string;
  authMode: "bearer" | "token_header" | "query";
};

export function getUazApiBase(): { baseUrl: string; adminToken?: string } | null {
  const baseUrl = Deno.env.get("UAZAPI_BASE_URL")?.replace(/\/$/, "");
  const adminToken = Deno.env.get("UAZAPI_ADMIN_TOKEN")?.trim() || undefined;
  if (!baseUrl) return null;
  return { baseUrl, adminToken };
}

/** Build a config for a specific instance token. */
export function getUazApiConfigForToken(token: string): UazApiConfig | null {
  const base = getUazApiBase();
  if (!base) return null;
  return { baseUrl: base.baseUrl, token: token.trim(), adminToken: base.adminToken };
}

/** Build a config using the admin token (for /instance/init and admin-level ops). */
export function getUazApiAdminConfig(): UazApiConfig | null {
  const base = getUazApiBase();
  if (!base || !base.adminToken) return null;
  return { baseUrl: base.baseUrl, token: base.adminToken, adminToken: base.adminToken };
}

/** Legacy fallback: uses UAZAPI_INSTANCE_TOKEN if set (kept for compat). */
export function getUazApiConfig(): UazApiConfig | null {
  const base = getUazApiBase();
  const token = Deno.env.get("UAZAPI_INSTANCE_TOKEN")?.trim();
  if (!base || !token) return null;
  return { baseUrl: base.baseUrl, token, adminToken: base.adminToken };
}

function withQuery(path: string, config: UazApiConfig): string {
  const params = new URLSearchParams();
  params.set("token", config.token);
  if (config.adminToken) params.set("admintoken", config.adminToken);
  return path.includes("?") ? `${path}&${params.toString()}` : `${path}?${params.toString()}`;
}

function redactSecretsInPath(path: string): string {
  return path
    .replace(/([?&]token=)[^&]+/gi, "$1***")
    .replace(/([?&]admintoken=)[^&]+/gi, "$1***");
}

function parseMaybeJson(raw: string): any {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return { raw }; }
}

export async function uazApiFetch(config: UazApiConfig, options: FetchOptions): Promise<UazApiResult> {
  const timeoutMs = options.timeoutMs ?? 30000;
  const body = options.body ? JSON.stringify(options.body) : undefined;
  const attempts: Array<{ path: string; auth: string; status: number; response: any }> = [];

  const authVariants: Array<{
    mode: "bearer" | "token_header" | "query";
    headers: Record<string, string>;
    buildPath: (p: string) => string;
  }> = [
    {
      mode: "bearer",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.token}` },
      buildPath: (p) => p,
    },
    {
      mode: "token_header",
      headers: {
        "Content-Type": "application/json",
        token: config.token,
        ...(config.adminToken ? { admintoken: config.adminToken } : {}),
      },
      buildPath: (p) => p,
    },
    {
      mode: "query",
      headers: { "Content-Type": "application/json" },
      buildPath: (p) => withQuery(p, config),
    },
  ];

  for (const path of options.pathCandidates) {
    for (const auth of authVariants) {
      const signal = AbortSignal.timeout(timeoutMs);
      const finalPath = auth.buildPath(path);
      const url = `${config.baseUrl}${finalPath}`;
      const safePath = redactSecretsInPath(finalPath);

      try {
        const res = await fetch(url, {
          method: options.method,
          headers: auth.headers,
          ...(body ? { body } : {}),
          signal,
        });

        const text = await res.text();
        const data = parseMaybeJson(text);
        attempts.push({ path: safePath, auth: auth.mode, status: res.status, response: data });

        if (res.ok) {
          return { ok: true, status: res.status, data, pathUsed: safePath, authMode: auth.mode };
        }
        if ([401, 403, 404, 405].includes(res.status)) continue;
      } catch (err: any) {
        attempts.push({ path: safePath, auth: auth.mode, status: 0, response: { error: err?.message ?? "network_error" } });
        continue;
      }
    }
  }

  const summary = attempts
    .map((a) => `[${a.status}] ${a.auth} ${a.path} => ${JSON.stringify(a.response)}`)
    .join(" | ");

  throw new Error(`UazAPI request failed: ${summary}`);
}

/** Extract instance token from /instance/init response. */
export function extractInstanceToken(data: any): string | null {
  const candidates = [
    data?.token,
    data?.instance?.token,
    data?.data?.token,
    data?.data?.instance?.token,
    data?.instanceToken,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

export function extractStatus(data: any): string {
  const candidates = [
    data?.status, data?.state,
    data?.instance?.state, data?.instance?.status,
    data?.data?.status, data?.data?.state,
    data?.data?.instance?.state, data?.data?.instance?.status,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (typeof candidate === "number" || typeof candidate === "boolean") return String(candidate);
    if (candidate && typeof candidate === "object") {
      const nested = (candidate as Record<string, unknown>)?.state ?? (candidate as Record<string, unknown>)?.status;
      if (typeof nested === "string" && nested.trim()) return nested;
      if (typeof nested === "number" || typeof nested === "boolean") return String(nested);
    }
  }
  return "unknown";
}

export function isConnectedStatus(status: unknown): boolean {
  if (typeof status === "boolean") return status;
  if (status && typeof status === "object") {
    const obj = status as Record<string, unknown>;
    if (typeof obj.connected === "boolean") return obj.connected;
    if (typeof obj.isConnected === "boolean") return obj.isConnected;
  }
  const normalized = String(status ?? "").toLowerCase();
  return (
    normalized === "connected" || normalized === "open" || normalized === "online" ||
    normalized === "ready" || normalized.includes("connected") || normalized.includes("open")
  );
}

export function extractPhone(data: any): string | null {
  const raw = data?.phone ?? data?.me?.id ?? data?.owner ?? data?.instance?.owner ?? null;
  return raw ? String(raw).replace(/@.*$/, "").replace(/\D/g, "") : null;
}

export function extractQrBase64(data: any): string | null {
  const candidates = [
    data?.qrcode, data?.base64, data?.qr,
    data?.qrcode?.base64, data?.qrcode?.qr, data?.qrcode?.url,
    data?.data?.qrcode, data?.data?.base64, data?.data?.qr,
    data?.data?.qrcode?.base64, data?.data?.qrcode?.qr, data?.data?.qrcode?.url,
    data?.data?.instance?.qrcode, data?.instance?.qrcode,
  ];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const value = candidate.trim();
    if (!value) continue;
    if (value.startsWith("data:image/")) return value;
    if (/^https?:\/\//i.test(value)) return value;
    if (/^[A-Za-z0-9+/=\r\n]+$/.test(value) && value.length > 100) return value;
  }
  return null;
}
