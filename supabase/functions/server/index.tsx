
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx"; // Keep for API key storage only

const BASE = "/make-server-832943b5";

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// Supabase (service role is OK inside Edge Function; never expose to client)
const supabase = createClient(
  requireEnv("SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
);

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Admin-Token"],
    allowMethods: ["POST", "GET", "OPTIONS", "DELETE", "PUT", "PATCH"],
  }),
);

// ------------------------------
// Token helpers (HMAC, simple)
// ------------------------------
function base64urlEncode(str: string): string {
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function base64urlDecode(b64url: string): string {
  let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  // pad
  while (b64.length % 4) b64 += "=";
  return atob(b64);
}

async function hmacKey(secret: string, usage: "sign" | "verify") {
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

async function createToken(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const payloadJson = JSON.stringify(payload);
  const key = await hmacKey(secret, "sign");
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadJson));
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${base64urlEncode(payloadJson)}.${sigHex}`;
}

async function verifyToken(token: string, secret: string): Promise<any> {
  const [payloadB64, signatureHex] = token.split(".");
  if (!payloadB64 || !signatureHex) throw new Error("Invalid token format");

  const payloadJson = base64urlDecode(payloadB64);
  const payload = JSON.parse(payloadJson);

  const signatureMatch = signatureHex.match(/.{2}/g);
  if (!signatureMatch) throw new Error("Invalid signature format");
  const signatureBytes = new Uint8Array(signatureMatch.map((h) => parseInt(h, 16)));

  const encoder = new TextEncoder();
  const key = await hmacKey(secret, "verify");
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(payloadJson),
  );
  if (!ok) throw new Error("Invalid token signature");

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }
  return payload;
}

// ------------------------------
// Mapping helpers
// ------------------------------
function dbToApi(dbEvent: any) {
  if (!dbEvent) return null;
  return {
    id: dbEvent.id,
    subject: dbEvent.subject,
    start: dbEvent.start,
    end: dbEvent.end,
    location: dbEvent.location,
    description: dbEvent.description,
    attendees: dbEvent.attendees,
    organizer: dbEvent.organizer,
    isRecurring: dbEvent.is_recurring,
    recurrencePattern: dbEvent.recurrence_pattern,
    seriesId: dbEvent.series_id,
    isCancelled: dbEvent.is_cancelled,
    category: dbEvent.category,
    importSource: dbEvent.import_source,
    emailSubject: dbEvent.email_subject,
    createdAt: dbEvent.created_at,
    importedAt: dbEvent.imported_at,
    updatedAt: dbEvent.updated_at,
    seriesCategory: dbEvent.series_category,
  };
}

const toBool = (value: any): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return !!value;
};

const ensureUTC = (dateString: string): string => {
  if (!dateString) return dateString;
  // if has Z or an offset like +02:00, leave it alone
  if (dateString.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(dateString)) return dateString;
  // trim trailing .000000 etc
  const cleaned = dateString.replace(/\.0+$/, "");
  return `${cleaned}Z`;
};

// ------------------------------
// Auth middleware
// ------------------------------
const validateApiKey = async (c: any, next: () => Promise<any>) => {
  const storedKey = await kv.get("config:api_key");
  if (!storedKey) return next(); // initial setup mode

  const apiKey = c.req.header("X-API-Key");
  if (!apiKey || apiKey !== storedKey) {
    return c.json({ error: "Invalid or missing API key" }, 401);
  }
  return next();
};

function adminSecret(): string {
  // separate secret from password
  return requireEnv("ADMIN_JWT_SECRET");
}

const validateAdminToken = async (c: any, next: () => Promise<any>) => {
  const token = c.req.header("X-Admin-Token");
  if (!token) return c.json({ error: "Admin authentication required" }, 401);

  try {
    const payload = await verifyToken(token, adminSecret());
    if (payload.role !== "admin") return c.json({ error: "Insufficient permissions" }, 403);
    return next();
  } catch (e) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
};

// ------------------------------
// Routes
// ------------------------------
app.get(`${BASE}/health`, async (c) => {
  const { error } = await supabase.from("events").select("id").limit(1);
  return c.json({
    status: error ? "unhealthy" : "healthy",
    timestamp: new Date().toISOString(),
    database: error ? "disconnected" : "connected",
  });
});

// API key config: allow only if not set yet; otherwise require admin
app.post(`${BASE}/config/api-key`, async (c) => {
  const existing = await kv.get("config:api_key");
  if (existing) {
    // require admin to rotate
    const adminToken = c.req.header("X-Admin-Token");
    if (!adminToken) return c.json({ error: "Admin authentication required to rotate API key" }, 401);
    await verifyToken(adminToken, adminSecret());
  }

  const { apiKey } = await c.req.json();
  if (!apiKey || apiKey.length < 16) {
    return c.json({ error: "API key must be at least 16 characters long" }, 400);
  }
  await kv.set("config:api_key", apiKey);
  return c.json({ success: true, message: existing ? "API key rotated" : "API key configured" });
});

app.get(`${BASE}/config/api-key`, async (c) => {
  const storedKey = await kv.get("config:api_key");
  return c.json({
    configured: !!storedKey,
    message: storedKey ? "API key is configured" : "No API key set",
  });
});

// Admin login
app.post(`${BASE}/auth/login`, async (c) => {
  const { password } = await c.req.json();
  const adminPassword = requireEnv("ADMIN_PASSWORD");

  if (password !== adminPassword) return c.json({ error: "Invalid password" }, 401);

  const payload = {
    role: "admin",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
  };
  const token = await createToken(payload, adminSecret());
  return c.json({ success: true, token, message: "Login successful" });
});

app.post(`${BASE}/auth/verify`, async (c) => {
  const { token } = await c.req.json();
  if (!token) return c.json({ error: "No token provided" }, 401);
  try {
    const payload = await verifyToken(token, adminSecret());
    if (payload.role !== "admin") return c.json({ error: "Invalid token" }, 401);
    return c.json({ success: true, isAdmin: true, message: "Token is valid" });
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});

// Import events from email (Power Automate)
app.post(`${BASE}/events/import-from-email`, validateApiKey, async (c) => {
  const body = await c.req.json();
  const {
    id, subject, start, end,
    location, description, attendees, organizer,
    isRecurring, recurrencePattern, seriesId,
    isCancelled, category, emailSubject, emailFrom, seriesCategory,
  } = body;

  if (!id || !subject || !start || !end) {
    return c.json({ error: "Missing required fields: id, subject, start, end are required" }, 400);
  }

  const eventData = {
    id,
    subject,
    start: ensureUTC(start),
    end: ensureUTC(end),
    location: location || "",
    description: description || "",
    attendees: attendees || [],
    organizer: organizer || emailFrom || "",
    is_recurring: toBool(isRecurring),
    recurrence_pattern: recurrencePattern || null,
    series_id: seriesId || null,
    is_cancelled: toBool(isCancelled),
    category: category || seriesCategory || "General",
    series_category: seriesCategory || null,
    import_source: "email",
    email_subject: emailSubject || "",
    imported_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("events")
    .upsert(eventData)
    .select()
    .single();

  if (error) return c.json({ error: `Failed to import event: ${error.message}` }, 500);

  // store series reference (optional)
  if (eventData.is_recurring && seriesId) {
    await supabase.from("series").upsert({
      series_id: seriesId,
      recurrence_pattern: recurrencePattern || null,
      subject,
      import_source: "email",
    });
  }

  return c.json({ success: true, event: dbToApi(data) });
});

// Create/update event (Power Automate)
app.post(`${BASE}/events`, validateApiKey, async (c) => {
  const body = await c.req.json();
  const {
    id, subject, start, end,
    location, description, attendees, organizer,
    isRecurring, recurrencePattern, seriesId,
    isCancelled, category, seriesCategory,
  } = body;

  if (!id || !subject || !start || !end) {
    return c.json({ error: "Missing required fields: id, subject, start, end are required" }, 400);
  }

  const eventData = {
    id,
    subject,
    start: ensureUTC(start),
    end: ensureUTC(end),
    location: location || "",
    description: description || "",
    attendees: attendees || [],
    organizer: organizer || "",
    is_recurring: toBool(isRecurring),
    recurrence_pattern: recurrencePattern || null,
    series_id: seriesId || null,
    is_cancelled: toBool(isCancelled),
    category: category || seriesCategory || "General",
    series_category: seriesCategory || null,
    import_source: "powerautomate",
    imported_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("events")
    .upsert(eventData)
    .select()
    .single();

  if (error) return c.json({ error: `Failed to create/update event: ${error.message}` }, 500);

  if (eventData.is_recurring && seriesId) {
    await supabase.from("series").upsert({
      series_id: seriesId,
      recurrence_pattern: recurrencePattern || null,
      subject,
      import_source: "powerautomate",
    });
  }

  return c.json({ success: true, event: dbToApi(data) });
});

// Get all events (FIXED: returns data)
app.get(`${BASE}/events`, async (c) => {
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .or("is_cancelled.eq.false,is_cancelled.is.null")
    .order("start", { ascending: true });

  if (error) return c.json({ error: `Failed to fetch events: ${error.message}`, code: error.code }, 500);

  return c.json({ events: (data || []).map(dbToApi) });
});

app.get(`${BASE}/events/:id`, async (c) => {
  const id = c.req.param("id");
  const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
  if (error) return c.json({ error: "Event not found" }, 404);
  return c.json({ event: dbToApi(data) });
});

app.delete(`${BASE}/events/:id`, validateAdminToken, async (c) => {
  const id = c.req.param("id");
  const { error } = await supabase.from("events").update({ is_cancelled: true }).eq("id", id);
  if (error) return c.json({ error: `Failed to cancel event: ${error.message}` }, 500);
  return c.json({ success: true, message: "Event cancelled" });
});

app.patch(`${BASE}/events/:id/category`, validateAdminToken, async (c) => {
  const id = c.req.param("id");
  const { category } = await c.req.json();
  const { data, error } = await supabase.from("events").update({ category }).eq("id", id).select().single();
  if (error) return c.json({ error: `Failed to update category: ${error.message}` }, 500);
  return c.json({ success: true, event: dbToApi(data) });
});

// (Optional) KV → DB migration endpoint: keep only if you still need it
app.post(`${BASE}/migrate/kv-to-database`, validateAdminToken, async (c) => {
  const kvEvents = await kv.getByPrefix("event:");
  let migrated = 0;
  const errors: any[] = [];

  for (const event of kvEvents) {
    const dbEvent = {
      id: event.id,
      subject: event.subject,
      start: event.start,
      end: event.end,
      location: event.location || "",
      description: event.description || "",
      attendees: event.attendees || [],
      organizer: event.organizer || "",
      is_recurring: !!event.isRecurring,
      recurrence_pattern: event.recurrencePattern || null,
      series_id: event.seriesId || null,
      is_cancelled: !!event.isCancelled,
      category: event.category || "General",
      series_category: event.seriesCategory || null,
      import_source: event.importSource || "powerautomate",
      email_subject: event.emailSubject || null,
      imported_at: event.importedAt || null,
    };

    const { error } = await supabase.from("events").upsert(dbEvent);
    if (error) errors.push({ id: event.id, error: error.message });
    else migrated++;
  }

  return c.json({ success: true, migratedCount: migrated, errorCount: errors.length, errors: errors.length ? errors : undefined });
});

Deno.serve(app.fetch);