
# Fix: WhatsApp QR Code Generation — Two Critical Bugs

## Root Cause Analysis

The edge function `whatsapp-evolution-proxy` has two bugs that completely block the QR code from being generated:

### Bug 1 — `auth.getClaims()` does not exist (CRITICAL)
Line 28 of the proxy function calls:
```typescript
const { data: authData, error: authError } = await authSupabase.auth.getClaims(token);
```
This method **does not exist** in `@supabase/supabase-js` v2. It will always throw or return an error, causing every request to be rejected with `401 Unauthorized` before any QR logic runs. The function is called, the user is authenticated, but the proxy immediately rejects the call.

**Fix:** Replace with `authSupabase.auth.getUser()` which is the correct v2 method to validate a JWT token and retrieve user info.

### Bug 2 — Missing CORS headers
The current `corsHeaders` only includes:
```
authorization, x-client-info, apikey, content-type
```
The Supabase JS client automatically sends additional headers like `x-supabase-client-platform`, `x-supabase-client-platform-version`, etc. If these are not whitelisted, the browser's OPTIONS preflight request fails before the actual POST even happens.

**Fix:** Expand `corsHeaders` to include all Supabase client headers.

---

## Fix Plan

### File: `supabase/functions/whatsapp-evolution-proxy/index.ts`

Two targeted changes:

**Change 1 — Expand CORS headers** (line 5):
```typescript
// BEFORE
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",

// AFTER
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
```

**Change 2 — Replace non-existent `getClaims()` with `getUser()`** (lines 27-33):
```typescript
// BEFORE
const token = authHeader.replace("Bearer ", "");
const { data: authData, error: authError } = await authSupabase.auth.getClaims(token);
if (authError || !authData?.claims) { ... }

// AFTER
const { data: { user }, error: authError } = await authSupabase.auth.getUser();
if (authError || !user) { ... }
```

---

## Why These Are the Only Changes Needed

The rest of the logic (QR endpoint paths, base64 extraction, polling in the UI) is correct. The function was simply never reaching the QR code fetch code because the auth check was crashing on every call. Once these two fixes are applied and the function is redeployed, the QR code generation should work end-to-end.

---

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/whatsapp-evolution-proxy/index.ts` | Fix CORS headers + replace `getClaims` with `getUser` |
