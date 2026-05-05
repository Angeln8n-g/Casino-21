# Requirements Document: OAuth Authentication Guide

## Introduction

Esta especificación define los requisitos para implementar una guía completa de autenticación OAuth con Google y Discord en Kasino21, incluyendo la configuración de proveedores, integración con Supabase, y la creación de plantillas de correo de confirmación personalizadas con el estilo visual del proyecto.

Kasino21 es una aplicación de juego de cartas multijugador en tiempo real que requiere autenticación segura y una experiencia de usuario fluida. La implementación de OAuth con proveedores populares (Google y Discord) mejorará la conversión de usuarios y reducirá la fricción en el proceso de registro.

## Glossary

- **OAuth_System**: El sistema de autenticación OAuth que gestiona el flujo de autenticación con proveedores externos
- **Supabase_Auth**: El servicio de autenticación de Supabase que maneja sesiones, tokens y proveedores OAuth
- **Google_Provider**: El proveedor de identidad OAuth de Google
- **Discord_Provider**: El proveedor de identidad OAuth de Discord
- **Email_Template**: La plantilla HTML de correo electrónico personalizada con el estilo visual de Kasino21
- **Confirmation_Email**: El correo electrónico enviado para confirmar el registro o login del usuario
- **Redirect_URL**: La URL a la que el usuario es redirigido después de completar el flujo OAuth
- **Client_Credentials**: Las credenciales (Client ID y Client Secret) obtenidas de los proveedores OAuth
- **User_Session**: La sesión autenticada del usuario después de completar el flujo OAuth
- **Auth_Callback**: El endpoint que recibe la respuesta del proveedor OAuth después de la autenticación

## Requirements

### Requirement 1: Google OAuth Configuration

**User Story:** Como desarrollador, quiero configurar Google OAuth en Kasino21, para que los usuarios puedan autenticarse con sus cuentas de Google.

#### Acceptance Criteria

1. THE OAuth_System SHALL provide step-by-step instructions to create a Google Cloud project
2. THE OAuth_System SHALL provide step-by-step instructions to enable Google OAuth API
3. THE OAuth_System SHALL provide step-by-step instructions to configure authorized redirect URIs for both development and production environments
4. WHEN Client_Credentials are obtained from Google, THE OAuth_System SHALL provide instructions to store them securely in environment variables
5. THE OAuth_System SHALL provide instructions to configure Google_Provider in Supabase dashboard
6. THE OAuth_System SHALL provide code examples for implementing Google sign-in button in React components
7. THE OAuth_System SHALL provide code examples for handling Google OAuth callback responses
8. THE OAuth_System SHALL document required scopes (email, profile) for Google authentication

### Requirement 2: Discord OAuth Configuration

**User Story:** Como desarrollador, quiero configurar Discord OAuth en Kasino21, para que los usuarios puedan autenticarse con sus cuentas de Discord.

#### Acceptance Criteria

1. THE OAuth_System SHALL provide step-by-step instructions to create a Discord application
2. THE OAuth_System SHALL provide step-by-step instructions to configure OAuth2 settings in Discord Developer Portal
3. THE OAuth_System SHALL provide step-by-step instructions to configure authorized redirect URIs for both development and production environments
4. WHEN Client_Credentials are obtained from Discord, THE OAuth_System SHALL provide instructions to store them securely in environment variables
5. THE OAuth_System SHALL provide instructions to configure Discord_Provider in Supabase dashboard
6. THE OAuth_System SHALL provide code examples for implementing Discord sign-in button in React components
7. THE OAuth_System SHALL provide code examples for handling Discord OAuth callback responses
8. THE OAuth_System SHALL document required scopes (identify, email) for Discord authentication

### Requirement 3: Supabase Auth Integration

**User Story:** Como desarrollador, quiero integrar los proveedores OAuth con Supabase Auth, para que la autenticación sea gestionada de forma centralizada y segura.

#### Acceptance Criteria

1. THE Supabase_Auth SHALL provide instructions to configure OAuth providers in Supabase dashboard
2. THE Supabase_Auth SHALL provide instructions to configure site URL and redirect URLs
3. THE Supabase_Auth SHALL provide code examples using @supabase/supabase-js for OAuth sign-in
4. WHEN a user completes OAuth flow, THE Supabase_Auth SHALL create or update user record in auth.users table
5. WHEN a user completes OAuth flow, THE Supabase_Auth SHALL return a valid User_Session with access token and refresh token
6. THE Supabase_Auth SHALL provide instructions to handle OAuth errors and edge cases
7. THE Supabase_Auth SHALL provide instructions to implement sign-out functionality
8. THE Supabase_Auth SHALL provide instructions to persist User_Session across page reloads

### Requirement 4: Email Confirmation Template Design

**User Story:** Como usuario, quiero recibir correos de confirmación con el estilo visual de Kasino21, para que la experiencia sea consistente y profesional.

#### Acceptance Criteria

1. THE Email_Template SHALL use the Kasino21 color palette (gold #D4AF37, dark backgrounds, casino theme)
2. THE Email_Template SHALL include the Kasino21 logo (brand21Icon) in the header
3. THE Email_Template SHALL be responsive and render correctly on desktop and mobile email clients
4. THE Email_Template SHALL include a clear call-to-action button for email confirmation
5. THE Email_Template SHALL include fallback text for email clients that don't support HTML
6. THE Email_Template SHALL follow email HTML best practices (inline CSS, table-based layout)
7. THE Email_Template SHALL include footer with contact information and unsubscribe option
8. THE Email_Template SHALL be compatible with major email providers (Gmail, Outlook, Yahoo, Apple Mail)

### Requirement 5: Email Template Configuration in Supabase

**User Story:** Como desarrollador, quiero configurar plantillas de correo personalizadas en Supabase, para que los usuarios reciban correos con el branding de Kasino21.

#### Acceptance Criteria

1. THE Supabase_Auth SHALL provide instructions to access email template settings in Supabase dashboard
2. THE Supabase_Auth SHALL provide instructions to customize confirmation email template
3. THE Supabase_Auth SHALL provide instructions to customize magic link email template
4. THE Supabase_Auth SHALL provide instructions to customize password recovery email template
5. THE Supabase_Auth SHALL provide instructions to test email templates before deployment
6. THE Email_Template SHALL support Supabase template variables ({{ .ConfirmationURL }}, {{ .Token }}, {{ .Email }})
7. THE Email_Template SHALL provide HTML code ready to paste into Supabase dashboard
8. THE Supabase_Auth SHALL provide instructions to configure SMTP settings if custom email provider is needed

### Requirement 6: Security Best Practices

**User Story:** Como desarrollador, quiero implementar mejores prácticas de seguridad en la autenticación OAuth, para proteger las cuentas de los usuarios y prevenir vulnerabilidades.

#### Acceptance Criteria

1. THE OAuth_System SHALL document the importance of using HTTPS for all OAuth redirect URLs
2. THE OAuth_System SHALL document how to validate state parameter to prevent CSRF attacks
3. THE OAuth_System SHALL document how to securely store Client_Credentials using environment variables
4. THE OAuth_System SHALL document how to implement PKCE (Proof Key for Code Exchange) flow when supported
5. THE OAuth_System SHALL document token refresh strategies to maintain User_Session security
6. THE OAuth_System SHALL document how to implement rate limiting on authentication endpoints
7. THE OAuth_System SHALL document how to handle and log authentication errors without exposing sensitive information
8. THE OAuth_System SHALL document how to implement account linking when user signs in with different providers using same email

### Requirement 7: Error Handling and User Feedback

**User Story:** Como usuario, quiero recibir mensajes claros cuando ocurre un error durante la autenticación, para entender qué salió mal y cómo solucionarlo.

#### Acceptance Criteria

1. WHEN OAuth authentication fails, THE OAuth_System SHALL display a user-friendly error message
2. WHEN network connection fails during OAuth flow, THE OAuth_System SHALL display a retry option
3. WHEN user denies permissions in OAuth consent screen, THE OAuth_System SHALL explain which permissions are required and why
4. WHEN email confirmation is required, THE Confirmation_Email SHALL be sent within 30 seconds
5. WHEN email confirmation link expires, THE OAuth_System SHALL provide option to resend confirmation email
6. WHEN user clicks expired confirmation link, THE OAuth_System SHALL display clear message and resend option
7. THE OAuth_System SHALL log authentication errors to console for debugging purposes
8. THE OAuth_System SHALL provide troubleshooting section in documentation for common OAuth errors

### Requirement 8: Development and Production Environment Setup

**User Story:** Como desarrollador, quiero configurar diferentes entornos para desarrollo y producción, para poder probar la autenticación OAuth de forma segura antes de desplegar.

#### Acceptance Criteria

1. THE OAuth_System SHALL provide instructions to configure separate OAuth applications for development and production
2. THE OAuth_System SHALL provide instructions to use different Redirect_URLs for localhost and production domain
3. THE OAuth_System SHALL provide instructions to manage environment variables for both environments
4. THE OAuth_System SHALL provide instructions to test OAuth flow in development environment
5. THE OAuth_System SHALL provide checklist for deploying OAuth configuration to production
6. THE OAuth_System SHALL document how to handle environment-specific Supabase projects
7. THE OAuth_System SHALL provide instructions to configure CORS settings for OAuth callbacks
8. THE OAuth_System SHALL provide instructions to test email delivery in development using Supabase email testing tools

### Requirement 9: React Component Integration

**User Story:** Como desarrollador, quiero componentes React reutilizables para los botones de OAuth, para mantener consistencia visual y reducir código duplicado.

#### Acceptance Criteria

1. THE OAuth_System SHALL provide a reusable GoogleSignInButton React component
2. THE OAuth_System SHALL provide a reusable DiscordSignInButton React component
3. THE OAuth_System SHALL provide components styled with Tailwind CSS matching Kasino21 design system
4. THE OAuth_System SHALL provide components with loading states during authentication
5. THE OAuth_System SHALL provide components with disabled states when authentication is in progress
6. THE OAuth_System SHALL provide components with proper accessibility attributes (aria-label, role)
7. THE OAuth_System SHALL provide custom hooks (useGoogleAuth, useDiscordAuth) for handling OAuth logic
8. THE OAuth_System SHALL provide TypeScript type definitions for all components and hooks

### Requirement 10: Documentation and Code Examples

**User Story:** Como desarrollador, quiero documentación completa con ejemplos de código, para poder implementar la autenticación OAuth sin necesidad de consultar múltiples fuentes externas.

#### Acceptance Criteria

1. THE OAuth_System SHALL provide a complete implementation guide in markdown format
2. THE OAuth_System SHALL provide code examples in TypeScript for all OAuth flows
3. THE OAuth_System SHALL provide code examples for error handling and edge cases
4. THE OAuth_System SHALL provide code examples for testing OAuth integration
5. THE OAuth_System SHALL provide screenshots of OAuth provider configuration screens
6. THE OAuth_System SHALL provide a troubleshooting section with common issues and solutions
7. THE OAuth_System SHALL provide links to official documentation for Google OAuth, Discord OAuth, and Supabase Auth
8. THE OAuth_System SHALL provide a quick start guide for developers who want to implement OAuth in under 30 minutes
