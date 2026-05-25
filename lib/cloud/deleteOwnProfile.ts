export async function deleteOwnProfile() {
  const { supabase } = await import("../supabase");
  const { data, error } = await supabase.rpc("delete_my_profile");

  if (error) {
    throw error;
  }

  return data;
}
