import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx'; // Keep for API key storage only

// Simple token creation and verification using HMAC
async function createToken(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = JSON.stringify(payload);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Return base64url encoded token: payload.signature
  const payloadB64 = btoa(data).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${payloadB64}.${signatureHex}`;
}

async function verifyToken(token: string, secret: string): Promise<any> {
  console.log('[verifyToken] Starting verification...');
  console.log('[verifyToken] Token length:', token.length);
  console.log('[verifyToken] Token (first 50 chars):', token.substring(0, 50));
  
  const parts = token.split('.');
  console.log('[verifyToken] Token parts count:', parts.length);
  
  const [payloadB64, signatureHex] = parts;
  if (!payloadB64 || !signatureHex) {
    console.log('[verifyToken] ERROR: Missing parts - payloadB64:', !!payloadB64, 'signatureHex:', !!signatureHex);
    throw new Error('Invalid token format');
  }
  
  console.log('[verifyToken] PayloadB64 length:', payloadB64.length);
  console.log('[verifyToken] SignatureHex length:', signatureHex.length);
  
  try {
    // Decode payload
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    console.log('[verifyToken] Decoded payload JSON:', payloadJson);
    const payload = JSON.parse(payloadJson);
    console.log('[verifyToken] Parsed payload:', payload);
    
    // Verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    console.log('[verifyToken] Crypto key imported');
    
    const signatureMatch = signatureHex.match(/.{2}/g);
    if (!signatureMatch) {
      console.log('[verifyToken] ERROR: Failed to parse signature hex');
      throw new Error('Invalid signature format');
    }
    
    const signatureBytes = new Uint8Array(signatureMatch.map(byte => parseInt(byte, 16)));
    console.log('[verifyToken] Signature bytes length:', signatureBytes.length);
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(payloadJson)
    );
    console.log('[verifyToken] Signature valid:', isValid);
    
    if (!isValid) {
      console.log('[verifyToken] ERROR: Invalid token signature');
      throw new Error('Invalid token signature');
    }
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.log('[verifyToken] ERROR: Token expired. Exp:', payload.exp, 'Now:', Math.floor(Date.now() / 1000));
      throw new Error('Token expired');
    }
    
    console.log('[verifyToken] Token verification successful!');
    return payload;
  } catch (error) {
    console.log('[verifyToken] ERROR during verification:', error.message);
    console.log('[verifyToken] ERROR stack:', error.stack);
    throw error;
  }
}

// Helper: Convert database snake_case to API camelCase
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
    seriesCategory: dbEvent.series_category
  };
}

// Helper: Convert API camelCase to database snake_case
function apiToDb(apiEvent: any) {
  return {
    id: apiEvent.id,
    subject: apiEvent.subject,
    start: apiEvent.start,
    end: apiEvent.end,
    location: apiEvent.location || '',
    description: apiEvent.description || '',
    attendees: apiEvent.attendees || [],
    organizer: apiEvent.organizer || '',
    is_recurring: apiEvent.isRecurring || false,
    recurrence_pattern: apiEvent.recurrencePattern || null,
    series_id: apiEvent.seriesId || null,
    is_cancelled: apiEvent.isCancelled || false,
    category: apiEvent.category || '',
    seriesCatefory: apiEvent.seriesCategory || false,
    import_source: apiEvent.importSource || 'powerautomate',
    email_subject: apiEvent.emailSubject || null,
    imported_at: apiEvent.importedAt || null
  };
}

const app = new Hono();

// Initialize Supabase client with service role key for full access
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

app.use('*', logger(console.log));
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Admin-Token'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'DELETE', 'PUT', 'PATCH'],
}));

// Middleware to validate API key for write operations
const validateApiKey = async (c: any, next: any) => {
  const apiKey = c.req.header('X-API-Key');
  const storedKey = await kv.get('config:api_key');
  
  // If no API key is set yet, allow the request (for initial setup)
  if (!storedKey) {
    return next();
  }
  
  if (!apiKey || apiKey !== storedKey) {
    return c.json({ error: 'Invalid or missing API key' }, 401);
  }
  
  return next();
};

// Health check
app.get('/make-server-832943b5/health', async (c) => {
  // Check database connection
  const { error } = await supabase.from('events').select('id').limit(1);
  
  return c.json({ 
    status: error ? 'unhealthy' : 'healthy', 
    timestamp: new Date().toISOString(),
    database: error ? 'disconnected' : 'connected'
  });
});

// Set or update API key (only call this once to set your key)
app.post('/make-server-832943b5/config/api-key', async (c) => {
  try {
    const body = await c.req.json();
    const { apiKey } = body;

    if (!apiKey || apiKey.length < 16) {
      return c.json({ 
        error: 'API key must be at least 16 characters long' 
      }, 400);
    }

    await kv.set('config:api_key', apiKey);
    return c.json({ success: true, message: 'API key configured successfully' });
  } catch (error) {
    console.log('Error setting API key:', error);
    return c.json({ 
      error: `Failed to set API key: ${error.message}` 
    }, 500);
  }
});

// Get API key status (doesn't return the actual key)
app.get('/make-server-832943b5/config/api-key', async (c) => {
  try {
    const storedKey = await kv.get('config:api_key');
    return c.json({ 
      configured: !!storedKey,
      message: storedKey ? 'API key is configured' : 'No API key set'
    });
  } catch (error) {
    console.log('Error checking API key:', error);
    return c.json({ 
      error: `Failed to check API key: ${error.message}` 
    }, 500);
  }
});

// ============================================================================
// ADMIN AUTHENTICATION ENDPOINTS
// ============================================================================

// Admin login - verify password and return JWT token
app.post('/make-server-832943b5/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const { password } = body;

    // Get admin password from environment variable
    const adminPassword = Deno.env.get('ADMIN_PASSWORD');

    if (!adminPassword) {
      console.log('ADMIN_PASSWORD environment variable not set');
      return c.json({ 
        error: 'Admin authentication not configured. Please set ADMIN_PASSWORD environment variable.' 
      }, 500);
    }

    // Verify password
    if (password !== adminPassword) {
      console.log('Invalid admin password attempt');
      return c.json({ error: 'Invalid password' }, 401);
    }

    // TEMPORARY: Use a hardcoded secret for debugging
    const secret = 'hardcoded-test-secret-12345';
    const payload = {
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
    };
    
    console.log('Creating JWT token with payload:', payload);
    console.log('Using HARDCODED secret for testing');
    
    const token = await createToken(payload, secret);

    console.log('Admin login successful, token generated (first 30 chars):', token.substring(0, 30) + '...');
    console.log('Token length:', token.length);
    return c.json({ 
      success: true, 
      token,
      message: 'Login successful' 
    });
  } catch (error) {
    console.log('Error during admin login:', error);
    return c.json({ 
      error: `Login failed: ${error.message}` 
    }, 500);
  }
});

// Verify admin token
app.post('/make-server-832943b5/auth/verify', async (c) => {
  try {
    const body = await c.req.json();
    const { token } = body;

    console.log('[auth/verify] Verifying token (first 30 chars):', token ? token.substring(0, 30) + '...' : 'null');

    if (!token) {
      console.log('[auth/verify] No token provided');
      return c.json({ error: 'No token provided' }, 401);
    }

    // TEMPORARY: Use hardcoded secret for debugging
    const secret = 'hardcoded-test-secret-12345';
    console.log('[auth/verify] Using HARDCODED secret for testing');
    
    try {
      const payload = await verifyToken(token, secret);
      console.log('[auth/verify] Token verified, payload:', payload);

      if (payload.role !== 'admin') {
        console.log('[auth/verify] Invalid role:', payload.role);
        return c.json({ error: 'Invalid token' }, 401);
      }

      console.log('[auth/verify] Token is valid');
      return c.json({ 
        success: true, 
        isAdmin: true,
        message: 'Token is valid' 
      });
    } catch (verifyError) {
      console.log('[auth/verify] Verify function threw error:', verifyError);
      console.log('[auth/verify] Error type:', verifyError.constructor.name);
      console.log('[auth/verify] Error message:', verifyError.message);
      console.log('[auth/verify] Error stack:', verifyError.stack);
      throw verifyError;
    }
  } catch (error) {
    console.log('[auth/verify] Token verification failed:', error);
    console.log('[auth/verify] Error message:', error.message);
    return c.json({ 
      error: 'Invalid or expired token' 
    }, 401);
  }
});

// Middleware to validate admin token for protected routes
const validateAdminToken = async (c: any, next: any) => {
  console.log('[validateAdminToken] Request:', c.req.method, c.req.url);
  
  const adminToken = c.req.header('X-Admin-Token');
  console.log('[validateAdminToken] X-Admin-Token header present:', !!adminToken);
  
  if (!adminToken) {
    console.log('[validateAdminToken] ERROR: No X-Admin-Token header provided');
    return c.json({ error: 'Admin authentication required' }, 401);
  }
  
  console.log('[validateAdminToken] Token extracted (first 30 chars):', adminToken.substring(0, 30) + '...');
  console.log('[validateAdminToken] Token length:', adminToken.length);
  
  try {
    // TEMPORARY: Use hardcoded secret for debugging
    const secret = 'hardcoded-test-secret-12345';
    console.log('[validateAdminToken] Using HARDCODED secret for testing');
    console.log('[validateAdminToken] Attempting to verify JWT token...');
    
    const payload = await verifyToken(adminToken, secret);
    console.log('[validateAdminToken] Token verified successfully!');
    console.log('[validateAdminToken] Payload:', JSON.stringify(payload, null, 2));

    if (payload.role !== 'admin') {
      console.log('[validateAdminToken] ERROR: Token role is not "admin", got:', payload.role);
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    console.log('[validateAdminToken] SUCCESS: Admin token validated, proceeding...');
    return next();
  } catch (error) {
    console.log('[validateAdminToken] ERROR: Token validation failed');
    console.log('[validateAdminToken] Error type:', error.constructor.name);
    console.log('[validateAdminToken] Error message:', error.message);
    console.log('[validateAdminToken] Error stack:', error.stack);
    return c.json({ error: `Invalid or expired token: ${error.message}` }, 401);
  }
};

// ============================================================================
// END ADMIN AUTHENTICATION
// ============================================================================

// ============================================================================
// EMAIL IMPORT ENDPOINT (for Power Automate email triggers)
// ============================================================================

// Import events from forwarded calendar invites via Power Automate
app.post('/make-server-832943b5/events/import-from-email', validateApiKey, async (c) => {
  try {
    const body = await c.req.json();
    console.log('Received email import request:', JSON.stringify(body, null, 2));
    
    const { 
      id, 
      subject, 
      start, 
      end, 
      location, 
      description,
      attendees,
      organizer,
      isRecurring,
      recurrencePattern,
      seriesId,
      isCancelled,
      category,
      // Additional fields from email parsing
      emailSubject,
      emailBody,
      emailFrom,
      seriesCategory,
    } = body;

    // Validate required fields
    if (!id || !subject || !start || !end) {
      console.log('Missing required fields:', { id, subject, start, end });
      return c.json({ 
        error: 'Missing required fields: id, subject, start, end are required' 
      }, 400);
    }

    // Helper function to convert string booleans to actual booleans
    const toBool = (value: any): boolean => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }
      return !!value;
    };

    // Helper function to ensure datetime strings are in UTC format
    const ensureUTC = (dateString: string): string => {
      if (!dateString) return dateString;
      // If the string doesn't end with 'Z' and doesn't have a timezone offset, add 'Z' to indicate UTC
      if (!dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
        // Remove any trailing zeros after the seconds (e.g., .0000000)
        const cleaned = dateString.replace(/\.0+$/, '');
        return `${cleaned}Z`;
      }
      return dateString;
    };

    const eventData = {
      id,
      subject,
      start: ensureUTC(start),
      end: ensureUTC(end),
      location: location || '',
      description: description || '',
      attendees: attendees || [],
      organizer: organizer || emailFrom || '',
      is_recurring: toBool(isRecurring),
      recurrence_pattern: recurrencePattern || null,
      series_id: seriesId || null,
      is_cancelled: toBool(isCancelled),
      category: category || 'General', // Default to General if not specified
      import_source: 'email', // Track that this came from email import
      email_subject: emailSubject || '',
      imported_at: new Date().toISOString()
    };

    console.log('Inserting imported event into database:', id);
    
    // Upsert the event (insert or update if exists)
    const { data, error } = await supabase
      .from('events')
      .upsert(eventData)
      .select()
      .single();

    if (error) {
      console.log('Database error inserting event:', error);
      return c.json({ 
        error: `Failed to import event: ${error.message}` 
      }, 500);
    }

    console.log('Event imported successfully from email:', id);

    // If this is a recurring series, also store the series reference
    if (eventData.is_recurring && seriesId) {
      console.log('Storing series reference:', seriesId);
      const { error: seriesError } = await supabase
        .from('series')
        .upsert({
          series_id: seriesId,
          recurrence_pattern: recurrencePattern,
          subject,
          import_source: 'email'
        });
      
      if (seriesError) {
        console.log('Error storing series reference:', seriesError);
      }
    }

    return c.json({ 
      success: true, 
      event: dbToApi(data), 
      message: 'Event imported successfully from email',
      importedAt: eventData.imported_at
    });
  } catch (error) {
    console.log('Error importing event from email:', error);
    console.log('Error stack:', error.stack);
    return c.json({ 
      error: `Failed to import event from email: ${error.message}` 
    }, 500);
  }
});

// ============================================================================
// END EMAIL IMPORT
// ============================================================================

// Add or update a calendar event from Power Automate
app.post('/make-server-832943b5/events', validateApiKey, async (c) => {
  try {
    const body = await c.req.json();
    console.log('Received event POST request:', JSON.stringify(body, null, 2));
    
    const { 
      id, 
      subject, 
      start, 
      end, 
      location, 
      description,
      attendees,
      organizer,
      isRecurring,
      recurrencePattern,
      seriesId,
      isCancelled,
      category,
      seriesCategory,
    } = body;

    if (!id || !subject || !start || !end) {
      console.log('Missing required fields:', { id, subject, start, end });
      return c.json({ 
        error: 'Missing required fields: id, subject, start, end are required' 
      }, 400);
    }

    // Helper function to convert string booleans to actual booleans
    const toBool = (value: any): boolean => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }
      return !!value;
    };

    // Helper function to ensure datetime strings are in UTC format
    const ensureUTC = (dateString: string): string => {
      if (!dateString) return dateString;
      if (!dateString.endsWith('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
        const cleaned = dateString.replace(/\.0+$/, '');
        return `${cleaned}Z`;
      }
      return dateString;
    };

    const eventData = {
      id,
      subject,
      start: ensureUTC(start),
      end: ensureUTC(end),
      location: location || '',
      description: description || '',
      attendees: attendees || [],
      organizer: organizer || '',
      is_recurring: toBool(isRecurring),
      recurrence_pattern: recurrencePattern || null,
      series_id: seriesId || null,
      is_cancelled: toBool(isCancelled),
      category: category || '',
      seriesCategory: seriesCategory || '',
      import_source: 'powerautomate'
    };

    console.log('Upserting event into database:', id);
    
    const { data, error } = await supabase
      .from('events')
      .upsert(eventData)
      .select()
      .single();

    if (error) {
      console.log('Database error upserting event:', error);
      return c.json({ 
        error: `Failed to create/update event: ${error.message}` 
      }, 500);
    }

    console.log('Event stored successfully:', id);

    // If this is a recurring series, also store the series reference
    if (eventData.is_recurring && seriesId) {
      console.log('Storing series reference:', seriesId);
      const { error: seriesError } = await supabase
        .from('series')
        .upsert({
          series_id: seriesId,
          recurrence_pattern: recurrencePattern,
          subject,
          import_source: 'powerautomate'
        });
      
      if (seriesError) {
        console.log('Error storing series reference:', seriesError);
      }
    }

    return c.json({ 
      success: true, 
      event: dbToApi(data), 
      message: 'Event created successfully' 
    });
  } catch (error) {
    console.log('Error creating/updating event:', error);
    console.log('Error stack:', error.stack);
    return c.json({ 
      error: `Failed to create/update event: ${error.message}` 
    }, 500);
  }
});

// Get all events
app.get('/make-server-832943b5/events', async (c) => {
  try {
    console.log('[GET /events] Starting request');
    console.log('[GET /events] Supabase URL:', supabaseUrl);
    console.log('[GET /events] Service key present:', !!supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_cancelled', false)
      .order('start', { ascending: true });

    if (error) {
      console.log('[GET /events] Database error:', error);
      console.log('[GET /events] Error code:', error.code);
      console.log('[GET /events] Error message:', error.message);
      console.log('[GET /events] Error details:', error.details);
      console.log('[GET /events] Error hint:', error.hint);
      
      // Check if table doesn't exist (PostgreSQL error)
      if (error.code === '42P01') {
        return c.json({ 
          error: 'Database tables not created. Please apply the migration from /supabase/migrations/20260226000001_create_events_table.sql',
          hint: 'Go to Supabase Dashboard → SQL Editor and run the migration file',
          errorCode: '42P01'
        }, 500);
      }
      
      // Check if PostgREST schema cache needs refresh (Supabase API error)
      if (error.code === 'PGRST205') {
        return c.json({ 
          error: 'Table not found in Supabase schema cache. Please apply the migration and reload the schema.',
          hint: 'Go to Supabase Dashboard → SQL Editor, run the migration, then go to API Settings → Schema Cache and click "Reload schema"',
          errorCode: 'PGRST205',
          instructions: [
            '1. Go to Supabase Dashboard → SQL Editor',
            '2. Run the migration from /supabase/migrations/20260226000001_create_events_table.sql',
            '3. Go to Settings → API → Reload Schema (or wait 24 hours for auto-refresh)'
          ]
        }, 500);
      }
      
      return c.json({ 
        error: `Failed to fetch events: ${error.message}`,
        details: error.details,
        hint: error.hint,
        code: error.code
      }, 500);
    }

    console.log(`[GET /events] Retrieved ${data?.length || 0} events from database`);

    // Convert all events from snake_case to camelCase
    const events = (data || []).map(dbToApi);

    return c.json({ events });
  } catch (error) {
    console.log('[GET /events] Exception caught:', error);
    console.log('[GET /events] Error message:', error.message);
    console.log('[GET /events] Error stack:', error.stack);
    return c.json({ 
      error: `Failed to fetch events: ${error.message}`,
      stack: error.stack
    }, 500);
  }
});

// Get a specific event
app.get('/make-server-832943b5/events/:id', async (c) => {
  try {
    const id = c.req.param('id');
    console.log('Fetching event:', id);
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json({ error: 'Event not found' }, 404);
      }
      console.log('Database error fetching event:', error);
      return c.json({ 
        error: `Failed to fetch event: ${error.message}` 
      }, 500);
    }

    return c.json({ event: dbToApi(data) });
  } catch (error) {
    console.log('Error fetching event:', error);
    return c.json({ 
      error: `Failed to fetch event: ${error.message}` 
    }, 500);
  }
});

// Delete an event (or mark as cancelled) - ADMIN ONLY
app.delete('/make-server-832943b5/events/:id', validateAdminToken, async (c) => {
  try {
    const id = c.req.param('id');
    console.log('Marking event as cancelled:', id);
    
    // Mark as cancelled rather than deleting
    const { data, error } = await supabase
      .from('events')
      .update({ is_cancelled: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json({ error: 'Event not found' }, 404);
      }
      console.log('Database error cancelling event:', error);
      return c.json({ 
        error: `Failed to cancel event: ${error.message}` 
      }, 500);
    }

    console.log('Event cancelled successfully:', id);
    return c.json({ success: true, message: 'Event cancelled' });
  } catch (error) {
    console.log('Error cancelling event:', error);
    return c.json({ 
      error: `Failed to cancel event: ${error.message}` 
    }, 500);
  }
});

// Update event category - ADMIN ONLY
app.patch('/make-server-832943b5/events/:id/category', validateAdminToken, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { category } = body;

    console.log(`Updating category for event ${id} to:`, category);

    const { data, error } = await supabase
      .from('events')
      .update({ category })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json({ error: 'Event not found' }, 404);
      }
      console.log('Database error updating category:', error);
      return c.json({ 
        error: `Failed to update event category: ${error.message}` 
      }, 500);
    }

    console.log('Event category updated successfully:', id);
    return c.json({ 
      success: true, 
      event: dbToApi(data), 
      message: 'Category updated successfully' 
    });
  } catch (error) {
    console.log('Error updating event category:', error);
    return c.json({ 
      error: `Failed to update event category: ${error.message}` 
    }, 500);
  }
});

// Get events by series
app.get('/make-server-832943b5/series/:seriesId/events', async (c) => {
  try {
    const seriesId = c.req.param('seriesId');
    console.log('Fetching events for series:', seriesId);
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('series_id', seriesId)
      .eq('is_cancelled', false)
      .order('start', { ascending: true });

    if (error) {
      console.log('Database error fetching series events:', error);
      return c.json({ 
        error: `Failed to fetch series events: ${error.message}` 
      }, 500);
    }

    const events = data.map(dbToApi);
    return c.json({ events });
  } catch (error) {
    console.log('Error fetching series events:', error);
    return c.json({ 
      error: `Failed to fetch series events: ${error.message}` 
    }, 500);
  }
});

// ============================================================================
// DATABASE MIGRATION ENDPOINTS
// ============================================================================

// Migrate data from KV store to Supabase database - ADMIN ONLY
app.post('/make-server-832943b5/migrate/kv-to-database', validateAdminToken, async (c) => {
  try {
    console.log('Starting KV to database migration...');
    
    // Get all events from KV store
    const kvEvents = await kv.getByPrefix('event:');
    let migratedCount = 0;
    let errorCount = 0;
    const errors: any[] = [];
    
    console.log(`Found ${kvEvents.length} events in KV store`);
    
    for (const event of kvEvents) {
      try {
        const dbEvent = {
          id: event.id,
          subject: event.subject,
          start: event.start,
          end: event.end,
          location: event.location || '',
          description: event.description || '',
          attendees: event.attendees || [],
          organizer: event.organizer || '',
          is_recurring: event.isRecurring || false,
          recurrence_pattern: event.recurrencePattern || null,
          series_id: event.seriesId || null,
          is_cancelled: event.isCancelled || false,
          category: event.category || '',
          import_source: event.importSource || 'powerautomate',
          email_subject: event.emailSubject || null,
          imported_at: event.importedAt || null
        };
        
        const { error } = await supabase
          .from('events')
          .upsert(dbEvent);
        
        if (error) {
          console.log('Error migrating event:', event.id, error.message);
          errorCount++;
          errors.push({ id: event.id, error: error.message });
        } else {
          migratedCount++;
          console.log('Migrated event:', event.id);
        }
      } catch (err) {
        console.log('Exception migrating event:', event.id, err.message);
        errorCount++;
        errors.push({ id: event.id, error: err.message });
      }
    }
    
    console.log(`Migration complete: ${migratedCount} succeeded, ${errorCount} failed`);
    
    return c.json({
      success: true,
      message: `Migrated ${migratedCount} events from KV to database`,
      migratedCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.log('Error during migration:', error);
    return c.json({
      error: `Migration failed: ${error.message}`
    }, 500);
  }
});

// Fix existing events with string booleans (legacy endpoint, now runs on database)
app.post('/make-server-832943b5/migrate/fix-booleans', async (c) => {
  try {
    // This endpoint is now deprecated since database handles types correctly
    return c.json({ 
      success: true, 
      message: 'No migration needed - database uses proper types',
      note: 'This endpoint is deprecated. The database handles boolean types correctly.'
    });
  } catch (error) {
    console.log('Error in migration endpoint:', error);
    return c.json({ 
      error: `Migration endpoint error: ${error.message}` 
    }, 500);
  }
});

Deno.serve(app.fetch);