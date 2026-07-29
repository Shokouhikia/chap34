// Small helpers to pass multi-field wizard state between pages without
// stuffing everything into the URL. Demo-only - in-memory/localStorage,
// nothing sensitive is stored here beyond what the user already typed.

export type GenderSettingsDraft = {
  gender: "male" | "female";
  outfitType: string;
  backgroundColor: string;
};

export type PrintOrderDraft = {
  size: "3x4" | "6x8";
  quantity: number;
  paperType: "glossy" | "matte";
  fullName?: string;
  province?: string;
  city?: string;
  fullAddress?: string;
  postalCode?: string;
  phone?: string;
};

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

function write<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const genderDraft = {
  get: () => read<GenderSettingsDraft>("genderSettingsDraft"),
  set: (value: GenderSettingsDraft) => write("genderSettingsDraft", value),
};

export const printDraft = {
  get: () => read<PrintOrderDraft>("printOrderDraft"),
  set: (value: PrintOrderDraft) => write("printOrderDraft", value),
  update: (patch: Partial<PrintOrderDraft>) => {
    const current = read<PrintOrderDraft>("printOrderDraft") || {
      size: "3x4" as const,
      quantity: 6,
      paperType: "glossy" as const,
    };
    write("printOrderDraft", { ...current, ...patch });
  },
};
