import React, { useLayoutEffect } from 'react';
import { LogoK21 } from '../LogoK21';
import { updateSEO, resetSEO } from '../../utils/seo';

export function PrivacyPolicy() {
  useLayoutEffect(() => {
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
            Política de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Privacidad</span>
          </h1>
          <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
            En KASINO21, estamos comprometidos con la protección de tu privacidad. Esta política explica qué datos recopilamos,
            cómo los usamos y cuáles son tus derechos.
          </p>
          <p className="text-[11px] text-gray-600 mt-4 font-mono">
            Última actualización: 11 de mayo de 2026 · Vigente de inmediato
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        <Section icon="🛡️" title="1. Información que Recopilamos">
          <p>KASINO21 está diseñado pensando en tu privacidad. Recopilamos los datos mínimos necesarios para operar el juego:</p>
          <ul>
            <li>
              <strong>Datos de la cuenta:</strong> Correo electrónico y nombre de usuario al registrarte. Se usan únicamente para la autenticación e identificación de tu cuenta.
            </li>
            <li>
              <strong>Datos del juego:</strong> Puntuaciones, rango ELO, monedas, historial de partidas, avatares y objetos del juego. Se almacenan en nuestra base de datos segura para ofrecer la experiencia de juego.
            </li>
            <li>
              <strong>Datos analíticos:</strong> Estadísticas de uso anónimas a través de Google Analytics (p. ej., duración de la sesión, páginas visitadas, tipo de dispositivo). Estos datos no pueden identificarte personalmente.
            </li>
            <li>
              <strong>Datos publicitarios:</strong> Google AdSense puede recopilar datos mediante cookies y tecnologías similares para mostrar anuncios relevantes. Consulta la Sección 4 para más detalles.
            </li>
          </ul>
          <p className="text-sm text-gray-500 italic mt-2">
            No recopilamos <strong className="text-gray-400">ninguna</strong> información de pago, dinero real ni datos personales sensibles. Todas las monedas y objetos del juego no tienen valor monetario.
          </p>
        </Section>

        <Section icon="🍪" title="2. Cookies y Tecnologías de Seguimiento">
          <p>Utilizamos cookies y tecnologías similares para los siguientes fines:</p>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <CookieCard
              type="Esenciales"
              color="emerald"
              items={['Sesión de autenticación del usuario', 'Progreso y configuración del juego', 'Tokens de seguridad']}
              canDisable={false}
            />
            <CookieCard
              type="Analíticas"
              color="blue"
              items={['Seguimiento anónimo de visitas a páginas', 'Estadísticas de uso de funciones', 'Monitoreo de rendimiento']}
              canDisable={true}
            />
            <CookieCard
              type="Publicitarias"
              color="amber"
              items={['Personalización de Google AdSense', 'Control de frecuencia de anuncios', 'Entrega de anuncios basada en intereses']}
              canDisable={true}
            />
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Puedes gestionar las cookies mediante la configuración de tu navegador. Ten en cuenta que deshabilitar las cookies esenciales impedirá que puedas jugar.
            Consulta nuestra <a href="/cookies" className="text-casino-gold hover:underline">Política de Cookies</a> para más información.
          </p>
        </Section>

        <Section icon="📡" title="3. Cómo Usamos tus Datos">
          <ul>
            <li>Autenticar tu cuenta y mantener tu sesión segura</li>
            <li>Guardar y mostrar tu progreso, rango y logros en el juego</li>
            <li>Facilitar el emparejamiento multijugador y las sesiones de juego en tiempo real</li>
            <li>Analizar patrones de uso para mejorar la experiencia de juego</li>
            <li>Mostrar anuncios relevantes a través de Google AdSense</li>
            <li>Enviar correos transaccionales (p. ej., restablecimiento de contraseña) — sin correos de marketing</li>
          </ul>
          <p className="mt-3 text-sm text-gray-500 italic">
            Nunca vendemos tus datos personales a terceros. No utilizamos tus datos para la toma de decisiones automatizada que produzca efectos legales.
          </p>
        </Section>

        <Section icon="🤝" title="4. Servicios de Terceros">
          <p>KASINO21 utiliza los siguientes servicios de terceros, cada uno con sus propias políticas de privacidad:</p>
          <div className="space-y-3 mt-4">
            <ThirdPartyRow
              name="Google AdSense"
              purpose="Publicidad contextual para mantener el juego gratuito"
              url="https://policies.google.com/technologies/ads"
            />
            <ThirdPartyRow
              name="Google Analytics"
              purpose="Analíticas de uso anónimas para mejorar el juego"
              url="https://policies.google.com/privacy"
            />
            <ThirdPartyRow
              name="Supabase"
              purpose="Base de datos segura y autenticación"
              url="https://supabase.com/privacy"
            />
          </div>
        </Section>

        <Section icon="🌍" title="5. Almacenamiento y Seguridad de los Datos">
          <p>
            Tus datos de juego se almacenan en servidores operados por Supabase (regiones UE/EE. UU.). Implementamos medidas
            de seguridad estándar de la industria, incluyendo conexiones cifradas (HTTPS/TLS), hash de contraseñas con bcrypt
            y políticas de seguridad a nivel de fila en todas las tablas de la base de datos.
          </p>
          <p className="mt-3 text-gray-400">
            Aunque nos esforzamos por proteger tus datos, ninguna transmisión por internet es 100% segura. No podemos garantizar
            una seguridad absoluta, pero te notificaremos sobre cualquier violación de datos significativa según lo exija la ley.
          </p>
        </Section>

        <Section icon="👶" title="6. Privacidad de Menores">
          <p>
            KASINO21 está destinado a usuarios mayores de <strong>13 años</strong>. No recopilamos a sabiendas información
            personal de niños menores de 13 años. Si eres padre o tutor y crees que tu hijo nos ha proporcionado datos
            personales, contáctanos de inmediato en{' '}
            <a href="mailto:kansino21.service@gmail.com" className="text-casino-gold hover:underline font-mono">
              kansino21.service@gmail.com
            </a>{' '}
            y eliminaremos esa información rápidamente.
          </p>
        </Section>

        <Section icon="⚖️" title="7. Tus Derechos (GDPR y CCPA)">
          <p>Dependiendo de tu ubicación, puedes tener los siguientes derechos sobre tus datos personales:</p>
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            {[
              { right: 'Acceso', desc: 'Solicitar una copia de tus datos personales' },
              { right: 'Rectificación', desc: 'Corregir datos inexactos o incompletos' },
              { right: 'Supresión', desc: 'Solicitar la eliminación de tu cuenta y datos' },
              { right: 'Portabilidad', desc: 'Recibir tus datos en un formato portátil' },
              { right: 'Oposición', desc: 'Oponearte a ciertas actividades de tratamiento de datos' },
              { right: 'Exclusión', desc: 'Excluirte de la personalización publicitaria' },
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
            Para ejercer cualquiera de estos derechos, contáctanos en{' '}
            <a href="mailto:kansino21.service@gmail.com" className="text-casino-gold hover:underline font-mono">
              kansino21.service@gmail.com
            </a>. Responderemos en un plazo de 30 días.
          </p>
        </Section>

        <Section icon="🔄" title="8. Cambios a Esta Política">
          <p>
            Podemos actualizar esta Política de Privacidad periódicamente. Cuando realicemos cambios significativos,
            actualizaremos la fecha de "Última actualización" en la parte superior de esta página. El uso continuado
            de KASINO21 después de la publicación de los cambios constituye tu aceptación de la política actualizada.
          </p>
        </Section>

        <Section icon="✉️" title="9. Contacto">
          <p>Si tienes preguntas, inquietudes o solicitudes sobre esta Política de Privacidad, contáctanos:</p>
          <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-2xl shrink-0">
              📬
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Contacto de Privacidad</p>
              <a href="mailto:kansino21.service@gmail.com" className="text-casino-gold hover:text-white transition-colors font-mono text-sm">
                kansino21.service@gmail.com
              </a>
              <p className="text-xs text-gray-600 mt-1">Respuesta en 30 días · Atención en español</p>
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
        {canDisable ? '⚙️ Se puede deshabilitar' : '🔒 Obligatorio'}
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
        Ver Política →
      </a>
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
    <footer className="mt-16 border-t border-white/5 bg-black/20">
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
