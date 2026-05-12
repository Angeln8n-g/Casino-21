import React, { useEffect } from 'react';
import { LogoK21 } from '../LogoK21';
import { updateSEO, resetSEO } from '../../utils/seo';

export function TermsOfService() {
  useEffect(() => {
    updateSEO({
      title: 'Términos de Servicio — KASINO21 | Juego de Cartas Online',
      description: 'Lee los Términos de Servicio de KASINO21. Reglas del juego, moneda virtual sin valor monetario, conducta de usuarios, propiedad intelectual y política de publicidad.',
      canonical: 'https://kasino21.com/terms',
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
        <div className="absolute inset-0 bg-gradient-to-br from-casino-gold/10 via-transparent to-orange-900/10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 py-16 relative z-10">
          <div className="flex items-center gap-2 text-xs text-casino-gold font-bold uppercase tracking-widest mb-4">
            <span className="w-6 h-px bg-casino-gold" />
            Legal / KASINO21
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-tight">
            Terms of <span className="text-transparent bg-clip-text bg-gradient-to-r from-casino-gold to-orange-400">Service</span>
          </h1>
          <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
            By accessing or playing KASINO21, you agree to be bound by these Terms of Service. 
            Please read them carefully before registering.
          </p>
          <p className="text-[11px] text-gray-600 mt-4 font-mono">
            Last updated: May 11, 2026 · Effective immediately
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        <DisclaimerBanner />

        <ToSSection icon="✅" number="1" title="Acceptance of Terms">
          <p>
            By accessing or using KASINO21 at <strong className="text-white">kasino21.com</strong> (the "Game" or "Service"), 
            you confirm that you are at least <strong className="text-white">13 years of age</strong> and agree to be bound by 
            these Terms of Service ("Terms").
          </p>
          <p className="mt-3">
            If you do not agree with any part of these Terms, you must discontinue use of the Service immediately. 
            These Terms constitute a legally binding agreement between you and KASINO21.
          </p>
        </ToSSection>

        <ToSSection icon="🎮" number="2" title="Game Purpose & Virtual Currency">
          <p>
            KASINO21 is a <strong className="text-white">free-to-play online card game for entertainment purposes only</strong>. 
            This is NOT a gambling service. No real money gambling occurs on this platform.
          </p>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <FactCard icon="🪙" title="Virtual Coins">
              All coins, currency, and in-game items have <strong>zero monetary value</strong>. 
              They cannot be exchanged for real money, cryptocurrency, or any goods and services outside the game.
            </FactCard>
            <FactCard icon="🚫" title="No Real Gambling">
              KASINO21 does not facilitate, enable, or encourage real money gambling. 
              Any resemblance to gambling mechanics is purely for entertainment and skill-based play.
            </FactCard>
          </div>
        </ToSSection>

        <ToSSection icon="👤" number="3" title="Account Registration">
          <ul>
            <li>You must be at least <strong className="text-white">13 years old</strong> to create an account.</li>
            <li>You must provide a valid email address and a unique username.</li>
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>One person may only maintain one active account. Multi-accounting is prohibited.</li>
            <li>You agree to provide accurate information and update it as necessary.</li>
            <li>You must notify us immediately of any unauthorized access to your account.</li>
          </ul>
        </ToSSection>

        <ToSSection icon="⚖️" number="4" title="User Conduct">
          <p>By using KASINO21, you agree <strong className="text-white">NOT</strong> to:</p>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            {[
              { icon: '🤖', text: 'Use bots, automation scripts, or AI to play on your behalf' },
              { icon: '🐛', text: 'Exploit bugs, glitches, or unintended game mechanics' },
              { icon: '😤', text: 'Harass, bully, or send abusive messages to other players' },
              { icon: '🔓', text: 'Attempt to hack, reverse-engineer, or compromise game servers' },
              { icon: '💰', text: 'Sell, trade, or transfer your account to another person' },
              { icon: '📢', text: 'Use the game to spam or promote external services' },
              { icon: '🌐', text: 'Use VPNs or proxies to circumvent regional restrictions' },
              { icon: '📜', text: 'Violate any applicable local, national, or international laws' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-2 bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                <span className="shrink-0">{icon}</span>
                <p className="text-xs text-gray-400">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Violations may result in account suspension or permanent ban without notice or refund. 
            We reserve the right to determine what constitutes a violation.
          </p>
        </ToSSection>

        <ToSSection icon="🏆" number="5" title="Virtual Purchases">
          <p>
            KASINO21 may offer optional virtual currency packages, avatar bundles, or VIP Passes for purchase 
            with real money (via Stripe or other payment processors).
          </p>
          <ul className="mt-3">
            <li>All purchases are <strong className="text-white">final and non-refundable</strong> except where required by applicable law.</li>
            <li>Purchasing grants a limited, non-transferable license to use the virtual items in-game.</li>
            <li>Virtual items are not property and have no cash value.</li>
            <li>We reserve the right to modify, discontinue, or remove any virtual items at any time.</li>
            <li>Prices are subject to change. We will notify users of price changes in advance where possible.</li>
          </ul>
        </ToSSection>

        <ToSSection icon="📢" number="6" title="Advertisements & Monetization">
          <p>
            To keep KASINO21 free to play, we display advertisements provided by <strong className="text-white">Google AdSense</strong>.
          </p>
          <ul className="mt-3">
            <li>We may use cookies to personalize ads and analyze traffic.</li>
            <li>Advertisements are provided by third parties; we are not responsible for the content of external sites linked in ads.</li>
            <li>Certain game features (e.g., rewarded ads) may require you to view an advertisement in full to receive virtual game currency or bonuses.</li>
            <li>You agree not to use ad-blockers or scripts that interfere with the delivery of advertisements on the Service.</li>
          </ul>
        </ToSSection>

        <ToSSection icon="©️" number="7" title="Intellectual Property">
          <p>
            All content within KASINO21 — including but not limited to the game's source code, visual design, 
            graphics, logo, name "KASINO21", card game mechanics, sound effects, music, and written texts — 
            are the <strong className="text-white">exclusive intellectual property of Angel (KASINO21)</strong>.
          </p>
          <p className="mt-3">
            You may not copy, reproduce, distribute, modify, create derivative works from, or commercially exploit 
            any game content without prior written authorization. Screenshots for personal or non-commercial 
            sharing are permitted with proper attribution.
          </p>
        </ToSSection>

        <ToSSection icon="🚨" number="8" title="Disclaimer of Warranties">
          <p>
            KASINO21 is provided <strong className="text-white">"as is"</strong> and <strong className="text-white">"as available"</strong> without 
            warranties of any kind, either express or implied. We do not guarantee that:
          </p>
          <ul className="mt-3">
            <li>The Service will be uninterrupted, error-free, or available at all times.</li>
            <li>Virtual game items, coins, or progress will be preserved indefinitely.</li>
            <li>The game will be free of bugs, security vulnerabilities, or data errors.</li>
          </ul>
        </ToSSection>

        <ToSSection icon="🛡️" number="9" title="Limitation of Liability">
          <p>
            To the maximum extent permitted by applicable law, KASINO21 and its creators shall not be liable for 
            any indirect, incidental, special, consequential, or punitive damages, including but not limited to:
          </p>
          <ul className="mt-3">
            <li>Loss of virtual coins, items, or game progress due to server errors, maintenance, or closure.</li>
            <li>Interruptions to service availability or performance issues.</li>
            <li>Unauthorized access to your account resulting from your own security negligence.</li>
          </ul>
        </ToSSection>

        <ToSSection icon="🔄" number="10" title="Termination">
          <p>
            We reserve the right to suspend or terminate your account at any time, with or without notice, 
            for violations of these Terms or for any other reason at our sole discretion.
          </p>
          <p className="mt-3">
            You may delete your account at any time by contacting us. Upon account deletion, your personal data 
            will be handled per our <a href="/privacy" className="text-casino-gold hover:underline">Privacy Policy</a>.
          </p>
        </ToSSection>

        <ToSSection icon="📝" number="11" title="Changes to Terms">
          <p>
            We reserve the right to modify these Terms at any time. When we make material changes, we will update 
            the "Last updated" date above. Your continued use of KASINO21 after changes become effective constitutes 
            your acceptance of the revised Terms.
          </p>
        </ToSSection>

        <ToSSection icon="✉️" number="12" title="Contact">
          <p>For questions about these Terms of Service, contact us:</p>
          <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 bg-casino-gold/10 border border-casino-gold/20 rounded-xl flex items-center justify-center text-2xl shrink-0">
              ⚖️
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Legal Contact</p>
              <a href="mailto:kasino.21@gmail.com" className="text-casino-gold hover:text-white transition-colors font-mono text-sm">
                kasino.21@gmail.com
              </a>
              <p className="text-xs text-gray-600 mt-1">Response within 30 days · English & Spanish supported</p>
            </div>
          </div>
        </ToSSection>

      </main>

      {/* Footer */}
      <LegalFooter current="terms" />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function DisclaimerBanner() {
  return (
    <div className="flex items-start gap-4 bg-casino-gold/5 border border-casino-gold/20 rounded-2xl p-5">
      <span className="text-3xl shrink-0">⚠️</span>
      <div>
        <p className="text-sm font-black text-casino-gold uppercase tracking-wider mb-1">Important Disclaimer</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          KASINO21 is a <strong className="text-white">skill-based card game for entertainment only</strong>. 
          No real money is wagered. All in-game coins, items, and rewards have <strong className="text-white">no monetary value</strong> 
          and cannot be exchanged for real currency. This is not a gambling service.
        </p>
      </div>
    </div>
  );
}

function ToSSection({ icon, number, title, children }: { icon: string; number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-casino-gold/10 border border-casino-gold/20 text-casino-gold font-black text-sm shrink-0">
          {number}
        </div>
        <span className="text-xl">{icon}</span>
        <h2 className="text-xl font-display font-black text-white tracking-tight">{title}</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent ml-2" />
      </div>
      <div className="text-gray-400 text-sm leading-relaxed space-y-3 pl-11">
        {children}
      </div>
    </section>
  );
}

function FactCard({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <p className="text-sm font-bold text-white">{title}</p>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{children}</p>
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
