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

## Final Recommendation

**Recommendation: NO for browser compatibility**

Official browser support should **not** be continued. The driver should be positioned as a **server-side (Node.js) client** only. Web applications should access ArangoDB through a **backend API**, not by running the driver in the browser.

**Business impact**

- Browser compatibility does not drive enterprise adoption or revenue; production customers already use server-side integrations.
- Continuing dual-runtime messaging weakens the product story; a Node-only stance is easier to sell, explain, and align with solution architecture.

**Client impact**

- **Enterprise and backend teams:** No meaningful loss—their deployments are unaffected.
- **Small group using direct browser access:** Will need to move database calls behind an API; acceptable trade-off for clearer support boundaries and a major-version migration path.

**Security considerations**

- Direct browser-to-database access exposes credentials and expands attack surface.
- Official browser support can be interpreted as endorsing a pattern that fails most security and compliance reviews.
- Removing browser support reinforces the correct model: data access from trusted server environments only.

**Maintenance and operational cost**

- Continuing requires ongoing browser CI, dual documentation, and support for CORS, TLS, and runtime-specific limitations.
- Ending official browser support reduces recurring overhead and focuses testing and releases on how customers actually run in production.

**Long-term sustainability**

- Industry practice favors API-first web access and server-side database drivers.
- Unsupported browser feature gaps will not be closed; maintaining official browser support perpetuates a promise the product cannot fulfill.
- Deprecating later becomes harder as more teams adopt browser-direct patterns; deciding now avoids growing migration debt.

**Architectural trade-offs**

- **Cost of NO:** Less convenience for demos and internal tools that call ArangoDB directly from the front end.
- **Benefit of NO:** Clear separation—**arangojs** for external server apps, **Foxx / `@arangodb`** for in-database logic, **HTTP APIs** for web clients.
- On balance, architectural clarity, security, and operational focus outweigh convenience for a non-core user segment.

**Decision:** Discontinue official browser compatibility. Communicate the change in a major release with migration guidance for affected users.
