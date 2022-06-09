import { expect } from "chai";
import { Database } from "../database";
import { ArangoError } from "../error";
import { config } from "./_config";

describe("Manipulating databases", function () {
  let system: Database;
  beforeEach(async () => {
    system = new Database(config);
    if (Array.isArray(config.url) && config.loadBalancingStrategy !== "NONE")
      await system.acquireHostList();
  });
  afterEach(async () => {
    system.close();
  });

  describe("database.createDatabase", () => {
    const name = `testdb_${Date.now()}`;
    let db: Database;
    afterEach(async () => {
      await system.dropDatabase(name);
    });
    it("creates a database with the given name", async () => {
      db = await system.createDatabase(name);
      const info = await db.get();
      expect(info.name).to.equal(name);
    });
    it("adds the given users to the database");
  });
  describe("database.get", () => {
    const name = `testdb_${Date.now()}`;
    let db: Database;
    before(async () => {
      db = await system.createDatabase(name);
    });
    after(async () => {
      await system.dropDatabase(name);
    });
    it("fetches the database description if the database exists", async () => {
      const info = await db.get();
      expect(info.name).to.equal(db.name);
      expect(db.name).to.equal(name);
    });
    it("fails if the database does not exist", async () => {
      db = system.database("__does_not_exist__");
      try {
        await db.get();
      } catch (e: any) {
        expect(e).to.be.an.instanceof(ArangoError);
        return;
      }
      expect.fail("should not succeed");
    });
  });
  describe("database.listDatabases", () => {
    const name = `testdb_${Date.now()}`;
    before(async () => {
      await system.createDatabase(name);
    });
    after(async () => {
      await system.dropDatabase(name);
    });
    it("returns a list of all databases", async () => {
      const databases = await system.listDatabases();
      expect(databases).to.be.an.instanceof(Array);
      expect(databases.indexOf(name)).to.be.greaterThan(-1);
    });
  });
  describe("database.listUserDatabases", () => {
    it("returns a list of databases accessible to the active user");
  });
  describe("database.dropDatabase", () => {
    const name = `testdb_${Date.now()}`;
    let db: Database;
    before(async () => {
      db = await system.createDatabase(name);
    });
    after(async () => {
      try {
        await system.dropDatabase(name);
      } catch {}
    });
    it("deletes the given database from the server", async () => {
      await system.dropDatabase(name);
      try {
        await db.get();
      } catch (e: any) {
        return;
      } finally {
        system.close();
      }
      expect.fail("should not succeed");
    });
  });

  describe('database.getUserAccessLevel', () => {
    const database = `testdb_foo_get_${Date.now()}`
    const username = `foo`
    before(async () => {
        await system.createDatabase(database, { users: [{ username }] })
    })
    after(async () => {
      try {
        await system.dropDatabase(database);
        await system.removeUser(username);
      } catch {}
    })
    it('read the access levels for a database', async () => {
        const accessLevel = await system.getUserAccessLevel(username, { database })
        expect(accessLevel).to.equal('rw')
    })
  })

  describe('database.setUserAccessLevel', () => {
    const database = `testdb_foo_set_${Date.now()}`
    const username = `foo_${Date.now()}`
    before(async () => {
      await system.createDatabase(database, { users: [{ username }] })
    })
    after(async () => {
      try {
        await system.dropDatabase(database);
        await system.removeUser(username);
      } catch {}
    })
    it('set the access levels for a database', async () => {
        const userAccessLevel = await system.setUserAccessLevel(username, { database, grant: 'ro' })
        expect(userAccessLevel[database]).to.equal('ro')
    })
  })

  describe('database.clearUserAccessLevel', () => {
    const database = `testdb_foo_clear_${Date.now()}`
    const username = `foo_${Date.now()}`
    before(async () => {
      await system.createDatabase(database, { users: [{ username }] })
    })
    after(async () => {
      try {
        await system.dropDatabase(database);
        await system.removeUser(username);
      } catch {}
    })
    it('clear the access levels for a database', async () => {
        const response = await system.clearUserAccessLevel(username, { database })
        expect(response).to.eql({ error: false, code: 202 })
    })
  })

  describe('database.getUserDatabases', () => {
    const database = `testdb_foo_get_me_${Date.now()}`
    const username = `foo_me_${Date.now()}`
    before(async () => {
      await system.createDatabase(database, { users: [{ username }] })
    })
    after(async () => {
      try {
        await system.dropDatabase(database);
        await system.removeUser(username);
      } catch {}
    })
    it('get users databases', async () => {
        const usersDatabases = await system.getUserDatabases(username)
        expect(usersDatabases).to.eql({[database]: 'rw'})
    })
  })

});
