import { PRODUCT_CODE } from "@/lib/pack/limits";
import { isSigningConfigured, signLicense } from "@/lib/server/license";
import { isRateLimited } from "@/lib/server/rate-limit";
import { CHECKOUT_SESSION_ID, getStripe } from "@/lib/server/stripe";

const noStore = { "Cache-Control": "no-store" };

/**
 * Confirms a Checkout Session was paid and returns a signed unlock token.
 * The session id acts as the customer's unlock link, so it can be reused to
 * restore the unlock on another device.
 */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  // The builder checks every few seconds while checkout is open in another tab; this stops anything heavier.
  if (isRateLimited("verify", request, 240, 10 * 60_000)) {
    return Response.json({ error: "rate_limited", message: "Too many checks. Please wait a minute." }, { status: 429, headers: noStore });
  }
  if (!CHECKOUT_SESSION_ID.test(sessionId)) {
    return Response.json({ error: "invalid_session", message: "That unlock link isn’t valid." }, { status: 400, headers: noStore });
  }
  const stripe = getStripe();
  if (!stripe || !isSigningConfigured()) {
    return Response.json({ error: "payments_not_configured", message: "Payments aren’t switched on yet." }, { status: 503, headers: noStore });
  }

  try {
    // Links can be switched off by the operator (e.g. one posted publicly): REVOKED_SESSIONS=cs_live_…,cs_live_…
    if ((process.env.REVOKED_SESSIONS ?? "").split(",").map((v) => v.trim()).includes(sessionId)) {
      return Response.json({ error: "revoked", message: "This unlock link has been switched off. Please contact us." }, { status: 403, headers: noStore });
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["payment_intent.latest_charge"] });
    // A refunded or disputed purchase no longer restores (browsers already unlocked keep working offline).
    const intent = session.payment_intent;
    const charge = intent && typeof intent === "object" ? intent.latest_charge : null;
    if (charge && typeof charge === "object" && (charge.refunded || charge.amount_refunded > 0 || charge.disputed)) {
      return Response.json({ error: "refunded", message: "This purchase was refunded, so it can’t unlock LodgeReady." }, { status: 403, headers: noStore });
    }
    // "no_payment_required" covers a 100%-off promotion code.
    const paid = session.status === "complete" && (session.payment_status === "paid" || session.payment_status === "no_payment_required");
    if (!paid || session.metadata?.product !== PRODUCT_CODE) {
      return Response.json(
        { error: "not_paid", message: "We couldn’t confirm this payment yet. If you just paid, wait a moment and refresh." },
        { status: 402, headers: noStore },
      );
    }
    const token = signLicense({ v: 1, sid: session.id, iat: Date.now() });
    return Response.json({ token }, { headers: noStore });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "resource_missing") {
      return Response.json({ error: "not_found", message: "We couldn’t find that purchase." }, { status: 404, headers: noStore });
    }
    console.error("[verify] failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "verify_failed", message: "We couldn’t check your payment. Please try again." }, { status: 502, headers: noStore });
  }
}
