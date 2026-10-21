import { PRODUCT_CODE } from "@/lib/pack/limits";
import { isSigningConfigured, signLicense } from "@/lib/server/license";
import { CHECKOUT_SESSION_ID, getStripe } from "@/lib/server/stripe";

const noStore = { "Cache-Control": "no-store" };

/**
 * Confirms a Checkout Session was paid and returns a signed unlock token.
 * The session id acts as the customer's unlock link, so it can be reused to
 * restore the unlock on another device.
 */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";
  if (!CHECKOUT_SESSION_ID.test(sessionId)) {
    return Response.json({ error: "invalid_session", message: "That unlock link isn’t valid." }, { status: 400, headers: noStore });
  }
  const stripe = getStripe();
  if (!stripe || !isSigningConfigured()) {
    return Response.json({ error: "payments_not_configured", message: "Payments aren’t switched on yet." }, { status: 503, headers: noStore });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.status === "complete" && session.payment_status === "paid";
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
