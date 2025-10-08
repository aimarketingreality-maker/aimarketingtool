"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/theme";

export interface CountdownTimerProps {
  config?: {
    targetDate?: string; // ISO date string
    targetTime?: string; // HH:MM format
    message?: string;
    expiredMessage?: string;
    backgroundColor?: string;
    textColor?: string;
    accentColor?: string;
    style?: "minimal" | "bold" | "elegant";
    showDays?: boolean;
    showHours?: boolean;
    showMinutes?: boolean;
    showSeconds?: boolean;
    labels?: {
      days?: string;
      hours?: string;
      minutes?: string;
      seconds?: string;
    };
  };
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export default function CountdownTimer({ config = {}, className }: CountdownTimerProps) {
  const {
    targetDate,
    targetTime = "23:59",
    message = "Limited Time Offer - Ends In:",
    expiredMessage = "Offer has ended",
    backgroundColor = "#1f2937",
    textColor = "#ffffff",
    accentColor = "#f59e0b",
    style = "bold",
    showDays = true,
    showHours = true,
    showMinutes = true,
    showSeconds = true,
    labels = {
      days: "Days",
      hours: "Hours",
      minutes: "Minutes",
      seconds: "Seconds"
    }
  } = config;

  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      let target = new Date();

      // If target date is provided, use it
      if (targetDate) {
        target = new Date(targetDate);
      } else {
        // Otherwise use today with the specified time
        const [hours, minutes] = targetTime.split(':').map(Number);
        target.setHours(hours, minutes, 59, 999);

        // If the time has passed today, use tomorrow
        if (target <= new Date()) {
          target.setDate(target.getDate() + 1);
        }
      }

      const difference = target.getTime() - new Date().getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);

        setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
      } else {
        setTimeLeft(prev => ({ ...prev, isExpired: true }));
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate, targetTime]);

  if (timeLeft.isExpired) {
    return (
      <div
        className={cn(
          "p-6 rounded-lg text-center",
          style === "minimal" && "py-3 px-4",
          className
        )}
        style={{ backgroundColor, color: textColor }}
      >
        <p className={cn(
          style === "minimal" ? "text-sm" : "text-lg",
          style === "bold" ? "font-bold" : "font-medium"
        )}>
          {expiredMessage}
        </p>
      </div>
    );
  }

  const renderTimeUnit = (value: number, label: string) => (
    <div className="text-center">
      <div
        className={cn(
          "rounded-lg flex items-center justify-center font-bold",
          style === "minimal" && "w-12 h-12 text-lg",
          style === "bold" && "w-16 h-16 text-2xl",
          style === "elegant" && "w-20 h-20 text-3xl"
        )}
        style={{
          backgroundColor: accentColor,
          color: backgroundColor
        }}
      >
        {String(value).padStart(2, '0')}
      </div>
      <div
        className={cn(
          "mt-2 text-xs uppercase tracking-wide",
          style === "minimal" && "text-xs",
          style === "bold" && "text-sm",
          style === "elegant" && "text-sm"
        )}
        style={{ color: textColor }}
      >
        {label}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "p-6 rounded-lg text-center",
        style === "minimal" && "py-4 px-6",
        className
      )}
      style={{ backgroundColor }}
    >
      {message && (
        <p
          className={cn(
            "mb-4",
            style === "minimal" && "text-sm mb-3",
            style === "bold" && "text-lg mb-6",
            style === "elegant" && "text-lg mb-6"
          )}
          style={{ color: textColor }}
        >
          {message}
        </p>
      )}

      <div
        className={cn(
          "flex justify-center items-center gap-4",
          style === "minimal" && "gap-2",
          style === "bold" && "gap-6",
          style === "elegant" && "gap-8"
        )}
      >
        {showDays && renderTimeUnit(timeLeft.days, labels?.days || "Days")}
        {showHours && renderTimeUnit(timeLeft.hours, labels?.hours || "Hours")}
        {showMinutes && renderTimeUnit(timeLeft.minutes, labels?.minutes || "Minutes")}
        {showSeconds && renderTimeUnit(timeLeft.seconds, labels?.seconds || "Seconds")}
      </div>
    </div>
  );
}

// Editor component for the CountdownTimer
export function CountdownTimerEditor({
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

  const updateLabels = (key: string, value: string) => {
    onChange({
      ...component,
      config: {
        ...component.config,
        labels: {
          ...component.config?.labels,
          [key]: value
        }
      }
    });
  };

  const config = component.config || {};

  return (
    <div className="space-y-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900">Countdown Timer Settings</h3>

      {/* Target Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Date (optional - leave empty for daily countdown)
        </label>
        <input
          type="date"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          value={config.targetDate?.split('T')[0] || ""}
          onChange={(e) => updateConfig("targetDate", e.target.value ? e.target.value + "T23:59:59" : "")}
        />
        <p className="text-xs text-gray-500 mt-1">
          Leave empty for daily countdown to specified time
        </p>
      </div>

      {/* Target Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Time (for daily countdown)
        </label>
        <input
          type="time"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          value={config.targetTime || "23:59"}
          onChange={(e) => updateConfig("targetTime", e.target.value)}
        />
      </div>

      {/* Messages */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Active Message
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            value={config.message || ""}
            onChange={(e) => updateConfig("message", e.target.value)}
            placeholder="Limited Time Offer - Ends In:"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expired Message
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            value={config.expiredMessage || ""}
            onChange={(e) => updateConfig("expiredMessage", e.target.value)}
            placeholder="Offer has ended"
          />
        </div>
      </div>

      {/* Style */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Style
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          value={config.style || "bold"}
          onChange={(e) => updateConfig("style", e.target.value)}
        >
          <option value="minimal">Minimal</option>
          <option value="bold">Bold</option>
          <option value="elegant">Elegant</option>
        </select>
      </div>

      {/* Show/Hide Units */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Display Units
        </label>
        <div className="space-y-2">
          {[
            { key: "showDays", label: "Show Days", default: true },
            { key: "showHours", label: "Show Hours", default: true },
            { key: "showMinutes", label: "Show Minutes", default: true },
            { key: "showSeconds", label: "Show Seconds", default: true }
          ].map(({ key, label, default: defaultValue }) => (
            <div key={key} className="flex items-center">
              <input
                type="checkbox"
                id={key}
                className="mr-2"
                checked={config[key] !== false}
                onChange={(e) => updateConfig(key, e.target.checked)}
              />
              <label htmlFor={key} className="text-sm text-gray-700">
                {label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900">Colors</h4>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Background Color
          </label>
          <input
            type="color"
            className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
            value={config.backgroundColor || "#1f2937"}
            onChange={(e) => updateConfig("backgroundColor", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text Color
          </label>
          <input
            type="color"
            className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
            value={config.textColor || "#ffffff"}
            onChange={(e) => updateConfig("textColor", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Accent Color (Numbers)
          </label>
          <input
            type="color"
            className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
            value={config.accentColor || "#f59e0b"}
            onChange={(e) => updateConfig("accentColor", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}