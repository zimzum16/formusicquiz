import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadAudioFile(file: File): Promise<{ path: string; url: string }> {
  const fileName = `${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('audio-files')
    .upload(`uploads/${fileName}`, file);

  if (error) throw error;

  const { data: publicData } = supabase.storage
    .from('audio-files')
    .getPublicUrl(data.path);

  return { path: data.path, url: publicData.publicUrl };
}

export async function deleteAudioFile(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from('audio-files')
    .remove([path]);
  if (error) throw error;
}
