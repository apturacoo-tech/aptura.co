import { supabase } from "./supabaseClient";

// Cria a conta no Supabase Auth (senha vai criptografada, nunca em texto puro)
// e a linha correspondente em "profiles". As tabelas de profissional/empresa
// sao criadas separadamente por quem chama isso (ver db.js).
export async function signUpUser({ email, senha, name, tipo }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
  });
  if (error) throw error;

  const userId = data.user?.id;
  if (!userId) {
    throw new Error("Nao foi possivel criar a conta. Verifique o e-mail informado.");
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    tipo,
    name,
    email,
  });
  if (profileError) throw profileError;

  return userId;
}

export async function signInUser({ email, senha }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
  return data.user;
}

export async function signOutUser() {
  await supabase.auth.signOut();
}

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Monta o objeto de sessao usado pelo app (profile + is_moderator + tipo)
export async function fetchFullProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
}

export function onAuthStateChange(callback) {
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => listener.subscription.unsubscribe();
}
