"use client";

import { Purchases, type CustomerInfo } from "@revenuecat/purchases-js";

const PRO_ENTITLEMENT_ID = "pro";

let configuredForUserId: string | null = null;

function getRevenueCatApiKey(): string {
  return process.env.NEXT_PUBLIC_RC_WEB_PUBLIC_API_KEY?.trim() ?? "";
}

export function isRevenueCatWebConfigured(): boolean {
  return getRevenueCatApiKey().length > 0;
}

export async function configureRevenueCatWeb(appUserId: string): Promise<void> {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey || !appUserId) return;
  if (configuredForUserId === appUserId) return;

  // Configure once per authenticated user session.
  Purchases.configure({
    // Plug your Web Billing public API key here via NEXT_PUBLIC_RC_WEB_PUBLIC_API_KEY.
    apiKey,
    appUserId,
  });
  configuredForUserId = appUserId;
}

export async function getRevenueCatCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isRevenueCatWebConfigured()) return null;
  try {
    return await Purchases.getSharedInstance().getCustomerInfo();
  } catch {
    return null;
  }
}

export function hasProEntitlement(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;
  return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]?.isActive);
}

export async function refreshRevenueCatProEntitlement(): Promise<boolean> {
  const info = await getRevenueCatCustomerInfo();
  return hasProEntitlement(info);
}

export type RevenueCatCheckoutMode = "sdk" | "purchase_link";

export type RevenueCatPurchaseResult =
  | { status: "succeeded" }
  | { status: "cancelled" }
  | { status: "redirected" }
  | { status: "failed"; message: string };

/**
 * Purchase handler placeholder.
 * - `sdk`: use Offerings + package ids (future wiring).
 * - `purchase_link`: redirect to your RevenueCat Web Purchase Link.
 */
export async function startRevenueCatPurchase(
  mode: RevenueCatCheckoutMode
): Promise<RevenueCatPurchaseResult> {
  try {
    if (mode === "sdk") {
      // TODO: Plug in your offering/package IDs here.
      // Example next step:
      // const offerings = await Purchases.getSharedInstance().getOfferings();
      // const pkg = offerings.current?.monthly;
      // if (!pkg) return { status: "failed", message: "No package configured." };
      // await Purchases.getSharedInstance().purchase({ rcPackage: pkg });
      return { status: "failed", message: "SDK purchase flow is not wired yet." };
    }

    // TODO: Replace with your RevenueCat Web Purchase Link.
    const purchaseLink = process.env.NEXT_PUBLIC_RC_WEB_PURCHASE_LINK?.trim() ?? "";
    if (!purchaseLink) {
      return { status: "failed", message: "Missing purchase link configuration." };
    }
    window.location.assign(purchaseLink);
    return { status: "redirected" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Purchase failed.";
    return { status: "failed", message };
  }
}

/**
 * Placeholder for future "Manage subscription" action.
 * Can use `customerInfo.managementURL` once billing UI is wired.
 */
export async function openRevenueCatManageSubscription(): Promise<boolean> {
  const info = await getRevenueCatCustomerInfo();
  const url = info?.managementURL?.trim();
  if (!url) return false;
  window.location.assign(url);
  return true;
}
