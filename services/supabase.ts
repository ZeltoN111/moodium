import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

/**
 * When an email link fails (expired, already used…), Supabase redirects back with the reason in the URL.
 * Read it before the client cleans the address, so the login screen can explain what happened.
 */
export const authLinkError: { code: string; description: string } | null = (() => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, '') || window.location.search);
  const description = params.get('error_description');
  const code = params.get('error_code') ?? params.get('error');
  return description || code ? { code: code ?? '', description: description ?? '' } : null;
})();

/** Cloud sync is optional: without these two variables the app stays fully local. */
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: Platform.OS === 'web',
        },
      })
    : null;
