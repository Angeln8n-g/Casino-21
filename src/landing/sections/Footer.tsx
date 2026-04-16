import React from 'react';
import brand21Icon from '../../Public/Icon (2).png';

export default function Footer() {
  return (
    <>
      {/* CTA Section */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            ¿Listo para jugar?
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Crea tu cuenta gratis y empieza a subir en el ranking hoy mismo.
          </p>
          <a
            href="/index.html"
            className="inline-block bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black text-xl px-14 py-5 rounded-2xl hover:scale-105 transition-transform shadow-[0_0_40px_rgba(234,179,8,0.25)]"
          >
            EMPEZAR AHORA — ES GRATIS
          </a>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-500 text-sm">
          <div className="flex items-center gap-2">
            <img src={brand21Icon} alt="Kasino21" className="w-6 h-6 rounded object-contain opacity-60" />
            <span className="font-black text-white/60">KASINO21</span>
          </div>
          <span>Juego de cartas competitivo online · {new Date().getFullYear()}</span>
        </div>
      </footer>
    </>
  );
}
