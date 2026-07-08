"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Résumé", ic: "▦" },
  { href: "/deliveries", label: "Livraisons", ic: "◉" },
  { href: "/charges", label: "Charges", ic: "▽" },
  { href: "/remittances", label: "Remises", ic: "↗" },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar">
      <div className="tabbar-brand">Field Cash</div>
      {tabs.map((t) => {
        const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`tab ${active ? "active" : ""}`}>
            <span className="ic">{t.ic}</span>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
