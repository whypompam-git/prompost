import { NextResponse } from "next/server";
import { SHOP_WORKSPACE_ID, loadProducts, loadSettings } from "@/lib/shopServer";

export const dynamic = "force-dynamic";

// Public: what the /gift page shows. Stock is returned so the page can say "เหลือ N".
export async function GET() {
  const [settings, products] = await Promise.all([loadSettings(SHOP_WORKSPACE_ID), loadProducts(SHOP_WORKSPACE_ID, true)]);
  return NextResponse.json({
    title: settings.title,
    intro: settings.intro,
    lineNote: settings.lineNote,
    isOpen: settings.isOpen,
    products: products.map((p) => ({ id: p.id, name: p.name, description: p.description, price: p.price, stock: p.stock, maxPerPerson: p.maxPerPerson, imageUrl: p.imageUrl })),
  });
}
