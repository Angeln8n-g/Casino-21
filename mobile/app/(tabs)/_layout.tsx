import React from 'react';
import { Tabs } from 'expo-router';
import { ShoppingBag, Home, User, Users, Calendar } from 'lucide-react-native';
import { useNotifications } from '../../hooks/useNotifications';

export default function TabsLayout() {
  const { totalPending, unreadCount } = useNotifications();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#fbbf24',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#020617',
          borderTopColor: '#1e293b',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarBadgeStyle: {
          backgroundColor: '#ef4444',
          color: '#ffffff',
          fontSize: 10,
          fontWeight: '900',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Tienda',
          tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Eventos',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          tabBarBadge: totalPending > 0 ? totalPending : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
