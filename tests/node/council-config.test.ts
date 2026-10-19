import { describe, it } from "node:test";
import { strictEqual as assertStrictEqual, deepStrictEqual as assertDeepStrictEqual, ok as assertOk } from "node:assert";
import {
  parseCouncilConfig,
  type CouncilConfig,
} from "../../agents/council/shared/config";

const DEFAULTS: CouncilConfig = {
  pollIntervalMs: 60_000,
  maxClaims: 5,
  decisionDelayMs: 2_000,
  peerReadsPerPersona: 3,
  peerReadDelayMs: 1_000,
  peerReadCapUsdc: 0.1,
  llmThrottleMs: 8_000,
};

describe("parseCouncilConfig", () => {
  it("returns today's defaults when every variable is unset", () => {
    const result = parseCouncilConfig({});
    assertOk(result.ok);
    if (result.ok) {
      assertDeepStrictEqual(result.config, DEFAULTS);
    }
  });

 it("treats empty strings as unset", () => {
    const result = parseCouncilConfig({
      COUNCIL_POLL_INTERVAL_MS: "",
      COUNCIL_MAX_CLAIMS: "  ",
    });
    assertOk(result.ok);
    if (result.ok) {
      assertStrictEqual(result.config.pollIntervalMs, DEFAULTS.pollIntervalMs);
      assertStrictEqual(result.config.maxClaims, DEFAULTS.maxClaims);
    }
  });

  it("resolves valid overrides", () => {
    const result = parseCouncilConfig({
      COUNCIL_POLL_INTERVAL_MS: "15000",
      COUNCIL_MAX_CLAIMS: "10",
      COUNCIL_DECISION_DELAY_MS: "0",
      COUNCIL_PEER_READS_PER_PERSONA: "0",
      COUNCIL_PEER_READ_DELAY_MS: "500",
      COUNCIL_PEER_READ_CAP_USDC: "2.5",
      COUNCIL_LLM_THROTTLE_MS: "0",
    });
    assertOk(result.ok);
    if (result.ok) {
      assertDeepStrictEqual(result.config, {
        pollIntervalMs: 15_000,
        maxClaims: 10,
        decisionDelayMs: 0,
        peerReadsPerPersona: 0,
        peerReadDelayMs: 500,
        peerReadCapUsdc: 2.5,
        llmThrottleMs: 0,
      });
    }
  });

  it("reports a non-numeric value", () => {
    const result = parseCouncilConfig({ COUNCIL_MAX_CLAIMS: "abc" });
    assertOk(!result.ok);
    if (!result.ok) {
      assertStrictEqual(result.errors.length, 1);
      assertOk(/COUNCIL_MAX_CLAIMS/.test(result.errors[0]));
    }
  });

 it("reports NaN and Infinity as non-numeric", () => {
    const result = parseCouncilConfig({
      COUNCIL_POLL_INTERVAL_MS: "NaN",
      COUNCIL_DECISION_DELAY_MS: "Infinity",
    });
    assertOk(!result.ok);
    if (!result.ok) {
      assertStrictEqual(result.errors.length, 2);
      assertOk(/COUNCIL_POLL_INTERVAL_MS/.test(result.errors[0]));
      assertOk(/COUNCIL_DECISION_DELAY_MS/.test(result.errors[1]));
    }
  });

  it("reports a negative value", () => {
    const result = parseCouncilConfig({ COUNCIL_MAX_CLAIMS: "-1" });
    assertOk(!result.ok);
    if (!result.ok) {
      assertStrictEqual(result.errors.length, 1);
      assertOk(/COUNCIL_MAX_CLAIMS/.test(result.errors[0]));
    }
  });

  it("reports a non-integer where an integer is required", () => {
    const result = parseCouncilConfig({ COUNCIL_MAX_CLAIMS: "1.5" });
    assertOk(!result.ok);
    if (!result.ok) {
      assertStrictEqual(result.errors.length, 1);
      assertOk(/integer/.test(result.errors[0]));
      assertOk(/COUNCIL_MAX_CLAIMS/.test(result.errors[0]));
    }
  });

 it("allows a fractional USDC cap", () => {
    const result = parseCouncilConfig({ COUNCIL_PEER_READ_CAP_USDC: "0.25" });
    assertOk(result.ok);
    if (result.ok) {
      assertStrictEqual(result.config.peerReadCapUsdc, 0.25);
    }
  });

  it("reports a value above the max", () => {
    const result = parseCouncilConfig({ COUNCIL_MAX_CLAIMS: "10000" });
    assertOk(!result.ok);
    if (!result.ok) {
      assertStrictEqual(result.errors.length, 1);
      assertOk(/COUNCIL_MAX_CLAIMS/.test(result.errors[0]));
    }
  });

 it("reports multiple errors together", () => {
    const result = parseCouncilConfig({
      COUNCIL_POLL_INTERVAL_MS: "abc",
      COUNCIL_MAX_CLAIMS: "-1",
      COUNCIL_DECISION_DELAY_MS: "1.5",
      COUNCIL_PEER_READS_PER_PERSONA: "1000",
      COUNCIL_PEER_READ_DELAY_MS: "NaN",
      COUNCIL_PEER_READ_CAP_USDC: "-1",
      COUNCIL_LLM_THROTTLE_MS: "Infinity",
    });
    assertOk(!result.ok);
    if (!result.ok) {
      assertStrictEqual(result.errors.length, 7);
      const joined = result.errors.join("\n");
      for (const key of [
        "COUNCIL_POLL_INTERVAL_MS",
        "COUNCIL_MAX_CLAIMS",
        "COUNCIL_DECISION_DELAY_MS",
        "COUNCIL_PEER_READS_PER_PERSONA",
        "COUNCIL_PEER_READ_DELAY_MS",
        "COUNCIL_PEER_READ_CAP_USDC",
        "COUNCIL_LLM_THROTTLE_MS",
      ]) {
        assertOk(joined.includes(key), `expected error for ${key}`);
      }
    }
  });
});
