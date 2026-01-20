import { expect } from "chai";
import { Database } from "../databases.js";
import { config } from "./_config.js";

// Access tokens require ArangoDB 3.12+
const describe312 = config.arangoVersion! >= 31200 ? describe : describe.skip;

describe312("Access Tokens", function () {
  let system: Database;
  const testUsername = `testuser_${Date.now()}`;
  const testPassword = "testpass123";

  before(async () => {
    system = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE") {
      await system.acquireHostList();
    }
    // Create test user
    await system.createUser(testUsername, testPassword);
  });

  after(async () => {
    const cleanupSystem  = new Database(config);
    try {
      await cleanupSystem .removeUser(testUsername);
    } catch (err) {
      // User might already be deleted, ignore
    } finally {
      try {
        cleanupSystem .close();
        system.close();
      } catch (err) {
        // Connection may already be closed, ignore
      }
    }
  });

  describe("database.createAccessToken", () => {
    it("should create a token with name only", async () => {
      const result = await system.createAccessToken(testUsername, {
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

      const result = await system.createAccessToken(testUsername, {
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
      const result = await system.createAccessToken(testUsername, {
        name: "Token for listing test",
      });
      tokenId = result.id;
    });

    it("should list all tokens", async () => {
      const tokens = await system.getAccessTokens(testUsername);
      expect(tokens).to.be.an("array");
      expect(tokens.length).to.be.greaterThan(0);

      const foundToken = tokens.find((t) => t.id === tokenId);
      expect(foundToken).to.exist;
      expect(foundToken!.name).to.equal("Token for listing test");
      expect(foundToken).to.not.have.property("token"); // Token value not returned
    });

    it("should return empty array for user with no tokens", async () => {
      const newUser = `newuser_${Date.now()}`;
      await system.createUser(newUser, "pass");
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
      const result = await system.createAccessToken(testUsername, {
        name: "Token to delete",
      });
      const tokenId = result.id;

      await system.deleteAccessToken(testUsername, tokenId);

      // Verify token is deleted
      const tokens = await system.getAccessTokens(testUsername);
      const foundToken = tokens.find((t) => t.id === tokenId);
      expect(foundToken).to.not.exist;
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
      const result = await system.createAccessToken(rootUser, {
        name: "Auth test token",
        valid_until: Math.floor(Date.now() / 1000) + 1 * 24 * 60 * 60, // 1 day from now
      });
      token = result.token;
      tokenId = result.id;
    });

    after(async () => {
      try {
        await system.deleteAccessToken(rootUser, tokenId);
      } catch (err) {
        // Token might already be deleted, ignore
      }
    });

    it("should authenticate using useAccessToken", async () => {
      // Use access token directly for Basic Auth
      system.useAccessToken(token);

      // Verify authentication works by making a request
      const collections = await system.collections();

      expect(collections).to.be.an("array");
    });

    it("should authenticate using login with empty username", async () => {

      // Login with empty username - token contains embedded username
      const jwt = await system.login("", token);

      expect(jwt).to.be.a("string");
      expect(jwt.length).to.be.greaterThan(0);
    });

    it("should authenticate using login with explicit username", async () => {

      // Login with explicit username - must match token's embedded user
      const jwt = await system.login(rootUser, token);

      expect(jwt).to.be.a("string");
      expect(jwt.length).to.be.greaterThan(0);
    });

    it("should authenticate using useBasicAuth with empty username and token", async () => {

      // Use Basic Auth with empty username and token as password
      system.useBasicAuth("", token);

      // Verify authentication works by making a request
      const collections = await system.collections();

      expect(collections).to.be.an("array");
    });

    it("should authenticate using useBasicAuth with explicit username and token", async () => {
      // Use Basic Auth with explicit username and token as password
      system.useBasicAuth(rootUser, token);

      // Verify authentication works by making a request
      const collections = await system.collections();

      expect(collections).to.be.an("array");
    });
  });
});
