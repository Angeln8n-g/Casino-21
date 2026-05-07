# Requirements Document

## Introduction

Este documento define los requisitos para convertir Kasino21, un juego de cartas competitivo multijugador en línea, en una Progressive Web App (PWA). La conversión permitirá a los usuarios instalar la aplicación en sus dispositivos móviles y de escritorio, disfrutar de una experiencia similar a una aplicación nativa, y acceder a funcionalidades básicas sin conexión.

El proyecto actual utiliza React 19, Vite 5, TypeScript, Tailwind CSS, Supabase para backend y Socket.io para comunicación en tiempo real. La conversión a PWA debe mantener toda la funcionalidad existente mientras añade capacidades de instalación, caché inteligente y experiencia offline.

## Glossary

- **PWA_System**: El sistema completo de Progressive Web App que incluye manifest, service worker y configuración de caché
- **Service_Worker**: Script que se ejecuta en segundo plano y gestiona eventos de red, caché y sincronización
- **Manifest**: Archivo JSON que define metadatos de la aplicación (nombre, iconos, colores, modo de visualización)
- **Cache_Manager**: Componente del Service Worker responsable de almacenar y recuperar recursos en caché
- **Install_Prompt**: Interfaz de usuario que permite al usuario instalar la PWA en su dispositivo
- **Offline_Handler**: Componente que gestiona la experiencia del usuario cuando no hay conexión a internet
- **Asset_Precacher**: Sistema que almacena recursos críticos durante la instalación del Service Worker
- **Network_Strategy**: Estrategia de caché utilizada para diferentes tipos de recursos (cache-first, network-first, etc.)
- **Update_Manager**: Sistema que detecta y aplica actualizaciones del Service Worker
- **Installable_App**: La aplicación web cuando cumple los criterios de instalabilidad de PWA

## Requirements

### Requirement 1: Web App Manifest

**User Story:** Como usuario, quiero que la aplicación tenga un manifest válido, para que pueda ser instalada en mi dispositivo como una aplicación nativa.

#### Acceptance Criteria

1. THE PWA_System SHALL generate a manifest.json file with name, short_name, description, theme_color, background_color, display mode, start_url, scope, and icons
2. THE Manifest SHALL include icons in sizes 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, and 512x512 pixels
3. THE Manifest SHALL specify display mode as "standalone" to provide app-like experience
4. THE Manifest SHALL set theme_color to "#020617" to match the existing application theme
5. THE Manifest SHALL set background_color to "#020617" for splash screen consistency
6. THE Manifest SHALL define start_url as "/" to launch at the application root
7. THE Manifest SHALL include lang property set to "es" for Spanish language
8. THE Manifest SHALL be referenced in index.html via link tag with rel="manifest"

### Requirement 2: Service Worker Registration

**User Story:** Como desarrollador, quiero registrar un Service Worker, para que la aplicación pueda interceptar peticiones de red y gestionar caché.

#### Acceptance Criteria

1. WHEN the application loads, THE PWA_System SHALL register the Service Worker if the browser supports it
2. THE PWA_System SHALL register the Service Worker only in production builds
3. WHEN Service Worker registration succeeds, THE PWA_System SHALL log the registration status
4. IF Service Worker registration fails, THEN THE PWA_System SHALL log the error and continue normal operation
5. THE Service_Worker SHALL be served from the root path to maximize scope coverage
6. WHEN the Service Worker updates, THE Update_Manager SHALL detect the new version

### Requirement 3: Asset Precaching Strategy

**User Story:** Como usuario, quiero que los recursos críticos se carguen rápidamente, para que la aplicación responda de forma instantánea.

#### Acceptance Criteria

1. WHEN the Service Worker installs, THE Asset_Precacher SHALL cache the application shell (index.html, main JavaScript bundle, main CSS bundle)
2. THE Asset_Precacher SHALL cache brand assets (logos, icons, brand images)
3. THE Asset_Precacher SHALL cache critical fonts from Google Fonts (Inter, Outfit, JetBrains Mono)
4. THE Cache_Manager SHALL version cache names to enable clean updates
5. WHEN a new Service Worker activates, THE Cache_Manager SHALL delete old cache versions
6. THE Asset_Precacher SHALL cache resources with a maximum size limit of 50MB

### Requirement 4: Runtime Caching Strategies

**User Story:** Como usuario, quiero que la aplicación funcione eficientemente con diferentes tipos de contenido, para que mi experiencia sea fluida independientemente de la calidad de mi conexión.

#### Acceptance Criteria

1. FOR static assets (JS, CSS, fonts, images), THE Network_Strategy SHALL use cache-first strategy
2. FOR API requests to Supabase, THE Network_Strategy SHALL use network-first strategy with cache fallback
3. FOR user avatars and profile images, THE Network_Strategy SHALL use cache-first strategy with network fallback
4. FOR Socket.io connections, THE Service_Worker SHALL allow direct network access without caching
5. THE Cache_Manager SHALL set maximum cache age of 7 days for static assets
6. THE Cache_Manager SHALL set maximum cache age of 1 hour for API responses
7. WHEN a cached resource exceeds its age limit, THE Cache_Manager SHALL fetch a fresh version

### Requirement 5: Offline Experience

**User Story:** Como usuario, quiero ver una página informativa cuando no tengo conexión, para que entienda que la aplicación requiere internet para funcionalidades en tiempo real.

#### Acceptance Criteria

1. WHEN the user is offline AND navigates to an uncached page, THE Offline_Handler SHALL display an offline fallback page
2. THE Offline_Handler SHALL display a message explaining that internet connection is required for multiplayer features
3. THE Offline_Handler SHALL show cached game statistics and achievements if available
4. THE Offline_Handler SHALL display a retry button to check connection status
5. WHEN the user clicks retry AND connection is restored, THE Offline_Handler SHALL reload the requested page
6. THE Offline_Handler SHALL use the application's design system (Tailwind CSS classes and brand colors)

### Requirement 6: Install Prompt UI

**User Story:** Como usuario, quiero recibir una invitación para instalar la aplicación, para que pueda acceder a ella fácilmente desde mi pantalla de inicio.

#### Acceptance Criteria

1. WHEN the PWA is installable AND not yet installed, THE Install_Prompt SHALL display an install banner
2. THE Install_Prompt SHALL show after the user has interacted with the application for at least 30 seconds
3. THE Install_Prompt SHALL include an "Instalar" button and a "Cerrar" button
4. WHEN the user clicks "Instalar", THE Install_Prompt SHALL trigger the browser's native install dialog
5. WHEN the user clicks "Cerrar", THE Install_Prompt SHALL hide and not show again for 7 days
6. WHEN the application is already installed, THE Install_Prompt SHALL not display
7. THE Install_Prompt SHALL be dismissible and non-intrusive to gameplay

### Requirement 7: Update Notification System

**User Story:** Como usuario, quiero ser notificado cuando hay una nueva versión disponible, para que pueda actualizar y obtener las últimas mejoras.

#### Acceptance Criteria

1. WHEN a new Service Worker is detected, THE Update_Manager SHALL display an update notification
2. THE Update_Manager SHALL show a non-blocking notification with "Actualizar" and "Más tarde" options
3. WHEN the user clicks "Actualizar", THE Update_Manager SHALL activate the new Service Worker and reload the page
4. WHEN the user clicks "Más tarde", THE Update_Manager SHALL dismiss the notification
5. IF the user dismisses the notification, THEN THE Update_Manager SHALL show it again after 24 hours
6. THE Update_Manager SHALL not interrupt active gameplay with update prompts
7. WHEN the page reloads after update, THE Update_Manager SHALL clear old caches

### Requirement 8: iOS Safari Compatibility

**User Story:** Como usuario de iOS, quiero que la PWA funcione correctamente en Safari, para que pueda instalarla y usarla en mi iPhone o iPad.

#### Acceptance Criteria

1. THE Manifest SHALL include apple-touch-icon meta tags for iOS home screen icons
2. THE PWA_System SHALL include apple-mobile-web-app-capable meta tag set to "yes"
3. THE PWA_System SHALL include apple-mobile-web-app-status-bar-style meta tag set to "black-translucent"
4. THE PWA_System SHALL include apple-mobile-web-app-title meta tag with "Kasino21"
5. THE Manifest SHALL include maskable icons for adaptive icon support on Android
6. THE PWA_System SHALL test and verify installation flow on iOS Safari 15+

### Requirement 9: Performance Optimization

**User Story:** Como usuario, quiero que la aplicación cargue rápidamente, para que pueda empezar a jugar sin demoras.

#### Acceptance Criteria

1. THE PWA_System SHALL achieve a Lighthouse PWA score of at least 90
2. THE PWA_System SHALL achieve a Lighthouse Performance score of at least 85
3. WHEN the Service Worker is active, THE Cache_Manager SHALL reduce Time to Interactive (TTI) by at least 30%
4. THE Asset_Precacher SHALL implement lazy loading for non-critical resources
5. THE PWA_System SHALL compress cached assets using gzip or brotli compression
6. THE Cache_Manager SHALL limit total cache size to prevent storage quota issues

### Requirement 10: Security and HTTPS

**User Story:** Como usuario, quiero que mi información esté segura, para que pueda confiar en la aplicación con mis datos de cuenta.

#### Acceptance Criteria

1. THE PWA_System SHALL only register the Service Worker when served over HTTPS
2. THE Service_Worker SHALL respect existing Content Security Policy headers
3. THE Cache_Manager SHALL not cache sensitive authentication tokens or credentials
4. THE Service_Worker SHALL validate cached responses before serving them
5. THE PWA_System SHALL maintain existing security headers (X-Content-Type-Options, X-Frame-Options)
6. WHEN caching API responses, THE Cache_Manager SHALL exclude Authorization headers from cache keys

### Requirement 11: Development and Testing Tools

**User Story:** Como desarrollador, quiero herramientas para probar la PWA, para que pueda verificar que funciona correctamente antes del despliegue.

#### Acceptance Criteria

1. THE PWA_System SHALL provide a development mode that skips Service Worker registration
2. THE PWA_System SHALL include a cache debugging panel accessible via browser DevTools
3. THE PWA_System SHALL log Service Worker lifecycle events in development mode
4. THE PWA_System SHALL provide a manual cache clear function for testing
5. THE PWA_System SHALL include Lighthouse CI integration for automated PWA audits
6. THE PWA_System SHALL document testing procedures for offline functionality

### Requirement 12: Vite PWA Plugin Integration

**User Story:** Como desarrollador, quiero integrar un plugin de PWA con Vite, para que la generación de manifest y Service Worker sea automática y mantenible.

#### Acceptance Criteria

1. THE PWA_System SHALL use vite-plugin-pwa for manifest and Service Worker generation
2. THE PWA_System SHALL configure the plugin to generate a Workbox-based Service Worker
3. THE PWA_System SHALL configure precaching patterns for build output files
4. THE PWA_System SHALL configure runtime caching rules for external resources
5. THE PWA_System SHALL enable Service Worker auto-update with prompt strategy
6. THE PWA_System SHALL generate TypeScript types for Service Worker registration

### Requirement 13: Analytics and Monitoring

**User Story:** Como administrador, quiero monitorear el uso de la PWA, para que pueda entender cómo los usuarios interactúan con las funcionalidades offline.

#### Acceptance Criteria

1. THE PWA_System SHALL track PWA installation events
2. THE PWA_System SHALL track Service Worker activation and update events
3. THE PWA_System SHALL track offline page views
4. THE PWA_System SHALL track cache hit and miss rates
5. THE PWA_System SHALL report Service Worker errors to error tracking system
6. THE PWA_System SHALL measure and report Time to First Byte (TTFB) improvements from caching

### Requirement 14: Cross-Browser Testing

**User Story:** Como usuario, quiero que la PWA funcione en diferentes navegadores, para que pueda usarla independientemente de mi navegador preferido.

#### Acceptance Criteria

1. THE PWA_System SHALL support installation on Chrome/Edge 90+
2. THE PWA_System SHALL support installation on Firefox 100+
3. THE PWA_System SHALL support installation on Safari 15.4+
4. THE PWA_System SHALL gracefully degrade on browsers without Service Worker support
5. THE PWA_System SHALL display appropriate install instructions for each browser
6. THE PWA_System SHALL test core functionality on mobile Chrome, Safari, and Firefox

### Requirement 15: Cache Storage Management

**User Story:** Como usuario, quiero que la aplicación gestione el almacenamiento de forma eficiente, para que no consuma todo el espacio disponible en mi dispositivo.

#### Acceptance Criteria

1. THE Cache_Manager SHALL check available storage quota before caching large resources
2. WHEN storage quota is low (below 100MB), THE Cache_Manager SHALL clear least recently used caches
3. THE Cache_Manager SHALL prioritize critical application shell over optional resources
4. THE Cache_Manager SHALL provide a settings option to clear all cached data
5. THE Cache_Manager SHALL display current cache size in application settings
6. WHEN cache operations fail due to quota, THE Cache_Manager SHALL log the error and continue without caching
