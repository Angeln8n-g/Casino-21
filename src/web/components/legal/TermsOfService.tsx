import React, { useLayoutEffect } from 'react';
import { LogoK21 } from '../LogoK21';
import { updateSEO, resetSEO } from '../../utils/seo';

export function TermsOfService() {
  useLayoutEffect(() => {
    updateSEO({
      title: 'Términos de Servicio — KASINO21 | Juego de Cartas Online',
      description: 'Lee los Términos de Servicio de KASINO21. Reglas del juego, moneda virtual sin valor monetario, conducta de usuarios, propiedad intelectual y política de publicidad.',
      canonical: 'https://kasino21.com/terms',
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
            Términos de <span className="text-transparent bg-clip-text bg-gradient-to-r from-casino-gold to-orange-400">Servicio</span>
          </h1>
          <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
            Al acceder o jugar a KASINO21, aceptas estos Términos de Servicio.
            Por favor, léelos atentamente antes de registrarte.
          </p>
          <p className="text-[11px] text-gray-600 mt-4 font-mono">
            Última actualización: 11 de mayo de 2026 · Vigente de inmediato
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        <DisclaimerBanner />

        <ToSSection icon="✅" number="1" title="Aceptación de los Términos">
          <p>
            Al acceder o utilizar KASINO21 en <strong className="text-white">kasino21.com</strong> (el "Juego" o "Servicio"),
            confirmas que tienes al menos <strong className="text-white">13 años de edad</strong> y aceptas estar sujeto a
            estos Términos de Servicio ("Términos").
          </p>
          <p className="mt-3">
            Si no estás de acuerdo con alguna parte de estos Términos, debes dejar de usar el Servicio de inmediato.
            Estos Términos constituyen un acuerdo legal vinculante entre tú y KASINO21.
          </p>
        </ToSSection>

        <ToSSection icon="🎮" number="2" title="Propósito del Juego y Moneda Virtual">
          <p>
            KASINO21 es un <strong className="text-white">juego de cartas online gratuito con fines de entretenimiento</strong>.
            NO es un servicio de apuestas. No se realiza ningún tipo de juego de azar con dinero real en esta plataforma.
          </p>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <FactCard icon="🪙" title="Monedas Virtuales">
              Todas las monedas, divisas y objetos del juego tienen <strong>valor monetario cero</strong>.
              No se pueden canjear por dinero real, criptomonedas ni bienes o servicios fuera del juego.
            </FactCard>
            <FactCard icon="🚫" title="Sin Apuestas Reales">
              KASINO21 no facilita, habilita ni fomenta las apuestas con dinero real.
              Cualquier similitud con mecánicas de juego de azar es puramente por entretenimiento y juego basado en habilidad.
            </FactCard>
          </div>
        </ToSSection>

        <ToSSection icon="👤" number="3" title="Registro de Cuenta">
          <ul>
            <li>Debes tener al menos <strong className="text-white">13 años</strong> para crear una cuenta.</li>
            <li>Debes proporcionar una dirección de correo electrónico válida y un nombre de usuario único.</li>
            <li>Eres responsable de mantener la seguridad de las credenciales de tu cuenta.</li>
            <li>Cada persona puede tener una sola cuenta activa. Está prohibido tener múltiples cuentas.</li>
            <li>Aceptas proporcionar información precisa y actualizarla cuando sea necesario.</li>
            <li>Debes notificarnos de inmediato cualquier acceso no autorizado a tu cuenta.</li>
          </ul>
        </ToSSection>

        <ToSSection icon="⚖️" number="4" title="Conducta del Usuario">
          <p>Al usar KASINO21, aceptas <strong className="text-white">NO</strong>:</p>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            {[
              { icon: '🤖', text: 'Usar bots, scripts de automatización o IA para jugar en tu lugar' },
              { icon: '🐛', text: 'Explotar bugs, fallos o mecánicas de juego no previstas' },
              { icon: '😤', text: 'Acosar, intimidar o enviar mensajes abusivos a otros jugadores' },
              { icon: '🔓', text: 'Intentar hackear, realizar ingeniería inversa o comprometer los servidores del juego' },
              { icon: '💰', text: 'Vender, intercambiar o transferir tu cuenta a otra persona' },
              { icon: '📢', text: 'Usar el juego para enviar spam o promocionar servicios externos' },
              { icon: '🌐', text: 'Usar VPNs o proxies para eludir restricciones regionales' },
              { icon: '📜', text: 'Violar cualquier ley local, nacional o internacional aplicable' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-2 bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                <span className="shrink-0">{icon}</span>
                <p className="text-xs text-gray-400">{text}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Las infracciones pueden resultar en la suspensión o el cierre permanente de la cuenta sin previo aviso ni reembolso.
            Nos reservamos el derecho de determinar qué constituye una infracción.
          </p>
        </ToSSection>

        <ToSSection icon="🏆" number="5" title="Compras Virtuales">
          <p>
            KASINO21 puede ofrecer paquetes opcionales de moneda virtual, paquetes de avatares o Pases VIP para su compra
            con dinero real (a través de Stripe u otros procesadores de pago).
          </p>
          <ul className="mt-3">
            <li>Todas las compras son <strong className="text-white">finales y no reembolsables</strong> excepto cuando lo exija la ley aplicable.</li>
            <li>La compra otorga una licencia limitada e intransferible para usar los objetos virtuales en el juego.</li>
            <li>Los objetos virtuales no son propiedad y no tienen valor en efectivo.</li>
            <li>Nos reservamos el derecho de modificar, descontinuar o eliminar cualquier objeto virtual en cualquier momento.</li>
            <li>Los precios están sujetos a cambios. Notificaremos a los usuarios sobre cambios de precio con antelación cuando sea posible.</li>
          </ul>
        </ToSSection>

        <ToSSection icon="📢" number="6" title="Anuncios y Monetización">
          <p>
            Para mantener KASINO21 gratuito, mostramos anuncios proporcionados por <strong className="text-white">Adsterra</strong>.
          </p>
          <ul className="mt-3">
            <li>Podemos usar cookies para personalizar anuncios y analizar el tráfico.</li>
            <li>Los anuncios son proporcionados por terceros; no somos responsables del contenido de sitios externos enlazados en los anuncios.</li>
            <li>Ciertas funciones del juego (p. ej., anuncios recompensados) pueden requerir que veas un anuncio completo para recibir moneda virtual o bonificaciones.</li>
            <li>Aceptas no usar bloqueadores de anuncios o scripts que interfieran con la entrega de anuncios en el Servicio.</li>
          </ul>
        </ToSSection>

        <ToSSection icon="©️" number="7" title="Propiedad Intelectual">
          <p>
            Todo el contenido de KASINO21 — incluyendo, entre otros, el código fuente del juego, el diseño visual,
            los gráficos, el logotipo, el nombre "KASINO21", las mecánicas del juego de cartas, los efectos de sonido,
            la música y los textos escritos — son <strong className="text-white">propiedad intelectual exclusiva de Angel (KASINO21)</strong>.
          </p>
          <p className="mt-3">
            No puedes copiar, reproducir, distribuir, modificar, crear obras derivadas ni explotar comercialmente
            ningún contenido del juego sin autorización previa por escrito. Se permiten capturas de pantalla para
            uso personal o no comercial con la atribución correspondiente.
          </p>
        </ToSSection>

        <ToSSection icon="🚨" number="8" title="Exención de Garantías">
          <p>
            KASINO21 se proporciona <strong className="text-white">"tal cual"</strong> y <strong className="text-white">"según disponibilidad"</strong> sin
            garantías de ningún tipo, ya sean expresas o implícitas. No garantizamos que:
          </p>
          <ul className="mt-3">
            <li>El Servicio sea ininterrumpido, libre de errores o esté disponible en todo momento.</li>
            <li>Los objetos virtuales, monedas o el progreso se conserven indefinidamente.</li>
            <li>El juego esté libre de bugs, vulnerabilidades de seguridad o errores de datos.</li>
          </ul>
        </ToSSection>

        <ToSSection icon="🛡️" number="9" title="Limitación de Responsabilidad">
          <p>
            En la máxima medida permitida por la ley aplicable, KASINO21 y sus creadores no serán responsables por
            daños indirectos, incidentales, especiales, consecuentes o punitivos, incluyendo, entre otros:
          </p>
          <ul className="mt-3">
            <li>Pérdida de monedas virtuales, objetos o progreso del juego debido a errores del servidor, mantenimiento o cierre.</li>
            <li>Interrupciones en la disponibilidad del servicio o problemas de rendimiento.</li>
            <li>Acceso no autorizado a tu cuenta como resultado de tu propia negligencia de seguridad.</li>
          </ul>
        </ToSSection>

        <ToSSection icon="🔄" number="10" title="Terminación">
          <p>
            Nos reservamos el derecho de suspender o cerrar tu cuenta en cualquier momento, con o sin previo aviso,
            por violaciones de estos Términos o por cualquier otro motivo a nuestra entera discreción.
          </p>
          <p className="mt-3">
            Puedes eliminar tu cuenta en cualquier momento contactándonos. Tras la eliminación de la cuenta, tus datos
            personales se gestionarán según nuestra <a href="/privacy" className="text-casino-gold hover:underline">Política de Privacidad</a>.
          </p>
        </ToSSection>

        <ToSSection icon="📝" number="11" title="Cambios a los Términos">
          <p>
            Nos reservamos el derecho de modificar estos Términos en cualquier momento. Cuando realicemos cambios
            importantes, actualizaremos la fecha de "Última actualización" arriba. El uso continuado de KASINO21
            después de que los cambios entren en vigor constituye tu aceptación de los Términos revisados.
          </p>
        </ToSSection>

        <ToSSection icon="✉️" number="12" title="Contacto">
          <p>Si tienes preguntas sobre estos Términos de Servicio, contáctanos:</p>
          <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 bg-casino-gold/10 border border-casino-gold/20 rounded-xl flex items-center justify-center text-2xl shrink-0">
              ⚖️
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Contacto Legal</p>
              <a href="mailto:kasino21.service@gmail.com" className="text-casino-gold hover:text-white transition-colors font-mono text-sm">
                kasino21.service@gmail.com
              </a>
              <p className="text-xs text-gray-600 mt-1">Respuesta en 30 días · Atención en español</p>
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
        <p className="text-sm font-black text-casino-gold uppercase tracking-wider mb-1">Aviso Importante</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          KASINO21 es un <strong className="text-white">juego de cartas basado en habilidad solo para entretenimiento</strong>.
          No se apuesta dinero real. Todas las monedas, objetos y recompensas del juego tienen <strong className="text-white">valor monetario cero</strong>
          y no pueden intercambiarse por divisas reales. Esto no es un servicio de apuestas.
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
      <div className="text-gray-400 text-sm leading-relaxed space-y-3 pl-6 md:pl-11">
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
    { href: '/privacy', label: 'Política de Privacidad' },
    { href: '/terms', label: 'Términos de Servicio' },
    { href: '/cookies', label: 'Política de Cookies' },
  ];

  return (
    <footer className="hidden md:block mt-16 border-t border-white/5 bg-black/20">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <LogoK21 size={28} />
          <div>
            <p className="text-xs font-black text-white/60 uppercase tracking-widest">KASINO21</p>
            <p className="text-[10px] text-gray-600">© 2026 · Todos los derechos reservados</p>
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
          ← Volver al Juego
        </a>
      </div>
    </footer>
  );
}
