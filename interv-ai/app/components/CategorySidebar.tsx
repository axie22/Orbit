"use client";

import { Card, CardHeader, CardBody } from "@heroui/react";
import { Category } from "../lib/definitions";

type CategorySidebarProps = {
  categories: Category[];
  selectedCategory: Category;
  onSelect: (category: Category) => void;
  className?: string;
};

export default function CategorySidebar({
  categories,
  selectedCategory,
  onSelect,
  className = "",
}: CategorySidebarProps) {
  return (
    <Card className={`h-full ${className}`}>
      <CardHeader className="px-4 py-3 border-b border-slate-200">
        <h1 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">
          Categories
        </h1>
      </CardHeader>

      <CardBody className="p-0">
        <nav className="flex flex-col">
          {categories.map((cat) => {
            const isActive = cat === selectedCategory;
            return (
              <button
                key={cat}
                onClick={() => onSelect(cat)}
                className={`w-full text-left px-4 py-3 text-sm border-b border-slate-100 transition-colors ${
                  isActive
                    ? "bg-slate-900 text-slate-50"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </nav>
      </CardBody>
    </Card>
  );
}
