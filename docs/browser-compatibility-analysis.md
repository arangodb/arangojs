# ArangoDB JavaScript Driver: Browser Compatibility — Remove or Continue?

**Purpose:** Leadership and architecture review — whether the official JavaScript driver should **continue** or **remove** browser compatibility as a supported capability.

**Context:** Browser compatibility **already exists today**. The driver is documented for Node.js and the browser, uses standard web HTTP APIs, and is validated with browser smoke tests in CI. Many flows work in a bundler or via CDN, but several capabilities are limited in browsers compared to Node.

**Decision under review:**

| Option | Meaning |
|--------|---------|
| **Continue** | Keep browser as an officially supported runtime (current state). |
| **Remove** | Drop official browser support; position the driver as **Node.js (server-side) only**. |

---

## 1. Who are the target users or clients that actually need browser compatibility?

| Segment | Need level | Notes |
|--------|------------|--------|
| **Enterprise production apps** | Low | Web UIs almost always call a backend API; the database is not exposed to the browser. |
| **Node.js / backend services** | None (for browser) | Primary, proven use case; unaffected if browser support is removed. |
| **Internal admin tools & dashboards** | Low–medium | Some teams use direct browser → DB on trusted networks or for prototypes. |
| **Developers / demos / workshops** | Medium | Convenient for quick experiments without an API layer. |
| **Partners building “full-stack JS” samples** | Low | Usually solvable with a thin backend. |

**Conclusion:** Only a **small subset** of users depends on **continued** official browser support. The core customer base runs the driver on the server.

---

## 2. What business or client value does continuing browser compatibility provide?

**Value of continuing**

- Supports existing users who bundle the driver in front-end apps today.
- Faster demos and internal tools without standing up an API.
- Matches current README positioning (“Node.js and the browser”).

**Value of removing**

- Clearer enterprise story: official driver = **server-side only**.
- Aligns product messaging with secure architecture (API in front of the database).
- Reduces support ambiguity and security-related questions.

**Conclusion:** Continuing browser support offers **convenience for a minority**. Removing it improves **clarity and security positioning** for the majority. Neither option is a major revenue driver on its own.

---

## 3. Which existing driver features may not work in browser environments?

These gaps exist **today** while browser support is still offered:

| Area | Browser limitation |
|------|-------------------|
| **Custom TLS / certificates** | No Node-style agent options; trust is controlled by the browser. |
| **Unix domain sockets** | Not available in browsers. |
| **Multi-server failover** | Limited or no practical effect in typical browser setups. |
| **Connection lifecycle (`close()`)** | No meaningful connection pool to manage as on the server. |
| **Cluster / load-balancing** | Weaker; CORS and single-origin constraints limit parity with Node. |
| **Cross-origin access** | Requires ArangoDB or proxy CORS configuration. |
| **Credentials in the client** | Secrets in front-end bundles are exposed to users. |

Core data operations (queries, collections, documents, graphs) can work over HTTP when configured—but **full parity with Node is not available**, even while browser support continues.

---

## 4. Are unsupported features in browsers re-implemented or redesigned for browser compatibility?

**No.** Features that do not work (or work poorly) in browsers are **not** being re-implemented or redesigned as browser-specific equivalents.

**Current approach**

- One shared API for Node and browser; limitations are **documented**, not closed with separate browser implementations.
- Examples (custom TLS agents, Unix sockets, multi-server failover, connection pooling) remain **Node-oriented**. There is no parallel “browser edition” of these capabilities.
- No roadmap investment to achieve feature parity in the browser.

**Implications for this decision**

| If we **continue** | If we **remove** |
|--------------------|------------------|
| Users keep a supported runtime with **known gaps** that will not be fixed for the browser. | Removing support avoids implying those gaps will ever be addressed in the browser. |
| Support must explain what works in the browser vs. what does not. | Full capabilities remain available on the **server** or via a **backend API** for web clients. |

**Conclusion:** Whether we continue or remove browser support, **unsupported browser features are not re-implemented for the browser**. Continuing only preserves the status quo; removing aligns product scope with how the driver is actually built and maintained.

---

## 5. Are there security or data exposure risks when running the driver inside browsers?

**Yes — material risks (present while browser support continues).**

- Exposed credentials in client-side bundles and devtools.
- Broader attack surface if users can replay application requests.
- CORS is not a substitute for server-side authorization.
- Enterprise compliance reviews often reject direct browser-to-database access in production.
- Custom TLS trust depends on the end-user browser, not application policy.

Continuing official browser support can be read as **endorsing** this pattern. Removing it signals the **recommended** approach: database access from the server only.

---

## 6. Does continuing browser compatibility add dependency, bundling, or packaging complexity?

**Yes — ongoing complexity while browser remains supported:**

| Factor | Impact while continuing |
|--------|-------------------------|
| **Packaging** | Package must stay bundler-friendly for browser consumers. |
| **Distribution** | CDN and import-map documentation and support questions. |
| **CI** | Browser smoke tests and related tooling in the pipeline. |
| **Dual messaging** | Node vs browser limitations in docs and support. |

**If browser support is removed:** Complexity drops in **documentation, CI, and support scope**. The npm package may still be bundleable by third parties, but that would be **unsupported**, not a product commitment.

---

## 7. How much maintenance, testing, and long-term support effort does continuing browser compatibility require?

| Activity | Effort while **continuing** |
|----------|----------------------------|
| **CI** | Browser bundling/smoke jobs and related infrastructure. |
| **Documentation** | Dual guidance (Node vs browser, CORS, TLS, security). |
| **Support** | Tickets mixing CORS, auth, network, and driver issues. |
| **Releases** | Shared HTTP layer must not regress for browser bundlers. |

**Order of magnitude:** Roughly **10–20% recurring overhead** on docs, CI, and support narrative compared to a Node-only supported runtime.

**If removed:** Focus shifts to Node LTS integration tests and server-side deployment patterns only.

---

## 8. Does the benefit of continuing outweigh the trade-offs of removing?

| Dimension | Continue browser support | Remove browser support |
|-----------|-------------------------|------------------------|
| **Enterprise fit** | Maintains a discouraged pattern | Aligns with API-first architecture |
| **Security narrative** | Weaker | Stronger |
| **Support clarity** | Two runtimes to explain | One supported runtime (Node) |
| **Maintenance** | Ongoing CI and docs cost | Lower, focused scope |
| **Existing browser users** | No migration required | Breaking change for a small group |

**Net assessment:** The **benefits of continuing** (convenience for demos and a small user set) do **not** outweigh the **benefits of removing** (security posture, clarity, lower support burden) for an official enterprise database driver.

---

## Client impact summary

| Stakeholder | If we **continue** | If we **remove** |
|-------------|-------------------|------------------|
| **Enterprise customers** | Status quo | Clearer, preferred architecture |
| **Backend / Node teams** | No change | No change |
| **Front-end direct DB users** | Supported (with limitations) | Must migrate to API + server-side driver |
| **Sales / solutions** | Dual message (Node + browser) | Single message: server-side official driver |

---

## Operational impact summary

**Continue:** Keep browser smoke CI, browser sections in README, and dual-runtime support expectations.

**Remove:** Narrow CI to Node-focused integration tests; update README and support policy; plan major-version communication and migration guide for direct browser users.

---

## Long-term considerations

- Removing support now is clearer than **deprecating later** after more customers adopt browser-direct patterns.
- Node as the sole **supported** runtime matches `engines.node` and how most customers deploy.
- Web applications remain fully supported via **HTTP APIs**—only direct browser use of the driver changes.

---

## Final recommendation

### **Remove** official browser compatibility (do not continue as a supported runtime).

### In short

| Question | Answer |
|----------|--------|
| Continue or remove? | **Remove** (as an officially supported environment) |
| Equivalent “YES/NO to browser compatibility”? | **NO** — stop supporting browser as an official target |

### Justification

1. Browser support **already exists**; the question is whether to **keep investing in it**—the analysis favors stopping.
2. Core customers do not need it; a small segment uses it for prototypes and internal tools.
3. Known feature gaps in the browser will not be fixed; continuing promises a parity that does not exist.
4. Security and compliance favor server-side database access only.
5. Continuing adds recurring CI, documentation, and support cost without strong business return.
6. Removing improves architectural clarity: **arangojs on the server**, **API for the web**, **Foxx/`@arangodb` inside the database**.

---

*This document evaluates whether to **continue or remove** existing browser compatibility as official product scope. It does not prescribe specific release or engineering tasks.*
