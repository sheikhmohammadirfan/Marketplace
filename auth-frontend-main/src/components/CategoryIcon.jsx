import { Armchair, BookOpen, Briefcase, Car, House, Package, PawPrint, Shirt, Smartphone } from "lucide-react";

const ICONS = {
  Vehicles: Car,
  Property: House,
  Electronics: Smartphone,
  Furniture: Armchair,
  Fashion: Shirt,
  Jobs: Briefcase,
  "Books & Hobbies": BookOpen,
  Pets: PawPrint,
  Other: Package,
};

export default function CategoryIcon({ category, size = 18 }) {
  const Icon = ICONS[category] || Package;
  return <Icon size={size} />;
}
