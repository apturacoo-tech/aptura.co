import { supabase } from "./supabaseClient";

// Redimensiona e comprime uma imagem no navegador antes do upload,
// devolvendo um Blob (arquivo) pronto para mandar pro Supabase Storage.
export function compressImageFile(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Nao foi possivel ler o arquivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo de imagem invalido."));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Faz upload de um arquivo de imagem para um bucket, dentro de uma "pasta"
// (normalmente o id do usuario ou da conversa, para bater com as politicas de acesso).
// Retorna o "path" salvo no banco (nao a URL — a URL e resolvida na hora de exibir,
// publica para buckets publicos ou assinada/temporaria para buckets privados).
export async function uploadImage({ bucket, folder, file, maxWidth = 1200, quality = 0.75 }) {
  const blob = await compressImageFile(file, maxWidth, quality);
  const path = `${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

// Buckets publicos (avatars, portfolio): URL direta e permanente.
export function publicUrl(bucket, path) {
  if (!path) return "";
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Buckets privados (documents, chat-attachments): URL assinada, expira em `expiresIn` segundos.
export async function signedUrl(bucket, path, expiresIn = 3600) {
  if (!path) return "";
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
