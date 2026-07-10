// js/real-data.js
// Real, published EduSpots network data — do NOT modify without checking
// against the primary sources listed below. Everything in this file is
// intentionally kept separate from synthetic/generated data so the boundary
// between "real" and "demo" is always clear.

const REAL_REGIONAL_COORDINATORS = [
  { name: "Cynthia Mawuena Tetteh", region: "Volta Region" },
  { name: "Getrude Akunlibe",       region: "Northern Region" },
  { name: "Abdul Wadud Suleiman",   region: "Central/Western Regions" },
  { name: "Abdul-Malik Iddrisu",    region: "New Spots" },
]; // source: https://eduspots.org/about-us/team/

const REAL_SPOT_NAMES = [
  "Aboabo No.4", "Abofour", "Abutia", "Agbledomi", "Ahenkro", "Akumadan",
  "Ameyaw", "Asemasa", "Atanve", "Banda Kabrono", "Bimbilla", "Bono Manso",
  "Bosomadwe", "Dadwen", "Dodome Awuiasu", "Donkorkrom", "Dulugu",
  "Ejisu-Besease", "Ejura", "Ekawso", "Ekumfi", "Elmina", "Funkoe",
  "Gambibgo", "Gomoa-Manso", "Ho-Kpenoe", "Joska Kenya", "Kalpohin",
  "Katanga-Zuarungu", "Kato Berekum", "Kejabil", "Kotokoli Zongo",
  "Kumbungu Zamigu", "Metsrikasa", "Mpatano", "New Ebu", "Nkonya", "Piisi",
  "Posmonu", "Sakasaka", "Sanzule-Krisan", "Savelugu", "Sefwi Asanteman",
  "Soko", "Takuve", "Teshie", "Wodome", "Yamfo", "Zangbalun",
]; // source: https://eduspots.org/ — 49 individually named Spots

// Real, published network aggregates
// source: eduspots.org homepage + 2024 annual report
// Used to ground network-wide references in report drafts.
// Do NOT adjust these figures without checking the source.
const REAL_NETWORK_TOTALS = {
  totalSpots:            52,
  totalCatalysts:        412,
  totalSparks:           12000,
  bookBorrowingChange:   "500% increase (2024 reporting period)",
  fundingGrowth:         "56% increase (2024)",
  asOf:                  "2024/2025 reporting period",
  source:                "https://eduspots.org/",
};
