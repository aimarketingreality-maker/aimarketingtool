"use client";

import React from "react";
import { cn } from "@/lib/theme";

export interface TestimonialProps {
  testimonial: {
    name: string;
    role: string;
    company: string;
    content: string;
    avatar?: string;
    rating?: number;
  };
  config?: {
    backgroundColor?: string;
    textColor?: string;
    cardBackgroundColor?: string;
    showRating?: boolean;
    layout?: "grid" | "carousel" | "single";
    avatarShape?: "circle" | "square";
    textSize?: "small" | "medium" | "large";
  };
  className?: string;
}

export default function Testimonial({
  testimonial,
  config = {},
  className
}: TestimonialProps) {
  const {
    backgroundColor = "#ffffff",
    textColor = "#1f2937",
    cardBackgroundColor = "#f9fafb",
    showRating = true,
    layout = "single",
    avatarShape = "circle",
    textSize = "medium"
  } = config;

  const textSizeClasses = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg"
  };

  if (layout === "single") {
    return (
      <div
        className={cn("p-6 rounded-lg", className)}
        style={{ backgroundColor: cardBackgroundColor }}
      >
        {/* Rating */}
        {showRating && testimonial.rating && (
          <div className="flex mb-4">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={cn(
                  "w-5 h-5",
                  i < testimonial.rating ? "text-yellow-400" : "text-gray-300"
                )}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        )}

        {/* Quote */}
        <blockquote
          className={cn(
            "font-medium mb-6 leading-relaxed italic",
            textSizeClasses[textSize]
          )}
          style={{ color: textColor }}
        >
          "{testimonial.content}"
        </blockquote>

        {/* Author */}
        <div className="flex items-center">
          {testimonial.avatar && (
            <img
              src={testimonial.avatar}
              alt={testimonial.name}
              className={cn(
                "w-12 h-12 mr-4 object-cover",
                avatarShape === "circle" ? "rounded-full" : "rounded-lg"
              )}
            />
          )}
          <div>
            <div
              className="font-semibold"
              style={{ color: textColor }}
            >
              {testimonial.name}
            </div>
            <div
              className="text-sm opacity-75"
              style={{ color: textColor }}
            >
              {testimonial.role}
              {testimonial.company && ` at ${testimonial.company}`}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid or carousel layout would be implemented here
  return null;
}

// Editor component for the Testimonial
export function TestimonialEditor({
  component,
  onChange
}: {
  component: any;
  onChange: (updates: any) => void;
}) {
  const updateConfig = (key: string, value: any) => {
    onChange({
      ...component,
      config: {
        ...component.config,
        [key]: value
      }
    });
  };

  const updateTestimonial = (key: string, value: any) => {
    onChange({
      ...component,
      config: {
        ...component.config,
        testimonial: {
          ...component.config?.testimonial,
          [key]: value
        }
      }
    });
  };

  const testimonial = component.config?.testimonial || {
    name: "",
    role: "",
    company: "",
    content: "",
    rating: 5
  };

  const config = component.config || {};

  return (
    <div className="space-y-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900">Testimonial Settings</h3>

      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Testimonial Content
        </label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          rows={4}
          value={testimonial.content}
          onChange={(e) => updateTestimonial("content", e.target.value)}
          placeholder="Enter the testimonial text..."
        />
      </div>

      {/* Author Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            value={testimonial.name}
            onChange={(e) => updateTestimonial("name", e.target.value)}
            placeholder="Customer name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            value={testimonial.role}
            onChange={(e) => updateTestimonial("role", e.target.value)}
            placeholder="Job title"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Company
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          value={testimonial.company}
          onChange={(e) => updateTestimonial("company", e.target.value)}
          placeholder="Company name"
        />
      </div>

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rating
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          value={testimonial.rating}
          onChange={(e) => updateTestimonial("rating", parseInt(e.target.value))}
        >
          {[5, 4, 3, 2, 1].map(rating => (
            <option key={rating} value={rating}>
              {rating} {rating === 1 ? 'Star' : 'Stars'}
            </option>
          ))}
        </select>
      </div>

      {/* Avatar URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Avatar URL (optional)
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          value={testimonial.avatar || ""}
          onChange={(e) => updateTestimonial("avatar", e.target.value)}
          placeholder="https://example.com/avatar.jpg"
        />
      </div>

      {/* Display Options */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900">Display Options</h4>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="showRating"
            className="mr-2"
            checked={config.showRating !== false}
            onChange={(e) => updateConfig("showRating", e.target.checked)}
          />
          <label htmlFor="showRating" className="text-sm text-gray-700">
            Show rating stars
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Size
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            value={config.textSize || "medium"}
            onChange={(e) => updateConfig("textSize", e.target.value)}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
      </div>
    </div>
  );
}