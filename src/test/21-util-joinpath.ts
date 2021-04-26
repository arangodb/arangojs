import { expect } from "chai";
import { joinPath } from "../lib/joinPath";

describe("Join Path", () => {
  it("joinPath 1", () => {
    const baseUrl = "../../u1/u2";
    const path = "/security/authenticate";
    expect(joinPath(baseUrl, path)).to.equal(
      "../../u1/u2/security/authenticate"
    );
  });
  it("joinPath 2", () => {
    const baseUrl = "/u1/u2";
    const path = "../security/authenticate";
    expect(joinPath(baseUrl, path)).to.equal("/u1/security/authenticate");
  });
  it("joinPath 3", () => {
    const baseUrl = "/u1/u2";
    const path = "../../security/authenticate";
    expect(joinPath(baseUrl, path)).to.equal("/security/authenticate");
  });
});
