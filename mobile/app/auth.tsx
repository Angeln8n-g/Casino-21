import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../services/supabase';
import { Lock, Mail, User as UserIcon, LogIn, UserPlus } from 'lucide-react-native';

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim()) {
      Alert.alert('Campo obligatorio', 'Por favor ingresa tu correo electrónico.');
      return;
    }

    setLoading(true);

    try {
      if (isRecovery) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        Alert.alert('Correo enviado', 'Revisa tu bandeja de entrada para restablecer tu contraseña.');
        setIsRecovery(false);
      } else if (isLogin) {
        if (!password) {
          Alert.alert('Campo obligatorio', 'Por favor ingresa tu contraseña.');
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.replace('/(tabs)');
      } else {
        if (!username.trim()) {
          Alert.alert('Campo obligatorio', 'El nombre de usuario es obligatorio.');
          setLoading(false);
          return;
        }
        if (!password) {
          Alert.alert('Campo obligatorio', 'Por favor ingresa una contraseña.');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.trim(),
            },
          },
        });
        if (error) throw error;
        Alert.alert('¡Registro completado!', 'Se ha creado tu cuenta con éxito.');
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      Alert.alert('Error de Autenticación', err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-slate-950 px-6 pt-16">
      {/* Header / Logo */}
      <View className="items-center mb-8">
        <View className="w-20 h-20 bg-amber-500/10 rounded-3xl border-2 border-amber-400 items-center justify-center mb-4">
          <Text className="text-amber-400 font-bold text-3xl">K21</Text>
        </View>
        <Text className="text-white font-bold text-3xl">KASINO 21</Text>
        <Text className="text-slate-400 text-sm mt-1">
          {isRecovery
            ? 'Recupera tu contraseña'
            : isLogin
            ? 'Inicia sesión para jugar'
            : 'Crea tu cuenta de jugador'}
        </Text>
      </View>

      {/* Formulario */}
      <View className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 mb-6">
        {!isLogin && !isRecovery && (
          <View className="mb-4">
            <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Nombre de usuario</Text>
            <View className="flex-row items-center bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
              <UserIcon color="#94a3b8" size={20} className="mr-3" />
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Tu apodo de jugador"
                placeholderTextColor="#64748b"
                className="flex-1 text-white text-base"
              />
            </View>
          </View>
        )}

        <View className="mb-4">
          <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Correo Electrónico</Text>
          <View className="flex-row items-center bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
            <Mail color="#94a3b8" size={20} className="mr-3" />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              autoCapitalize="none"
              className="flex-1 text-white text-base"
            />
          </View>
        </View>

        {!isRecovery && (
          <View className="mb-6">
            <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Contraseña</Text>
            <View className="flex-row items-center bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
              <Lock color="#94a3b8" size={20} className="mr-3" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry
                className="flex-1 text-white text-base"
              />
            </View>
          </View>
        )}

        {/* Botón Principal */}
        <Pressable
          disabled={loading}
          onPress={handleAuth}
          className="bg-amber-500 active:bg-amber-600 p-4 rounded-2xl items-center flex-row justify-center"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#020617" />
          ) : (
            <>
              {isLogin ? (
                <LogIn color="#020617" size={20} className="mr-2" />
              ) : (
                <UserPlus color="#020617" size={20} className="mr-2" />
              )}
              <Text className="text-slate-950 font-bold text-base">
                {isRecovery
                  ? 'ENVIAR CORREO'
                  : isLogin
                  ? 'INICIAR SESIÓN'
                  : 'CREAR CUENTA'}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Alternar modos */}
      <View className="items-center mb-12">
        {isRecovery ? (
          <Pressable onPress={() => setIsRecovery(false)}>
            <Text className="text-amber-400 font-bold text-sm">Volver al inicio de sesión</Text>
          </Pressable>
        ) : (
          <>
            <Pressable onPress={() => setIsLogin(!isLogin)} className="mb-3">
              <Text className="text-slate-300 text-sm">
                {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                <Text className="text-amber-400 font-bold">
                  {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
                </Text>
              </Text>
            </Pressable>
            {isLogin && (
              <Pressable onPress={() => setIsRecovery(true)}>
                <Text className="text-slate-500 text-xs">¿Olvidaste tu contraseña?</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}
