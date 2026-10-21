import { expect, test } from "@playwright/test";

test.describe("payment API (Stripe not configured in tests)", () => {
  test("checkout reports payments are not configured", async ({ request }) => {
    const res = await request.post("/api/checkout", { data: {} });
    expect(res.status()).toBe(503);
    expect((await res.json()).error).toBe("payments_not_configured");
    expect(res.headers()["cache-control"]).toContain("no-store");
  });

  test("checkout rejects cross-site requests", async ({ request }) => {
    const res = await request.post("/api/checkout", { data: {}, headers: { Origin: "https://evil.example" } });
    expect(res.status()).toBe(403);
  });

  test("verify rejects malformed session ids", async ({ request }) => {
    for (const id of ["", "abc", "cs_live_", "cs_test_<script>", "pi_123456789012345"]) {
      const res = await request.get(`/api/verify?session_id=${encodeURIComponent(id)}`);
      expect(res.status(), id).toBe(400);
    }
  });

  test("verify with a well-formed id still requires payments to be configured", async ({ request }) => {
    const res = await request.get("/api/verify?session_id=cs_test_a1b2c3d4e5f6g7h8");
    expect(res.status()).toBe(503);
  });
});
