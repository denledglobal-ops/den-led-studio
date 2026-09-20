import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { iyzicoPost } from "@/lib/iyzico-client";
import { isBillingPlan } from "@/lib/billing-plans";

const PRICES = {
  starter: { monthly: "1490.00", yearly: "14900.00" },
  pro: { monthly: "2990.00", yearly: "29900.00" },
  enterprise: { monthly: "5990.00", yearly: "59900.00" },
} as const;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

    const input = await request.json();
    const plan = String(input.plan || "");
    const period = String(input.billingPeriod || "");
    if (!isBillingPlan(plan) || (period !== "monthly" && period !== "yearly"))
      return NextResponse.json({ error: "Geçersiz paket." }, { status: 400 });

    const { data: org } = await supabase.from("organizations").select("id,name").limit(1).maybeSingle();
    if (!org) return NextResponse.json({ error: "Şirket bulunamadı." }, { status: 404 });

    const price = PRICES[plan][period];
    const { data: order, error } = await supabase.from("billing_orders").insert({
      organization_id: org.id, user_id: user.id, plan, billing_period: period,
      amount_cents: Math.round(Number(price) * 100), currency: "TRY",
      provider: "iyzico", idempotency_key: crypto.randomUUID(),
    }).select("id").single();
    if (error || !order) return NextResponse.json({ error: error?.message || "Sipariş oluşturulamadı." }, { status: 500 });

    const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
    const origin = configuredOrigin ? configuredOrigin.replace(/\/$/, "") : new URL(request.url).origin;
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const buyerIp = forwardedFor || request.headers.get("x-real-ip") || "127.0.0.1";
    const displayName = (user.email.split("@")[0] || "DEN LED").slice(0, 30);
    const result = await iyzicoPost("/payment/iyzipos/checkoutform/initialize/auth/ecom", {
      locale: "tr", conversationId: order.id, price, paidPrice: price, currency: "TRY",
      basketId: order.id, paymentGroup: "PRODUCT",
      callbackUrl: origin + "/api/billing/iyzico/callback", enabledInstallments: [1],
      buyer: { id: user.id, name: displayName, surname: "Musteri", email: user.email,
        identityNumber: "11111111111", registrationAddress: "Turkiye", city: "Istanbul", country: "Turkey", ip: buyerIp },
      shippingAddress: { contactName: displayName, address: "Turkiye", city: "Istanbul", country: "Turkey" },
      billingAddress: { contactName: displayName, address: "Turkiye", city: "Istanbul", country: "Turkey" },
      basketItems: [{ id: plan, name: "DEN LED " + plan, category1: "SaaS", itemType: "VIRTUAL", price }],
    });
    return NextResponse.json({ paymentPageUrl: result.paymentPageUrl, token: result.token });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Ödeme başlatılamadı." }, { status: 500 });
  }
}
