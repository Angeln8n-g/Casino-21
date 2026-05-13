import React, { useEffect } from 'react';
import { LogoK21 } from '../LogoK21';
import { updateSEO, resetSEO } from '../../utils/seo';

export function PrivacyPolicy() {
  useEffect(() => {
    updateSEO({
      title: 'Política de Privacidad — KASINO21 | Juego de Cartas Online',
      description: 'Conoce cómo KASINO21 protege tu privacidad. Información sobre cookies, Google AdSense, analíticas y tus derechos GDPR/CCPA como usuario del juego de cartas online.',
      canonical: 'https://kasino21.com/privacy',
    });
    return () => resetSEO();
  }, []);

  return (
    <div className="h-screen overflow-y-auto bg-[#020617] text-white">
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
            <a href="/terms" className="text-gray-500 hover:text-casino-gold transition-colors">Términos</a>
            <a href="/cookies" className="text-gray-500 hover:text-casino-gold transition-colors">Cookies</a>
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
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 py-16 relative z-10">
          <div className="flex items-center gap-2 text-xs text-blue-400 font-bold uppercase tracking-widest mb-4">
            <span className="w-6 h-px bg-blue-400" />
            Legal / KASINO21
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-tight">
            Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Policy</span>
          </h1>
          <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
            At KASINO21, we're committed to protecting your privacy. This policy explains what data we collect, 
            how we use it, and your rights.
          </p>
          <p className="text-[11px] text-gray-600 mt-4 font-mono">
            Last updated: May 11, 2026 · Effective immediately
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        <Section icon="🛡️" title="1. Information We Collect">
          <p>KASINO21 is designed with privacy in mind. We collect minimal data necessary to operate the game:</p>
          <ul>
            <li>
              <strong>Account Data:</strong> Email address and username when you register. This is used solely for authentication and to identify your account.
            </li>
            <li>
              <strong>Game Data:</strong> Scores, ELO rating, coins, match history, avatars, and in-game items. This is stored in our secure database to provide the game experience.
            </li>
            <li>
              <strong>Analytics Data:</strong> Anonymous usage statistics via Google Analytics (e.g., session duration, pages visited, device type). This data cannot identify you personally.
            </li>
            <li>
              <strong>Advertising Data:</strong> Google AdSense may collect data through cookies and similar technologies to display relevant advertisements. See Section 4 for details.
            </li>
          </ul>
          <p className="text-sm text-gray-500 italic mt-2">
            We do <strong className="text-gray-400">not</strong> collect payment information, real money, or sensitive personal data. All in-game coins and items have no monetary value.
          </p>
        </Section>

        <Section icon="🍪" title="2. Cookies & Tracking Technologies">
          <p>We use cookies and similar technologies for the following purposes:</p>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <CookieCard
              type="Essential"
              color="emerald"
              items={['User authentication session', 'Game progress & settings', 'Security tokens']}
              canDisable={false}
            />
            <CookieCard
              type="Analytics"
              color="blue"
              items={['Anonymous page visit tracking', 'Feature usage statistics', 'Performance monitoring']}
              canDisable={true}
            />
            <CookieCard
              type="Advertising"
              color="amber"
              items={['Google AdSense personalization', 'Ad frequency capping', 'Interest-based ad delivery']}
              canDisable={true}
            />
          </div>
          <p className="mt-4 text-sm text-gray-500">
            You can manage cookies through your browser settings. Note that disabling essential cookies will prevent you from playing the game.
            See our <a href="/cookies" className="text-casino-gold hover:underline">Cookie Policy</a> for full details.
          </p>
        </Section>

        <Section icon="📡" title="3. How We Use Your Data">
          <ul>
            <li>To authenticate your account and keep your session secure</li>
            <li>To save and display your game progress, rank, and achievements</li>
            <li>To facilitate multiplayer matchmaking and real-time game sessions</li>
            <li>To analyze usage patterns and improve the game experience</li>
            <li>To serve relevant advertisements through Google AdSense</li>
            <li>To send transactional emails (e.g., password reset) — no marketing emails</li>
          </ul>
          <p className="mt-3 text-sm text-gray-500 italic">
            We never sell your personal data to third parties. We do not use your data for automated decision-making that produces legal effects.
          </p>
        </Section>

        <Section icon="🤝" title="4. Third-Party Services">
          <p>KASINO21 uses the following third-party services, each with their own privacy policies:</p>
          <div className="space-y-3 mt-4">
            <ThirdPartyRow
              name="Google AdSense"
              purpose="Contextual advertising to support free gameplay"
              url="https://policies.google.com/technologies/ads"
            />
            <ThirdPartyRow
              name="Google Analytics"
              purpose="Anonymous usage analytics to improve the game"
              url="https://policies.google.com/privacy"
            />
            <ThirdPartyRow
              name="Supabase"
              purpose="Secure backend database and authentication"
              url="https://supabase.com/privacy"
            />
          </div>
        </Section>

        <Section icon="🌍" title="5. Data Storage & Security">
          <p>
            Your game data is stored on servers operated by Supabase (EU/US regions). We implement industry-standard 
            security measures including encrypted connections (HTTPS/TLS), bcrypt password hashing, and row-level 
            security policies on all database tables.
          </p>
          <p className="mt-3 text-gray-400">
            While we strive to protect your data, no internet transmission is 100% secure. We cannot guarantee 
            absolute security but will notify you of any significant data breach as required by law.
          </p>
        </Section>

        <Section icon="👶" title="6. Children's Privacy">
          <p>
            KASINO21 is intended for users aged <strong>13 and older</strong>. We do not knowingly collect personal 
            information from children under 13. If you are a parent or guardian and believe your child has provided 
            us with personal data, please contact us immediately at{' '}
            <a href="mailto:kansino21.service@gmail.com" className="text-casino-gold hover:underline font-mono">
              kansino21.service@gmail.com
            </a>{' '}
            and we will delete that information promptly.
          </p>
        </Section>

        <Section icon="⚖️" title="7. Your Rights (GDPR & CCPA)">
          <p>Depending on your location, you may have the following rights regarding your personal data:</p>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            {[
              { right: 'Access', desc: 'Request a copy of your personal data' },
              { right: 'Rectification', desc: 'Correct inaccurate or incomplete data' },
              { right: 'Erasure', desc: 'Request deletion of your account and data' },
              { right: 'Portability', desc: 'Receive your data in a portable format' },
              { right: 'Objection', desc: 'Object to certain data processing activities' },
              { right: 'Opt-Out', desc: 'Opt out of advertising personalization' },
            ].map(({ right, desc }) => (
              <div key={right} className="flex items-start gap-3 bg-white/5 rounded-xl p-3 border border-white/5">
                <span className="text-casino-gold font-black text-xs mt-0.5">✓</span>
                <div>
                  <p className="text-sm font-bold text-white">{right}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-500">
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:kansino21.service@gmail.com" className="text-casino-gold hover:underline font-mono">
              kansino21.service@gmail.com
            </a>. We will respond within 30 days.
          </p>
        </Section>

        <Section icon="🔄" title="8. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we make significant changes, we will update the 
            "Last updated" date at the top of this page. Your continued use of KASINO21 after changes are posted 
            constitutes your acceptance of the updated policy.
          </p>
        </Section>

        <Section icon="✉️" title="9. Contact Us">
          <p>If you have questions, concerns, or requests regarding this Privacy Policy, please contact us:</p>
          <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-2xl shrink-0">
              📬
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Privacy Contact</p>
              <a href="mailto:kansino21.service@gmail.com" className="text-casino-gold hover:text-white transition-colors font-mono text-sm">
                kansino21.service@gmail.com
              </a>
              <p className="text-xs text-gray-600 mt-1">Response within 30 days · English & Spanish supported</p>
            </div>
          </div>
        </Section>

      </main>

      {/* Footer */}
      <LegalFooter current="privacy" />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-xl font-display font-black text-white tracking-tight">{title}</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent ml-2" />
      </div>
      <div className="text-gray-400 text-sm leading-relaxed space-y-3 pl-6 md:pl-10">
        {children}
      </div>
    </section>
  );
}

function CookieCard({
  type,
  color,
  items,
  canDisable,
}: {
  type: string;
  color: 'emerald' | 'blue' | 'amber';
  items: string[];
  canDisable: boolean;
}) {
  const colors = {
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
    blue: 'border-blue-500/30 bg-blue-500/5 text-blue-400',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
  };

  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <p className="font-black text-sm uppercase tracking-widest mb-3">{type}</p>
      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item} className="flex items-start gap-2 text-xs text-gray-400">
            <span className="mt-0.5 shrink-0">·</span>
            {item}
          </li>
        ))}
      </ul>
      <div className={`mt-3 pt-3 border-t border-white/5 text-[10px] font-bold uppercase tracking-wider ${canDisable ? 'text-gray-500' : 'text-gray-600'}`}>
        {canDisable ? '⚙️ Can be disabled' : '🔒 Required'}
      </div>
    </div>
  );
}

function ThirdPartyRow({ name, purpose, url }: { name: string; purpose: string; url: string }) {
  return (
    <div className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-xl p-4 gap-4">
      <div>
        <p className="text-sm font-bold text-white">{name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{purpose}</p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-casino-gold hover:underline font-mono shrink-0"
      >
        View Policy →
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
