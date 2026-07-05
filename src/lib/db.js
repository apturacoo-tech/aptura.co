import { supabase } from "./supabaseClient";

function must(error) {
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// PROFESSIONALS (publico)
// ---------------------------------------------------------------------------
export async function fetchApprovedProfessionals() {
  const { data, error } = await supabase
    .from("professionals")
    .select("*, reviews(*), portfolio_items(*)")
    .eq("status", "aprovado")
    .order("created_at", { ascending: false });
  must(error);
  return data;
}

export async function fetchProfessionalById(id) {
  const { data, error } = await supabase
    .from("professionals")
    .select("*, reviews(*), portfolio_items(*)")
    .eq("id", id)
    .maybeSingle();
  must(error);
  return data;
}

export async function fetchMyProfessional(userId) {
  const { data, error } = await supabase
    .from("professionals")
    .select("*, reviews(*), portfolio_items(*), professional_verifications(*)")
    .eq("id", userId)
    .maybeSingle();
  must(error);
  return data;
}

export async function fetchAllProfessionalsForModerator() {
  const { data, error } = await supabase
    .from("professionals")
    .select("*, professional_verifications(*)")
    .order("created_at", { ascending: false });
  must(error);
  return data;
}

export async function createProfessional({
  id, name, profession, categories, city, address, lat, lng, photoPath, description, telefone, rg, rgFrentePath, rgVersoPath,
}) {
  const { error: e1 } = await supabase.from("professionals").insert({
    id,
    name,
    profession,
    categories,
    city,
    address,
    lat,
    lng,
    photo_path: photoPath || null,
    description,
    status: "pendente",
  });
  must(e1);

  const { error: e2 } = await supabase.from("professional_verifications").insert({
    professional_id: id,
    telefone,
    rg,
    rg_frente_path: rgFrentePath,
    rg_verso_path: rgVersoPath,
  });
  must(e2);
}

export async function updateProfessionalStatus(id, status) {
  const { error } = await supabase.from("professionals").update({ status }).eq("id", id);
  must(error);
}

export async function updateProfessionalPhoto(id, photoPath) {
  const { error } = await supabase.from("professionals").update({ photo_path: photoPath }).eq("id", id);
  must(error);
}

export async function incrementProfessionalViews(id) {
  const { error } = await supabase.rpc("increment_professional_views", { prof_id: id });
  if (error) console.warn("Nao foi possivel contar a visualizacao:", error.message);
}

// ---------------------------------------------------------------------------
// PORTFOLIO
// ---------------------------------------------------------------------------
export async function addPortfolioItem(professionalId, type, path) {
  const { error } = await supabase.from("portfolio_items").insert({ professional_id: professionalId, type, path });
  must(error);
}

export async function removePortfolioItem(itemId) {
  const { error } = await supabase.from("portfolio_items").delete().eq("id", itemId);
  must(error);
}

// ---------------------------------------------------------------------------
// COMPANIES
// ---------------------------------------------------------------------------
export async function createCompany({ id, name, segment, description, documentoPath }) {
  const { error: e1 } = await supabase.from("companies").insert({ id, name, segment, description });
  must(e1);

  const { error: e2 } = await supabase.from("company_verifications").insert({
    company_id: id,
    documento_path: documentoPath,
  });
  must(e2);
}

export async function fetchMyCompany(userId) {
  const { data, error } = await supabase.from("companies").select("*").eq("id", userId).maybeSingle();
  must(error);
  return data;
}

// ---------------------------------------------------------------------------
// VAGAS
// ---------------------------------------------------------------------------
export async function fetchVagas() {
  const { data, error } = await supabase.from("vagas").select("*").order("created_at", { ascending: false });
  must(error);
  return data;
}

export async function fetchMyVagas(companyId) {
  const { data, error } = await supabase
    .from("vagas")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  must(error);
  return data;
}

export async function createVaga({ companyId, companyName, title, city, category, description }) {
  const { error } = await supabase.from("vagas").insert({
    company_id: companyId || null,
    company_name: companyName,
    title,
    city,
    category: category || "Geral",
    description,
  });
  must(error);
}

// ---------------------------------------------------------------------------
// REVIEWS
// ---------------------------------------------------------------------------
export async function addReview(professionalId, author, rating, comment) {
  const { error } = await supabase.from("reviews").insert({ professional_id: professionalId, author, rating, comment });
  must(error);
}

// ---------------------------------------------------------------------------
// CONVERSAS / MENSAGENS
// ---------------------------------------------------------------------------
export async function getOrCreateConversation(professionalId, visitorId) {
  const { data: existing, error: e1 } = await supabase
    .from("conversations")
    .select("*")
    .eq("professional_id", professionalId)
    .eq("visitor_id", visitorId)
    .maybeSingle();
  must(e1);
  if (existing) return existing;

  const { data: created, error: e2 } = await supabase
    .from("conversations")
    .insert({ professional_id: professionalId, visitor_id: visitorId })
    .select()
    .single();
  must(e2);
  return created;
}

export async function fetchMessages(conversationId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  must(error);
  return data;
}

export async function sendMessage({ conversationId, senderId, text, imagePath, videoUrl }) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    text: text || null,
    image_path: imagePath || null,
    video_url: videoUrl || null,
  });
  must(error);
}

// Todas as conversas de um prestador, com o nome do visitante e as mensagens
export async function fetchProfessionalConversations(professionalId) {
  const { data, error } = await supabase
    .from("conversations")
    .select("*, profiles(name), messages(*)")
    .eq("professional_id", professionalId)
    .order("updated_at", { ascending: false });
  must(error);
  return data;
}

// Assina novas mensagens em tempo real para uma conversa (chat ao vivo de verdade)
export function subscribeToMessages(conversationId, onInsert) {
  const channel = supabase
    .channel(`messages-${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}
