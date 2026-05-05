# Implementation Plan: OAuth Authentication Guide

## Overview

Este plan de implementación convierte el diseño técnico de OAuth Authentication Guide en tareas accionables para un agente de código. La implementación incluye:

- Configuración de proveedores OAuth (Google y Discord)
- Componentes React para botones de OAuth con estilo Kasino21
- Custom hooks para lógica de autenticación
- Plantilla de email HTML personalizada
- Documentación técnica completa
- Testing (unit tests e integration tests)

El plan sigue un enfoque incremental: primero la infraestructura base, luego los componentes, después la integración, y finalmente la documentación y testing.

## Tasks

- [ ] 1. Configurar estructura de archivos y tipos TypeScript base
  - Crear directorio `src/web/components/auth/`
  - Crear directorio `src/web/hooks/` (si no existe)
  - Crear directorio `src/web/services/` (si no existe)
  - Crear directorio `src/web/utils/` (si no existe)
  - Crear archivo `src/web/types/oauth.ts` con tipos TypeScript para OAuth (AuthError, OAuthSignInOptions, OAuthResponse, OAuthErrorCode enum)
  - _Requirements: 9.8, 10.2_

- [ ] 2. Implementar servicio de configuración OAuth
  - [ ] 2.1 Crear `src/web/services/oauth-config.ts`
    - Implementar interfaz `OAuthConfig` con URLs de redirect y scopes
    - Implementar función `getRedirectUrl()` que retorna URL según entorno (dev/prod)
    - Implementar función `validateOAuthConfig()` para validar configuración
    - Leer variables de entorno: `VITE_OAUTH_REDIRECT_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_DISCORD_CLIENT_ID`
    - _Requirements: 1.3, 2.3, 8.2, 8.3_

  - [ ]* 2.2 Escribir unit tests para oauth-config.ts
    - Test: `getRedirectUrl()` retorna URL correcta según entorno
    - Test: `validateOAuthConfig()` detecta configuración inválida
    - Test: Scopes de Google incluyen 'email' y 'profile'
    - Test: Scopes de Discord incluyen 'identify' y 'email'
    - _Requirements: 1.8, 2.8_

- [ ] 3. Implementar utilidades de manejo de errores OAuth
  - [ ] 3.1 Crear `src/web/utils/oauth-errors.ts`
    - Implementar función `normalizeError()` que convierte errores de Supabase a `AuthError`
    - Implementar función `getErrorMessage()` que retorna mensaje user-friendly según código de error
    - Implementar función `logOAuthError()` para logging estructurado de errores
    - Manejar todos los códigos de error definidos en `OAuthErrorCode` enum
    - _Requirements: 6.7, 7.1, 7.7_

  - [ ]* 3.2 Escribir unit tests para oauth-errors.ts
    - Test: `normalizeError()` convierte correctamente errores de Supabase
    - Test: `getErrorMessage()` retorna mensajes apropiados para cada código de error
    - Test: `logOAuthError()` incluye timestamp y metadata
    - _Requirements: 7.1, 7.7_

- [ ] 4. Implementar custom hook useGoogleAuth
  - [ ] 4.1 Crear `src/web/hooks/useGoogleAuth.tsx`
    - Implementar hook que retorna `{ signInWithGoogle, loading, error, session }`
    - Implementar función `signInWithGoogle()` que invoca `supabase.auth.signInWithOAuth()` con provider 'google'
    - Configurar redirect URL usando `getRedirectUrl()` de oauth-config
    - Configurar scopes: 'email profile'
    - Manejar estados de loading y error usando `normalizeError()`
    - Retornar sesión después de autenticación exitosa
    - _Requirements: 1.6, 1.7, 3.3, 9.7_

  - [ ]* 4.2 Escribir unit tests para useGoogleAuth
    - Test: Estado inicial es `{ loading: false, error: null, session: null }`
    - Test: `loading` cambia a `true` durante autenticación
    - Test: `signInWithGoogle()` invoca `supabase.auth.signInWithOAuth()` con parámetros correctos
    - Test: Retorna `session` después de autenticación exitosa (mock)
    - Test: Retorna `error` cuando falla autenticación (mock)
    - _Requirements: 1.6, 1.7_

- [ ] 5. Implementar custom hook useDiscordAuth
  - [ ] 5.1 Crear `src/web/hooks/useDiscordAuth.tsx`
    - Implementar hook que retorna `{ signInWithDiscord, loading, error, session }`
    - Implementar función `signInWithDiscord()` que invoca `supabase.auth.signInWithOAuth()` con provider 'discord'
    - Configurar redirect URL usando `getRedirectUrl()` de oauth-config
    - Configurar scopes: 'identify email'
    - Manejar estados de loading y error usando `normalizeError()`
    - Retornar sesión después de autenticación exitosa
    - _Requirements: 2.6, 2.7, 3.3, 9.7_

  - [ ]* 5.2 Escribir unit tests para useDiscordAuth
    - Test: Estado inicial es `{ loading: false, error: null, session: null }`
    - Test: `loading` cambia a `true` durante autenticación
    - Test: `signInWithDiscord()` invoca `supabase.auth.signInWithOAuth()` con parámetros correctos
    - Test: Retorna `session` después de autenticación exitosa (mock)
    - Test: Retorna `error` cuando falla autenticación (mock)
    - _Requirements: 2.6, 2.7_

- [ ] 6. Implementar componente GoogleSignInButton
  - [ ] 6.1 Crear `src/web/components/auth/GoogleSignInButton.tsx`
    - Implementar componente React con props: `label`, `className`, `onSuccess`, `onError`, `disabled`
    - Usar hook `useGoogleAuth()` para lógica de autenticación
    - Renderizar botón con estilo Tailwind CSS matching Kasino21 design (gold #D4AF37, dark backgrounds)
    - Mostrar spinner durante estado de loading
    - Deshabilitar botón cuando `disabled=true` o `loading=true`
    - Invocar `onSuccess(session)` después de autenticación exitosa
    - Invocar `onError(error)` cuando falla autenticación
    - Incluir atributos de accesibilidad: `aria-label`, `aria-busy`, `role="button"`
    - _Requirements: 1.6, 9.1, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 6.2 Escribir unit tests para GoogleSignInButton
    - Test: Renderiza correctamente con props por defecto
    - Test: Muestra spinner cuando `loading=true`
    - Test: Está deshabilitado cuando `disabled=true`
    - Test: Invoca `onSuccess` callback después de autenticación exitosa (mock)
    - Test: Invoca `onError` callback cuando falla autenticación (mock)
    - Test: Aplica `className` personalizada correctamente
    - Test: Incluye atributos de accesibilidad apropiados
    - _Requirements: 9.1, 9.6_

- [ ] 7. Implementar componente DiscordSignInButton
  - [ ] 7.1 Crear `src/web/components/auth/DiscordSignInButton.tsx`
    - Implementar componente React con props: `label`, `className`, `onSuccess`, `onError`, `disabled`
    - Usar hook `useDiscordAuth()` para lógica de autenticación
    - Renderizar botón con estilo Tailwind CSS matching Kasino21 design (gold #D4AF37, dark backgrounds)
    - Mostrar spinner durante estado de loading
    - Deshabilitar botón cuando `disabled=true` o `loading=true`
    - Invocar `onSuccess(session)` después de autenticación exitosa
    - Invocar `onError(error)` cuando falla autenticación
    - Incluir atributos de accesibilidad: `aria-label`, `aria-busy`, `role="button"`
    - _Requirements: 2.6, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 7.2 Escribir unit tests para DiscordSignInButton
    - Test: Renderiza correctamente con props por defecto
    - Test: Muestra spinner cuando `loading=true`
    - Test: Está deshabilitado cuando `disabled=true`
    - Test: Invoca `onSuccess` callback después de autenticación exitosa (mock)
    - Test: Invoca `onError` callback cuando falla autenticación (mock)
    - Test: Aplica `className` personalizada correctamente
    - Test: Incluye atributos de accesibilidad apropiados
    - _Requirements: 9.2, 9.6_

- [ ] 8. Crear plantilla de email HTML personalizada
  - [ ] 8.1 Crear archivo `.kiro/specs/oauth-authentication-guide/email-template.html`
    - Implementar plantilla HTML con layout responsive usando tablas
    - Usar inline CSS para compatibilidad con clientes de correo
    - Incluir logo de Kasino21 (brand21Icon) en header
    - Aplicar color palette de Kasino21: gold #D4AF37, dark background #1a1a1a
    - Incluir botón CTA para confirmación de email con variable `{{ .ConfirmationURL }}`
    - Incluir texto fallback para clientes sin soporte HTML
    - Incluir footer con copyright y información de contacto
    - Asegurar compatibilidad con Gmail, Outlook, Yahoo, Apple Mail
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ] 8.2 Crear variante para magic link email
    - Copiar plantilla base y ajustar texto para magic link
    - Usar variable `{{ .Token }}` para magic link
    - _Requirements: 5.3_

  - [ ] 8.3 Crear variante para password recovery email
    - Copiar plantilla base y ajustar texto para recuperación de contraseña
    - Usar variable `{{ .ConfirmationURL }}` para reset password link
    - _Requirements: 5.4_

- [ ] 9. Checkpoint - Verificar componentes y hooks funcionan correctamente
  - Ejecutar todos los unit tests: `npm run test`
  - Verificar que no hay errores de TypeScript: `npm run type-check`
  - Verificar que componentes se pueden importar sin errores
  - Preguntar al usuario si hay dudas o ajustes necesarios

- [ ] 10. Crear documentación técnica: Google OAuth Setup
  - [ ] 10.1 Crear `.kiro/specs/oauth-authentication-guide/docs/google-oauth-setup.md`
    - Sección 1: Crear proyecto en Google Cloud Console (paso a paso con screenshots)
    - Sección 2: Habilitar Google OAuth API
    - Sección 3: Crear credenciales OAuth 2.0 (Client ID y Client Secret)
    - Sección 4: Configurar authorized redirect URIs para desarrollo (`http://localhost:5173/auth/callback`)
    - Sección 5: Configurar authorized redirect URIs para producción (`https://kasino21.com/auth/callback`)
    - Sección 6: Copiar Client ID y Client Secret a variables de entorno
    - Sección 7: Troubleshooting común (redirect_uri_mismatch, invalid_client, etc.)
    - Incluir links a documentación oficial de Google OAuth
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 10.1, 10.5, 10.6, 10.7_

- [ ] 11. Crear documentación técnica: Discord OAuth Setup
  - [ ] 11.1 Crear `.kiro/specs/oauth-authentication-guide/docs/discord-oauth-setup.md`
    - Sección 1: Crear aplicación en Discord Developer Portal (paso a paso con screenshots)
    - Sección 2: Configurar OAuth2 settings
    - Sección 3: Agregar redirect URIs para desarrollo (`http://localhost:5173/auth/callback`)
    - Sección 4: Agregar redirect URIs para producción (`https://kasino21.com/auth/callback`)
    - Sección 5: Copiar Client ID y Client Secret a variables de entorno
    - Sección 6: Configurar scopes requeridos (identify, email)
    - Sección 7: Troubleshooting común (invalid_redirect_uri, unauthorized_client, etc.)
    - Incluir links a documentación oficial de Discord OAuth
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 10.1, 10.5, 10.6, 10.7_

- [ ] 12. Crear documentación técnica: Supabase Configuration
  - [ ] 12.1 Crear `.kiro/specs/oauth-authentication-guide/docs/supabase-configuration.md`
    - Sección 1: Acceder a Authentication settings en Supabase Dashboard
    - Sección 2: Configurar Google provider (pegar Client ID y Client Secret)
    - Sección 3: Configurar Discord provider (pegar Client ID y Client Secret)
    - Sección 4: Configurar Site URL (`https://kasino21.com`)
    - Sección 5: Configurar Redirect URLs (agregar URLs de desarrollo y producción)
    - Sección 6: Habilitar email confirmations (si es necesario)
    - Sección 7: Configurar SMTP settings (opcional, para custom email provider)
    - Sección 8: Troubleshooting común (provider not enabled, invalid redirect URL, etc.)
    - Incluir screenshots de cada paso en Supabase Dashboard
    - _Requirements: 3.1, 3.2, 5.1, 5.8, 10.1, 10.5_

- [ ] 13. Crear documentación técnica: Email Templates
  - [ ] 13.1 Crear `.kiro/specs/oauth-authentication-guide/docs/email-templates.md`
    - Sección 1: Acceder a Email Templates en Supabase Dashboard
    - Sección 2: Personalizar Confirmation Email template (copiar HTML de email-template.html)
    - Sección 3: Personalizar Magic Link template (copiar HTML de variante magic link)
    - Sección 4: Personalizar Password Recovery template (copiar HTML de variante password recovery)
    - Sección 5: Variables disponibles en Supabase (`{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .Email }}`)
    - Sección 6: Testing de email templates usando Supabase email testing tools
    - Sección 7: Verificar renderizado en diferentes clientes de correo (Gmail, Outlook, etc.)
    - Sección 8: Troubleshooting común (variables no se reemplazan, CSS no se aplica, etc.)
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 8.8, 10.1_

- [ ] 14. Crear documentación técnica: Troubleshooting Guide
  - [ ] 14.1 Crear `.kiro/specs/oauth-authentication-guide/docs/troubleshooting.md`
    - Sección 1: Errores comunes de Google OAuth (redirect_uri_mismatch, invalid_client, access_denied)
    - Sección 2: Errores comunes de Discord OAuth (invalid_redirect_uri, unauthorized_client, access_denied)
    - Sección 3: Errores comunes de Supabase (provider not enabled, invalid session, token expired)
    - Sección 4: Problemas de configuración (variables de entorno faltantes, URLs incorrectas)
    - Sección 5: Problemas de red (CORS errors, timeout, connection refused)
    - Sección 6: Problemas de email (emails no se envían, templates no se aplican, links expirados)
    - Sección 7: Debugging tips (revisar console logs, network tab, Supabase logs)
    - Sección 8: Links a recursos adicionales (Stack Overflow, Supabase Discord, GitHub issues)
    - _Requirements: 7.8, 10.6, 10.7_

- [ ] 15. Crear guía de inicio rápido (Quick Start)
  - [ ] 15.1 Crear `.kiro/specs/oauth-authentication-guide/docs/quick-start.md`
    - Sección 1: Prerequisitos (cuenta de Google Cloud, Discord Developer, Supabase project)
    - Sección 2: Configuración rápida de Google OAuth (5 minutos)
    - Sección 3: Configuración rápida de Discord OAuth (5 minutos)
    - Sección 4: Configuración rápida de Supabase (5 minutos)
    - Sección 5: Agregar componentes a tu aplicación (código de ejemplo)
    - Sección 6: Testing en desarrollo (localhost)
    - Sección 7: Deployment a producción (checklist)
    - Sección 8: Next steps (personalizar email templates, agregar más proveedores)
    - Objetivo: Implementar OAuth en menos de 30 minutos
    - _Requirements: 10.8_

- [ ] 16. Checkpoint - Verificar documentación está completa
  - Revisar que todos los documentos técnicos están creados
  - Verificar que screenshots están incluidos (o placeholders si no se pueden generar)
  - Verificar que links a documentación oficial funcionan
  - Verificar que código de ejemplo es correcto y funcional
  - Preguntar al usuario si hay ajustes necesarios en la documentación

- [ ] 17. Crear página de ejemplo de integración
  - [ ] 17.1 Crear `src/web/pages/AuthExample.tsx` (página de ejemplo, no para producción)
    - Importar `GoogleSignInButton` y `DiscordSignInButton`
    - Implementar handlers `onSuccess` y `onError` con console.log
    - Mostrar estado de sesión actual usando `useAuth()`
    - Incluir botón de sign out
    - Incluir comentarios explicativos en el código
    - Estilizar con Tailwind CSS matching Kasino21 design
    - _Requirements: 10.2, 10.3_

  - [ ]* 17.2 Escribir integration test para flujo completo de OAuth
    - Test: Usuario hace click en GoogleSignInButton y completa flujo OAuth (mock)
    - Test: Usuario hace click en DiscordSignInButton y completa flujo OAuth (mock)
    - Test: Sesión persiste después de reload de página
    - Test: Sign out funciona correctamente
    - Usar MSW (Mock Service Worker) para mockear Supabase API
    - _Requirements: 3.3, 3.7, 3.8_

- [ ] 18. Crear archivo de variables de entorno de ejemplo
  - [ ] 18.1 Crear `.env.example` en la raíz del proyecto
    - Incluir todas las variables de entorno necesarias con valores de ejemplo
    - Incluir comentarios explicativos para cada variable
    - Sección para Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
    - Sección para Google OAuth (VITE_GOOGLE_CLIENT_ID)
    - Sección para Discord OAuth (VITE_DISCORD_CLIENT_ID)
    - Sección para Redirect URLs (VITE_OAUTH_REDIRECT_URL)
    - Incluir instrucciones de cómo obtener cada valor
    - _Requirements: 1.4, 2.4, 8.3_

- [ ] 19. Actualizar README principal del proyecto
  - [ ] 19.1 Agregar sección "OAuth Authentication" en README.md
    - Breve descripción de la feature OAuth
    - Link a documentación completa en `.kiro/specs/oauth-authentication-guide/docs/`
    - Link a quick start guide
    - Proveedores soportados (Google, Discord)
    - Instrucciones básicas de configuración
    - _Requirements: 10.1_

- [ ] 20. Crear checklist de deployment a producción
  - [ ] 20.1 Crear `.kiro/specs/oauth-authentication-guide/docs/deployment-checklist.md`
    - Pre-deployment: Crear aplicaciones OAuth en proveedores
    - Pre-deployment: Configurar redirect URLs en proveedores
    - Pre-deployment: Configurar proveedores en Supabase dashboard
    - Pre-deployment: Actualizar variables de entorno en producción
    - Pre-deployment: Personalizar plantillas de email en Supabase
    - Pre-deployment: Ejecutar todos los tests
    - Deployment: Deploy de código a producción
    - Deployment: Verificar variables de entorno en servidor
    - Post-deployment: Verificar redirect URLs funcionan
    - Post-deployment: Probar login con Google en producción
    - Post-deployment: Probar login con Discord en producción
    - Post-deployment: Verificar emails de confirmación se envían
    - Post-deployment: Monitorear logs de errores OAuth
    - _Requirements: 8.5, 8.6_

- [ ] 21. Final checkpoint - Verificar implementación completa
  - Ejecutar todos los tests: `npm run test`
  - Verificar que no hay errores de TypeScript: `npm run type-check`
  - Verificar que todos los archivos de documentación están creados
  - Verificar que componentes OAuth se pueden usar en la aplicación
  - Revisar que email templates están listos para copiar a Supabase
  - Preguntar al usuario si hay ajustes finales necesarios

## Notes

- **Tareas marcadas con `*` son opcionales** y pueden omitirse para un MVP más rápido
- **Cada tarea referencia requisitos específicos** para trazabilidad completa
- **Checkpoints incluidos** en tareas 9, 16 y 21 para validación incremental
- **Testing incluido** como sub-tareas opcionales para asegurar calidad
- **Documentación completa** con 5 documentos técnicos detallados
- **Lenguaje de implementación**: TypeScript con React (definido en el diseño)
- **Framework de testing**: Vitest + React Testing Library (ya usado en Kasino21)
- **Estilo**: Tailwind CSS con color palette de Kasino21 (gold #D4AF37, dark backgrounds)

## Implementation Order Rationale

1. **Fase 1 (Tasks 1-3)**: Infraestructura base - tipos, configuración, utilidades
2. **Fase 2 (Tasks 4-5)**: Lógica de negocio - custom hooks para OAuth
3. **Fase 3 (Tasks 6-7)**: Componentes visuales - botones de OAuth
4. **Fase 4 (Task 8)**: Branding - plantillas de email personalizadas
5. **Fase 5 (Tasks 10-15)**: Documentación técnica completa
6. **Fase 6 (Tasks 17-20)**: Integración y deployment
7. **Fase 7 (Task 21)**: Validación final

Este orden asegura que cada tarea construye sobre las anteriores, minimizando dependencias bloqueantes y permitiendo validación incremental.
