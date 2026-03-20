export type UazApiConfig = {
  baseUrl: string;
  token: string;
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
  authMode: "header" | "query";
};

export function getUazApiConfig(): UazApiConfig | null {
  const baseUrl = Deno.env.get("UAZAPI_BASE_URL")?.replace(/\/$/, "");
  const token = Deno.env.get("UAZAPI_INSTANCE_TOKEN");
  const adminToken = Deno.env.get("UAZAPI_ADMIN_TOKEN") || undefined;

  if (!baseUrl || !token) return null;
  return { baseUrl, token, adminToken };
}

function withQuery(path: string, config: UazApiConfig): string {
  const params = new URLSearchParams();
  params.set("token", config.token);
  if (config.adminToken) params.set("admintoken", config.adminToken);
  return path.includes("?") ? `${path}&${params.toString()}` : `${path}?${params.toString()}`;
}

function parseMaybeJson(raw: string): any {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

export async function uazApiFetch(config: UazApiConfig, options: FetchOptions): Promise<UazApiResult> {
  const timeoutMs = options.timeoutMs ?? 30000;
  const body = options.body ? JSON.stringify(options.body) : undefined;
  const attempts: Array<{ path: string; auth: string; status: number; response: any }> = [];

  const authVariants: Array<{
    mode: "header" | "query";
    headers: Record<string, string>;
    buildPath: (p: string) => string;
  }> = [
    {
      mode: "header",
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

      try {
        const res = await fetch(url, {
          method: options.method,
          headers: auth.headers,
          ...(body ? { body } : {}),
          signal,
        });

        const text = await res.text();
        const data = parseMaybeJson(text);
        attempts.push({ path: finalPath, auth: auth.mode, status: res.status, response: data });

        if (res.ok) {
          return {
            ok: true,
            status: res.status,
            data,
            pathUsed: finalPath,
            authMode: auth.mode,
          };
        }

        // Continue trying alternate path/auth on auth and route errors
        if ([401, 403, 404, 405].includes(res.status)) {
          continue;
        }
      } catch (err: any) {
        attempts.push({
          path: finalPath,
          auth: auth.mode,
          status: 0,
          response: { error: err?.message ?? "network_error" },
        });
        continue;
      }
    }
  }

  const summary = attempts
    .map((a) => `[${a.status}] ${a.auth} ${a.path} => ${JSON.stringify(a.response)}`)
    .join(" | ");

  throw new Error(`UazAPI request failed: ${summary}`);
}

export function extractStatus(data: any): string {
  return data?.status ?? data?.state ?? data?.instance?.state ?? "unknown";
}

export function isConnectedStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return normalized === "connected" || normalized === "open";
}

export function extractPhone(data: any): string | null {
  const raw = data?.phone ?? data?.me?.id ?? data?.owner ?? data?.instance?.owner ?? null;
  return raw ? String(raw).replace(/@.*$/, "").replace(/\D/g, "") : null;
}

export function extractQrBase64(data: any): string | null {
  return data?.qrcode ?? data?.base64 ?? data?.qr ?? data?.data?.qrcode ?? data?.data?.base64 ?? null;
}
