'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DASHBOARD_PREFIXES = ['/admin', '/congregation', '/profile', '/onboarding', '/auth'];

export function Footer() {
  const pathname = usePathname();
  if (DASHBOARD_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-3 group">
              <Image
                src="/icons/icon-192.png"
                alt="Kanataran Logo"
                width={28}
                height={28}
                className="w-7 h-7 rounded-lg object-contain shadow-xs transition-transform group-hover:scale-105"
              />
              <span className="font-bold text-foreground">Kanataran</span>
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
              {['Features', 'How It Works'].map((item) => (
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
            <h3 className="text-sm font-semibold text-foreground mb-3">Legal & Support</h3>
            <ul className="space-y-2">
              {[
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
                { label: 'Contact', href: '/contact' },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/60 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Kanataran. Built with ❤️ for congregations.
        </div>
      </div>
    </footer>
  );
}
