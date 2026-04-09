import { expect } from "chai";
import { Database } from "../databases.js";

describe("QueryOptions normalization (maxPlans vs maxNumberOfPlans)", () => {
  it("sends options.maxNumberOfPlans when only legacy maxPlans is provided", (done) => {
    const db = new Database();
    (db as any)._connection._hosts = [
      {
        fetch: async ({ body }: any) => {
          try {
            expect(typeof body).to.equal("string");
            const parsed = JSON.parse(body);
            expect(parsed).to.have.property("options");
            expect(parsed.options).to.not.have.property("maxPlans");
            expect(parsed.options).to.have.property("maxNumberOfPlans", 2);
            done();
            return new Response(JSON.stringify({ result: [] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          } catch (err) {
            done(err as any);
            throw err;
          }
        },
        close: () => {},
      },
    ];
    db.query("RETURN 1", {}, { maxPlans: 2 }).catch(() => {
      // ignore driver errors; the assertions above complete the test
    });
  });

  it("sends options.maxNumberOfPlans when only maxNumberOfPlans is provided", (done) => {
    const db = new Database();
    (db as any)._connection._hosts = [
      {
        fetch: async ({ body }: any) => {
          try {
            const parsed = JSON.parse(body);
            expect(parsed.options).to.have.property("maxNumberOfPlans", 5);
            expect(parsed.options).to.not.have.property("maxPlans");
            done();
            return new Response(JSON.stringify({ result: [] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          } catch (err) {
            done(err as any);
            throw err;
          }
        },
        close: () => {},
      },
    ];
    db.query("RETURN 1", {}, { maxNumberOfPlans: 5 }).catch(() => {});
  });

  it("prefers maxNumberOfPlans over legacy maxPlans when both are provided", (done) => {
    const db = new Database();
    (db as any)._connection._hosts = [
      {
        fetch: async ({ body }: any) => {
          try {
            const parsed = JSON.parse(body);
            expect(parsed.options).to.have.property("maxNumberOfPlans", 7);
            expect(parsed.options).to.not.have.property("maxPlans");
            done();
            return new Response(JSON.stringify({ result: [] }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          } catch (err) {
            done(err as any);
            throw err;
          }
        },
        close: () => {},
      },
    ];
    db.query("RETURN 1", {}, { maxPlans: 3, maxNumberOfPlans: 7 }).catch(() => {});
  });
});
