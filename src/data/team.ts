import type { LocalizedString } from "@lib/types";

interface TeamMember {
  id: string;
  name: string;
  role: LocalizedString;
}

// Photos: public/images/team/<id>.webp. Missing photos use the shared avatar.
export const teamMembers: TeamMember[] = [
  { id: "osman", name: "Osman Veyisli", role: { az: "Təsisçi", en: "Founder" } },
  { id: "ayhan", name: "Ayhan Qədimov", role: { az: "Həmtəsisçi", en: "Co-founder" } },
  { id: "ehad", name: "Əhəd Dilanov", role: { az: "Texniki rəhbər", en: "Tech Lead" } },
  { id: "atilla", name: "Atilla Mustafa", role: { az: "Texniki rəhbər", en: "Tech Lead" } },
  { id: "tofiq", name: "Tofiq Fərəcli", role: { az: "Analitika üzrə rəhbər", en: "Analytics lead" } },
  // Provisional role: update both translations here when confirmed.
  { id: "imran", name: "İmran Hidayətzadə", role: { az: "Marketinq rəhbəri", en: "Marketing lead" } },
];
