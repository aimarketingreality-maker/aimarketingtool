"use client";

import React from "react";
import { cn } from "@/lib/theme";

export interface HeroSectionConfig {
  headline: string;
  subheadline: string;
  backgroundImage?: string;
  backgroundColor?: string;
  textColor?: string;
  ctaButton?: {
    text: string;
    url: string;
    style: "primary" | "secondary";
  };
  alignment?: "left" | "center" | "right";
}

interface HeroSectionProps {
  config: HeroSectionConfig;
  isPreview?: boolean;
  onUpdate?: (config: HeroSectionConfig) => void;
}

const defaultConfig: HeroSectionConfig = {
  headline: "Transform Your Business Today",
  subheadline: "Discover how our marketing funnel builder can help you generate more leads and sales automatically.",
  backgroundColor: "#1f2937",
  textColor: "#ffffff",
  ctaButton: {
    text: "Get Started Free",
    url: "#",
    style: "primary",
  },
  alignment: "center",
};

export function HeroSection({ config, isPreview = false, onUpdate }: HeroSectionProps) {
  const heroConfig = { ...defaultConfig, ...config };

  const getAlignmentClasses = () => {
    switch (heroConfig.alignment) {
      case "left":
        return "text-left items-start";
      case "right":
        return "text-right items-end";
      default:
        return "text-center items-center";
    }
  };

  const getButtonClasses = () => {
    const baseClasses = "px-8 py-3 rounded-lg font-semibold transition-all duration-200 inline-block";
    return heroConfig.ctaButton?.style === "secondary"
      ? `${baseClasses} bg-transparent border-2 border-white text-white hover:bg-white hover:text-gray-900`
      : `${baseClasses} bg-yellow-500 text-gray-900 hover:bg-yellow-400 shadow-lg hover:shadow-xl`;
  };

  if (isPreview) {
    return (
      <div
        className={cn(
          "relative min-h-[400px] rounded-lg overflow-hidden border-2 border-dashed border-gray-600",
          "flex flex-col justify-center p-8"
        )}
        style={{
          backgroundColor: heroConfig.backgroundColor,
          color: heroConfig.textColor,
        }}
      >
        <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
          Hero Section
        </div>

        <div className={cn("flex flex-col space-y-4 max-w-4xl mx-auto w-full", getAlignmentClasses())}>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            {heroConfig.headline}
          </h1>
          <p className="text-xl md:text-2xl opacity-90 max-w-2xl">
            {heroConfig.subheadline}
          </p>
          {heroConfig.ctaButton && (
            <button className={getButtonClasses()}>
              {heroConfig.ctaButton.text}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <section
      className="relative min-h-screen flex items-center justify-center"
      style={{
        backgroundColor: heroConfig.backgroundColor,
        backgroundImage: heroConfig.backgroundImage
          ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${heroConfig.backgroundImage})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: heroConfig.textColor,
      }}
    >
      <div className="container mx-auto px-4 py-16">
        <div className={cn("flex flex-col space-y-8 max-w-4xl mx-auto w-full", getAlignmentClasses())}>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            {heroConfig.headline}
          </h1>
          <p className="text-xl md:text-3xl opacity-90 max-w-3xl leading-relaxed">
            {heroConfig.subheadline}
          </p>
          {heroConfig.ctaButton && (
            <a
              href={heroConfig.ctaButton.url}
              className={getButtonClasses()}
            >
              {heroConfig.ctaButton.text}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

// Editor component for configuring the Hero Section
export function HeroSectionEditor({ config, onUpdate }: { config: HeroSectionConfig; onUpdate: (config: HeroSectionConfig) => void }) {
  const [localConfig, setLocalConfig] = React.useState<HeroSectionConfig>({ ...defaultConfig, ...config });

  const handleChange = (field: keyof HeroSectionConfig, value: any) => {
    const newConfig = { ...localConfig, [field]: value };
    setLocalConfig(newConfig);
    onUpdate(newConfig);
  };

  return (
    <div className="space-y-6 p-6 bg-gray-800 rounded-lg">
      <h3 className="text-lg font-semibold text-white mb-4">Hero Section Settings</h3>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Headline
        </label>
        <input
          type="text"
          value={localConfig.headline}
          onChange={(e) => handleChange("headline", e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Subheadline
        </label>
        <textarea
          value={localConfig.subheadline}
          onChange={(e) => handleChange("subheadline", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Alignment
        </label>
        <select
          value={localConfig.alignment}
          onChange={(e) => handleChange("alignment", e.target.value as "left" | "center" | "right")}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500"
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Background Color
        </label>
        <input
          type="color"
          value={localConfig.backgroundColor}
          onChange={(e) => handleChange("backgroundColor", e.target.value)}
          className="w-full h-10 bg-gray-700 border border-gray-600 rounded-md cursor-pointer"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Text Color
        </label>
        <input
          type="color"
          value={localConfig.textColor}
          onChange={(e) => handleChange("textColor", e.target.value)}
          className="w-full h-10 bg-gray-700 border border-gray-600 rounded-md cursor-pointer"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          CTA Button Text
        </label>
        <input
          type="text"
          value={localConfig.ctaButton?.text || ""}
          onChange={(e) => handleChange("ctaButton", { ...localConfig.ctaButton, text: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          CTA Button URL
        </label>
        <input
          type="text"
          value={localConfig.ctaButton?.url || ""}
          onChange={(e) => handleChange("ctaButton", { ...localConfig.ctaButton, url: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Button Style
        </label>
        <select
          value={localConfig.ctaButton?.style || "primary"}
          onChange={(e) => handleChange("ctaButton", { ...localConfig.ctaButton, style: e.target.value as "primary" | "secondary" })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-yellow-500 focus:border-yellow-500"
        >
          <option value="primary">Primary (Yellow)</option>
          <option value="secondary">Secondary (Outlined)</option>
        </select>
      </div>
    </div>
  );
}