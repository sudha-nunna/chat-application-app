import { getCurrentUser } from "../services/authService";

/**
 * Returns the configured Stripe payment link for a given plan.
 * Priority:
 * 1. planObj.stripePaymentLink / planObj.paymentLink / planObj.stripeUrl (from backend)
 * 2. Environment variables matching plan key (e.g. VITE_STRIPE_PAYMENT_LINK_PRO)
 * 3. Default environment variable (VITE_STRIPE_PAYMENT_LINK_DEFAULT)
 * 4. Fallback test link
 */
export const getStripePaymentLink = (planKey, planObj = {}) => {
  const normalizedKey = (planKey || "").toLowerCase();

  // 1. Direct link on plan object from API
  if (planObj?.stripePaymentLink) return planObj.stripePaymentLink;
  if (planObj?.paymentLink) return planObj.paymentLink;
  if (planObj?.stripeUrl) return planObj.stripeUrl;

  // 2. Specific env variables per tier
  if (normalizedKey.includes("starter") || normalizedKey.includes("basic")) {
    if (import.meta.env.VITE_STRIPE_PAYMENT_LINK_STARTER) {
      return import.meta.env.VITE_STRIPE_PAYMENT_LINK_STARTER;
    }
  }

  if (normalizedKey.includes("pro")) {
    if (import.meta.env.VITE_STRIPE_PAYMENT_LINK_PRO) {
      return import.meta.env.VITE_STRIPE_PAYMENT_LINK_PRO;
    }
  }

  if (
    normalizedKey.includes("enterprise") ||
    normalizedKey.includes("power") ||
    normalizedKey.includes("unlimited")
  ) {
    if (import.meta.env.VITE_STRIPE_PAYMENT_LINK_ENTERPRISE) {
      return import.meta.env.VITE_STRIPE_PAYMENT_LINK_ENTERPRISE;
    }
  }

  // 3. General fallback link from .env or default Stripe URL
  return (
    import.meta.env.VITE_STRIPE_PAYMENT_LINK_DEFAULT ||
    "https://buy.stripe.com/test_default"
  );
};

/**
 * Builds the full Stripe checkout URL with client reference ID and prefilled email.
 */
export const buildStripeCheckoutUrl = (planKey, planObj = {}) => {
  let link = getStripePaymentLink(planKey, planObj);
  const user = getCurrentUser();
  const email = user?.email || "";
  const userId = user?._id || user?.id || "";

  try {
    const urlObj = new URL(link);
    if (email && !urlObj.searchParams.has("prefilled_email")) {
      urlObj.searchParams.set("prefilled_email", email);
    }
    if (userId && !urlObj.searchParams.has("client_reference_id")) {
      urlObj.searchParams.set("client_reference_id", userId);
    }
    return urlObj.toString();
  } catch {
    const sep = link.includes("?") ? "&" : "?";
    let query = "";
    if (email) query += `${sep}prefilled_email=${encodeURIComponent(email)}`;
    if (userId) query += `${query ? "&" : sep}client_reference_id=${encodeURIComponent(userId)}`;
    return link + query;
  }
};

/**
 * Opens Stripe checkout in a new browser tab.
 */
export const redirectToStripe = (planKey, planObj = {}, target = "_blank") => {
  const url = buildStripeCheckoutUrl(planKey, planObj);
  if (target === "_blank") {
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    window.location.href = url;
  }
};
