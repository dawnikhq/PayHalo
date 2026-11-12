/**
 * Older links and any return URL already registered with PayPal point here.
 * The handler lives at /api/paypal/callback; this keeps both alive.
 */
export { GET, dynamic } from "../../callback/route";
