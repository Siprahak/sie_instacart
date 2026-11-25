import type { Data } from "./types";

let clientData: Data | null = null;
let inflight: Promise<Data> | null = null;

export async function fetchDashboardClient(forceRefresh = false): Promise<Data> {
  if (clientData && !forceRefresh) return clientData;
  if (inflight && !forceRefresh) return inflight;

  inflight = fetch("/api/dashboard")
    .then((r) => {
      if (!r.ok) throw new Error("Gagal mengambil data dashboard");
      return r.json();
    })
    .then((data: Data) => {
      clientData = data;
      inflight = null;
      return data;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });

  return inflight;
}

export function clearClientDashboardCache() {
  clientData = null;
}