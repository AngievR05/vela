import { Compass, Dna, House, LibraryBig, Settings } from "lucide-react";

export const PRIMARY_NAVIGATION = [
  { label: "Home", href: "/home", icon: House },
  { label: "Library", href: "/library", icon: LibraryBig },
  { label: "Discover", href: "/discover", icon: Compass },
  { label: "DNA", href: "/dna", icon: Dna },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const ROOT_SCREEN_TITLES = {
  "/home": "Home",
  "/library": "Library",
  "/discover": "Discover",
  "/dna": "Reading DNA",
  "/settings": "Settings",
};
