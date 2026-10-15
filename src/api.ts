export let csrf = "";
export function setCsrf(value: string) {
  csrf = value;
}
export async function api<T = any>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
      body:
        body === undefined
          ? undefined
          : JSON.stringify(body, (key, value) => {
              if (
                [
                  "amount",
                  "area",
                  "plannedArea",
                  "actualArea",
                  "agreedPrice",
                  "adjustment",
                  "tankLiters",
                ].includes(key) &&
                typeof value === "string" &&
                value.includes(",")
              )
                return value.replaceAll(".", "").replace(",", ".");
              return value;
            }),
    });
  } catch {
    throw Error("Bağlantı kesildi; bilgiler kaydedilmedi. Formunuz korunuyor.");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw Error(data?.error?.message ?? "İşlem kaydedilemedi.");
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
export const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("tr-TR", {
        timeZone: "Europe/Istanbul",
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "Planlanmadı";
export const number = (v: unknown, unit = "") =>
  v == null
    ? "Ölçülmedi"
    : `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(Number(v))} ${unit}`;
export const localInput = (value?: string) => {
  const d = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .format(d)
    .replace(" ", "T");
};
export const iso = (v: string) => new Date(v + "+03:00").toISOString();
export const today = () => localInput().slice(0, 10);
export const dayEnd = (day: string) =>
  new Date(
    new Date(day + "T00:00:00+03:00").getTime() + 86400000,
  ).toISOString();
export const labels: Record<string, string> = {
  REQUESTED: "Talep",
  PLANNED: "Planlandı",
  RUNNING: "Devam ediyor",
  COMPLETED: "Tamamlandı",
  POSTPONED: "Ertelendi",
  CANCELLED: "İptal",
  PREPARATION: "Hazırlığa başla",
  FLIGHT_START: "Uçuşa başla",
  FLIGHT_END: "Uçuşu bitir",
  REFILL: "Dolum",
  BATTERY: "Batarya değişimi",
  WAIT_START: "Beklemeye başla",
  WAIT_END: "Beklemeyi bitir",
  COMPLETE: "İşi tamamla",
  TRANSPORT: "Ulaşım",
  ENERGY: "Enerji / yakıt",
  LABOR: "İşçilik",
  CONSUMABLE: "Sarf",
  OTHER: "Diğer",
  preparation: "Hazırlık / geçiş",
  flight: "Uçuş",
  refill: "Dolum",
  battery: "Batarya",
  waiting: "Bekleme",
};
