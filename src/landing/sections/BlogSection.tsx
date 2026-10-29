import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, ArrowRight, X, BookOpen, Layers } from 'lucide-react';
import { blogPosts, BlogPost } from '../../web/data/blog-posts';
import { useFocusTrap } from '../../web/hooks/useFocusTrap';

const CATEGORY_COLORS: Record<string, string> = {
  Guías: 'from-blue-500/20 to-blue-600/20 border-blue-500/40 text-blue-300',
  Estrategia: 'from-amber-500/20 to-yellow-600/20 border-amber-500/40 text-amber-300',
  Noticias: 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/40 text-cyan-300',
  Mecánicas: 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/40 text-emerald-300',
  Historia: 'from-amber-900/20 to-stone-800/30 border-amber-800/40 text-amber-200',
  Consejos: 'from-rose-500/20 to-rose-600/20 border-rose-500/40 text-rose-300',
};

const CATEGORY_ICONS: Record<string, string> = {
  Guías: '♠',
  Estrategia: '♦',
  Noticias: '♣',
  Mecánicas: '♥',
  Historia: '♠',
  Consejos: '♦',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function BlogSection() {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const modalRef = useFocusTrap({
    isOpen: !!selectedPost,
    onClose: () => setSelectedPost(null),
  });

  const postsToShow = blogPosts.slice(0, 3);

  return (
    <section id="blog" className="py-24 px-4 sm:px-6 lg:px-8 relative bg-[#040712] border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading (No eyebrow per craft-floor) */}
        <div className="text-left max-w-3xl mb-12">
          <h2 className="text-3xl sm:text-5xl font-black font-['Russo_One'] text-white tracking-tight">
            Guías y estrategia de juego
          </h2>
          <p className="mt-3 text-base sm:text-lg text-gray-300 font-['Chakra_Petch'] leading-relaxed">
            Aprende a contar cartas, optimizar tus formaciones y dominar la psicología del rival en la mesa.
          </p>
        </div>

        {/* Grid of posts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {postsToShow.map((post) => (
            <article
              key={post.slug}
              className="group rounded-3xl border border-white/10 bg-[#081020] hover:border-amber-400/40 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xl"
            >
              {/* Graphic Card Header (Replaces external Unsplash images) */}
              <div
                className="relative h-40 p-5 flex flex-col justify-between select-none overflow-hidden"
                style={{
                  background:
                    'radial-gradient(circle at 80% 20%, #152747 0%, #0a1426 60%, #060c18 100%)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border bg-gradient-to-r font-['Chakra_Petch'] ${
                      CATEGORY_COLORS[post.category] || 'from-white/10 to-white/5 border-white/20 text-white'
                    }`}
                  >
                    {post.category}
                  </span>

                  <span className="text-2xl opacity-20 font-serif text-white">
                    {CATEGORY_ICONS[post.category] || '♠'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider font-['Chakra_Petch']">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} /> {formatDate(post.date)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {post.readTime} min lectura
                  </span>
                </div>
              </div>

              {/* Info & Text */}
              <div className="p-6 flex flex-col flex-grow justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors leading-snug font-['Chakra_Petch'] line-clamp-2">
                    {post.title}
                  </h3>

                  <p className="text-xs text-gray-300 leading-relaxed line-clamp-3 font-['Chakra_Petch']">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setSelectedPost(post)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 uppercase tracking-wider transition-colors font-['Chakra_Petch'] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded"
                  >
                    <span>Leer Artículo Completo</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* View All Blog Link */}
        <div className="mt-10 text-center">
          <a
            href="/blog"
            className="inline-flex items-center gap-2 text-xs font-['Chakra_Petch'] font-bold text-gray-400 hover:text-amber-400 uppercase tracking-widest transition-colors py-2 px-4 rounded-xl bg-white/[0.04] border border-white/10"
          >
            <span>Ver Todos los Artículos del Blog</span>
            <ArrowRight size={13} />
          </a>
        </div>
      </div>

      {/* Article Modal Overlay */}
      <AnimatePresence>
        {selectedPost && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedPost(null)}
          >
            <motion.div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="post-title"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-[#081020] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                aria-label="Cerrar artículo"
              >
                <X size={18} />
              </button>

              {/* Category */}
              <div className="mb-3">
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 font-['Chakra_Petch']">
                  {selectedPost.category}
                </span>
              </div>

              {/* Title */}
              <h2 id="post-title" className="text-2xl sm:text-3xl font-black font-['Russo_One'] text-white mb-3 pr-8">
                {selectedPost.title}
              </h2>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-gray-400 font-['Chakra_Petch'] font-semibold mb-6 border-b border-white/[0.08] pb-4">
                <span>{formatDate(selectedPost.date)}</span>
                <span>•</span>
                <span>{selectedPost.readTime} minutos de lectura</span>
              </div>

              {/* Content */}
              <div
                className="prose prose-invert max-w-none text-sm text-gray-200 leading-relaxed font-['Chakra_Petch'] select-text"
                dangerouslySetInnerHTML={{ __html: selectedPost.content }}
              />

              <div className="mt-8 pt-4 border-t border-white/[0.08] flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPost(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-['Chakra_Petch'] font-bold text-xs"
                >
                  Cerrar Artículo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default memo(BlogSection);
