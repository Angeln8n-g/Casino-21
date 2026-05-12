import React, { useEffect } from 'react';
import { LogoK21 } from '../LogoK21';
import { updateSEO, resetSEO } from '../../utils/seo';

export function CookiePolicy() {
  useEffect(() => {
    updateSEO({
      title: 'Política de Cookies — KASINO21 | Juego de Cartas Online',
      description: 'Información completa sobre las cookies que utiliza KASINO21: cookies esenciales, analíticas de Google Analytics y publicitarias de Google AdSense. Cumplimiento GDPR/ePrivacy.',
      canonical: 'https://kasino21.com/cookies',
    });
    return () => resetSEO();
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <div className="opacity-90 group-hover:opacity-100 transition-opacity">
              <LogoK21 size={36} />
            </div>
            <span className="font-display font-black text-casino-gold tracking-wider text-lg">KASINO21</span>
          </a>
          <nav className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
            <a href="/privacy" className="text-gray-500 hover:text-casino-gold transition-colors">Privacidad</a>
            <a href="/terms" className="text-gray-500 hover:text-casino-gold transition-colors">Términos</a>
            <a
              href="/"
              className="bg-casino-gold/10 hover:bg-casino-gold/20 text-casino-gold border border-casino-gold/30 px-4 py-2 rounded-xl transition-all"
            >
              ← Jugar
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-transparent to-orange-900/10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 py-16 relative z-10">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-bold uppercase tracking-widest mb-4">
            <span className="w-6 h-px bg-amber-400" />
            Legal / KASINO21
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-tight">
            Cookie <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Policy</span>
          </h1>
          <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
            This Cookie Policy explains how KASINO21 uses cookies and similar tracking technologies, 
            required by EU law (GDPR/ePrivacy Directive) for sites using Google AdSense.
          </p>
          <p className="text-[11px] text-gray-600 mt-4 font-mono">
            Last updated: May 11, 2026 · Required for EU compliance
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        <CookieSection icon="🍪" title="What Are Cookies?">
          <p>
            Cookies are small text files placed on your device (computer, tablet, or mobile) when you visit a website. 
            They are widely used to make websites work efficiently, to remember your preferences, and to provide 
            information to website owners.
          </p>
          <p className="mt-3">
            Similar technologies — such as web beacons, pixels, and local storage — serve similar purposes 
            and are covered by this policy. We collectively refer to all of these as "cookies."
          </p>
        </CookieSection>

        <CookieSection icon="📋" title="What Cookies We Use">
          <p className="mb-6">KASINO21 uses the following categories of cookies:</p>

          <div className="space-y-4">
            <CookieTable
              category="Essential / Strictly Necessary"
              color="emerald"
              required
              description="These cookies are required for the game to function. Without them, you cannot log in, play, or use core features. They cannot be disabled."
              cookies={[
                { name: 'sb-auth-token', provider: 'Supabase', purpose: 'Maintains your authenticated session', duration: 'Session / 1 hour' },
                { name: 'casino21_roomId', provider: 'KASINO21', purpose: 'Saves your current game room for reconnection', duration: 'Session' },
                { name: 'casino21_playerId', provider: 'KASINO21', purpose: 'Identifies your player ID in the current game', duration: 'Session' },
                { name: 'casino21_ui_*', provider: 'KASINO21', purpose: 'Saves your UI preferences (sidebar state, etc.)', duration: 'Persistent' },
              ]}
            />

            <CookieTable
              category="Analytics"
              color="blue"
              required={false}
              description="These cookies help us understand how players use KASINO21, which features are popular, and where improvements are needed. All data is anonymous."
              cookies={[
                { name: '_ga', provider: 'Google Analytics', purpose: 'Distinguishes unique users (anonymized)', duration: '2 years' },
                { name: '_ga_*', provider: 'Google Analytics', purpose: 'Maintains session state for analytics', duration: '2 years' },
                { name: '_gid', provider: 'Google Analytics', purpose: 'Distinguishes users within a 24-hour period', duration: '24 hours' },
              ]}
            />

            <CookieTable
              category="Advertising (Google AdSense)"
              color="amber"
              required={false}
              description="Google AdSense places cookies to show relevant ads that help fund KASINO21 as a free game. These cookies may collect data about your browsing habits across sites."
              cookies={[
                { name: '__gads / __gpi', provider: 'Google AdSense', purpose: 'Registers ad impressions and prevents duplicate serving', duration: '13 months' },
                { name: 'IDE', provider: 'Google DoubleClick', purpose: 'Records and reports ad interactions for conversion tracking', duration: '13 months' },
                { name: 'NID / ANID', provider: 'Google', purpose: 'Stores user preferences for ad personalization', duration: '6 months' },
                { name: 'DSID', provider: 'Google', purpose: 'Identifies signed-in users for cross-device ad targeting', duration: '2 weeks' },
              ]}
            />
          </div>
        </CookieSection>

        <CookieSection icon="⚙️" title="How to Control Cookies">
          <p>You have several options to manage cookies. Note that restricting cookies may impact your game experience:</p>
          
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <ControlCard
              icon="🌐"
              title="Browser Settings"
              description="All modern browsers allow you to block, delete, or allow specific cookies. Here's how for common browsers:"
              links={[
                { label: 'Chrome', url: 'https://support.google.com/chrome/answer/95647' },
                { label: 'Firefox', url: 'https://support.mozilla.org/kb/enable-and-disable-cookies' },
                { label: 'Safari', url: 'https://support.apple.com/guide/safari/manage-cookies-sfri11471' },
                { label: 'Edge', url: 'https://support.microsoft.com/topic/microsoft-edge-browsing-data-and-privacy' },
              ]}
            />
            <ControlCard
              icon="🎯"
              title="Ad Personalization"
              description="Opt out of Google's personalized advertising or manage your ad settings:"
              links={[
                { label: 'Google Ad Settings', url: 'https://adssettings.google.com' },
                { label: 'Google Analytics Opt-out', url: 'https://tools.google.com/dlpage/gaoptout' },
                { label: 'Your Online Choices (EU)', url: 'https://www.youronlinechoices.com' },
                { label: 'NAI Opt-out (US)', url: 'https://optout.networkadvertising.org' },
              ]}
            />
          </div>

          <div className="mt-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-bold text-amber-400 mb-1">Important: Game Functionality</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Disabling <strong className="text-white">Essential cookies</strong> will prevent you from logging in and playing KASINO21.
                  Disabling <strong className="text-white">Analytics or Advertising cookies</strong> only affects tracking and ad personalization — 
                  the game will still function, though you may see less relevant ads.
                </p>
              </div>
            </div>
          </div>
        </CookieSection>

        <CookieSection icon="🔗" title="Google's Cookie Usage">
          <p>
            KASINO21 uses Google AdSense to display advertisements. Google uses cookies to serve ads based on your 
            prior visits to KASINO21 or other websites on the internet. You can read more about how Google uses 
            cookie data when you use their partners' sites or apps:
          </p>
          <div className="mt-4 space-y-3">
            <ExternalLinkRow
              title="Google's Privacy & Terms"
              url="https://policies.google.com/privacy"
              desc="Google's comprehensive privacy policy explaining all data practices"
            />
            <ExternalLinkRow
              title="How Google uses cookies in advertising"
              url="https://policies.google.com/technologies/ads"
              desc="Detailed explanation of advertising cookies used by Google AdSense"
            />
            <ExternalLinkRow
              title="Google's cookie types"
              url="https://policies.google.com/technologies/cookies"
              desc="Full breakdown of all cookies Google uses and their purposes"
            />
          </div>
        </CookieSection>

        <CookieSection icon="🔄" title="Changes to This Policy">
          <p>
            We may update this Cookie Policy to reflect changes in cookies we use, or for operational, legal, or 
            regulatory reasons. When we make significant changes, we will update the "Last updated" date at the top.
          </p>
          <p className="mt-3">
            Please check this page regularly to stay informed about our use of cookies.
          </p>
        </CookieSection>

        <CookieSection icon="✉️" title="Contact Us">
          <p>For any questions about our use of cookies, contact us:</p>
          <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-2xl shrink-0">
              🍪
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Cookie Inquiries</p>
              <a href="mailto:kansino21.service@gmail.com" className="text-casino-gold hover:text-white transition-colors font-mono text-sm">
                kansino21.service@gmail.com
              </a>
              <p className="text-xs text-gray-600 mt-1">Response within 30 days · English & Spanish supported</p>
            </div>
          </div>
        </CookieSection>

      </main>

      {/* Footer */}
      <LegalFooter current="cookies" />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function CookieSection({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-xl font-display font-black text-white tracking-tight">{title}</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent ml-2" />
      </div>
      <div className="text-gray-400 text-sm leading-relaxed space-y-3 pl-10">
        {children}
      </div>
    </section>
  );
}

interface CookieRow {
  name: string;
  provider: string;
  purpose: string;
  duration: string;
}

function CookieTable({
  category,
  color,
  required,
  description,
  cookies,
}: {
  category: string;
  color: 'emerald' | 'blue' | 'amber';
  required: boolean;
  description: string;
  cookies: CookieRow[];
}) {
  const colorMap = {
    emerald: 'border-emerald-500/30 bg-emerald-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
    amber: 'border-amber-500/30 bg-amber-500/5',
  };
  const textMap = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
  };

  return (
    <div className={`border rounded-2xl overflow-hidden ${colorMap[color]}`}>
      <div className={`px-5 py-4 border-b border-white/5 flex items-center justify-between`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-sm font-black uppercase tracking-widest ${textMap[color]}`}>{category}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
              required 
                ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' 
                : 'border-white/10 text-gray-600 bg-white/5'
            }`}>
              {required ? 'Required' : 'Optional'}
            </span>
          </div>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5 bg-black/20">
              <th className="text-left px-4 py-2 text-gray-600 font-bold uppercase tracking-wider">Cookie Name</th>
              <th className="text-left px-4 py-2 text-gray-600 font-bold uppercase tracking-wider">Provider</th>
              <th className="text-left px-4 py-2 text-gray-600 font-bold uppercase tracking-wider">Purpose</th>
              <th className="text-left px-4 py-2 text-gray-600 font-bold uppercase tracking-wider whitespace-nowrap">Duration</th>
            </tr>
          </thead>
          <tbody>
            {cookies.map((cookie, i) => (
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 font-mono text-gray-300 whitespace-nowrap">{cookie.name}</td>
                <td className="px-4 py-3 text-gray-500">{cookie.provider}</td>
                <td className="px-4 py-3 text-gray-400">{cookie.purpose}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{cookie.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ControlCard({ icon, title, description, links }: {
  icon: string;
  title: string;
  description: string;
  links: { label: string; url: string }[];
}) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <h3 className="text-sm font-black text-white">{title}</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">{description}</p>
      <div className="space-y-2">
        {links.map(link => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-casino-gold hover:text-white transition-colors"
          >
            <span className="text-[8px]">▶</span>
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function ExternalLinkRow({ title, url, desc }: { title: string; url: string; desc: string }) {
  return (
    <div className="flex items-start justify-between bg-white/[0.03] border border-white/5 rounded-xl p-4 gap-4">
      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-casino-gold hover:underline font-mono shrink-0"
      >
        Visit →
      </a>
    </div>
  );
}

function LegalFooter({ current }: { current: 'privacy' | 'terms' | 'cookies' }) {
  const links = [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
    { href: '/cookies', label: 'Cookie Policy' },
  ];

  return (
    <footer className="mt-16 border-t border-white/5 bg-black/20">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <LogoK21 size={28} />
          <div>
            <p className="text-xs font-black text-white/60 uppercase tracking-widest">KASINO21</p>
            <p className="text-[10px] text-gray-600">© 2026 · All rights reserved</p>
          </div>
        </div>
        <nav className="flex gap-6">
          {links.map(link => (
            <a
              key={link.href}
              href={link.href}
              className={`text-xs uppercase tracking-widest font-bold transition-colors ${
                current === link.href.slice(1)
                  ? 'text-casino-gold'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <a
          href="/"
          className="text-xs bg-casino-gold/10 hover:bg-casino-gold/20 text-casino-gold border border-casino-gold/20 px-4 py-2 rounded-xl font-bold uppercase tracking-widest transition-all"
        >
          ← Back to Game
        </a>
      </div>
    </footer>
  );
}
