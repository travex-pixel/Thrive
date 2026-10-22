import { PRICE_AUD_CENTS, PRODUCT_CODE } from "@/lib/pack/limits";
import { isSigningConfigured } from "@/lib/server/license";
import { isRateLimited } from "@/lib/server/rate-limit";
import { getStripe, isAllowedOrigin, returnOrigin, siteOrigin } from "@/lib/server/stripe";

const noStore = { "Cache-Control": "no-store" };

/**
 * Creates a Stripe Checkout Session for the one-off unlock and returns its URL and id. With flow "tab" (the usual
 * case) checkout runs in its own tab and the builder tab polls /api/verify with the id, so the built pack is never
 * lost; with "redirect" (pop-ups blocked) Stripe sends the buyer back to the builder.
 */
export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return Response.json(
      { error: "forbidden", message: `Checkout only works from ${siteOrigin(request)}. Open LodgeReady there and try again.` },
      { status: 403, headers: noStore },
    );
  }
  if (isRateLimited("checkout", request, 20, 10 * 60_000)) {
    return Response.json(
      { error: "rate_limited", message: "Too many checkout attempts. Please wait a few minutes and try again." },
      { status: 429, headers: noStore },
    );
  }
  const stripe = getStripe();
  if (!stripe || !isSigningConfigured()) {
    return Response.json(
      { error: "payments_not_configured", message: "Payments aren’t switched on yet. Please try again soon." },
      { status: 503, headers: noStore },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { flow?: unknown };
  const flow = body.flow === "tab" ? "tab" : "redirect";
  const origin = returnOrigin(request);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      // Cards only (Apple Pay and Google Pay are card wallets): slow-clearing methods would leave buyers waiting.
      allowed_payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: PRICE_AUD_CENTS,
            product_data: {
              name: "LodgeReady: unlimited evidence packs",
              description:
                "One-off purchase. Unlimited files and rebuilds in the browser where you pay. Changed your mind? Full refund within 30 days. A document tool, not immigration advice.",
            },
          },
        },
      ],
      custom_text: {
        submit: {
          message: `By paying you agree to the terms at ${origin}/terms. LodgeReady is a document tool: it doesn’t check whether your evidence is enough, and isn’t affiliated with the Department of Home Affairs.`,
        },
      },
      allow_promotion_codes: true,
      metadata: { product: PRODUCT_CODE },
      payment_intent_data: { description: "LodgeReady unlimited evidence packs", metadata: { product: PRODUCT_CODE } },
      success_url: `${origin}/unlock?session_id={CHECKOUT_SESSION_ID}${flow === "tab" ? "&tab=1" : ""}`,
      cancel_url: flow === "tab" ? `${origin}/unlock?cancelled=1` : `${origin}/build?checkout=cancelled`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return Response.json({ url: session.url, id: session.id }, { headers: noStore });
  } catch (error) {
    console.error("[checkout] failed to create session", error instanceof Error ? error.message : error);
    return Response.json(
      { error: "checkout_failed", message: "We couldn’t start checkout. Please try again in a minute." },
      { status: 502, headers: noStore },
    );
  }
}
