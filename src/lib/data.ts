import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getWeather } from "./weather.functions";
import { useUserId } from "./auth";

export type Item = Tables<"clothing_items">;
export type Tag = Tables<"rfid_tags">;

export function useItems() {
  const uid = useUserId();
  return useQuery({
    queryKey: ["items", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("clothing_items").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useTags() {
  const uid = useUserId();
  return useQuery({
    queryKey: ["tags", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("rfid_tags").select("*");
      if (error) throw error;
      return data;
    },
  });
}

export function useProfile() {
  const uid = useUserId();
  return useQuery({
    queryKey: ["profile", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useDevices() {
  const uid = useUserId();
  return useQuery({
    queryKey: ["devices", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("devices").select("id,device_name,device_identifier,last_seen_at,created_at").order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useScans(limit = 20) {
  const uid = useUserId();
  return useQuery({
    queryKey: ["scans", uid, limit],
    enabled: !!uid,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase.from("scan_events").select("*").order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useReadings(limit = 50) {
  const uid = useUserId();
  return useQuery({
    queryKey: ["readings", uid, limit],
    enabled: !!uid,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.from("sensor_readings").select("*").order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

export function useWeatherForProfile() {
  const { data: profile } = useProfile();
  const fetchWeather = useServerFn(getWeather);
  return useQuery({
    queryKey: ["weather", profile?.latitude, profile?.longitude],
    enabled: profile?.latitude != null && profile?.longitude != null,
    staleTime: 10 * 60 * 1000,
    queryFn: () => fetchWeather({ data: { latitude: profile!.latitude!, longitude: profile!.longitude!, location: profile!.location_name ?? undefined } }),
  });
}

const urlCache = new Map<string, { url: string; exp: number }>();
export function useImageUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["img", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const c = urlCache.get(path!);
      if (c && c.exp > Date.now()) return c.url;
      const { data, error } = await supabase.storage.from("clothing-images").createSignedUrl(path!, 3600);
      if (error) throw error;
      urlCache.set(path!, { url: data.signedUrl, exp: Date.now() + 55 * 60 * 1000 });
      return data.signedUrl;
    },
  });
}

export function useOutfits(limit = 100) {
  const uid = useUserId();
  return useQuery({
    queryKey: ["outfits", uid, limit], enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from("outfit_recommendations").select("*").order("created_at", { ascending: false }).limit(limit);
      if (error) throw error;
      return data;
    },
  });
}

