import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { iyzicoPost } from "@/lib/iyzico-client";
import { BILLING_PLANS } from "@/lib/billing-plans";

export async function POST(request: Request) {
  const fail = () => NextResponse.redirect(new URL("/paketler?payment=failed", request.url), 303);
  try {
    const form = await request.formData();
    const token = String(form.get("token") || "");
    if (!token) return fail();

    const payment = await iyzicoPost("/payment/iyzipos/checkoutform/auth/ecom/detail", { locale: "tr", token });
    if (payment.paymentStatus !== "SUCCESS" || !payment.conversationId) return fail();

    const admin = createAdminClient();
    const { data: order } = await admin.from("billing_orders")
      .select("id,plan,status,amount_cents,currency")
      .eq("id", String(payment.conversationId)).single();
    if (!order) return fail();
    if (order.status === "paid") return NextResponse.redirect(new URL("/paketler?payment=success", request.url), 303);

    const paidCents = Math.round(Number(payment.paidPrice) * 100);
    if (paidCents !== order.amount_cents || String(payment.currency) !== order.currency) return fail();

    const plan = order.plan as keyof typeof BILLING_PLANS;
    const grant = BILLING_PLANS[plan]?.credits ?? 0;
    const { error } = await admin.rpc("activate_paid_order", {
      target_order: order.id,
      payment_ref: String(payment.paymentId || token),
      credit_grant: grant,
    });
    if (error) return fail();
    return NextResponse.redirect(new URL("/paketler?payment=success", request.url), 303);
  } catch {
    return fail();
  }
}
