// Local device profile (display name + avatar photo) — stored in
// localStorage since there is no login/auth system yet. Once staff
// accounts exist this should move to the staff row in the database.

const KEY = "prompost:profile";

export type Profile = {
  name: string;
  photo: string | null; // data URL
};

const DEFAULT_PROFILE: Profile = { name: "", photo: null };

export function getProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // best-effort
  }
}
