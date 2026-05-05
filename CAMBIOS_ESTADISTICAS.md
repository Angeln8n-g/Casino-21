# 🎯 Solución Implementada: Actualización de Estadísticas en Tiempo Real

## 📋 Resumen

Se implementaron dos soluciones complementarias para garantizar que las estadísticas del jugador (wins, losses, elo, coins) se actualicen correctamente en la interfaz después de completar una partida.

---

## ✅ Cambios Realizados

### 1. **GameScreen.tsx** - Disparar eventos al completar partida

**Ubicación:** `src/web/components/GameScreen.tsx` (línea ~237-250)

**Cambio:**
```typescript
if (previousState.phase !== 'completed' && gameState.phase === 'completed') {
  const shouldCelebrate = isSpectator || didLocalPlayerWin(gameState, localPlayerId);
  playSfx(shouldCelebrate ? 'victory' : 'defeat');

  if (shouldCelebrate) {
    setCelebrationSeed(Date.now());
    setShowCelebration(true);
  }

  // ✅ NUEVO: Disparar eventos para refrescar el perfil
  if (!isSpectator) {
    window.dispatchEvent(new CustomEvent('profile_updated'));
    window.dispatchEvent(new CustomEvent('coins_updated'));
    window.dispatchEvent(new CustomEvent('elo_updated'));
  }
}
```

**Propósito:** Notificar inmediatamente a `useAuth` que debe recargar el perfil cuando el juego termina.

---

### 2. **useAuth.tsx** - Suscripción en tiempo real

**Ubicación:** `src/web/hooks/useAuth.tsx` (después de línea 237)

**Cambio:**
```typescript
// Suscripción en tiempo real a cambios en el perfil del usuario
useEffect(() => {
  if (!user) return;

  const channel = supabase
    .channel(`profile-changes-${user.id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`
      },
      (payload) => {
        logger.debug('Profile updated in DB via realtime:', payload);
        // Actualizar el perfil con los nuevos datos
        if (payload.new) {
          setProfile(payload.new);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.debug('Subscribed to profile changes');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        logger.warn('Profile subscription error:', status);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, [user?.id]);
```

**Propósito:** Detectar automáticamente cambios en la base de datos y actualizar el perfil sin necesidad de eventos manuales.

---

### 3. **MatchCompletedScreen.tsx** - Eventos al montar

**Ubicación:** `src/web/components/game/MatchCompletedScreen.tsx`

**Cambio:**
```typescript
// Disparar eventos al montar el componente para refrescar estadísticas
useEffect(() => {
  window.dispatchEvent(new CustomEvent('profile_updated'));
  window.dispatchEvent(new CustomEvent('coins_updated'));
  window.dispatchEvent(new CustomEvent('elo_updated'));
}, []);
```

**Propósito:** Garantizar que las estadísticas se actualicen incluso si el usuario llega directamente a esta pantalla.

---

### 4. **MatchAbandonedScreen.tsx** - Eventos al montar

**Ubicación:** `src/web/components/game/MatchAbandonedScreen.tsx`

**Cambio:**
```typescript
// Disparar eventos al montar el componente para refrescar estadísticas
useEffect(() => {
  window.dispatchEvent(new CustomEvent('profile_updated'));
  window.dispatchEvent(new CustomEvent('coins_updated'));
  window.dispatchEvent(new CustomEvent('elo_updated'));
}, []);
```

**Propósito:** Actualizar estadísticas cuando un jugador abandona la partida.

---

## 🔄 Flujo de Actualización

### Escenario 1: Partida Normal
1. El juego termina (`gameState.phase === 'completed'`)
2. `GameScreen.tsx` dispara eventos personalizados
3. `useAuth.tsx` escucha los eventos y recarga el perfil desde Supabase
4. Los componentes `QuickStats` y `EventsPage` reciben el perfil actualizado automáticamente

### Escenario 2: Actualización en Tiempo Real
1. El servidor actualiza la tabla `profiles` en Supabase
2. Supabase Realtime notifica al cliente
3. `useAuth.tsx` recibe la notificación y actualiza el estado local
4. Los componentes se actualizan automáticamente con los nuevos datos

### Escenario 3: Abandono de Partida
1. Un jugador abandona
2. `MatchAbandonedScreen` se monta y dispara eventos
3. `useAuth.tsx` recarga el perfil
4. Las estadísticas se actualizan

---

## 🧪 Cómo Verificar

### Prueba 1: Eventos Personalizados
1. Abre las DevTools del navegador (F12)
2. Ve a la pestaña Console
3. Ejecuta:
```javascript
window.addEventListener('profile_updated', () => console.log('✅ profile_updated'));
window.addEventListener('coins_updated', () => console.log('✅ coins_updated'));
window.addEventListener('elo_updated', () => console.log('✅ elo_updated'));
```
4. Juega una partida completa
5. Verifica que aparezcan los mensajes en la consola al terminar

### Prueba 2: Actualización de UI
1. Anota tus estadísticas actuales (wins, losses, elo, coins)
2. Juega una partida completa
3. Al terminar, verifica que:
   - Las monedas aumenten inmediatamente
   - El ELO cambie (+25 si ganas, -25 si pierdes)
   - Los wins/losses se actualicen
   - El componente `QuickStats` muestre los nuevos valores

### Prueba 3: Realtime Subscription
1. Abre las DevTools → Console
2. Busca el mensaje: `"Subscribed to profile changes"`
3. Si aparece, la suscripción en tiempo real está activa

---

## ⚠️ Requisitos de Supabase

Para que la **Opción 2** (suscripción en tiempo real) funcione, debes:

1. **Habilitar Realtime en la tabla `profiles`:**
   - Ve a Supabase Dashboard
   - Database → Replication
   - Activa la tabla `profiles`

2. **Verificar permisos RLS:**
   - Los usuarios deben poder leer su propio perfil
   - La política RLS debe permitir `SELECT` en `profiles` donde `id = auth.uid()`

---

## 🎉 Beneficios

✅ **Actualización inmediata:** Las estadísticas se refrescan al terminar la partida  
✅ **Redundancia:** Dos mecanismos independientes garantizan la actualización  
✅ **Tiempo real:** Los cambios en la BD se reflejan automáticamente  
✅ **Sin polling:** No genera tráfico innecesario  
✅ **Experiencia fluida:** El usuario ve sus recompensas instantáneamente  

---

## 📝 Notas Adicionales

- Los eventos se disparan **solo para jugadores**, no para espectadores
- La suscripción en tiempo real es **por usuario** (no afecta a otros)
- Si Realtime no está disponible, los eventos personalizados funcionan como respaldo
- Los componentes `QuickStats` y `EventsPage` **no necesitan cambios** porque ya usan `useAuth`

---

## 🐛 Troubleshooting

### Las estadísticas no se actualizan
1. Verifica que los eventos se disparen (ver Prueba 1)
2. Revisa la consola en busca de errores de Supabase
3. Confirma que la función RPC `process_match_results` existe en la BD
4. Verifica que el servidor esté llamando correctamente a `saveMatchResult()`

### Realtime no funciona
1. Verifica que Realtime esté habilitado en Supabase Dashboard
2. Revisa las políticas RLS de la tabla `profiles`
3. Busca errores en la consola relacionados con `CHANNEL_ERROR`

---

## 📚 Referencias

- **Supabase Realtime:** https://supabase.com/docs/guides/realtime
- **Custom Events:** https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent
- **useEffect Hook:** https://react.dev/reference/react/useEffect
