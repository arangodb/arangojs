import InstanceManager from "arangodb-instance-manager/lib/InstanceManager";
import { expect } from "chai";
import { resolve } from "path";
import { Connection } from "../connection";
import { Database } from "../database";

let ARANGO_PATH = "";
let ARANGO_RUNNER: "local" | "docker";
if (process.env.RESILIENCE_ARANGO_BASEPATH) {
  ARANGO_PATH = resolve(
    __dirname,
    "..",
    "..",
    process.env.RESILIENCE_ARANGO_BASEPATH
  );
  ARANGO_RUNNER = "local";
} else if (process.env.RESILIENCE_DOCKER_IMAGE) {
  ARANGO_PATH = process.env.RESILIENCE_DOCKER_IMAGE;
  ARANGO_RUNNER = "docker";
}
const describeIm = ARANGO_PATH ? describe.only : describe.skip;

describeIm("Cluster round robin", function () {
  this.timeout(Infinity);
  const NUM_COORDINATORS = 3;
  let im: InstanceManager;
  let db: Database;
  let conn: Connection;
  beforeEach(async () => {
    im = new InstanceManager(ARANGO_PATH, ARANGO_RUNNER);
    const endpoint = await im.startCluster(1, NUM_COORDINATORS, 2);
    db = new Database({
      url: endpoint,
      loadBalancingStrategy: "ROUND_ROBIN",
    });
    conn = (db as any)._connection;
    await db.acquireHostList();
  });
  afterEach(async () => {
    await im.cleanup();
  });
  async function getServerId(): Promise<string | undefined> {
    const res = await db.route("_admin/status").get();
    return res.parsedBody.serverInfo && res.parsedBody.serverInfo.serverId;
  }
  it("cycles servers", async () => {
    expect((conn as any)._hostUrls).to.have.lengthOf(NUM_COORDINATORS);
    const serverIds = new Set<string>();
    for (let i = 0; i < NUM_COORDINATORS; i++) {
      const serverId = await getServerId();
      expect(serverId).not.to.be.empty;
      expect(serverIds).not.to.include(serverId!);
      serverIds.add(serverId!);
    }

    expect(serverIds.size).to.equal(NUM_COORDINATORS);
    for (const serverId of serverIds) {
      const secondId = await getServerId();
      expect(secondId).to.equal(serverId);
    }
  });
  it("skips downed servers", async () => {
    expect((conn as any)._hostUrls).to.have.lengthOf(NUM_COORDINATORS);
    const firstRun = new Set<string>();
    for (let i = 0; i < NUM_COORDINATORS; i++) {
      const serverId = await getServerId();
      expect(serverId).not.to.be.empty;
      firstRun.add(serverId!);
    }

    const instance = im.coordinators()[0];
    expect(instance.status).to.equal("RUNNING");
    await im.shutdown(instance);
    expect(instance.status).not.to.equal("RUNNING");

    const secondRun = new Set<string>();
    for (let i = 0; i < NUM_COORDINATORS; i++) {
      const serverId = await getServerId();
      expect(serverId).not.to.be.empty;
      secondRun.add(serverId!);
    }
    expect(firstRun.size - secondRun.size).to.equal(1);
  });
  it("it picks up restarted servers", async () => {
    expect((conn as any)._hostUrls).to.have.lengthOf(NUM_COORDINATORS);
    const firstRun = new Set<string>();
    for (let i = 0; i < NUM_COORDINATORS; i++) {
      const serverId = await getServerId();
      expect(serverId).not.to.be.empty;
      firstRun.add(serverId!);
    }

    const instance = im.coordinators()[0];
    expect(instance.status).to.equal("RUNNING");
    await im.shutdown(instance);
    expect(instance.status).not.to.equal("RUNNING");
    for (let i = 0; i < NUM_COORDINATORS; i++) {
      await getServerId();
    }
    await im.restart(instance);
    expect(instance.status).to.equal("RUNNING");

    const secondRun = new Set<string>();
    for (let i = 0; i < NUM_COORDINATORS; i++) {
      const serverId = await getServerId();
      expect(serverId).not.to.be.empty;
      secondRun.add(serverId!);
    }
    expect(firstRun.size).to.equal(secondRun.size);
  });
  it("treats cursors as sticky", async () => {
    expect((conn as any)._hostUrls).to.have.lengthOf(NUM_COORDINATORS);
    const LENGTH = 2;
    const cursor = await db.query(
      `FOR i IN 1..${LENGTH} RETURN i`,
      {},
      { batchSize: 1 }
    );
    const result = [];
    while (cursor.hasNext) {
      result.push(await cursor.next());
    }
    expect(result).to.have.lengthOf(LENGTH);
  });
});
