import { expect } from "chai";
import { Database } from "../databases.js";
import { isArangoError } from "../errors.js";
import { config, isClusterRuntime } from "./_config.js";
import {
  accessTokenIdsEqual,
  clusterIntegrationTimeoutMs,
  createAccessTokenAndPropagate,
  pollAccessTokensUntilStableMatch,
  propagationForResourceMs,
  waitForUserPropagated,
  waitUntilAccessTokenNotListed,
} from "./_integration-timeouts.js";

async function withUnauthorizedRetry<T>(fn: () => Promise<T>): Promise<T> {
  const budget = isClusterRuntime ? 60_000 : 8_000;
  const deadline = Date.now() + budget;
  let last: unknown;
  while (Date.now() < deadline) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (isClusterRuntime && isArangoError(e)) {
        const retryable =
          e.code === 401 ||
          /not authorized|unauthorized|wrong credentials/i.test(e.message);
        if (retryable) {
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
      }
      throw e;
    }
  }
  throw last instanceof Error ? last : new Error(String(last));
}

// Access tokens require ArangoDB 3.12+
const describe312 = config.arangoVersion! >= 31200 ? describe : describe.skip;

describe312("Access Tokens", function () {
  this.timeout(clusterIntegrationTimeoutMs);
  let system: Database;
  const testUsername = `testuser_${Date.now()}`;
  const testPassword = "testpass123";

  before(async () => {
    system = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE") {
      await system.acquireHostList();
    }
    await system.createUser(testUsername, testPassword);
    await waitForUserPropagated(system, testUsername);
  });

  after(async () => {
    const cleanupSystem = new Database(config);
    try {
      await cleanupSystem.removeUser(testUsername);
    } catch (err) {
      // User might already be deleted, ignore
    } finally {
      try {
        cleanupSystem.close();
        system.close();
      } catch (err) {
        // Connection may already be closed, ignore
      }
    }
  });

  describe("database.createAccessToken", () => {
    it("should create a token with name only", async () => {
      const result = await createAccessTokenAndPropagate(system, testUsername, {
        name: "Test token 1",
      });
      expect(result).to.have.property("id");
      expect(result).to.have.property("token");
      expect(result.token).to.be.a("string");
      expect(result.token).to.match(/^v1\./);
      expect(result.name).to.equal("Test token 1");
    });

    it("should create a token with Unix timestamp expiry", async () => {
      const expiryTimestamp =
        Math.floor(Date.now() / 1000) + 1 * 24 * 60 * 60; // 1 days from now

      const result = await createAccessTokenAndPropagate(system, testUsername, {
        name: "Test token 2",
        valid_until: expiryTimestamp,
      });
      expect(result).to.have.property("valid_until");
      expect(result.valid_until).to.be.a("number");
      expect(result.valid_until).to.equal(expiryTimestamp);
    });

    it("should reject Date objects for valid_until", async () => {
      try {
        await system.createAccessToken(testUsername, {
          name: "Test token 3",
          valid_until: new Date() as any,
        });
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.message).to.include("valid_until must be a Unix timestamp");
      }
    });

    it("should throw error for invalid username", async () => {
      try {
        await system.createAccessToken("", { name: "Test" });
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.message).to.include("Username must be a non-empty string");
      }
    });

    it("should throw error for missing name", async () => {
      try {
        await system.createAccessToken(testUsername, {} as any);
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.message).to.include("Token name must be a non-empty string");
      }
    });
  });

  describe("database.getAccessTokens", () => {
    let tokenId: number;

    before(async () => {
      const result = await createAccessTokenAndPropagate(system, testUsername, {
        name: "Token for listing test",
      });
      tokenId = Number(result.id);
    });

    it("should list all tokens", async () => {
      const tokens = await pollAccessTokensUntilStableMatch(
        system,
        testUsername,
        { id: tokenId, name: "Token for listing test" },
        propagationForResourceMs,
      );
      expect(tokens).to.be.an("array");
      expect(tokens.length).to.be.greaterThan(0);

      const foundToken = tokens.find(
        (t) =>
          accessTokenIdsEqual(t.id, tokenId) &&
          t.name === "Token for listing test",
      );
      expect(foundToken).to.exist;
      expect(foundToken!.name).to.equal("Token for listing test");
      expect(foundToken).to.not.have.property("token"); // Token value not returned
    });

    it("should return empty array for user with no tokens", async () => {
      const newUser = `newuser_${Date.now()}`;
      await system.createUser(newUser, "pass");
      await waitForUserPropagated(system, newUser);
      try {
        const tokens = await system.getAccessTokens(newUser);
        expect(tokens).to.be.an("array");
        expect(tokens.length).to.equal(0);
      } finally {
        await system.removeUser(newUser);
      }
    });
  });

  describe("database.deleteAccessToken", () => {
    it("should delete a token", async () => {
      const result = await createAccessTokenAndPropagate(system, testUsername, {
        name: "Token to delete",
      });
      const tokenId = Number(result.id);

      await system.deleteAccessToken(testUsername, tokenId);

      await waitUntilAccessTokenNotListed(
        system,
        testUsername,
        tokenId,
        propagationForResourceMs,
      );
    });

    it("should throw error for invalid token ID", async () => {
      try {
        await system.deleteAccessToken(testUsername, -1);
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.message).to.include(
          "Token ID must be a non-negative integer"
        );
      }
    });
  });

  describe("Authentication with access tokens", () => {
    let token: string;
    let tokenId: number;
    const rootUser = "root";

    before(async () => {
      const result = await createAccessTokenAndPropagate(system, rootUser, {
        name: "Auth test token",
        valid_until: Math.floor(Date.now() / 1000) + 1 * 24 * 60 * 60, // 1 day from now
      });
      token = result.token;
      tokenId = Number(result.id);
    });

    after(async () => {
      try {
        const admin = new Database(config);
        if (isClusterRuntime) await admin.acquireHostList();
        admin.useBasicAuth("root", "");
        await admin.deleteAccessToken(rootUser, tokenId);
        admin.close();
      } catch (err) {
        // Token might already be deleted, ignore
      }
    });

    it("should authenticate using useAccessToken", async () => {
      const client = new Database(config);
      if (isClusterRuntime) await client.acquireHostList();
      try {
        client.useAccessToken(token);
        const collections = await withUnauthorizedRetry(() =>
          client.collections(),
        );
        expect(collections).to.be.an("array");
      } finally {
        client.close();
      }
    });

    it("should authenticate using login with empty username", async () => {
      const client = new Database(config);
      if (isClusterRuntime) await client.acquireHostList();
      try {
        const jwt = await withUnauthorizedRetry(() => client.login("", token));
        expect(jwt).to.be.a("string");
        expect(jwt.length).to.be.greaterThan(0);
      } finally {
        client.close();
      }
    });

    it("should authenticate using login with explicit username", async () => {
      const client = new Database(config);
      if (isClusterRuntime) await client.acquireHostList();
      try {
        const jwt = await withUnauthorizedRetry(() =>
          client.login(rootUser, token),
        );
        expect(jwt).to.be.a("string");
        expect(jwt.length).to.be.greaterThan(0);
      } finally {
        client.close();
      }
    });

    it("should authenticate using useBasicAuth with empty username and token", async () => {
      const client = new Database(config);
      if (isClusterRuntime) await client.acquireHostList();
      try {
        client.useBasicAuth("", token);
        const collections = await withUnauthorizedRetry(() =>
          client.collections(),
        );
        expect(collections).to.be.an("array");
      } finally {
        client.close();
      }
    });

    it("should authenticate using useBasicAuth with explicit username and token", async () => {
      const client = new Database(config);
      if (isClusterRuntime) await client.acquireHostList();
      try {
        client.useBasicAuth(rootUser, token);
        const collections = await withUnauthorizedRetry(() =>
          client.collections(),
        );
        expect(collections).to.be.an("array");
      } finally {
        client.close();
      }
    });
  });
});
