export interface TemplateComponent {
  type: "hero" | "optin-form" | "features" | "testimonials" | "pricing" | "countdown-timer";
  config: Record<string, any>;
  order: number;
}

export interface FunnelTemplate {
  id: string;
  name: string;
  description: string;
  category: "lead-magnet" | "sales-funnel" | "webinar" | "product-launch" | "booking";
  preview: string;
  components: TemplateComponent[];
  workflow?: string; // n8n workflow template ID
}