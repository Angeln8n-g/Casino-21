import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Calendar, Clock, ArrowRight, X } from 'lucide-react';
import { blogPosts, BlogPost } from '../../web/data/blog-posts';

const CATEGORY_COLORS: Record<string, string> = {
  'Guías': 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
  'Estrategia': 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400',
  'Noticias': 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30 text-cyan-400',
  'Mecánicas': 'from-amber-500/20 to-amber-600/20 border-amber-500/30 text-amber-400',
  'Historia': 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30 text-emerald-400',
  'Consejos': 'from-rose-500/20 to-rose-600/20 border-rose-500/30 text-rose-400',
};

const DEFAULT_IMAGES: Record<string, string> = {
  'Guías': 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800',
  'Estrategia': 'https://images.unsplash.com/photo-1603484477859-abe6a79798f07?auto=format&fit=crop&q=80&w=800',
  'Noticias': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800',
  'Mecánicas': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800',
  'Historia': 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&q=80&w=800',
  'Consejos': 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&q=80&w=800',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BlogSection() {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  
  // Mostrar los 3 artículos más recientes en la landing
  const postsToShow = blogPosts.slice(0, 3);

  return (
    <section id="blog" className="py-20 px-6 relative overflow-hidden bg-transparent">
      {/* Background ambient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-500/[0.01] rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-yellow-500/[0.01] rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="text-[10px] uppercase tracking-[0.25em] text-yellow-400 font-bold mb-2 font-['Chakra_Petch'] flex items-center justify-center gap-1.5">
            <BookOpen size={10} /> Noticias y Guías
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-['Russo_One'] text-white">
            Blog de <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 neon-gold">Estrategia</span>
          </h2>
          <p className="text-gray-400 text-sm mt-3 font-['Chakra_Petch'] max-w-md mx-auto">
            Aprende de los expertos, descubre mecánicas de juego y mejora tus jugadas en la mesa.
          </p>
        </div>

        {/* Grid of posts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {postsToShow.map((post, idx) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              whileHover={{ y: -6 }}
              className="group relative overflow-hidden rounded-2xl border border-white/5 bg-[#050811]/40 hover:border-yellow-500/25 hover:shadow-[0_8px_30px_rgba(251,191,36,0.1)] transition-all duration-300 flex flex-col h-full"
            >
              {/* Thumbnail Image */}
              <div className="relative h-44 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent z-10" />
                <div
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                  style={{ backgroundImage: `url(${DEFAULT_IMAGES[post.category] || DEFAULT_IMAGES['Noticias']})` }}
                />
                <span className={`absolute top-4 left-4 z-20 px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full border bg-gradient-to-r ${CATEGORY_COLORS[post.category] || 'from-white/10 to-white/5 border-white/20'}`}>
                  {post.category}
                </span>
              </div>

              {/* Info & Text */}
              <div className="p-5 flex flex-col flex-grow">
                <div className="flex items-center gap-3 text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-3 font-['Chakra_Petch']">
                  <span className="flex items-center gap-1"><Calendar size={10} /> {formatDate(post.date)}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-700" />
                  <span className="flex items-center gap-1"><Clock size={10} /> {post.readTime} min</span>
                </div>

                <h3 className="text-sm font-bold text-white mb-2 group-hover:text-yellow-400 transition-colors leading-snug line-clamp-2 font-['Chakra_Petch']">
                  {post.title}
                </h3>

                <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 mb-5 font-['Chakra_Petch']">
                  {post.excerpt}
                </p>

                <div className="mt-auto">
                  <button
                    onClick={() => setSelectedPost(post)}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-yellow-400 uppercase tracking-widest group-hover:gap-2.5 transition-all font-['Chakra_Petch'] cursor-pointer"
                  >
                    Leer Artículo <ArrowRight size={10} />
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Ver más en el blog */}
        <div className="mt-12 text-center">
          <a
            href="/blog"
            className="inline-flex items-center text-xs text-gray-500 hover:text-yellow-400 transition-colors font-['Chakra_Petch'] uppercase tracking-widest cursor-pointer"
          >
            Visitar Blog Completo →
          </a>
        </div>
      </div>

      {/* Article Modal Overlay */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-[#040814] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Cerrar artículo"
              >
                <X size={16} />
              </button>

              {/* Category Badge */}
              <div className="mb-4">
                <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border bg-gradient-to-r ${CATEGORY_COLORS[selectedPost.category] || 'from-white/10 to-white/5'}`}>
                  {selectedPost.category}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-black font-['Russo_One'] text-white mb-4 pr-8">
                {selectedPost.title}
              </h2>

              {/* Meta information */}
              <div className="flex items-center gap-4 text-xs text-gray-500 font-bold uppercase tracking-widest mb-6 border-b border-white/5 pb-4 font-['Chakra_Petch']">
                <span className="flex items-center gap-1.5"><Calendar size={12} /> {formatDate(selectedPost.date)}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                <span className="flex items-center gap-1.5"><Clock size={12} /> {selectedPost.readTime} minutos de lectura</span>
              </div>

              {/* Article Content Rendered */}
              <div 
                className="prose prose-invert max-w-none text-sm text-gray-300 leading-relaxed space-y-4 font-['Chakra_Petch'] select-text
                  prose-h2:text-lg prose-h2:font-black prose-h2:font-['Russo_One'] prose-h2:text-yellow-400 prose-h2:mt-6 prose-h2:mb-3
                  prose-h3:text-base prose-h3:font-bold prose-h3:text-cyan-400 prose-h3:mt-4 prose-h3:mb-2
                  prose-ul:list-disc prose-ul:pl-5 prose-ul:space-y-2
                  prose-strong:text-white"
                dangerouslySetInnerHTML={{ __html: selectedPost.content }}
              />
              
              <div className="mt-8 pt-4 border-t border-white/5 flex justify-end">
                <button
                  onClick={() => setSelectedPost(null)}
                  className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all font-['Chakra_Petch'] cursor-pointer"
                >
                  Cerrar Artículo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
