# Casino 21 Store - UX/UI & Technical Documentation

## 1. Resumen Ejecutivo
La tienda online ("Store VIP") ha sido reconstruida aplicando principios de **UX/UI Pro Max**, enfocada en diseño *mobile-first*, accesibilidad (WCAG 2.1) y optimización de flujos de conversión para el ecosistema de Casino 21.

## 2. Guía de Estilo (Design System)

### Paleta de Colores
- **Fondo Base**: `#0F0F23` (Midnight Dark)
- **Acento Primario**: `#7C3AED` (Neon Purple)
- **Acento Secundario**: `#A78BFA` (Soft Purple)
- **Llamado a la Acción (CTA) Compra**: `#F43F5E` (Rose/Red para alto contraste)
- **Llamado a la Acción (CTA) Premium**: `#EAB308` (Yellow/Gold)
- **Texto Principal**: `#FFFFFF` y `#E2E8F0`

### Tipografía
- **Fuente Principal**: `Chakra Petch` (Gaming, Bold, Action). Importada desde Google Fonts para títulos y botones.
- **Fuente Secundaria**: `Inter` / `sans-serif` (legibilidad de descripciones).

### Efectos y Animaciones
- **Glassmorphism**: Uso de `bg-black/40 backdrop-blur-md` en tarjetas.
- **Microinteracciones**: Hover con escalado sutil (`scale-105`), sombras de colores (`drop-shadow`) y transiciones de borde (`duration-300`).
- **Feedback Háptico**: Integrado con el API del dispositivo (`triggerHaptic`) en cada click y compra exitosa.
- **Esqueletos de Carga (Skeleton Loaders)**: Añadidos para mejorar la percepción de velocidad (Tiempos de Carga < 3s).

---

## 3. Arquitectura Técnica

### 3.1. `Store.tsx`
El componente principal de la tienda ahora incluye:
1. **Filtros Avanzados (`useMemo`)**:
   - Barra de búsqueda por nombre y descripción.
   - Ordenamiento por precio (asc/desc) y alfabético.
2. **Flujo de Compra Optimizado**:
   - Se eliminó el bloqueante `window.confirm`.
   - Se implementó un modal de confirmación inferior ("BottomSheet") no intrusivo (`confirmBuyItem`).
3. **Simulación A/B Testing**:
   - Asignación aleatoria de `isCompactView` en montaje, para medir conversiones entre una cuadrícula densa vs una detallada.

### 3.2. `StoreAdmin.tsx`
El panel de administración fue rediseñado para ser intuitivo:
1. **Dashboard Kpis**: Visualización rápida de métricas (Total, Activos, Premium, Categorías).
2. **UX de Formularios**:
   - Mejor contraste en inputs.
   - Subida de archivos asíncrona con feedback visual (Spinner, URLs auto-rellenadas).
   - Prevención de envíos múltiples (`disabled={uploading}`).
3. **Accesibilidad**: Etiquetas `aria-label`, contraste adecuado y navegación por teclado en la tabla.

---

## 4. Capacitación para el Equipo de Mantenimiento

### 4.1. Agregar Nuevos Artículos
1. Navega al panel de administración.
2. Haz clic en **+ Nuevo Artículo**.
3. Selecciona la categoría. Si es un `Tema Premium`, debes ingresar un `theme_key` que esté previamente registrado en `src/themes/themeRegistry.ts`.
4. Sube la imagen usando el botón (soporta drag & drop nativo de OS) o pega una URL directa.

### 4.2. Pruebas A/B
Actualmente, `isCompactView` determina la densidad de la grilla en la tienda de forma aleatoria (50/50) al montar el componente `Store.tsx`. Para implementar un tracker real:
- Envía el valor de `isCompactView` como metadato a tu plataforma de analíticas (ej: Mixpanel o PostHog) durante el evento de `handleBuy`.

### 4.3. Accesibilidad (WCAG 2.1)
Si modificas los componentes, asegúrate de:
- Mantener los atributos `role="button"` o `role="tab"`.
- Validar que se pueda navegar con la tecla `Tab` y accionar con `Enter`.
- No remover las etiquetas `aria-label` ni `aria-hidden="true"` (para emojis puramente decorativos).
