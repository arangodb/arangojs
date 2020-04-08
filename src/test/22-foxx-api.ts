import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
import { Database } from "../database";
import { ArangoError } from "../error";
import { sanitizeUrl } from "../lib/sanitizeUrl";

const ARANGO_URL = process.env.TEST_ARANGODB_URL || "http://localhost:8529";
const ARANGO_URL_SELF_REACHABLE = process.env.TEST_ARANGODB_URL_SELF_REACHABLE;
const ARANGO_VERSION = Number(
  process.env.ARANGO_VERSION || process.env.ARANGOJS_DEVEL_VERSION || 30400
);

const normalizedArangoUrl = sanitizeUrl(ARANGO_URL);
const localAppsPath = path.resolve(".", "fixtures");
const mount = "/foxx-crud-test";
const serviceServiceMount = "/foxx-crud-test-download";

function makeSelfReachable(returnedUrl: string) {
  if (ARANGO_URL_SELF_REACHABLE) {
    return returnedUrl.replace(normalizedArangoUrl, ARANGO_URL_SELF_REACHABLE);
  }
  if (normalizedArangoUrl.match(/^[a-z]+:\/\/unix:/)) {
    return returnedUrl.replace(normalizedArangoUrl + ":", "http://");
  }
  return returnedUrl;
}

describe("Foxx service", () => {
  let db: Database;
  let arangoPaths: any;
  before(async () => {
    db = new Database({ url: ARANGO_URL, arangoVersion: ARANGO_VERSION });
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
    db.close();
  });

  afterEach(async () => {
    try {
      await db.uninstallService(mount, { force: true });
    } catch (e) {}
  });

  const cases = [
    {
      name: "localJsFile",
      source: (arangoPaths: any) => arangoPaths.local.js,
    },
    {
      name: "localZipFile",
      source: (arangoPaths: any) => arangoPaths.local.zip,
    },
    {
      name: "localDir",
      source: (arangoPaths: any) => arangoPaths.local.dir,
    },
    {
      name: "jsBuffer",
      source: () =>
        fs.readFileSync(
          path.resolve(localAppsPath, "minimal-working-service.js")
        ),
    },
    {
      name: "zipBuffer",
      source: () =>
        fs.readFileSync(
          path.resolve(localAppsPath, "minimal-working-service.zip")
        ),
    },
    {
      name: "remoteJsFile",
      source: (arangoPaths: any) => makeSelfReachable(arangoPaths.remote.js),
    },
    {
      name: "remoteZipFile",
      source: (arangoPaths: any) => makeSelfReachable(arangoPaths.remote.zip),
    },
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
    const resp = await db.getServiceConfiguration(mount);
    expect(resp).to.eql({});
  });

  it("empty minimal configuration should be available", async () => {
    await db.installService(
      mount,
      fs.readFileSync(
        path.resolve(localAppsPath, "minimal-working-service.zip")
      )
    );
    const resp = await db.getServiceConfiguration(mount, true);
    expect(resp).to.eql({});
  });

  it("configuration should be available", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-configuration.zip"))
    );
    const resp = await db.getServiceConfiguration(mount);
    expect(resp).to.have.property("test1");
    expect(resp.test1).to.not.have.property("current");
    expect(resp).to.have.property("test2");
    expect(resp.test2).to.not.have.property("current");
  });

  it("minimal configuration should be available", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-configuration.zip"))
    );
    const resp = await db.getServiceConfiguration(mount, true);
    expect(resp).to.have.eql({});
  });

  it("configuration should be available after update", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-configuration.zip"))
    );
    const updateResp = await db.updateServiceConfiguration(mount, {
      test1: "test",
    });
    expect(updateResp).to.have.property("test1");
    expect(updateResp.test1).to.have.property("current", "test");
    expect(updateResp.test1).to.not.have.property("warning");
    expect(updateResp).to.have.property("test2");
    expect(updateResp.test2).to.not.have.property("current");
    expect(updateResp.test2).to.not.have.property("warning");
    const resp = await db.getServiceConfiguration(mount);
    expect(resp).to.have.property("test1");
    expect(resp.test1).to.have.property("current", "test");
    expect(resp).to.have.property("test2");
    expect(resp.test2).to.not.have.property("current");
  });

  it("minimal configuration should be available after update", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-configuration.zip"))
    );
    const updateResp = await db.updateServiceConfiguration(
      mount,
      {
        test1: "test",
      },
      true
    );
    expect(updateResp).to.have.property("values");
    expect(updateResp.values).to.have.property("test1", "test");
    expect(updateResp.values).to.not.have.property("test2");
    expect(updateResp).to.not.have.property("warnings");
    const resp = await db.getServiceConfiguration(mount, true);
    expect(resp).to.have.property("test1", "test");
    expect(resp).to.not.have.property("test2");
  });

  it("configuration should be available after replace", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-configuration.zip"))
    );
    const replaceResp = await db.replaceServiceConfiguration(mount, {
      test1: "test",
    });
    expect(replaceResp).to.have.property("test1");
    expect(replaceResp.test1).to.have.property("current", "test");
    expect(replaceResp.test1).to.not.have.property("warning");
    expect(replaceResp).to.have.property("test2");
    expect(replaceResp.test2).to.not.have.property("current");
    expect(replaceResp.test2).to.have.property("warning", "is required");
    const resp = await db.getServiceConfiguration(mount);
    expect(resp).to.have.property("test1");
    expect(resp.test1).to.have.property("current", "test");
    expect(resp).to.have.property("test2");
    expect(resp.test2).to.not.have.property("current");
  });

  it("minimal configuration should be available after replace", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-configuration.zip"))
    );
    const replaceResp = await db.replaceServiceConfiguration(
      mount,
      {
        test1: "test",
      },
      true
    );
    expect(replaceResp).to.have.property("values");
    expect(replaceResp.values).to.have.property("test1", "test");
    expect(replaceResp.values).to.not.have.property("test2");
    expect(replaceResp).to.have.property("warnings");
    expect(replaceResp.warnings).to.have.property("test2", "is required");
    const resp = await db.getServiceConfiguration(mount, true);
    expect(resp).to.have.property("test1", "test");
    expect(resp).to.not.have.property("test2");
  });

  it("configuration should be merged after update", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-configuration.zip"))
    );
    await db.replaceServiceConfiguration(mount, { test2: "test2" });
    await db.updateServiceConfiguration(mount, { test1: "test1" });
    const resp = await db.getServiceConfiguration(mount);
    expect(resp).to.have.property("test1");
    expect(resp.test1).to.have.property("current", "test1");
    expect(resp).to.have.property("test2");
    expect(resp.test2).to.have.property("current", "test2");
  });

  it("minimal configuration should be merged after update", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-configuration.zip"))
    );
    await db.replaceServiceConfiguration(mount, { test2: "test2" }, true);
    await db.updateServiceConfiguration(mount, { test1: "test1" }, true);
    const resp = await db.getServiceConfiguration(mount, true);
    expect(resp).to.have.property("test1", "test1");
    expect(resp).to.have.property("test2", "test2");
  });

  it("configuration should be overwritten after replace", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-configuration.zip"))
    );
    await db.updateServiceConfiguration(mount, { test2: "test2" });
    await db.replaceServiceConfiguration(mount, { test1: "test" });
    const resp = await db.getServiceConfiguration(mount);
    expect(resp).to.have.property("test1");
    expect(resp.test1).to.have.property("current", "test");
    expect(resp).to.have.property("test2");
    expect(resp.test2).to.not.have.property("current");
  });

  it("minimal configuration should be overwritten after replace", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-configuration.zip"))
    );
    await db.updateServiceConfiguration(mount, { test2: "test2" }, true);
    await db.replaceServiceConfiguration(mount, { test1: "test" }, true);
    const resp = await db.getServiceConfiguration(mount, true);
    expect(resp).to.have.property("test1", "test");
    expect(resp).to.not.have.property("test2");
  });

  it("empty dependencies should be available", async () => {
    await db.installService(
      mount,
      fs.readFileSync(
        path.resolve(localAppsPath, "minimal-working-service.zip")
      )
    );
    const resp = await db.getServiceDependencies(mount);
    expect(resp).to.eql({});
  });

  it("empty minimal dependencies should be available", async () => {
    await db.installService(
      mount,
      fs.readFileSync(
        path.resolve(localAppsPath, "minimal-working-service.zip")
      )
    );
    const resp = await db.getServiceDependencies(mount, true);
    expect(resp).to.eql({});
  });

  it("dependencies should be available", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-dependencies.zip"))
    );
    const resp = await db.getServiceDependencies(mount);
    expect(resp).to.have.property("test1");
    expect(resp.test1).to.not.have.property("current");
    expect(resp).to.have.property("test2");
    expect(resp.test2).to.not.have.property("current");
  });

  it("minimal dependencies should be available", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-dependencies.zip"))
    );
    const resp = await db.getServiceDependencies(mount, true);
    expect(resp).to.eql({});
  });

  it("dependencies should be available after updater", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-dependencies.zip"))
    );
    const updateResp = await db.updateServiceDependencies(mount, {
      test1: "/test",
    });
    expect(updateResp).to.have.property("test1");
    expect(updateResp.test1).to.have.property("current", "/test");
    expect(updateResp.test1).to.not.have.property("warning");
    expect(updateResp).to.have.property("test2");
    expect(updateResp.test2).to.not.have.property("current");
    expect(updateResp.test2).to.not.have.property("warning");
    const resp = await db.getServiceDependencies(mount);
    expect(resp).to.have.property("test1");
    expect(resp.test1).to.have.property("current", "/test");
    expect(resp).to.have.property("test2");
    expect(resp.test2).to.not.have.property("current");
  });

  it("minimal dependencies should be available after updater", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-dependencies.zip"))
    );
    const updateResp = await db.updateServiceDependencies(
      mount,
      {
        test1: "/test",
      },
      true
    );
    expect(updateResp).to.have.property("values");
    expect(updateResp.values).to.have.property("test1", "/test");
    expect(updateResp.values).to.not.have.property("test2");
    expect(updateResp).to.not.have.property("warnings");
    const resp = await db.getServiceDependencies(mount, true);
    expect(resp).to.have.property("test1", "/test");
    expect(resp).to.not.have.property("test2");
  });

  it("dependencies should be available after replace", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-dependencies.zip"))
    );
    const replaceResp = await db.replaceServiceDependencies(mount, {
      test1: "/test",
    });
    expect(replaceResp).to.have.property("test1");
    expect(replaceResp.test1).to.have.property("current", "/test");
    expect(replaceResp.test1).to.not.have.property("warning");
    expect(replaceResp).to.have.property("test2");
    expect(replaceResp.test2).to.not.have.property("current");
    expect(replaceResp.test2).to.have.property("warning", "is required");
    const resp = await db.getServiceDependencies(mount);
    expect(resp).to.have.property("test1");
    expect(resp.test1).to.have.property("current", "/test");
    expect(resp).to.have.property("test2");
    expect(resp.test2).to.not.have.property("current");
  });

  it("minimal dependencies should be available after replace", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-dependencies.zip"))
    );
    const replaceResp = await db.replaceServiceDependencies(
      mount,
      {
        test1: "/test",
      },
      true
    );
    expect(replaceResp).to.have.property("values");
    expect(replaceResp.values).to.have.property("test1", "/test");
    expect(replaceResp.values).to.not.have.property("test2");
    expect(replaceResp).to.have.property("warnings");
    expect(replaceResp.warnings).to.have.property("test2", "is required");
    const resp = await db.getServiceDependencies(mount, true);
    expect(resp).to.have.property("test1", "/test");
    expect(resp).to.not.have.property("test2");
  });

  it("dependencies should be merged after update", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-dependencies.zip"))
    );
    const replaceResp = await db.replaceServiceDependencies(mount, {
      test2: "/test2",
    });
    expect(replaceResp).to.have.property("test1");
    expect(replaceResp.test1).to.have.property("warning", "is required");
    expect(replaceResp).to.have.property("test2");
    expect(replaceResp.test2).to.have.property("current", "/test2");
    const updateResp = await db.updateServiceDependencies(mount, {
      test1: "/test1",
    });
    expect(updateResp).to.have.property("test1");
    expect(updateResp.test1).to.have.property("current", "/test1");
    expect(updateResp.test1).to.not.have.property("warning");
    expect(updateResp).to.have.property("test2");
    expect(updateResp.test2).to.have.property("current", "/test2");
    expect(updateResp.test2).to.not.have.property("warning");
    const resp = await db.getServiceDependencies(mount);
    expect(resp).to.have.property("test1");
    expect(resp.test1).to.have.property("current", "/test1");
    expect(resp).to.have.property("test2");
    expect(resp.test2).to.have.property("current", "/test2");
  });

  it("minimal dependencies should be merged after update", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-dependencies.zip"))
    );
    const replaceResp = await db.replaceServiceDependencies(
      mount,
      { test2: "/test2" },
      true
    );
    expect(replaceResp).to.have.property("values");
    expect(replaceResp.values).to.have.property("test2", "/test2");
    expect(replaceResp.values).to.not.have.property("test1");
    expect(replaceResp).to.have.property("warnings");
    expect(replaceResp.warnings).to.have.property("test1", "is required");
    const updateResp = await db.updateServiceDependencies(
      mount,
      {
        test1: "/test1",
      },
      true
    );
    expect(updateResp).to.have.property("values");
    expect(updateResp.values).to.have.property("test1", "/test1");
    expect(updateResp.values).to.have.property("test2", "/test2");
    const resp = await db.getServiceDependencies(mount, true);
    expect(resp).to.have.property("test1", "/test1");
    expect(resp).to.have.property("test2", "/test2");
  });

  it("dependencies should be overwritten after replace", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-dependencies.zip"))
    );
    const updateResp = await db.updateServiceDependencies(mount, {
      test2: "/test2",
    });
    expect(updateResp).to.have.property("test1");
    expect(updateResp.test1).to.not.have.property("current");
    expect(updateResp.test1).to.not.have.property("warning");
    expect(updateResp).to.have.property("test2");
    expect(updateResp.test2).to.have.property("current", "/test2");
    expect(updateResp.test2).to.not.have.property("warning");
    const replaceResp = await db.replaceServiceDependencies(mount, {
      test1: "/test1",
    });
    expect(replaceResp).to.have.property("test1");
    expect(replaceResp.test1).to.have.property("current", "/test1");
    expect(replaceResp.test1).to.not.have.property("warning");
    expect(replaceResp).to.have.property("test2");
    expect(replaceResp.test2).to.not.have.property("current");
    expect(replaceResp.test2).to.have.property("warning", "is required");
    const resp = await db.getServiceDependencies(mount);
    expect(resp).to.have.property("test1");
    expect(resp.test1).to.have.property("current", "/test1");
    expect(resp).to.have.property("test2");
    expect(resp.test2).to.not.have.property("current");
  });

  it("minimal dependencies should be overwritten after replace", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-dependencies.zip"))
    );
    const updateResp = await db.updateServiceDependencies(
      mount,
      {
        test2: "/test2",
      },
      true
    );
    expect(updateResp).to.have.property("values");
    expect(updateResp.values).to.not.have.property("test1");
    expect(updateResp.values).to.have.property("test2", "/test2");
    expect(updateResp).to.not.have.property("warnings");
    const replaceResp = await db.replaceServiceDependencies(
      mount,
      {
        test1: "/test1",
      },
      true
    );
    expect(replaceResp).to.have.property("values");
    expect(replaceResp.values).to.have.property("test1", "/test1");
    expect(replaceResp.values).to.not.have.property("test2");
    expect(replaceResp).to.have.property("warnings");
    expect(replaceResp.warnings).to.have.property("test2", "is required");
    const resp = await db.getServiceDependencies(mount, true);
    expect(resp).to.have.property("test1", "/test1");
    expect(resp).to.not.have.property("test2");
  });

  it("should be downloadable", async () => {
    await db.installService(
      mount,
      fs.readFileSync(
        path.resolve(localAppsPath, "minimal-working-service.zip")
      )
    );
    const resp = await db.downloadService(mount);
    expect(resp).to.be.instanceof(Buffer);
  });

  it("list should allow excluding system services", async () => {
    await db.installService(
      mount,
      fs.readFileSync(
        path.resolve(localAppsPath, "minimal-working-service.zip")
      )
    );
    const services = await db.listServices();
    expect(services).to.be.instanceOf(Array);
    expect(services.length).to.greaterThan(0);
  });

  it("should be contained in service list", async () => {
    await db.installService(
      mount,
      fs.readFileSync(
        path.resolve(localAppsPath, "minimal-working-service.zip")
      )
    );
    const services = await db.listServices();
    const service = services.find((service) => service.mount === mount)!;
    expect(service).to.have.property("name", "minimal-working-manifest");
    expect(service).to.have.property("version", "0.0.0");
    expect(service).to.have.property("provides");
    expect(service.provides).to.eql({});
    expect(service).to.have.property("development", false);
    expect(service).to.have.property("legacy", false);
  });

  it("informations should be returned", async () => {
    await db.installService(
      mount,
      fs.readFileSync(
        path.resolve(localAppsPath, "minimal-working-service.zip")
      )
    );
    const service = await db.getService(mount);
    expect(service).to.have.property("mount", mount);
    expect(service).to.have.property("name", "minimal-working-manifest");
    expect(service).to.have.property("version", "0.0.0");
    expect(service).to.have.property("development", false);
    expect(service).to.have.property("legacy", false);
    expect(service).to.have.property("manifest");
    expect(service.manifest).to.be.an("object");
    expect(service).to.have.property("options");
    expect(service.options).to.be.an("object");
    expect(service).to.have.property("checksum");
    expect(service.checksum).to.be.a("string");
  });

  it("list of scripts should be available", async () => {
    await db.installService(
      mount,
      fs.readFileSync(
        path.resolve(localAppsPath, "minimal-working-setup-teardown.zip")
      )
    );
    const scripts = await db.listServiceScripts(mount);
    expect(scripts).to.have.property("setup", "Setup");
    expect(scripts).to.have.property("teardown", "Teardown");
  });

  it("script should be available", async () => {
    await db.installService(
      mount,
      fs.readFileSync(
        path.resolve(localAppsPath, "minimal-working-setup-teardown.zip")
      )
    );
    const col = `${mount}_setup_teardown`.replace(/\//, "").replace(/-/g, "_");
    expect(await db.collection(col).get()).to.be.instanceOf(Object);
    await db.runServiceScript(mount, "teardown", {});
    try {
      await db.collection(col).get();
      expect.fail();
    } catch (e) {
      expect(e).to.be.instanceOf(ArangoError);
      expect(e.errorNum).to.equal(1203);
    }
  });

  it("non-existing script should not be available", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "echo-script.zip"))
    );
    try {
      await db.runServiceScript(mount, "no", {});
    } catch (e) {
      expect(e).to.be.instanceOf(ArangoError);
      expect(e.code).to.equal(400);
      expect(e.errorNum).to.equal(3016);
    }
  });

  it("should pass argv to script and return exports", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "echo-script.zip"))
    );
    const argv = { hello: "world" };
    const resp = await db.runServiceScript(mount, "echo", argv);
    expect(resp).to.eql([argv]);
  });

  it("should treat array script argv like any other script argv", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "echo-script.zip"))
    );
    const argv = ["yes", "please"];
    const resp = await db.runServiceScript(mount, "echo", argv);
    expect(resp).to.eql([argv]);
  });

  it("set devmode should enable devmode", async () => {
    await db.installService(
      mount,
      fs.readFileSync(
        path.resolve(localAppsPath, "minimal-working-service.zip")
      )
    );
    const resp = await db.getService(mount);
    expect(resp.development).to.equal(false);
    const devResp = await db.setServiceDevelopmentMode(mount, true);
    expect(devResp.development).to.equal(true);
    const respAfter = await db.getService(mount);
    expect(respAfter.development).to.equal(true);
  });

  it("clear devmode should disable devmode", async () => {
    await db.installService(
      mount,
      fs.readFileSync(
        path.resolve(localAppsPath, "minimal-working-service.zip")
      ),
      { development: true }
    );
    const resp = await db.getService(mount);
    expect(resp.development).to.equal(true);
    const devResp = await db.setServiceDevelopmentMode(mount, false);
    expect(devResp.development).to.equal(false);
    const respAfter = await db.getService(mount);
    expect(respAfter.development).to.equal(false);
  });

  it("tests should run", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-tests.zip"))
    );
    const resp = await db.runServiceTests(mount, {});
    expect(resp).to.have.property("stats");
    expect(resp).to.have.property("tests");
    expect(resp).to.have.property("pending");
    expect(resp).to.have.property("failures");
    expect(resp).to.have.property("passes");
  });

  it("should deliver the readme", async () => {
    await db.installService(
      mount,
      fs.readFileSync(path.resolve(localAppsPath, "with-readme.zip"))
    );
    const resp = await db.getServiceReadme(mount);
    expect(resp).to.equal("Please read this.");
  });

  it("should indicate a missing readme", async () => {
    await db.installService(
      mount,
      fs.readFileSync(
        path.resolve(localAppsPath, "minimal-working-service.zip")
      )
    );
    const resp = await db.getServiceReadme(mount);
    expect(resp).to.equal("");
  });

  it("should provide a swagger description", async () => {
    await db.installService(
      mount,
      fs.readFileSync(
        path.resolve(localAppsPath, "minimal-working-service.zip")
      )
    );
    const resp = await db.getServiceDocumentation(mount);
    expect(resp).to.have.property("swagger", "2.0");
    expect(resp).to.have.property("basePath", `/_db/${db.name}${mount}`);
    expect(resp).to.have.property("info");
    expect(resp.info).to.have.property("title", "minimal-working-manifest");
    expect(resp.info).to.have.property("description", "");
    expect(resp.info).to.have.property("version", "0.0.0");
    expect(resp.info).to.have.property("license");
    expect(resp).to.have.property("paths");
    expect(resp.paths).to.have.property("/");
    expect(resp.paths["/"]).to.have.property("get");
  });

  const routes: [string, Function][] = [
    ["getService", (mount: string) => db.getService(mount)],
    [
      "getServiceConfiguration",
      (mount: string) => db.getServiceConfiguration(mount),
    ],
    [
      "getServiceDependencies",
      (mount: string) => db.getServiceDependencies(mount),
    ],
    ["listServiceScripts", (mount: string) => db.listServiceScripts(mount)],
    ["upgradeService", (mount: string) => db.upgradeService(mount, {} as any)],
    [
      "updateServiceConfiguration",
      (mount: string) => db.updateServiceConfiguration(mount, {}),
    ],
    [
      "updateServiceDependencies",
      (mount: string) => db.updateServiceDependencies(mount, {}),
    ],
    ["replaceService", (mount: string) => db.replaceService(mount, {} as any)],
    [
      "replaceServiceConfiguration",
      (mount: string) => db.replaceServiceConfiguration(mount, {}),
    ],
    [
      "replaceServiceDependencies",
      (mount: string) => db.replaceServiceDependencies(mount, {}),
    ],
    [
      "runServiceScript",
      (mount: string) => db.runServiceScript(mount, "xxx", {}),
    ],
    ["runServiceTests", (mount: string) => db.runServiceTests(mount, {})],
    ["uninstallService", (mount: string) => db.uninstallService(mount)],
    ["downloadService", (mount: string) => db.downloadService(mount)],
    [
      "enableServiceDevelopmentMode",
      (mount: string) => db.setServiceDevelopmentMode(mount, true),
    ],
    [
      "disableServiceDevelopmentMode",
      (mount: string) => db.setServiceDevelopmentMode(mount, false),
    ],
    [
      "getServiceDocumentation",
      (mount: string) => db.getServiceDocumentation(mount),
    ],
    ["getServiceReadme", (mount: string) => db.getServiceReadme(mount)],
  ];

  for (const [desc, method] of routes) {
    it(`should return 400 when mount is omitted for ${desc}`, async () => {
      try {
        await method();
        expect.fail();
      } catch (e) {
        expect(e).to.be.instanceOf(ArangoError);
        expect(e.code).to.equal(400);
      }
    });

    it(`should return 400 when mount is invalid for ${desc}`, async () => {
      try {
        await method(`/dev/null`);
        expect.fail();
      } catch (e) {
        expect(e).to.be.instanceOf(ArangoError);
        expect(e.code).to.equal(400);
      }
    });
  }
});
