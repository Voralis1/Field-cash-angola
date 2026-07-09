"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Truck, Receipt, Send, Wallet } from "lucide-react";

const tabs = [
  { href: "/", label: "Résumé", Icon: LayoutDashboard },
  { href: "/deliveries", label: "Livraisons", Icon: Truck },
  { href: "/charges", label: "Charges", Icon: Receipt },
  { href: "/remittances", label: "Remises", Icon: Send },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar">
      <div className="tabbar-brand">
        <span className="brand-mark">
          <Wallet />
        </span>
        Field Cash
      </div>
      {tabs.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`tab ${active ? "active" : ""}`}>
            <span className="ic">
              <t.Icon />
            </span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
