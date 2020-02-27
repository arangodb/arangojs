import Instance from "arangodb-instance-manager/lib/Instance";
import InstanceManager from "arangodb-instance-manager/lib/InstanceManager";
import { expect } from "chai";
import { Database } from "../arangojs";
import { DocumentCollection } from "../collection";
import { Connection } from "../connection";

const sleep = (timeout: number) =>
  new Promise(resolve => setTimeout(resolve, timeout));

let ARANGO_PATH: string;
let ARANGO_RUNNER: "local" | "docker";
if (process.env.RESILIENCE_ARANGO_BASEPATH) {
  ARANGO_PATH = process.env.RESILIENCE_ARANGO_BASEPATH;
  ARANGO_RUNNER = "local";
} else if (process.env.RESILIENCE_DOCKER_IMAGE) {
  ARANGO_PATH = process.env.RESILIENCE_DOCKER_IMAGE;
  ARANGO_RUNNER = "docker";
}
const describeIm = ARANGO_PATH! ? describe.only : describe.skip;

describeIm("Single-server active failover", function() {
  this.timeout(Infinity);
  let im: InstanceManager;
  let uuid: string;
  let leader: Instance;
  let db: Database;
  let conn: Connection;
  beforeEach(async () => {
    im = new InstanceManager(ARANGO_PATH, ARANGO_RUNNER, "rocksdb");
    await im.startAgency();
    console.log("agency started");
    await im.startSingleServer("arangojs", 2);
    console.log("single server started");
    await im.waitForAllInstances();
    console.log("done waiting for all instances");
    uuid = await im.asyncReplicationLeaderSelected();
    console.log("replication leader selected", uuid);
    leader = (await im.resolveUUID(uuid))!;
    console.log("leader resolved", leader.name);
    db = new Database({ url: leader.endpoint });
    conn = (db as any)._connection;
    await db.acquireHostList();
  });
  afterEach(async function() {
    im.moveServerLogs(this.currentTest);
    const logs = await im.cleanup(this.currentTest!.isFailed());
    if (logs) console.error(`IM Logs:\n${logs}`);
  });
  async function getServerId(): Promise<string | undefined> {
    const res = await db.route("_api/replication/server-id").get();
    return res.body.serverId;
  }
  async function responseHeaders() {
    const res = await db.route("_api/version").get();
    return res.headers;
  }
  it("failover to follower if leader is down", async () => {
    expect((conn as any)._urls).to.have.lengthOf(2);
    (conn as any)._activeHost = 0;
    const leaderId = await getServerId();
    expect(leaderId).not.to.be.empty;
    const headers = await responseHeaders();
    expect(headers).not.to.include.keys("x-arango-endpoint");

    await im.kill(leader);
    await im.asyncReplicationLeaderSelected(uuid as any);
    await sleep(3000);
    await db.version(); // cycle

    const newLeaderId = await getServerId();
    expect(newLeaderId).not.to.be.empty;
    expect(newLeaderId).not.to.equal(leaderId);
    const newHeaders = await responseHeaders();
    expect(newHeaders).not.to.include.keys("x-arango-endpoint");
  });
  it("redirect to leader if server is not leader", async () => {
    expect((conn as any)._urls).to.have.lengthOf(2);
    (conn as any)._activeHost = 1;
    const followerId = await getServerId();
    expect(followerId).not.to.be.empty;
    const headers = await responseHeaders();
    expect(headers).to.include.keys("x-arango-endpoint");

    await im.kill(leader);
    await im.asyncReplicationLeaderSelected(uuid as any);
    await sleep(3000);

    const newLeaderId = await getServerId();
    expect(newLeaderId).not.to.be.empty;
    expect(newLeaderId).to.equal(followerId);
    const newHeaders = await responseHeaders();
    expect(newHeaders).not.to.include.keys("x-arango-endpoint");
  });
});

describeIm("Single-server with follower", function() {
  this.timeout(Infinity);
  let im: InstanceManager;
  let leader: Instance;
  let db: Database;
  let conn: Connection;
  let collection: DocumentCollection;
  beforeEach(async () => {
    im = new InstanceManager(ARANGO_PATH, ARANGO_RUNNER);
    await im.startAgency();
    console.log("agency started");
    await im.startSingleServer("arangojs", 2);
    console.log("single server started");
    await im.waitForAllInstances();
    console.log("done waiting for all instances");
    leader = await im.asyncReplicationLeaderInstance();
    console.log("leader selected & resolved", leader.name);
    db = new Database({ url: leader.endpoint });
    conn = (db as any)._connection;
    await db.acquireHostList();
    collection = db.collection("test");
    await collection.create();
    await collection.save({ _key: "abc" });
    await sleep(3000);
  });
  afterEach(async () => {
    await collection.drop();
    await sleep(3000);
    await im.cleanup();
  });
  async function getResponse(dirty?: boolean) {
    return await conn.request({
      method: "GET",
      path: "/_api/document/test/abc",
      allowDirtyRead: dirty
    });
  }
  it("supports dirty reads", async () => {
    expect((conn as any)._urls).to.have.lengthOf(2);
    const res1 = await getResponse(true);
    expect(res1.arangojsHostId).to.be.a("number");
    const headers1 = res1.request.getHeaders();
    expect(headers1).to.include.keys("x-arango-allow-dirty-read");
    const res2 = await getResponse(true);
    expect(res2.arangojsHostId).to.be.a("number");
    expect(res2.arangojsHostId).not.to.equal(res1.arangojsHostId);
    const headers2 = res2.request.getHeaders();
    expect(headers2).to.include.keys("x-arango-allow-dirty-read");
  });
  it("supports non-dirty reads", async () => {
    expect((conn as any)._urls).to.have.lengthOf(2);
    const res1 = await getResponse();
    expect(res1.arangojsHostId).to.be.a("number");
    const headers1 = res1.request.getHeaders();
    expect(headers1).not.to.include.keys("x-arango-allow-dirty-read");
    const res2 = await getResponse();
    expect(res2.arangojsHostId).to.be.a("number");
    expect(res2.arangojsHostId).to.equal(res1.arangojsHostId);
    const headers2 = res2.request.getHeaders();
    expect(headers2).not.to.include.keys("x-arango-allow-dirty-read");
  });
  it("supports dirty read over multiple cursor batches", async () => {
    const cursor = await db.query(
      "FOR i IN 1..2 RETURN i",
      {},
      {
        allowDirtyRead: true,
        batchSize: 1
      }
    );
    expect(cursor.hasNext()).to.equal(true);
    expect(await cursor.next()).to.equal(1);
    expect(cursor.hasNext()).to.equal(true);
    expect(await cursor.next()).to.equal(2);
  });
});

describeIm("Cluster round robin", function() {
  this.timeout(Infinity);
  const NUM_COORDINATORS = 3;
  let im: InstanceManager;
  let db: Database;
  let conn: Connection;
  beforeEach(async () => {
    im = new InstanceManager(ARANGO_PATH, ARANGO_RUNNER);
    const endpoint = await im.startCluster(1, NUM_COORDINATORS, 2);
    console.log("cluster started");
    db = new Database({
      url: endpoint,
      loadBalancingStrategy: "ROUND_ROBIN"
    });
    conn = (db as any)._connection;
    await db.acquireHostList();
  });
  afterEach(async () => {
    await im.cleanup();
  });
  async function getServerId(): Promise<string | undefined> {
    const res = await db.route("_admin/status").get();
    return res.body.serverInfo && res.body.serverInfo.serverId;
  }
  it("cycles servers", async () => {
    expect((conn as any)._urls).to.have.lengthOf(NUM_COORDINATORS);
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
    expect((conn as any)._urls).to.have.lengthOf(NUM_COORDINATORS);
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
    expect((conn as any)._urls).to.have.lengthOf(NUM_COORDINATORS);
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
    expect((conn as any)._urls).to.have.lengthOf(NUM_COORDINATORS);
    const LENGTH = 2;
    const cursor = await db.query(
      `FOR i IN 1..${LENGTH} RETURN i`,
      {},
      { batchSize: 1 }
    );
    const result = [];
    while (cursor.hasNext()) {
      result.push(await cursor.next());
    }
    expect(result).to.have.lengthOf(LENGTH);
  });
});
