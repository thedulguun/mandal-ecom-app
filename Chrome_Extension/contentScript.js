// ===== CONFIG / STATE =====
const DEFAULT_RESPONSES = [
  {
    id: "local-greeting",
    title: "Greeting",
    body: "Sain baina uu 😊 MANDAL-аас бичиж байна. Юу сонирхож байна вэ?",
    category: "greeting",
    is_favorite: true
  },
  {
    id: "local-shipping",
    title: "Shipping info (UB)",
    body: "Хүргэлт УБ дотор 24 цагийн дотор, 5,000₮. Аймаг унаанд өгч явуулна 🚚",
    category: "shipping",
    is_favorite: false
  }
];

let cannedResponses = [];
let filteredResponses = [];
let lastUrl = location.href;
let searchQuery = "";
let selectedCategory = "all";

let currentOrders = [];
let customerOrderHistory = [];
let selectedOrderId = null;
let hasUnsavedChanges = false;

// Draft order state
let currentDraft = null; // Store loaded draft
let draftSaveTimer = null; // Debounce timer for auto-save

// Shortcuts stored locally per user: { "responseId": "keyNumber" }
let localShortcuts = {};

// Items data for structured UI
let itemsData = []; // Array of { name: string, quantity: number }

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `ig-toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== CUSTOM MODAL DIALOG =====
function showModal(config) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "ig-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "ig-modal";

    // Header
    const header = document.createElement("div");
    header.className = "ig-modal-header";
    const title = document.createElement("h3");
    title.className = "ig-modal-title";
    title.textContent = config.title;
    header.appendChild(title);

    // Body
    const body = document.createElement("div");
    body.className = "ig-modal-body";

    const fields = [];
    config.fields.forEach(field => {
      const fieldDiv = document.createElement("div");
      fieldDiv.className = "ig-modal-field";

      const label = document.createElement("label");
      label.className = "ig-modal-label";
      label.textContent = field.label;
      fieldDiv.appendChild(label);

      let input;
      if (field.type === "textarea") {
        input = document.createElement("textarea");
        input.className = "ig-modal-textarea";
      } else if (field.type === "select") {
        input = document.createElement("select");
        input.className = "ig-modal-select";
        field.options.forEach(opt => {
          const option = document.createElement("option");
          option.value = opt.value;
          option.textContent = opt.label;
          input.appendChild(option);
        });
      } else {
        input = document.createElement("input");
        input.type = field.type || "text";
        input.className = "ig-modal-input";
      }

      input.name = field.name;
      input.value = field.value || "";
      input.placeholder = field.placeholder || "";
      fieldDiv.appendChild(input);

      if (field.hint) {
        const hint = document.createElement("div");
        hint.className = "ig-modal-hint";
        hint.textContent = field.hint;
        fieldDiv.appendChild(hint);
      }

      body.appendChild(fieldDiv);
      fields.push(input);
    });

    // Footer
    const footer = document.createElement("div");
    footer.className = "ig-modal-footer";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "ig-modal-btn ig-modal-btn-cancel";
    cancelBtn.textContent = config.cancelText || "Cancel";
    cancelBtn.addEventListener("click", () => {
      overlay.remove();
      resolve(null);
    });

    const confirmBtn = document.createElement("button");
    confirmBtn.className = `ig-modal-btn ig-modal-btn-${config.confirmType || "primary"}`;
    confirmBtn.textContent = config.confirmText || "Confirm";

    const submitForm = () => {
      const values = {};
      fields.forEach(input => {
        values[input.name] = input.value;
      });
      overlay.remove();
      document.removeEventListener("keydown", keyHandler);
      resolve(values);
    };

    confirmBtn.addEventListener("click", submitForm);

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Focus first input
    if (fields.length > 0) {
      setTimeout(() => fields[0].focus(), 100);
    }

    // Keyboard handlers
    const keyHandler = (e) => {
      if (e.key === "Escape") {
        overlay.remove();
        document.removeEventListener("keydown", keyHandler);
        resolve(null);
      } else if (e.key === "Enter" && config.submitOnEnter) {
        e.preventDefault();
        submitForm();
      }
    };
    document.addEventListener("keydown", keyHandler);

    // Close on overlay click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(null);
      }
    });
  });
}

async function showOrderConfirmationModal(orderData) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "ig-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "ig-modal";

    const header = document.createElement("div");
    header.className = "ig-modal-header";
    const title = document.createElement("h3");
    title.className = "ig-modal-title";
    title.textContent = "Захиалга батлах";
    header.appendChild(title);

    const body = document.createElement("div");
    body.className = "ig-modal-body";

    // Parse items to show count
    let itemsDisplay = "Тодорхойгүй";
    try {
      if (orderData.items) {
        const items = JSON.parse(orderData.items);
        if (Array.isArray(items) && items.length > 0) {
          const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
          itemsDisplay = `${itemCount} бараа`;
        }
      }
    } catch (e) {}

    body.innerHTML = `
      <div style="margin-bottom: 8px; color: #1f2937; font-size: 13px;">
        <strong style="color: #374151;">Нэр:</strong> ${orderData.cus_name || "Тодорхойгүй"}
      </div>
      <div style="margin-bottom: 8px; color: #1f2937; font-size: 13px;">
        <strong style="color: #374151;">Утас:</strong> ${orderData.cus_phone || "Тодорхойгүй"}
      </div>
      ${orderData.cus_phone1 ? `<div style="margin-bottom: 8px; color: #1f2937; font-size: 13px;">
        <strong style="color: #374151;">Нэмэлт утас:</strong> ${orderData.cus_phone1}
      </div>` : ''}
      ${orderData.address ? `<div style="margin-bottom: 8px; color: #1f2937; font-size: 13px;">
        <strong style="color: #374151;">Хаяг:</strong> ${orderData.address}
      </div>` : ''}
      <div style="margin-bottom: 8px; color: #1f2937; font-size: 13px;">
        <strong style="color: #374151;">Бараа:</strong> ${itemsDisplay}
      </div>
      <p style="margin-top: 16px; color: #374151; font-size: 14px; font-weight: 500;">
        Захиалга үүсгэх үү?
      </p>
    `;

    const footer = document.createElement("div");
    footer.className = "ig-modal-footer";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "ig-modal-btn ig-modal-btn-cancel";
    cancelBtn.textContent = "Цуцлах";
    cancelBtn.addEventListener("click", () => {
      overlay.remove();
      resolve(false);
    });

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "ig-modal-btn ig-modal-btn-primary";
    confirmBtn.textContent = "Захиалга үүсгэх";
    confirmBtn.addEventListener("click", () => {
      overlay.remove();
      resolve(true);
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close on escape or enter
    const keyHandler = (e) => {
      if (e.key === "Escape") {
        overlay.remove();
        resolve(false);
        document.removeEventListener("keydown", keyHandler);
      } else if (e.key === "Enter") {
        e.preventDefault();
        overlay.remove();
        document.removeEventListener("keydown", keyHandler);
        resolve(true); // Confirm order
      }
    };
    document.addEventListener("keydown", keyHandler);

    // Close on overlay click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });
  });
}

async function showDeliveryConfirmationModal(orderData) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "ig-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "ig-modal";

    const header = document.createElement("div");
    header.className = "ig-modal-header";
    const title = document.createElement("h3");
    title.className = "ig-modal-title";
    title.textContent = "Хүргэлт үүсгэх";
    header.appendChild(title);

    const body = document.createElement("div");
    body.className = "ig-modal-body";

    // Parse items to show details
    let itemsDisplay = "";
    try {
      if (orderData.items) {
        const items = typeof orderData.items === 'string' ? JSON.parse(orderData.items) : orderData.items;
        if (Array.isArray(items) && items.length > 0) {
          itemsDisplay = items.map(item => `${item.name} (×${item.quantity || 1})`).join(", ");
        }
      }
    } catch (e) {
      itemsDisplay = "Тодорхойгүй";
    }

    body.innerHTML = `
      <div style="margin-bottom: 8px; color: #1f2937; font-size: 13px;">
        <strong style="color: #374151;">Захиалгын дугаар:</strong> ${orderData.order_id || "Тодорхойгүй"}
      </div>
      <div style="margin-bottom: 8px; color: #1f2937; font-size: 13px;">
        <strong style="color: #374151;">Нэр:</strong> ${orderData.cus_name || "Тодорхойгүй"}
      </div>
      <div style="margin-bottom: 8px; color: #1f2937; font-size: 13px;">
        <strong style="color: #374151;">Утас:</strong> ${orderData.cus_phone || "Тодорхойгүй"}
      </div>
      ${orderData.cus_phone1 ? `<div style="margin-bottom: 8px; color: #1f2937; font-size: 13px;">
        <strong style="color: #374151;">Нэмэлт утас:</strong> ${orderData.cus_phone1}
      </div>` : ''}
      ${orderData.address ? `<div style="margin-bottom: 8px; color: #1f2937; font-size: 13px;">
        <strong style="color: #374151;">Хаяг:</strong> ${orderData.address}
      </div>` : ''}
      <div style="margin-bottom: 8px; color: #1f2937; font-size: 13px;">
        <strong style="color: #374151;">Бараа:</strong> ${itemsDisplay}
      </div>
      <p style="margin-top: 16px; color: #374151; font-size: 14px; font-weight: 500;">
        Хүргэлт үүсгэх үү?
      </p>
    `;

    const footer = document.createElement("div");
    footer.className = "ig-modal-footer";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "ig-modal-btn ig-modal-btn-cancel";
    cancelBtn.textContent = "Цуцлах";
    cancelBtn.addEventListener("click", () => {
      overlay.remove();
      resolve(false);
    });

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "ig-modal-btn ig-modal-btn-primary";
    confirmBtn.textContent = "Хүргэлт үүсгэх";
    confirmBtn.addEventListener("click", () => {
      overlay.remove();
      resolve(true);
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close on escape or enter
    const keyHandler = (e) => {
      if (e.key === "Escape") {
        overlay.remove();
        resolve(false);
        document.removeEventListener("keydown", keyHandler);
      } else if (e.key === "Enter") {
        e.preventDefault();
        overlay.remove();
        document.removeEventListener("keydown", keyHandler);
        resolve(true); // Confirm delivery
      }
    };
    document.addEventListener("keydown", keyHandler);

    // Close on overlay click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });
  });
}

async function showEditOrderModal(orderId, panel) {
  // Get current order
  const order = currentOrders.find(o => o.id === orderId);
  if (!order) return;

  // Check if delivery was called
  if (order.is_delivery_called) {
    await showModal({
      title: "Засах боломжгүй",
      fields: [],
      confirmText: "OK",
      cancelText: null
    });
    showToast("Хүргэлт дуудсан тул захиалгыг засах боломжгүй", "error");
    return;
  }

  const result = await showModal({
    title: "Захиалга засах",
    fields: [
      {
        name: "customer_name",
        label: "Харилцагчийн нэр",
        type: "text",
        value: order.customer_name || "",
        placeholder: "Нэр"
      },
      {
        name: "phone",
        label: "Утас",
        type: "tel",
        value: order.phone || "",
        placeholder: "Утасны дугаар"
      }
    ],
    confirmText: "Хадгалах",
    cancelText: "Цуцлах"
  });

  if (result === null) return; // Cancelled

  try {
    const updated = await bgRequest("UPDATE_ORDER", {
      id: orderId,
      ig_thread_id: order.ig_thread_id,
      ig_username: order.ig_username,
      customer_name: result.customer_name.trim() || null,
      phone: result.phone.trim() || null
    });

    const idx = currentOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) currentOrders[idx] = updated;

    // Update form display
    panel.querySelector("#ord-name").value = updated.customer_name || "";
    panel.querySelector("#ord-phone").value = updated.phone || "";

    renderOrdersList(panel);
    showToast("Захиалга шинэчлэгдлээ.", "success");
  } catch (err) {
    showToast("Засахад алдаа: " + err.message, "error");
  }
}

async function showDeleteConfirmationModal(order) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "ig-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "ig-modal";

    const header = document.createElement("div");
    header.className = "ig-modal-header";
    const title = document.createElement("h3");
    title.className = "ig-modal-title";
    title.textContent = "Захиалга устгах";
    header.appendChild(title);

    const body = document.createElement("div");
    body.className = "ig-modal-body";

    const orderDate = order.created_at
      ? new Date(order.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "Unknown";

    body.innerHTML = `
      <div style="margin-bottom: 12px; color: #1f2937; font-size: 14px;">
        <strong style="color: #374151;">Захиалгын ID:</strong> ${order.order_id || "No ID"}
      </div>
      <div style="margin-bottom: 12px; color: #1f2937; font-size: 14px;">
        <strong style="color: #374151;">Огноо:</strong> ${orderDate}
      </div>
      <div style="margin-bottom: 12px; color: #1f2937; font-size: 14px;">
        <strong style="color: #374151;">Харилцагчийн нэр:</strong> ${order.customer_name || "Тодорхойгүй"}
      </div>
      <p style="margin-top: 16px; color: #dc2626; font-size: 14px; font-weight: 600;">
        Энэ захиалгыг устгах уу?
      </p>
      <p style="margin-top: 8px; color: #6b7280; font-size: 13px;">
        Энэ үйлдлийг буцаах боломжгүй.
      </p>
    `;

    const footer = document.createElement("div");
    footer.className = "ig-modal-footer";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "ig-modal-btn ig-modal-btn-cancel";
    cancelBtn.textContent = "Цуцлах";
    cancelBtn.addEventListener("click", () => {
      overlay.remove();
      resolve(false);
    });

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "ig-modal-btn ig-modal-btn-danger";
    confirmBtn.textContent = "Устгах";
    confirmBtn.addEventListener("click", () => {
      overlay.remove();
      resolve(true);
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close on escape or enter (safe default: cancel)
    const keyHandler = (e) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        overlay.remove();
        document.removeEventListener("keydown", keyHandler);
        resolve(false); // Safe default: cancel, not delete
      }
    };
    document.addEventListener("keydown", keyHandler);

    // Close on overlay click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });
  });
}

// ===== IG HELPERS =====

function isDmThreadUrl(url) {
  return url.includes("/direct/t/");
}

function getMessageInput() {
  const el = document.querySelector(
    'div[aria-label="Message"][contenteditable="true"][role="textbox"]'
  );
  if (el && el.offsetParent !== null) return el;
  return null;
}

function insertTextIntoIgInput(text) {
  const input = getMessageInput();
  if (!input) {
    showToast("IG message box олдсонгүй.", "error");
    return;
  }

  input.focus();
  const current = (input.innerText || input.textContent || "").trimEnd();
  const toInsert = current ? " " + text : text;

  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(input);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);

  document.execCommand("insertText", false, toInsert);
  input.dispatchEvent(new InputEvent("input", { bubbles: true }));
}

function sendCurrentMessage() {
  const buttons = Array.from(
    document.querySelectorAll('div[role="button"][tabindex="0"]')
  );
  const sendDiv = buttons.find(
    (el) => el.textContent.trim().toLowerCase() === "send"
  );
  if (sendDiv) sendDiv.click();
}

// Thread id from URL
function getCurrentThreadId() {
  const m = location.pathname.match(/\/direct\/t\/([^\/]+)/);
  return m ? m[1] : null;
}

// Best-effort IG name
function getCurrentIgIdentity() {
  let displayName = "";
  let handle = "";

  const nameSpan = document.querySelector('h2 span span[title]');
  if (nameSpan) {
    displayName = nameSpan.textContent.trim();

    let container = nameSpan.closest("div.html-div");
    if (container && container.parentElement) {
      container = container.parentElement;

      const innerSpans = container.querySelectorAll("span span");
      for (const el of innerSpans) {
        const txt = el.textContent.trim();
        if (
          txt &&
          txt !== displayName &&
          /^[a-z0-9._]+$/.test(txt)
        ) {
          handle = txt;
          break;
        }
      }
    }
  }

  return {
    displayName: displayName || "",
    handle: handle || ""
  };
}

function getCurrentIgName() {
  const { displayName, handle } = getCurrentIgIdentity();
  return displayName || handle || "";
}

// ===== SETTINGS MODAL =====

async function showSettingsModal() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "ig-modal-overlay";

    const modal = document.createElement("div");
    modal.className = "ig-modal";

    // Load current settings
    chrome.storage.local.get(['ebuuhiaCredentials'], (result) => {
      const credentials = result.ebuuhiaCredentials || {};

      const header = document.createElement("div");
      header.className = "ig-modal-header";
      header.innerHTML = `<h3 class="ig-modal-title">Settings</h3>`;

      const body = document.createElement("div");
      body.className = "ig-modal-body";
      body.style.maxHeight = "500px";
      body.style.overflowY = "auto";
      body.innerHTML = `
        <div style="margin-bottom: 24px;">
          <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827;">Ebuuhia Delivery Integration</h4>
          <div class="ig-field">
            <label>Email</label>
            <input id="modal-ebuuhia-email" type="email" placeholder="your@email.com" value="${credentials.email || ''}" />
          </div>
          <div class="ig-field">
            <label>Password</label>
            <div style="position: relative;">
              <input id="modal-ebuuhia-password" type="password" placeholder="••••••••" value="${credentials.password || ''}" style="padding-right: 40px;" />
              <button id="toggle-password-visibility" type="button" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px 8px; color: #6b7280; transition: color 0.2s;">👁️</button>
            </div>
          </div>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">
            These credentials are stored locally and used to create delivery orders via Ebuuhia API.
          </p>
        </div>

        <div>
          <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #111827;">Keyboard Shortcuts</h4>
          <div style="font-size: 12px; color: #374151; line-height: 1.8;">
            <div><kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: monospace;">Ctrl+Enter</kbd> Save current order</div>
            <div><kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: monospace;">Esc</kbd> Close modals</div>
            <div><kbd style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: monospace;">Enter</kbd> Confirm actions</div>
          </div>
        </div>
      `;

      const footer = document.createElement("div");
      footer.className = "ig-modal-footer";

      const cancelBtn = document.createElement("button");
      cancelBtn.className = "ig-modal-btn ig-modal-btn-cancel";
      cancelBtn.textContent = "Cancel";
      cancelBtn.addEventListener("click", () => {
        overlay.remove();
        resolve(false);
      });

      const saveBtn = document.createElement("button");
      saveBtn.className = "ig-modal-btn ig-modal-btn-primary";
      saveBtn.textContent = "Save Settings";
      saveBtn.addEventListener("click", () => {
        const email = modal.querySelector("#modal-ebuuhia-email").value.trim();
        const password = modal.querySelector("#modal-ebuuhia-password").value.trim();

        if (!email || !password) {
          showToast("Please enter both email and password", "error");
          return;
        }

        chrome.storage.local.set({
          ebuuhiaCredentials: { email, password }
        }, () => {
          showToast("Settings saved successfully", "success");
          overlay.remove();
          resolve(true);
        });
      });

      footer.appendChild(cancelBtn);
      footer.appendChild(saveBtn);

      modal.appendChild(header);
      modal.appendChild(body);
      modal.appendChild(footer);
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Password visibility toggle
      const toggleBtn = modal.querySelector("#toggle-password-visibility");
      const passwordInput = modal.querySelector("#modal-ebuuhia-password");
      toggleBtn.addEventListener("click", () => {
        if (passwordInput.type === "password") {
          passwordInput.type = "text";
          toggleBtn.textContent = "🙈";
        } else {
          passwordInput.type = "password";
          toggleBtn.textContent = "👁️";
        }
      });

      // Focus email field
      setTimeout(() => modal.querySelector("#modal-ebuuhia-email").focus(), 100);

      // Close on overlay click
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          overlay.remove();
          resolve(false);
        }
      });

      // Escape key
      const keyHandler = (e) => {
        if (e.key === "Escape") {
          overlay.remove();
          document.removeEventListener("keydown", keyHandler);
          resolve(false);
        } else if (e.key === "Enter") {
          e.preventDefault();
          saveBtn.click();
        }
      };
      document.addEventListener("keydown", keyHandler);
    });
  });
}

// ===== ITEMS UI =====

function addItemRow(panel, name = "", quantity = 1) {
  const itemsList = panel.querySelector("#ord-items-list");
  const index = itemsList.children.length;

  const row = document.createElement("div");
  row.className = "item-row";
  row.dataset.itemIndex = index;

  row.innerHTML = `
    <input type="text" class="item-name" placeholder="Product name" maxlength="100" value="${name}" />
    <input type="number" class="item-quantity" placeholder="Qty" min="1" value="${quantity}" />
    <button class="item-remove-btn" type="button">×</button>
  `;

  // Remove button handler
  row.querySelector(".item-remove-btn").addEventListener("click", () => {
    row.remove();
    updateItemsData(panel);
    hasUnsavedChanges = true;
    scheduleDraftSave(panel);
  });

  // Input handlers for auto-save
  row.querySelector(".item-name").addEventListener("input", () => {
    updateItemsData(panel);
    hasUnsavedChanges = true;
    scheduleDraftSave(panel);
  });

  row.querySelector(".item-quantity").addEventListener("input", () => {
    updateItemsData(panel);
    hasUnsavedChanges = true;
    scheduleDraftSave(panel);
  });

  itemsList.appendChild(row);
  return row;
}

function updateItemsData(panel) {
  const rows = panel.querySelectorAll(".item-row");
  itemsData = Array.from(rows).map(row => ({
    name: row.querySelector(".item-name").value.trim(),
    quantity: parseInt(row.querySelector(".item-quantity").value) || 1
  })).filter(item => item.name); // Filter out empty names
}

function getItemsArray(panel) {
  updateItemsData(panel);
  return itemsData.map(item => ({
    name: item.name,
    start: item.quantity
  }));
}

function getItemsJSON(panel) {
  updateItemsData(panel);
  return JSON.stringify(itemsData);
}

function loadItemsFromJSON(panel, itemsJSON) {
  const itemsList = panel.querySelector("#ord-items-list");
  itemsList.innerHTML = "";

  if (!itemsJSON) {
    addItemRow(panel);
    return;
  }

  try {
    const items = JSON.parse(itemsJSON);
    if (Array.isArray(items) && items.length > 0) {
      items.forEach(item => {
        addItemRow(panel, item.name, item.quantity);
      });
    } else {
      addItemRow(panel);
    }
  } catch (e) {
    console.error("Error parsing items JSON:", e);
    addItemRow(panel);
  }
}

function clearItems(panel) {
  const itemsList = panel.querySelector("#ord-items-list");
  itemsList.innerHTML = "";
  addItemRow(panel);
  itemsData = [];
}

// ===== BACKGROUND MESSAGING =====

function bgRequest(type, payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (res) => {
      if (!res || !res.ok) {
        reject(new Error(res?.error || "Unknown error"));
      } else {
        resolve(res.data);
      }
    });
  });
}

// ===== CANNED RESPONSES =====

async function loadCannedResponses() {
  try {
    const data = await bgRequest("GET_CANNED");
    if (Array.isArray(data) && data.length) {
      cannedResponses = data;
    } else {
      cannedResponses = DEFAULT_RESPONSES;
    }
  } catch (e) {
    console.warn("[Mandal Instagram Helper] GET_CANNED error, using defaults:", e);
    cannedResponses = DEFAULT_RESPONSES;
  }

  // Load local shortcuts
  const storageResult = await new Promise((resolve) => {
    chrome.storage.local.get(["responseShortcuts"], (result) => {
      resolve(result);
    });
  });

  if (storageResult.responseShortcuts) {
    localShortcuts = storageResult.responseShortcuts;
  }

  filterResponses();
}

function filterResponses() {
  let filtered = [...cannedResponses];

  // Filter by category
  if (selectedCategory !== "all") {
    if (selectedCategory === "favorites") {
      filtered = filtered.filter(r => r.is_favorite);
    } else {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }
  }

  // Filter by search
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(r =>
      (r.title && r.title.toLowerCase().includes(query)) ||
      (r.body && r.body.toLowerCase().includes(query))
    );
  }

  // Sort: favorites first, then by updated_at
  filtered.sort((a, b) => {
    if (a.is_favorite && !b.is_favorite) return -1;
    if (!a.is_favorite && b.is_favorite) return 1;
    const dateA = new Date(a.updated_at || 0);
    const dateB = new Date(b.updated_at || 0);
    return dateB - dateA;
  });

  filteredResponses = filtered;
}

function getCategories() {
  const categories = new Set();
  cannedResponses.forEach(r => {
    if (r.category) categories.add(r.category);
  });
  return Array.from(categories);
}

async function toggleFavorite(resp) {
  try {
    const newFavorite = !resp.is_favorite;
    if (resp.id && !String(resp.id).startsWith("local-")) {
      await bgRequest("UPDATE_CANNED", {
        id: resp.id,
        title: resp.title,
        body: resp.body,
        category: resp.category,
        is_favorite: newFavorite
      });
    }
    resp.is_favorite = newFavorite;
    filterResponses();
    const panel = document.getElementById("ig-helper-panel");
    if (panel) renderResponses(panel);
    showToast(newFavorite ? "Added to favorites" : "Removed from favorites", "success");
  } catch (err) {
    showToast("Error updating favorite: " + err.message, "error");
  }
}

function setShortcutKey(resp, key) {
  try {
    // Remove this key from any other response
    Object.keys(localShortcuts).forEach(respId => {
      if (localShortcuts[respId] === key && respId !== String(resp.id)) {
        delete localShortcuts[respId];
      }
    });

    // Set or remove shortcut
    if (key === null || key === "") {
      delete localShortcuts[String(resp.id)];
    } else {
      localShortcuts[String(resp.id)] = key;
    }

    // Save to chrome storage
    chrome.storage.local.set({ responseShortcuts: localShortcuts });

    const panel = document.getElementById("ig-helper-panel");
    if (panel) renderResponses(panel);

    if (key) {
      showToast(`Shortcut ${key} assigned`, "success");
    } else {
      showToast("Shortcut removed", "success");
    }
  } catch (err) {
    showToast("Error setting shortcut: " + err.message, "error");
  }
}

function getShortcutKey(resp) {
  return localShortcuts[String(resp.id)] || null;
}

function renderResponses(panel) {
  const list = panel.querySelector("#ig-helper-responses");
  list.innerHTML = "";

  filteredResponses.forEach((resp, idx) => {
    const item = document.createElement("div");
    item.className = "ig-helper-response";

    const starIcon = resp.is_favorite
      ? '<span class="ig-favorite-icon favorited">★</span>'
      : '<span class="ig-favorite-icon">☆</span>';

    const categoryBadge = resp.category
      ? `<span class="ig-category-badge">${resp.category}</span>`
      : '';

    // Show keyboard shortcut badge if set (from local storage)
    const shortcutKey = getShortcutKey(resp);
    const shortcutBadge = shortcutKey
      ? `<span class="ig-shortcut-badge">${shortcutKey}</span>`
      : '';

    item.innerHTML = `
      <div class="ig-helper-response-title">
        ${starIcon}
        ${resp.title}
        ${categoryBadge}
        ${shortcutBadge}
      </div>
      <div class="ig-helper-response-body">${resp.body}</div>
      <div class="ig-helper-response-actions">
        <button class="ig-helper-btn ig-set-shortcut" data-index="${idx}">Set Shortcut</button>
        <button class="ig-helper-btn ig-edit" data-index="${idx}">Засах</button>
        <button class="ig-helper-btn ig-delete" data-index="${idx}">Устгах</button>
        <button class="ig-helper-btn ig-send" data-index="${idx}">Insert & Send</button>
      </div>
    `;

    // Star click
    const star = item.querySelector(".ig-favorite-icon");
    star.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(resp);
    });

    // Whole card = insert only
    item.addEventListener("click", (e) => {
      if (e.target.closest("button") || e.target.closest(".ig-favorite-icon")) return;
      insertTextIntoIgInput(resp.body);
    });

    list.appendChild(item);
  });

  // Set Shortcut
  list.querySelectorAll(".ig-set-shortcut").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const index = Number(btn.dataset.index);
      const current = filteredResponses[index];

      const currentShortcut = getShortcutKey(current);
      const result = await showModal({
        title: "Set Keyboard Shortcut",
        fields: [
          {
            name: "key",
            label: "Shortcut Key",
            type: "text",
            value: currentShortcut || "",
            placeholder: "1-9",
            hint: "Enter a number between 1-9, or leave empty to remove",
            autofocus: true
          }
        ],
        confirmText: "Set Shortcut",
        cancelText: "Cancel",
        submitOnEnter: true
      });

      if (result === null) return; // Cancelled

      const key = result.key.trim();
      if (key === "") {
        // Remove shortcut
        setShortcutKey(current, null);
      } else if (/^[1-9]$/.test(key)) {
        // Valid key 1-9
        setShortcutKey(current, key);
      } else {
        showToast("Please enter a number between 1-9", "error");
      }
    });
  });

  // Edit
  list.querySelectorAll(".ig-edit").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const index = Number(btn.dataset.index);
      const current = filteredResponses[index];

      const result = await showModal({
        title: "Edit Response",
        fields: [
          {
            name: "title",
            label: "Title",
            type: "text",
            value: current.title || "",
            placeholder: "Response title"
          },
          {
            name: "body",
            label: "Message",
            type: "textarea",
            value: current.body || "",
            placeholder: "Message content"
          },
          {
            name: "category",
            label: "Category",
            type: "text",
            value: current.category || "",
            placeholder: "Optional category"
          }
        ],
        confirmText: "Save",
        cancelText: "Cancel"
      });

      if (result === null) return; // Cancelled

      try {
        if (current.id && !String(current.id).startsWith("local-")) {
          const updated = await bgRequest("UPDATE_CANNED", {
            id: current.id,
            title: result.title.trim() || "Untitled",
            body: result.body.trim(),
            category: result.category.trim() || null,
            is_favorite: current.is_favorite
          });
          const origIndex = cannedResponses.findIndex(r => r.id === current.id);
          if (origIndex >= 0) cannedResponses[origIndex] = updated;
        } else {
          current.title = result.title.trim() || "Untitled";
          current.body = result.body.trim();
          current.category = result.category.trim() || null;
        }
        filterResponses();
        renderResponses(panel);
        renderCategories(panel);
        showToast("Мессеж шинэчлэгдлээ", "success");
      } catch (err) {
        showToast("Засахад алдаа гарлаа: " + err.message, "error");
      }
    });
  });

  // Delete
  list.querySelectorAll(".ig-delete").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("Энэ мессежийг устгах уу?")) return;

      const index = Number(btn.dataset.index);
      const current = filteredResponses[index];

      try {
        if (current.id && !String(current.id).startsWith("local-")) {
          await bgRequest("DELETE_CANNED", { id: current.id });
        }
        const origIndex = cannedResponses.findIndex(r => r.id === current.id);
        if (origIndex >= 0) cannedResponses.splice(origIndex, 1);
        filterResponses();
        renderResponses(panel);
        renderCategories(panel);
        showToast("Устгагдлаа", "success");
      } catch (err) {
        showToast("Устгахад алдаа гарлаа: " + err.message, "error");
      }
    });
  });

  // Insert & Send
  list.querySelectorAll(".ig-send").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const index = Number(btn.dataset.index);
      const resp = filteredResponses[index];
      insertTextIntoIgInput(resp.body);
      sendCurrentMessage();
    });
  });
}

function renderCategories(panel) {
  const container = panel.querySelector("#ig-helper-categories");
  container.innerHTML = "";

  // All tab
  const allTab = document.createElement("div");
  allTab.className = "ig-category-tab" + (selectedCategory === "all" ? " active" : "");
  allTab.textContent = "All";
  allTab.addEventListener("click", () => {
    selectedCategory = "all";
    filterResponses();
    renderResponses(panel);
    renderCategories(panel);
  });
  container.appendChild(allTab);

  // Favorites tab
  const favTab = document.createElement("div");
  favTab.className = "ig-category-tab" + (selectedCategory === "favorites" ? " active" : "");
  favTab.textContent = "⭐ Favorites";
  favTab.addEventListener("click", () => {
    selectedCategory = "favorites";
    filterResponses();
    renderResponses(panel);
    renderCategories(panel);
  });
  container.appendChild(favTab);

  // Category tabs
  const categories = getCategories();
  categories.forEach(cat => {
    const tab = document.createElement("div");
    tab.className = "ig-category-tab" + (selectedCategory === cat ? " active" : "");
    tab.textContent = cat;
    tab.addEventListener("click", () => {
      selectedCategory = cat;
      filterResponses();
      renderResponses(panel);
      renderCategories(panel);
    });
    container.appendChild(tab);
  });
}

// ===== ORDERS UI HELPERS =====

function clearOrderForm(panel, prefillName = true) {
  selectedOrderId = null;
  hasUnsavedChanges = false;
  panel.querySelector("#ord-order-id-display").textContent = "";
  panel.querySelector("#ord-order-id-display").style.display = "none";
  panel.querySelector("#ord-cus-name").value = prefillName ? getCurrentIgName() || "" : "";
  panel.querySelector("#ord-cus-phone").value = "";
  panel.querySelector("#ord-cus-phone1").value = "";
  panel.querySelector("#ord-city").value = "";
  panel.querySelector("#ord-district").value = "";
  panel.querySelector("#ord-committee").value = "";
  panel.querySelector("#ord-address").value = "";
  panel.querySelector("#ord-deli-desc").value = "";
  clearItems(panel);
  updateActionButtons(panel);
}

function renderOrdersList(panel) {
  const listEl = panel.querySelector("#ig-orders-list");
  listEl.innerHTML = "";

  // Show empty state if no orders
  if (currentOrders.length === 0) {
    listEl.innerHTML = `
      <div class="ig-empty-state">
        <div class="ig-empty-state-icon">📦</div>
        <div class="ig-empty-state-text">
          No orders yet<br>
          <small>Create your first order to get started</small>
        </div>
      </div>
    `;
    return;
  }

  currentOrders.forEach((ord) => {
    const row = document.createElement("div");
    row.className = "ig-order-row" + (ord.id === selectedOrderId ? " selected" : "");

    const orderIdText = ord.order_id || "No ID";
    const dateText = ord.created_at
      ? new Date(ord.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
      : "Unknown";

    const info = document.createElement("div");
    info.className = "ig-order-row-info";
    info.dataset.orderId = ord.id;
    info.innerHTML = `
      <span class="ig-order-date">${dateText}</span>
      <span class="ig-order-id-text">${orderIdText}</span>
    `;

    info.addEventListener("click", () => {
      if (hasUnsavedChanges && !confirm("Хадгалаагүй өөрчлөлт устгагдана. Үргэлжлүүлэх үү?")) {
        return;
      }

      selectedOrderId = ord.id;
      hasUnsavedChanges = false;
      const orderIdDisplay = panel.querySelector("#ord-order-id-display");
      if (ord.order_id) {
        orderIdDisplay.textContent = ord.order_id;
        orderIdDisplay.style.display = "block";
      } else {
        orderIdDisplay.textContent = "";
        orderIdDisplay.style.display = "none";
      }
      panel.querySelector("#ord-cus-name").value = ord.cus_name || "";
      panel.querySelector("#ord-cus-phone").value = ord.cus_phone || "";
      panel.querySelector("#ord-cus-phone1").value = ord.cus_phone1 || "";
      panel.querySelector("#ord-city").value = ord.city || "";
      panel.querySelector("#ord-district").value = ord.district || "";
      panel.querySelector("#ord-committee").value = ord.committee || "";
      panel.querySelector("#ord-address").value = ord.address || "";
      panel.querySelector("#ord-deli-desc").value = ord.deli_desc || "";
      loadItemsFromJSON(panel, ord.items);
      updateActionButtons(panel);
      renderOrdersList(panel);
    });

    // Create delivery button
    const deliveryBtn = document.createElement("button");
    deliveryBtn.className = "ig-create-delivery-btn";
    deliveryBtn.dataset.orderId = ord.id;

    if (ord.is_delivery_called) {
      deliveryBtn.textContent = "✓ Delivered";
      deliveryBtn.classList.add("delivered");
      deliveryBtn.disabled = true;
    } else {
      deliveryBtn.textContent = "📦 Delivery";
      deliveryBtn.addEventListener("click", async (e) => {
        e.stopPropagation();

        // Add loading state
        deliveryBtn.classList.add("loading");
        deliveryBtn.disabled = true;

        try {
          await handleCreateDeliveryClick(ord, panel);
        } finally {
          deliveryBtn.classList.remove("loading");
          deliveryBtn.disabled = false;
        }
      });
    }

    row.appendChild(info);
    row.appendChild(deliveryBtn);
    listEl.appendChild(row);
  });
}

// ─────────────────────────────────────────────────────────
// Handle Create Delivery Click
// ─────────────────────────────────────────────────────────
async function handleCreateDeliveryClick(order, panel) {
  try {
    // Validate required fields
    if (!order.cus_name || !order.cus_phone || !order.address) {
      showToast("Missing required fields: Name, Phone, or Address", "error");
      return;
    }

    // Parse items
    let itemsArray = [];
    try {
      if (order.items) {
        itemsArray = JSON.parse(order.items);
      }
    } catch (e) {
      console.error("Error parsing items:", e);
    }

    if (itemsArray.length === 0) {
      showToast("No items in order", "error");
      return;
    }

    // Get ebuuhia credentials
    const credentials = await new Promise((resolve) => {
      chrome.storage.local.get(["ebuuhiaCredentials"], (result) => {
        resolve(result.ebuuhiaCredentials || null);
      });
    });

    if (!credentials || !credentials.email || !credentials.password) {
      showToast("Please configure ebuuhia credentials in Settings", "error");
      return;
    }

    // Show delivery confirmation modal
    const confirmed = await showDeliveryConfirmationModal(order);

    if (!confirmed) {
      return;
    }

    showToast("Creating delivery...", "info");

    // Prepare delivery data for ebuuhia API
    const deliveryData = {
      email: credentials.email,
      password: credentials.password,
      cus_name: order.cus_name,
      cus_phone: order.cus_phone,
      cus_phone1: order.cus_phone1 || "",
      city: order.city || "",
      district: order.district || "",
      committee: order.committee || "",
      address: order.address,
      items: itemsArray,
      deli_desc: order.deli_desc || ""
    };

    // Call background script to create delivery
    const response = await bgRequest("CREATE_DELIVERY", {
      orderId: order.id,
      deliveryData: deliveryData
    });

    if (response.success) {
      showToast("Delivery created successfully!", "success");

      // Update local order state
      const orderInList = currentOrders.find(o => o.id === order.id);
      if (orderInList) {
        orderInList.is_delivery_called = true;
        orderInList.delivery_created_at = new Date().toISOString();
        orderInList.ebuuhia_response = JSON.stringify(response.ebuuhiaResponse || {});
      }

      // Re-render orders list to show updated button
      renderOrdersList(panel);
    } else {
      showToast("Failed to create delivery: " + (response.error || "Unknown error"), "error");
    }
  } catch (error) {
    console.error("Error creating delivery:", error);
    showToast("Error creating delivery: " + error.message, "error");
  }
}

async function saveDraftToDatabase(panel) {
  const threadId = getCurrentThreadId();
  const { handle } = getCurrentIgIdentity();

  if (!threadId) return;

  updateItemsData(panel);

  const draftData = {
    ig_thread_id: threadId,
    ig_username: handle || null,
    cus_name: panel.querySelector("#ord-cus-name").value.trim() || null,
    cus_phone: panel.querySelector("#ord-cus-phone").value.trim() || null,
    cus_phone1: panel.querySelector("#ord-cus-phone1").value.trim() || null,
    city: panel.querySelector("#ord-city").value.trim() || null,
    district: panel.querySelector("#ord-district").value.trim() || null,
    committee: panel.querySelector("#ord-committee").value.trim() || null,
    address: panel.querySelector("#ord-address").value.trim() || null,
    items: getItemsJSON(panel),
    deli_desc: panel.querySelector("#ord-deli-desc").value.trim() || null
  };

  try {
    const saved = await bgRequest("SAVE_DRAFT", draftData);
    currentDraft = saved;
    // Silent save - no toast notification
  } catch (err) {
    console.warn("[Mandal Instagram Helper] Draft save failed:", err);
  }
}

function scheduleDraftSave(panel) {
  // Debounce: wait 1 second after last keystroke
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => {
    saveDraftToDatabase(panel);
  }, 1000);
}

function updateActionButtons(panel) {
  const actionsContainer = panel.querySelector("#ig-order-actions");
  const currentDraftBtn = panel.querySelector("#ig-order-current-draft");

  if (selectedOrderId) {
    // EDITING EXISTING ORDER - show save changes and delete buttons
    actionsContainer.innerHTML = `
      <button id="ig-order-save-changes" class="ig-helper-btn ig-btn-save-changes" ${!hasUnsavedChanges ? 'disabled' : ''}>
        Өөрчлөлт хадгалах
      </button>
      <button id="ig-order-delete" class="ig-helper-btn ig-btn-delete">
        Захиалга Устгах
      </button>
    `;
    // Remove selected state from Current Draft button
    if (currentDraftBtn) {
      currentDraftBtn.classList.remove("selected");
    }
  } else {
    // VIEWING DRAFT - show create order button
    actionsContainer.innerHTML = `
      <button id="ig-order-save" class="ig-helper-btn ig-save-order">
        Захиалга үүсгэх
      </button>
    `;
    // Add selected state to Current Draft button
    if (currentDraftBtn) {
      currentDraftBtn.classList.add("selected");
    }
  }
}

async function loadOrdersForCurrentThread(panel) {
  const threadId = getCurrentThreadId();
  if (!threadId) {
    currentOrders = [];
    selectedOrderId = null;
    currentDraft = null;
    clearOrderForm(panel, true);
    renderOrdersList(panel);
    return;
  }

  try {
    // Load existing orders
    currentOrders = await bgRequest("GET_ORDERS", { ig_thread_id: threadId });
    console.log("[Mandal Instagram Helper] Loaded orders:", currentOrders);

    // Load draft
    currentDraft = await bgRequest("GET_DRAFT", { ig_thread_id: threadId });
    console.log("[Mandal Instagram Helper] Loaded draft:", currentDraft);
  } catch (e) {
    console.warn("[Mandal Instagram Helper] Load error:", e);
    currentOrders = [];
    currentDraft = null;
  }

  // Also load customer history
  const { handle } = getCurrentIgIdentity();
  if (handle) {
    try {
      customerOrderHistory = await bgRequest("GET_ORDERS_BY_CUSTOMER", { ig_username: handle });

      // Show customer stats if they have previous orders
      if (customerOrderHistory.length > currentOrders.length) {
        const totalOrders = customerOrderHistory.length;
        const totalSpent = customerOrderHistory.reduce((sum, ord) => sum + (ord.total_amount || 0), 0);
        showToast(`Repeat customer! ${totalOrders} orders, ${totalSpent}₮ total`, "info");
      }
    } catch (e) {
      console.warn("[Mandal Instagram Helper] GET_ORDERS_BY_CUSTOMER error:", e);
      customerOrderHistory = [];
    }
  }

  selectedOrderId = null;

  // If draft exists and no order is selected, populate form with draft
  if (currentDraft && !selectedOrderId) {
    panel.querySelector("#ord-cus-name").value = currentDraft.cus_name || getCurrentIgName() || "";
    panel.querySelector("#ord-cus-phone").value = currentDraft.cus_phone || "";
    panel.querySelector("#ord-cus-phone1").value = currentDraft.cus_phone1 || "";
    panel.querySelector("#ord-city").value = currentDraft.city || "";
    panel.querySelector("#ord-district").value = currentDraft.district || "";
    panel.querySelector("#ord-committee").value = currentDraft.committee || "";
    panel.querySelector("#ord-address").value = currentDraft.address || "";
    panel.querySelector("#ord-deli-desc").value = currentDraft.deli_desc || "";
    loadItemsFromJSON(panel, currentDraft.items);
    // Don't mark as unsaved since it's loaded from draft
    hasUnsavedChanges = false;
  } else {
    clearOrderForm(panel, true);
  }

  updateActionButtons(panel);
  renderOrdersList(panel);
}

// ===== PANEL CREATION =====

function createPanel() {
  let existing = document.getElementById("ig-helper-panel");
  if (existing) return existing;

  const panel = document.createElement("div");
  panel.id = "ig-helper-panel";

  panel.innerHTML = `
    <div id="ig-helper-header">
      <span>Mandal Helper</span>
      <div>
        <button id="ig-settings-btn" class="ig-settings-btn" title="Settings">⚙️</button>
        <button id="ig-helper-toggle" class="ig-helper-toggle">›</button>
      </div>
    </div>

    <div id="ig-helper-search">
      <input type="text" placeholder="Search responses..." id="ig-search-input" />
    </div>

    <div id="ig-helper-categories"></div>

    <button id="ig-helper-add" class="ig-helper-add-btn">+ Add</button>

    <div id="ig-helper-responses"></div>

    <div class="ig-section-header" id="ig-helper-orders-toggle">
      <span>Захиалга</span>
      <span>▲</span>
    </div>
    <div id="ig-helper-orders" class="collapsed">
      <div id="ig-orders-list"></div>

      <div class="ig-orders-controls">
        <button id="ig-order-current-draft" class="ig-helper-btn">Current Draft</button>
      </div>

      <div id="ord-order-id-display" class="ig-order-id-display"></div>

      <div class="ig-field">
        <label>Харилцагчийн нэр (Customer Name) *</label>
        <input id="ord-cus-name" type="text" maxlength="100" readonly />
      </div>
      <div class="ig-field">
        <label>Утас (Phone) *</label>
        <input id="ord-cus-phone" type="tel" maxlength="8" placeholder="99112233" />
      </div>
      <div class="ig-field">
        <label>Нэмэлт утас (Extra Phone)</label>
        <input id="ord-cus-phone1" type="tel" maxlength="8" placeholder="99112244" />
      </div>
      <div class="ig-field">
        <label>Хот (City)</label>
        <input id="ord-city" type="text" maxlength="50" placeholder="Улаанбаатар" />
      </div>
      <div class="ig-field-row">
        <div class="ig-field ig-field-half">
          <label>Дүүрэг (District)</label>
          <input id="ord-district" type="text" maxlength="50" placeholder="Баянзүрх" />
        </div>
        <div class="ig-field ig-field-half">
          <label>Хороо (Committee)</label>
          <input id="ord-committee" type="text" maxlength="50" placeholder="4-р хороо" />
        </div>
      </div>
      <div class="ig-field">
        <label>Хаяг (Address) *</label>
        <textarea id="ord-address" maxlength="250" rows="3" placeholder="Дэлгэрэнгүй хаяг"></textarea>
      </div>
      <div class="ig-field">
        <label>Бараа (Items) *</label>
        <div id="ord-items-list" class="items-list"></div>
        <button id="ig-add-item-btn" class="ig-helper-btn ig-btn-secondary" type="button">
          + Add Item
        </button>
      </div>
      <div class="ig-field">
        <label>Хүргэлтийн тайлбар (Delivery Notes)</label>
        <textarea id="ord-deli-desc" maxlength="250" rows="2" placeholder="Нэмэлт мэдээлэл"></textarea>
      </div>

      <div id="ig-order-actions" class="ig-order-actions">
        <button id="ig-order-save" class="ig-helper-btn ig-save-order">
          Захиалга үүсгэх
        </button>
      </div>
    </div>
  `;

  panel.style.position = "fixed";
  panel.style.top = "0";
  panel.style.right = "0";
  panel.style.height = "100vh";
  panel.style.width = "380px";
  panel.style.zIndex = "999999";

  // Add resize handle
  const resizeHandle = document.createElement("div");
  resizeHandle.className = "resize-handle";
  panel.insertBefore(resizeHandle, panel.firstChild);

  document.body.appendChild(panel);

  // Load saved state from storage
  chrome.storage.local.get(["panelCollapsed", "panelWidth"], (result) => {
    if (result.panelCollapsed) {
      panel.classList.add("ig-helper-collapsed");
      panel.querySelector("#ig-helper-toggle").textContent = "‹";
    }
    if (result.panelWidth) {
      panel.style.width = result.panelWidth + "px";
    }
  });

  // Resize functionality
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = panel.offsetWidth;
    document.body.style.cursor = "ew-resize";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    const diff = startX - e.clientX;
    const newWidth = Math.max(320, Math.min(600, startWidth + diff));
    panel.style.width = newWidth + "px";
  });

  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = "";
      // Save width to storage
      chrome.storage.local.set({ panelWidth: panel.offsetWidth });
    }
  });

  // Collapse / expand
  const toggleBtn = panel.querySelector("#ig-helper-toggle");
  toggleBtn.addEventListener("click", () => {
    const isCollapsed = panel.classList.toggle("ig-helper-collapsed");
    toggleBtn.textContent = isCollapsed ? "‹" : "›";
    chrome.storage.local.set({ panelCollapsed: isCollapsed });
  });

  // Search input
  const searchInput = panel.querySelector("#ig-search-input");
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    filterResponses();
    renderResponses(panel);
  });

  // Add new canned response
  panel.querySelector("#ig-helper-add").addEventListener("click", async () => {
    const result = await showModal({
      title: "Add New Response",
      fields: [
        {
          name: "body",
          label: "Message",
          type: "textarea",
          placeholder: "Message content",
          value: ""
        },
        {
          name: "title",
          label: "Title",
          type: "text",
          placeholder: "Response title (optional)",
          value: ""
        },
        {
          name: "category",
          label: "Category",
          type: "text",
          placeholder: "Optional category",
          value: ""
        }
      ],
      confirmText: "Add Response",
      cancelText: "Cancel"
    });

    if (result === null || !result.body.trim()) return; // Cancelled or empty

    const title = result.title.trim() || result.body.trim().slice(0, 25);
    const body = result.body.trim();
    const category = result.category.trim() || null;

    try {
      const created = await bgRequest("CREATE_CANNED", {
        title,
        body,
        category,
        is_favorite: false
      });
      cannedResponses.unshift(created);
      filterResponses();
      renderResponses(panel);
      renderCategories(panel);
      showToast("Шинэ мессеж нэмэгдлээ", "success");
    } catch (err) {
      showToast("Шинэ мессеж нэмэхэд алдаа гарлаа: " + err.message, "error");
    }
  });

  // Orders toggle
  const ordersToggle = panel.querySelector("#ig-helper-orders-toggle");
  const ordersSection = panel.querySelector("#ig-helper-orders");
  ordersToggle.addEventListener("click", () => {
    const collapsed = ordersSection.classList.contains("collapsed");
    if (collapsed) {
      ordersSection.classList.remove("collapsed");
      ordersToggle.querySelector("span:last-child").textContent = "▼";
    } else {
      ordersSection.classList.add("collapsed");
      ordersToggle.querySelector("span:last-child").textContent = "▲";
    }
  });

  // Current Draft button
  panel.querySelector("#ig-order-current-draft").addEventListener("click", () => {
    if (hasUnsavedChanges && !confirm("Хадгалаагүй өөрчлөлт устгагдана. Үргэлжлүүлэх үү?")) {
      return;
    }
    clearOrderForm(panel, true);

    // Load draft data if available
    if (currentDraft) {
      panel.querySelector("#ord-cus-name").value = currentDraft.cus_name || getCurrentIgName() || "";
      panel.querySelector("#ord-cus-phone").value = currentDraft.cus_phone || "";
      panel.querySelector("#ord-cus-phone1").value = currentDraft.cus_phone1 || "";
      panel.querySelector("#ord-city").value = currentDraft.city || "";
      panel.querySelector("#ord-district").value = currentDraft.district || "";
      panel.querySelector("#ord-committee").value = currentDraft.committee || "";
      panel.querySelector("#ord-address").value = currentDraft.address || "";
      panel.querySelector("#ord-deli-desc").value = currentDraft.deli_desc || "";
      loadItemsFromJSON(panel, currentDraft.items);
    }

    renderOrdersList(panel);
  });

  // Settings button - opens modal
  panel.querySelector("#ig-settings-btn").addEventListener("click", () => {
    showSettingsModal();
  });

  // Add item button
  panel.querySelector("#ig-add-item-btn").addEventListener("click", () => {
    addItemRow(panel);
  });

  // Initialize items with one empty row
  addItemRow(panel);

  // Track unsaved changes AND auto-save drafts
  const formFields = panel.querySelectorAll("#ig-helper-orders input, #ig-helper-orders textarea");
  formFields.forEach(field => {
    // Skip the items list inputs as they have their own handlers
    if (!field.closest(".items-list")) {
      field.addEventListener("input", () => {
        hasUnsavedChanges = true;
        scheduleDraftSave(panel); // Auto-save draft
        updateActionButtons(panel); // Update button states
      });
    }
  });

  // Event delegation for dynamically created action buttons
  panel.querySelector("#ig-order-actions").addEventListener("click", async (e) => {
    const target = e.target;

    // Handle "Захиалга үүсгэх" button (create order from draft)
    if (target.id === "ig-order-save") {
      const threadId = getCurrentThreadId();
      const { handle } = getCurrentIgIdentity();

      const cusName = panel.querySelector("#ord-cus-name").value.trim();
      const cusPhone = panel.querySelector("#ord-cus-phone").value.trim();
      const cusPhone1 = panel.querySelector("#ord-cus-phone1").value.trim();
      const city = panel.querySelector("#ord-city").value.trim();
      const district = panel.querySelector("#ord-district").value.trim();
      const committee = panel.querySelector("#ord-committee").value.trim();
      const address = panel.querySelector("#ord-address").value.trim();
      const deliDesc = panel.querySelector("#ord-deli-desc").value.trim();

      // Validate required fields
      if (!cusName) {
        showToast("Customer name is required", "error");
        return;
      }
      if (!cusPhone) {
        showToast("Phone number is required", "error");
        return;
      }
      // Validate phone is 8 digits
      if (!/^\d{8}$/.test(cusPhone)) {
        showToast("Phone must be 8 digits", "error");
        return;
      }
      if (cusPhone1 && !/^\d{8}$/.test(cusPhone1)) {
        showToast("Extra phone must be 8 digits", "error");
        return;
      }
      if (!address) {
        showToast("Address is required", "error");
        return;
      }

      updateItemsData(panel);
      if (itemsData.length === 0) {
        showToast("At least one item is required", "error");
        return;
      }

      // Show confirmation modal with order data
      const confirmed = await showOrderConfirmationModal({
        cus_name: cusName,
        cus_phone: cusPhone,
        cus_phone1: cusPhone1 || null,
        address: address,
        items: getItemsJSON(panel)
      });

      if (!confirmed) return; // User cancelled

      const payload = {
        ig_thread_id: threadId,
        ig_username: handle || null,
        cus_name: cusName,
        cus_phone: cusPhone,
        cus_phone1: cusPhone1 || null,
        city: city || null,
        district: district || null,
        committee: committee || null,
        address: address,
        items: getItemsJSON(panel),
        deli_desc: deliDesc || null
      };

      try {
        const created = await bgRequest("CREATE_ORDER", payload);
        currentOrders.unshift(created);
        selectedOrderId = created.id;

        // Delete draft after successful order creation
        await bgRequest("DELETE_DRAFT", { ig_thread_id: threadId });
        currentDraft = null;

        hasUnsavedChanges = false;

        // Update display to show created order
        const orderIdDisplay = panel.querySelector("#ord-order-id-display");
        if (created.order_id) {
          orderIdDisplay.textContent = created.order_id;
          orderIdDisplay.style.display = "block";
        }

        updateActionButtons(panel);
        renderOrdersList(panel);
        showToast("Захиалга үүсгэгдлээ.", "success");
      } catch (err) {
        showToast("Захиалга үүсгэхэд алдаа: " + err.message, "error");
      }
    }

    // Handle "Өөрчлөлт хадгалах" button (save changes to existing order)
    else if (target.id === "ig-order-save-changes") {
      if (!selectedOrderId) return;
      if (!hasUnsavedChanges) return; // Button should be disabled

      const cusName = panel.querySelector("#ord-cus-name").value.trim();
      const cusPhone = panel.querySelector("#ord-cus-phone").value.trim();
      const cusPhone1 = panel.querySelector("#ord-cus-phone1").value.trim();
      const city = panel.querySelector("#ord-city").value.trim();
      const district = panel.querySelector("#ord-district").value.trim();
      const committee = panel.querySelector("#ord-committee").value.trim();
      const address = panel.querySelector("#ord-address").value.trim();
      const deliDesc = panel.querySelector("#ord-deli-desc").value.trim();

      // Validate required fields
      if (!cusName) {
        showToast("Customer name is required", "error");
        return;
      }
      if (!cusPhone) {
        showToast("Phone number is required", "error");
        return;
      }
      // Validate phone is 8 digits
      if (!/^\d{8}$/.test(cusPhone)) {
        showToast("Phone must be 8 digits", "error");
        return;
      }
      if (cusPhone1 && !/^\d{8}$/.test(cusPhone1)) {
        showToast("Extra phone must be 8 digits", "error");
        return;
      }
      if (!address) {
        showToast("Address is required", "error");
        return;
      }

      updateItemsData(panel);
      if (itemsData.length === 0) {
        showToast("At least one item is required", "error");
        return;
      }

      const order = currentOrders.find(o => o.id === selectedOrderId);
      if (!order) return;

      try {
        const updated = await bgRequest("UPDATE_ORDER", {
          id: selectedOrderId,
          ig_thread_id: order.ig_thread_id,
          ig_username: order.ig_username,
          cus_name: cusName,
          cus_phone: cusPhone,
          cus_phone1: cusPhone1 || null,
          city: city || null,
          district: district || null,
          committee: committee || null,
          address: address,
          items: getItemsJSON(panel),
          deli_desc: deliDesc || null
        });

        const idx = currentOrders.findIndex(o => o.id === selectedOrderId);
        if (idx !== -1) currentOrders[idx] = updated;

        hasUnsavedChanges = false;
        updateActionButtons(panel);
        renderOrdersList(panel);
        showToast("Захиалга шинэчлэгдлээ.", "success");
      } catch (err) {
        showToast("Засахад алдаа: " + err.message, "error");
      }
    }

    // Handle "Захиалга Устгах" button (delete order)
    else if (target.id === "ig-order-delete") {
      if (!selectedOrderId) {
        showToast("Сонгосон захиалга алга.", "error");
        return;
      }

      // Show confirmation modal
      const order = currentOrders.find(o => o.id === selectedOrderId);
      const confirmed = await showDeleteConfirmationModal(order);
      if (!confirmed) return;

      try {
        await bgRequest("DELETE_ORDER", { id: selectedOrderId });
        currentOrders = currentOrders.filter((o) => o.id !== selectedOrderId);
        clearOrderForm(panel, true);

        // Load draft back if available
        if (currentDraft) {
          panel.querySelector("#ord-cus-name").value = currentDraft.cus_name || getCurrentIgName() || "";
          panel.querySelector("#ord-cus-phone").value = currentDraft.cus_phone || "";
          panel.querySelector("#ord-cus-phone1").value = currentDraft.cus_phone1 || "";
          panel.querySelector("#ord-city").value = currentDraft.city || "";
          panel.querySelector("#ord-district").value = currentDraft.district || "";
          panel.querySelector("#ord-committee").value = currentDraft.committee || "";
          panel.querySelector("#ord-address").value = currentDraft.address || "";
          panel.querySelector("#ord-deli-desc").value = currentDraft.deli_desc || "";
          loadItemsFromJSON(panel, currentDraft.items);
        }

        renderOrdersList(panel);
        showToast("Устгагдлаа.", "success");
      } catch (err) {
        showToast("Захиалга устгахад алдаа: " + err.message, "error");
      }
    }
  });

  return panel;
}

// ===== KEYBOARD SHORTCUTS =====

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Check if panel is collapsed - if so, disable shortcuts
    const panel = document.getElementById("ig-helper-panel");
    if (panel && panel.classList.contains("ig-helper-collapsed")) {
      return;
    }

    // Ctrl+Enter to save order (when in order form)
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      const ordersSection = panel.querySelector("#ig-helper-orders");
      if (ordersSection && !ordersSection.classList.contains("collapsed")) {
        e.preventDefault();
        const saveBtn = panel.querySelector("#ig-order-save");
        const saveChangesBtn = panel.querySelector("#ig-order-save-changes");
        if (saveBtn && !saveBtn.disabled) {
          saveBtn.click();
        } else if (saveChangesBtn && !saveChangesBtn.disabled) {
          saveChangesBtn.click();
        }
        return;
      }
    }

    // Only trigger on number keys 1-9, no modifiers
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) {
      // Exception: allow in IG message input
      const msgInput = getMessageInput();
      if (e.target !== msgInput) return;
    }

    const key = e.key;
    if (key >= "1" && key <= "9") {
      // Find response with this shortcut key (from local storage)
      const response = cannedResponses.find(r => getShortcutKey(r) === key);
      if (response) {
        e.preventDefault();
        insertTextIntoIgInput(response.body);
        showToast(`Inserted shortcut ${key}`, "success");
      }
    }
  });
}

// ===== URL WATCHER / INIT =====

async function handleUrlChange() {
  const url = location.href;
  if (isDmThreadUrl(url)) {
    const panel = createPanel();
    panel.classList.remove("hidden");

    await loadCannedResponses();
    renderCategories(panel);
    renderResponses(panel);

    await loadOrdersForCurrentThread(panel);

    // Ensure name is populated after page loads (wait for IG to render)
    setTimeout(() => {
      if (!selectedOrderId) {
        const currentName = getCurrentIgName();
        if (currentName) {
          panel.querySelector("#ord-cus-name").value = currentName;
        }
      }
    }, 1000);
  } else {
    const panel = document.getElementById("ig-helper-panel");
    if (panel) panel.classList.add("hidden");
  }
}

function startUrlWatcher() {
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      handleUrlChange();
    }
  }, 300);
}

(async function init() {
  lastUrl = location.href;
  await handleUrlChange();
  startUrlWatcher();
  setupKeyboardShortcuts();
})();
