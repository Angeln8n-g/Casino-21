# Changelog

Todas las mejoras notables en el proyecto serán documentadas en este archivo.

## [Unreleased]

### Mejoras de UX/UI en la Tienda (Mobile-First)
- **Navegación Móvil Mejorada:** Las pestañas de categorías en la tienda ahora se muestran como una barra superior fijada (sticky top navigation) con desplazamiento horizontal (horizontal scroll) fluido y botones más grandes, optimizando el espacio vertical en móviles y facilitando la exploración con una mano.
- **Botones Adaptados para Pulgares (Touch Targets):** Se ha garantizado que los botones de compra, equipar y cambio de pestañas cumplan con los estándares WCAG 2.1, estableciendo un tamaño mínimo de `44x44px` para una interacción más fácil y reduciendo la tasa de clics accidentales.
- **Diseño de Grilla Adaptativo (Responsive Grid):** Las tarjetas de los artículos ahora se muestran en una grilla progresiva de 1 columna para pantallas muy pequeñas (`<375px`), 2 columnas para móviles estándar (`>=375px`), 3 columnas en tablets y 4 columnas en desktop grande, aprovechando el espacio visual.
- **Rendimiento de Imágenes:** Se implementó `loading="lazy"` y `decoding="async"` en todas las imágenes de los artículos para reducir los tiempos de carga (Lighthouse score), lo cual beneficia especialmente a conexiones 3G/4G móviles.
- **Modal tipo Bottom Sheet:** El panel de previsualización (Preview Modal) en dispositivos móviles fue transformado en un verdadero panel deslizante desde abajo (Bottom Sheet) con bordes superiores más redondeados y botones flotantes fijos en la base de la pantalla, facilitando las conversiones y accesibilidad.
- **Tipografía Escalable:** Se integraron clases de tipografía fluida en descripciones, títulos y etiquetas para mejorar la legibilidad en pantallas desde 320px hasta 1440px.
