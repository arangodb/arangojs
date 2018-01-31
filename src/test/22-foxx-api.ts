import * as fs from "fs";
import * as path from "path";

import { Database } from "../arangojs";
import { expect } from "chai";

const ARANGO_VERSION = Number(process.env.ARANGO_VERSION || 30000);
const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";

const localAppsPath = path.resolve(".", "fixtures");
const mount = "/foxx-crud-test";
const serviceServiceMount = "/foxx-crud-test-download";

describe.only("Foxx service", () => {
  const db = new Database({
    url: ARANGO_URL,
    arangoVersion: ARANGO_VERSION
  });

  let arangoPaths: any;
  before(async () => {
    await db.installService(
      serviceServiceMount,
      fs.readFileSync(path.resolve("fixtures", "service-service-service.zip"))
    );
    arangoPaths = (await db.route(serviceServiceMount).get()).body;
  });

  after(async () => {
    try {
      await db.uninstallService(serviceServiceMount, { force: true });
    } catch (e) {}
  });

  afterEach(async () => {
    try {
      await db.uninstallService(mount, { force: true });
    } catch (e) {}
  });

  const cases = [
    {
      name: "localJsFile",
      source: (arangoPaths: any) => arangoPaths.local.js
    },
    {
      name: "localZipFile",
      source: (arangoPaths: any) => arangoPaths.local.zip
    },
    {
      name: "localDir",
      source: (arangoPaths: any) => arangoPaths.local.dir
    },
    {
      name: "jsBuffer",
      source: () =>
        fs.readFileSync(
          path.resolve(localAppsPath, "minimal-working-service.js")
        )
    },
    {
      name: "zipBuffer",
      source: () =>
        fs.readFileSync(
          path.resolve(localAppsPath, "minimal-working-service.zip")
        )
    },
    {
      name: "remoteJsFile",
      source: (arangoPaths: any) => arangoPaths.remote.js
    },
    {
      name: "remoteZipFile",
      source: (arangoPaths: any) => arangoPaths.remote.zip
    }
  ];

  for (const c of cases) {
    it(`installed via ${c.name} should be available`, async () => {
      await db.installService(mount, c.source(arangoPaths));
      const resp = await db.route(mount).get();
      expect(resp.body).to.eql({ hello: "world" });
    });

    it(`replace via ${c.name} should be available`, async () => {
      await db.installService(
        mount,
        fs.readFileSync(path.resolve(localAppsPath, "itzpapalotl.zip"))
      );
      await db.replaceService(mount, c.source(arangoPaths));
      const resp = await db.route(mount).get();
      expect(resp.body).to.eql({ hello: "world" });
    });

    it(`upgrade via ${c.name} should be available`, async () => {
      await db.installService(
        mount,
        fs.readFileSync(path.resolve(localAppsPath, "itzpapalotl.zip"))
      );
      await db.upgradeService(mount, c.source(arangoPaths));
      const resp = await db.route(mount).get();
      expect(resp.body).to.eql({ hello: "world" });
    });
  }

  it("uninstalled should not be available", async () => {
    await db.installService(
      mount,
      fs.readFileSync(
        path.resolve(localAppsPath, "minimal-working-service.zip")
      )
    );
    await db.uninstallService(mount);
    try {
      await db.route(mount).get();
      expect.fail();
    } catch (e) {}
  });

  it("empty configuration should be available", async () => {
    await db.installService(
      mount,
      fs.readFileSync(
        path.resolve(localAppsPath, "minimal-working-service.zip")
      )
    );
  });
});
