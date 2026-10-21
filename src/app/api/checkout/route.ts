import { PRICE_AUD_CENTS, PRODUCT_CODE } from "@/lib/pack/limits";
import { isSigningConfigured } from "@/lib/server/license";
import { getStripe, isSameOrigin, siteOrigin } from "@/lib/server/stripe";

const noStore = { "Cache-Control": "no-store" };

/** Creates a Stripe Checkout Session for the one-off unlock and returns its URL. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "forbidden" }, { status: 403, headers: noStore });
  }
  const stripe = getStripe();
  if (!stripe || !isSigningConfigured()) {
    return Response.json(
      { error: "payments_not_configured", message: "Payments aren’t switched on yet. Please try again soon." },
      { status: 503, headers: noStore },
    );
  }

  const origin = siteOrigin(request);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "aud",
            unit_amount: PRICE_AUD_CENTS,
            product_data: {
              name: "LodgeReady — unlimited evidence packs",
              description: "One-off purchase. Unlimited files and rebuilds on this device. 30-day money-back guarantee.",
            },
          },
        },
      ],
      allow_promotion_codes: true,
      metadata: { product: PRODUCT_CODE },
      payment_intent_data: { description: "LodgeReady unlimited evidence packs", metadata: { product: PRODUCT_CODE } },
      success_url: `${origin}/unlock?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/build?checkout=cancelled`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return Response.json({ url: session.url }, { headers: noStore });
  } catch (error) {
    console.error("[checkout] failed to create session", error instanceof Error ? error.message : error);
    return Response.json(
      { error: "checkout_failed", message: "We couldn’t start checkout. Please try again in a minute." },
      { status: 502, headers: noStore },
    );
  }
}
