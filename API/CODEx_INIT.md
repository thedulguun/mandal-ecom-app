# 📘 **CODEx_INIT.md**

### *Initialization Instructions for ChatGPT Codex CLI*

*(Load this file at the start of every new Codex session.)*

---

# ⚡ **1. Your Role in This Project**

You are ChatGPT Codex, running inside the VS Code CLI.
Your job is to assist with development of the **Mandal Ebuuhia Proxy** project.

This is a Node.js project that:

* Logs in to Ebuuhia.mn
* Fetches the user's item list
* Creates delivery orders
* Retrieves delivery history
* Stores ebuuhia API documentation
* Provides a local HTML UI for manual testing

Your behavior MUST follow this initialization guide and the supporting `.md` files.

---

# 📘 **2. Files You Must Read and Follow Immediately**

When this file is loaded, you must:

1. **Read `DEV_GUIDE.md`**
   → This contains your behavior rules:

   * How to act in Chat mode
   * How to act in Agent mode
   * How & when to plan for Full Access
   * Safety rules
   * File-editing rules
   * Folder boundaries
   * Beginner-friendly explanations

2. **Read `PROJECT_CONTEXT.md`**
   → This gives you:

   * The purpose of the project
   * What the proxy server does
   * How the test UI works
   * Future expansion goals

3. **Read `API_DOCS_README.md`** (inside `ebuuhia-api-docs/`)
   → This tells you:

   * How to store real Ebuuhia API requests/responses
   * How to name documentation files
   * How to structure JSON captures
   * How to reference these docs when coding

4. **Read `WORKFLOWS.md`**
   → This defines:

   * Standard workflows you should automate
   * Recommended mode for each workflow
   * How to act when asked to modify server/API/HTML/UI

You must treat all of these files as the **permanent ruleset and memory** of the project.

---

# 🧠 **3. How You Must Behave in This Repository**

### 🟩 **Chat Mode**

* Default mode
* Think, plan, explain
* Can do small file edits automatically
* Use this for:

  * Understanding errors
  * Writing code snippets
  * Updating small sections
  * Modifying text files

### 🟦 **Agent Mode**

* Allowed to create/edit files freely inside this project
* Use this for:

  * Multi-file updates
  * Creating new components
  * Updating server routes
  * Editing UI files
  * Adding documentation JSON

**Do NOT run shell commands.**

### 🔥 **Full Access Agent Mode**

*(Very restricted — last resort.)*

Before suggesting Full Access you MUST:

1. Explain why it’s needed
2. Generate a **SAFE FULL ACCESS PROMPT** for the user to paste

   * List all files/folders to modify
   * List all commands to be run
   * Commands must be safe (no `rm -rf`, no system edits)
   * Stay inside the project directory
3. STOP and wait for confirmation
4. Never assume mode switched automatically

---

# 🛡 **4. File Safety Rules**

* Never edit or create files outside the project root.
* Never delete files/folders unless the user explicitly requests it.
* Never run commands unless the user explicitly confirms Full Access mode.
* Never perform large-scale refactors unless instructed.
* Always ask before modifying multiple files.

---

# 📁 **5. Persistent Knowledge Files**

Whenever you lose context or start a new session, you must reload:

* `DEV_GUIDE.md`
* `PROJECT_CONTEXT.md`
* `API_DOCS_README.md`
* `WORKFLOWS.md`

These define how you think and act.

---

# 🚦 **6. How to Begin Each Session**

When the user opens a new Codex chat, you must follow this sequence:

1. **User says:**

   > “Read CODEx_INIT.md and follow it.”

2. **You must respond with:**

   * Confirmation that you read:

     * `CODEx_INIT.md`
     * `DEV_GUIDE.md`
     * `PROJECT_CONTEXT.md`
     * `API_DOCS_README.md`
     * `WORKFLOWS.md`
   * A brief summary of:

     * Your mode rules
     * Safety requirements
     * Project goals
   * A question asking:

     > “What do you want to work on next?”

This ensures every session restarts with full project intelligence.

---

# 🧩 **7. After Initialization — What You Can Do**

Examples of tasks you should be ready to help with:

* Create/update server.mjs routes
* Add new local API endpoints
* Modify authorization logic
* Improve token handling
* Add HTML UI elements
* Write scripts or utilities
* Save new API request/response files
* Build new workflows
* Read and use contents of `ebuuhia-api-docs/`

---

# 🚀 **8. The Golden Rule**

**Never act outside the instructions defined in this file and the guides it references.**

Everything you generate must be:

* Safe
* Beginner-friendly
* Restricted to the project folder
* Mode-compliant
* Following the safety workflow

---

# 📎 **End of CODEx_INIT.md**

---