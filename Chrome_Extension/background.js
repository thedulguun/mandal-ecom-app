const SUPABASE_URL = "https://zmexhvaetfxrqsonrbzw.supabase.co";
const SUPABASE_KEY = "sb_publishable_Q8CvgGpJBf8f_O4TyCgQKA_cepycpAa";
const TEAM_ID = "8da9848b-2145-48ef-ab76-1ac74749081e";

// ---- Generic Supabase helper (fixed JSON issue) ----
async function supabaseRequest(path, method = "GET", body) {
  const url = `${SUPABASE_URL}${path}`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }

  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    console.warn("Could not parse JSON, raw:", text);
    return null;
  }
}

// ===== CANNED RESPONSES HANDLERS (unchanged logic) =====
async function handleGetCanned() {
  return await supabaseRequest(
    `/rest/v1/canned_responses?team_id=eq.${TEAM_ID}&select=*&order=updated_at.desc`,
    "GET"
  );
}

async function handleCreateCanned(payload) {
  const row = {
    team_id: TEAM_ID,
    title: payload.title,
    body: payload.body,
    category: payload.category || null,
    is_favorite: payload.is_favorite || false,
    created_by: payload.created_by || "extension",
    updated_at: new Date().toISOString()
  };
  const data = await supabaseRequest("/rest/v1/canned_responses", "POST", row);
  return data ? data[0] : row;
}

async function handleUpdateCanned(payload) {
  const { id, title, body, category, is_favorite } = payload;
  const patch = {
    title,
    body,
    category: category !== undefined ? category : undefined,
    is_favorite: is_favorite !== undefined ? is_favorite : undefined,
    updated_at: new Date().toISOString()
  };
  // Remove undefined fields
  Object.keys(patch).forEach(key => patch[key] === undefined && delete patch[key]);

  const data = await supabaseRequest(
    `/rest/v1/canned_responses?id=eq.${id}`,
    "PATCH",
    patch
  );
  return data ? data[0] : { id, ...patch };
}

async function handleDeleteCanned(payload) {
  const { id } = payload;
  await supabaseRequest(
    `/rest/v1/canned_responses?id=eq.${id}`,
    "DELETE"
  );
  return { success: true };
}

// ===== DRAFT HANDLERS =====

// Get draft for current thread
async function handleGetDraft(payload) {
  const { ig_thread_id } = payload;
  const data = await supabaseRequest(
    `/rest/v1/customer_drafts?team_id=eq.${TEAM_ID}&ig_thread_id=eq.${encodeURIComponent(ig_thread_id)}&limit=1`,
    "GET"
  );
  return data && data.length > 0 ? data[0] : null;
}

// Save/update draft (upsert)
async function handleSaveDraft(payload) {
  const { ig_thread_id } = payload;

  // Try to get existing draft
  const existing = await handleGetDraft({ ig_thread_id });

  if (existing) {
    // Update existing draft
    const patch = {
      ig_username: payload.ig_username || null,
      cus_name: payload.cus_name || null,
      cus_phone: payload.cus_phone || null,
      cus_phone1: payload.cus_phone1 || null,
      city: payload.city || null,
      district: payload.district || null,
      committee: payload.committee || null,
      address: payload.address || null,
      items: payload.items || null,
      deli_desc: payload.deli_desc || null,
      updated_at: new Date().toISOString()
    };
    const data = await supabaseRequest(
      `/rest/v1/customer_drafts?id=eq.${existing.id}`,
      "PATCH",
      patch
    );
    return data ? data[0] : { ...existing, ...patch };
  } else {
    // Create new draft
    const row = {
      team_id: TEAM_ID,
      ig_thread_id: payload.ig_thread_id,
      ig_username: payload.ig_username || null,
      cus_name: payload.cus_name || null,
      cus_phone: payload.cus_phone || null,
      cus_phone1: payload.cus_phone1 || null,
      city: payload.city || null,
      district: payload.district || null,
      committee: payload.committee || null,
      address: payload.address || null,
      items: payload.items || null,
      deli_desc: payload.deli_desc || null
    };
    const data = await supabaseRequest("/rest/v1/customer_drafts", "POST", row);
    return data ? data[0] : row;
  }
}

// Delete draft after order creation
async function handleDeleteDraft(payload) {
  const { ig_thread_id } = payload;
  await supabaseRequest(
    `/rest/v1/customer_drafts?team_id=eq.${TEAM_ID}&ig_thread_id=eq.${encodeURIComponent(ig_thread_id)}`,
    "DELETE"
  );
  return { success: true };
}

// ===== ORDERS HANDLERS =====

// Get all orders for this chat (thread) ordered by newest first
async function handleGetOrders(payload) {
  const { ig_thread_id } = payload;
  const data = await supabaseRequest(
    `/rest/v1/orders?team_id=eq.${TEAM_ID}&ig_thread_id=eq.${encodeURIComponent(
      ig_thread_id
    )}&select=*&order=created_at.desc`,
    "GET"
  );
  return data || [];
}

// Get all orders for a customer (by ig_username) across all threads
async function handleGetOrdersByCustomer(payload) {
  const { ig_username } = payload;
  const data = await supabaseRequest(
    `/rest/v1/orders?team_id=eq.${TEAM_ID}&ig_username=eq.${encodeURIComponent(
      ig_username
    )}&select=*&order=created_at.desc`,
    "GET"
  );
  return data || [];
}

async function generateOrderId() {
  // Format: MND-YYMMDD-XXXXXX-RR (RR = random 2 alphanumeric chars for collision prevention)
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2); // Last 2 digits of year
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Generate random 2-character alphanumeric suffix (0-9, A-Z)
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomSuffix = chars[Math.floor(Math.random() * chars.length)] +
                       chars[Math.floor(Math.random() * chars.length)];

  // Get today's orders to determine the next sequence number
  const fullYear = now.getFullYear();
  const todayStart = `${fullYear}-${month}-${day}T00:00:00`;
  const todayEnd = `${fullYear}-${month}-${day}T23:59:59`;

  try {
    const todayOrders = await supabaseRequest(
      `/rest/v1/orders?team_id=eq.${TEAM_ID}&created_at=gte.${todayStart}&created_at=lte.${todayEnd}&select=order_id&order=created_at.desc&limit=1`,
      "GET"
    );

    let sequence = 1;
    if (todayOrders && todayOrders.length > 0 && todayOrders[0].order_id) {
      // Extract sequence from last order_id (format: MND-YYMMDD-XXXXXX-RR)
      const lastOrderId = todayOrders[0].order_id;
      const match = lastOrderId.match(/-(\d{6})-[0-9A-Z]{2}$/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    const sequenceStr = String(sequence).padStart(6, '0');
    return `MND-${dateStr}-${sequenceStr}-${randomSuffix}`;
  } catch (e) {
    // Fallback: use timestamp-based sequence if query fails
    const timestamp = now.getTime().toString().slice(-6);
    return `MND-${dateStr}-${timestamp}-${randomSuffix}`;
  }
}

async function handleCreateOrder(payload) {
  const order_id = await generateOrderId();

  const row = {
    team_id: TEAM_ID,
    order_id: order_id,
    ig_username: payload.ig_username || null,
    ig_thread_id: payload.ig_thread_id || null,
    cus_name: payload.cus_name || null,
    cus_phone: payload.cus_phone || null,
    cus_phone1: payload.cus_phone1 || null,
    city: payload.city || null,
    district: payload.district || null,
    committee: payload.committee || null,
    address: payload.address || null,
    items: payload.items || null,
    deli_desc: payload.deli_desc || null
  };

  const data = await supabaseRequest("/rest/v1/orders", "POST", row);
  return data ? data[0] : row;
}

async function handleUpdateOrder(payload) {
  const { id, ...rest } = payload;

  // Check if delivery was called
  const existing = await supabaseRequest(
    `/rest/v1/orders?id=eq.${id}&select=is_delivery_called`,
    "GET"
  );
  if (existing && existing[0] && existing[0].is_delivery_called) {
    throw new Error("Хүргэлт дуудсан тул захиалгыг засах боломжгүй");
  }

  const patch = {
    ig_username: rest.ig_username || null,
    cus_name: rest.cus_name || null,
    cus_phone: rest.cus_phone || null,
    cus_phone1: rest.cus_phone1 || null,
    city: rest.city || null,
    district: rest.district || null,
    committee: rest.committee || null,
    address: rest.address || null,
    items: rest.items || null,
    deli_desc: rest.deli_desc || null
  };

  const data = await supabaseRequest(
    `/rest/v1/orders?id=eq.${id}`,
    "PATCH",
    patch
  );
  return data ? data[0] : { id, ...patch };
}

async function handleDeleteOrder(payload) {
  const { id } = payload;
  await supabaseRequest(`/rest/v1/orders?id=eq.${id}`, "DELETE");
  return { success: true };
}

// ===== EBUUHIA API HANDLER =====

async function handleCreateDelivery(payload) {
  const { orderId, deliveryData } = payload;

  // Call ebuuhia API
  const ebuuhiaUrl = "https://api.ebuuhia.com/api/v1/ebuuhiaApi";

  const ebuuhiaPayload = {
    email: deliveryData.email,
    password: deliveryData.password,
    cus_name: deliveryData.cus_name,
    cus_phone: deliveryData.cus_phone,
    cus_phone1: deliveryData.cus_phone1 || "",
    city: deliveryData.city || "",
    district: deliveryData.district || "",
    committee: deliveryData.committee || "",
    address: deliveryData.address,
    items: deliveryData.items, // Array of { name, quantity }
    deli_desc: deliveryData.deli_desc || ""
  };

  try {
    const response = await fetch(ebuuhiaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(ebuuhiaPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ebuuhia API error ${response.status}: ${errorText}`);
    }

    const ebuuhiaResponse = await response.json();

    // Update order in database to mark delivery as called
    const updatePayload = {
      is_delivery_called: true,
      delivery_created_at: new Date().toISOString(),
      ebuuhia_response: JSON.stringify(ebuuhiaResponse)
    };

    await supabaseRequest(
      `/rest/v1/orders?id=eq.${orderId}`,
      "PATCH",
      updatePayload
    );

    return {
      success: true,
      ebuuhiaResponse: ebuuhiaResponse
    };
  } catch (error) {
    console.error("[Mandal Instagram Helper] Ebuuhia API error:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ===== MESSAGE ROUTER =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case "GET_CANNED":
          sendResponse({ ok: true, data: await handleGetCanned() });
          break;
        case "CREATE_CANNED":
          sendResponse({ ok: true, data: await handleCreateCanned(message.payload) });
          break;
        case "UPDATE_CANNED":
          sendResponse({ ok: true, data: await handleUpdateCanned(message.payload) });
          break;
        case "DELETE_CANNED":
          sendResponse({ ok: true, data: await handleDeleteCanned(message.payload) });
          break;

        case "GET_ORDERS":
          sendResponse({ ok: true, data: await handleGetOrders(message.payload) });
          break;
        case "CREATE_ORDER":
          sendResponse({ ok: true, data: await handleCreateOrder(message.payload) });
          break;
        case "UPDATE_ORDER":
          sendResponse({ ok: true, data: await handleUpdateOrder(message.payload) });
          break;
        case "DELETE_ORDER":
          sendResponse({ ok: true, data: await handleDeleteOrder(message.payload) });
          break;
        case "GET_ORDERS_BY_CUSTOMER":
          sendResponse({ ok: true, data: await handleGetOrdersByCustomer(message.payload) });
          break;

        case "GET_DRAFT":
          sendResponse({ ok: true, data: await handleGetDraft(message.payload) });
          break;
        case "SAVE_DRAFT":
          sendResponse({ ok: true, data: await handleSaveDraft(message.payload) });
          break;
        case "DELETE_DRAFT":
          sendResponse({ ok: true, data: await handleDeleteDraft(message.payload) });
          break;

        case "CREATE_DELIVERY":
          sendResponse({ ok: true, data: await handleCreateDelivery(message.payload) });
          break;

        default:
          sendResponse({ ok: false, error: "Unknown message type" });
      }
    } catch (err) {
      console.error("[Mandal Instagram Helper] background error", err);
      sendResponse({ ok: false, error: err.message });
    }
  })();

  return true; // async
});
