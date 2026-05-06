// UazAPI v2 helper
// Auth rules (per official SDK):
//  - admin endpoints (/instance/init, /instance/all, ...) use header: admintoken
//  - instance endpoints (/instance/status, /instance/connect, /send/text, ...) use header: token

export type AuthType = "admin" | "instance";

export type UazApiConfig = {
  baseUrl: string;
  adminToken?: string;
  instanceToken?: string;
};

type FetchOptions = {
  method: "GET" | "POST" | "DELETE" | "PUT";
  pathCandidates: string[];
  authType: AuthType;
  body?: unknown;
  timeoutMs?: number;
};

type UazApiResult = {
  ok: boolean;
  status: number;
  data: any;
  pathUsed: string;
};

export function getUazApiBase(): { baseUrl: string; adminToken?: string } | null {
  const baseUrl = Deno.env.get("UAZAPI_BASE_URL")?.replace(/\/$/, "");
  const adminToken = Deno.env.get("UAZAPI_ADMIN_TOKEN")?.trim() || undefined;
  if (!baseUrl) return null;
  return { baseUrl, adminToken };
}

/** Config for a specific instance token. */
export function getUazApiConfigForToken(token: string): UazApiConfig | null {
  const base = getUazApiBase();
  if (!base) return null;
  return { baseUrl: base.baseUrl, adminToken: base.adminToken, instanceToken: token.trim() };
}

/** Config for admin-level operations. */
export function getUazApiAdminConfig(): UazApiConfig | null {
  const base = getUazApiBase();
  if (!base || !base.adminToken) return null;
  return { baseUrl: base.baseUrl, adminToken: base.adminToken };
}

function parseMaybeJson(raw: string): any {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return { raw }; }
}

export async function uazApiFetch(config: UazApiConfig, options: FetchOptions): Promise<UazApiResult> {
  const timeoutMs = options.timeoutMs ?? 30000;
  const body = options.body !== undefined ? JSON.stringify(options.body) : undefined;

  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
  if (options.authType === "admin") {
    if (!config.adminToken) throw new Error("UazAPI admin token não configurado.");
    headers["admintoken"] = config.adminToken;
  } else {
    if (!config.instanceToken) throw new Error("UazAPI instance token não fornecido.");
    headers["token"] = config.instanceToken;
  }

  const attempts: Array<{ path: string; status: number; response: any }> = [];

  for (const path of options.pathCandidates) {
    const signal = AbortSignal.timeout(timeoutMs);
    const url = `${config.baseUrl}${path}`;
    try {
      const res = await fetch(url, {
        method: options.method,
        headers,
        ...(body ? { body } : {}),
        signal,
      });
      const text = await res.text();
      const data = parseMaybeJson(text);
      attempts.push({ path, status: res.status, response: data });
      if (res.ok) return { ok: true, status: res.status, data, pathUsed: path };
      if ([401, 403, 404, 405].includes(res.status)) continue;
      // other status: stop and report
      throw new Error(`UazAPI ${path} -> ${res.status}: ${text.slice(0, 300)}`);
    } catch (err: any) {
      if (err?.name === "TimeoutError" || err?.name === "AbortError") {
        attempts.push({ path, status: 0, response: { error: "timeout" } });
        continue;
      }
      attempts.push({ path, status: 0, response: { error: err?.message ?? "network_error" } });
      continue;
    }
  }

  const summary = attempts
    .map((a) => `[${a.status}] ${a.path} => ${JSON.stringify(a.response).slice(0, 200)}`)
    .join(" | ");
  throw new Error(`UazAPI request failed (auth=${options.authType}): ${summary}`);
}

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
    }
  }
  return "unknown";
}

export function isConnectedStatus(status: unknown): boolean {
  if (typeof status === "boolean") return status;
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
    data?.instance?.qrcode, data?.instance?.paircode,
    data?.data?.qrcode, data?.data?.base64, data?.data?.qr,
    data?.data?.qrcode?.base64, data?.data?.qrcode?.qr, data?.data?.qrcode?.url,
    data?.data?.instance?.qrcode,
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
