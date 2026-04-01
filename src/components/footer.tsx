'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { usePathname } from 'next/navigation';

const DASHBOARD_PREFIXES = ['/admin', '/congregation', '/dashboard'];

export function Footer() {
  const pathname = usePathname();
  if (DASHBOARD_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <MapPin size={14} className="text-primary" />
              </div>
              <span className="font-bold text-foreground">Ministry Planner</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Offline-first territory management for congregations. Organize, assign, and track your
              ministry with ease.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Product</h3>
            <ul className="space-y-2">
              {['Features', 'How It Works', 'Security'].map((item) => (
                <li key={item}>
                  <Link
                    href={`/#${item.toLowerCase().replace(' ', '-')}`}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Legal</h3>
            <ul className="space-y-2">
              {['Privacy Policy', 'Terms of Service', 'Contact'].map((item) => (
                <li key={item}>
                  <Link
                    href="#"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/60 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Ministry Planner. Built with ❤️ for congregations.
        </div>
      </div>
    </footer>
  );
}
