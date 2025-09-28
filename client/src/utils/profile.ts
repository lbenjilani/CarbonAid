// src/utils/profile.ts
export type Profile = { name: string };

const KEY = 'profile';

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { name: 'Bro' }; // default from your bio
    const p = JSON.parse(raw);
    if (!p || typeof p.name !== 'string' || !p.name.trim()) return { name: 'Bro' };
    return { name: p.name.trim() };
  } catch {
    return { name: 'Bro' };
  }
}

export function saveProfile(p: Profile) {
  localStorage.setItem(KEY, JSON.stringify({ name: String(p.name || 'Bro').trim() }));
}
