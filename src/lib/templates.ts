import { FunnelTemplate } from "@/types/templates";

export const funnelTemplates: FunnelTemplate[] = [
  {
    id: "lead-magnet-funnel",
    name: "Lead Magnet Funnel",
    description: "Perfect for collecting email leads and delivering free content. Includes hero section and opt-in form with Mailchimp integration.",
    category: "lead-magnet",
    preview: "/templates/lead-magnet-preview.jpg",
    workflow: "mailchimp-optin",
    components: [
      {
        type: "hero",
        config: {
          headline: "Get Your Free Marketing Guide",
          subheadline: "Learn the 7 secrets to doubling your conversion rate in 30 days",
          backgroundColor: "#1f2937",
          textColor: "#ffffff",
          ctaButton: {
            text: "Download Free Guide",
            url: "#optin-form",
            style: "primary",
          },
          alignment: "center",
        },
        order: 0,
      },
      {
        type: "optin-form",
        config: {
          headline: "Enter Your Details Below",
          subheadline: "Get instant access to your free guide + bonus templates",
          buttonText: "Get Free Access",
          buttonStyle: "primary",
          fields: [
            {
              id: "email",
              type: "email",
              label: "Email Address",
              placeholder: "Enter your email",
              required: true,
              width: "full",
            },
            {
              id: "firstName",
              type: "name",
              label: "First Name",
              placeholder: "Enter your first name",
              required: false,
              width: "half",
            },
            {
              id: "lastName",
              type: "name",
              label: "Last Name",
              placeholder: "Enter your last name",
              required: false,
              width: "half",
            },
          ],
          backgroundColor: "#111827",
          textColor: "#ffffff",
          successMessage: "Great! Check your email for your free guide.",
          errorMessage: "Something went wrong. Please try again.",
          privacyText: "We respect your privacy. Unsubscribe at any time.",
          n8nWorkflowId: "", // Will be populated when workflow is created
        },
        order: 1,
      },
    ],
  },
  {
    id: "sales-funnel",
    name: "Product Sales Funnel",
    description: "Complete sales funnel with product showcase, testimonials, and payment integration.",
    category: "sales-funnel",
    preview: "/templates/sales-funnel-preview.jpg",
    workflow: "stripe-payment",
    components: [
      {
        type: "hero",
        config: {
          headline: "Transform Your Business Today",
          subheadline: "The complete marketing automation system that grows your business while you sleep",
          backgroundColor: "#1f2937",
          textColor: "#ffffff",
          ctaButton: {
            text: "Start Free Trial",
            url: "#pricing",
            style: "primary",
          },
          alignment: "center",
        },
        order: 0,
      },
      {
        type: "optin-form",
        config: {
          headline: "Get Started Today",
          subheadline: "Join 10,000+ businesses using our platform",
          buttonText: "Start Free Trial",
          buttonStyle: "primary",
          fields: [
            {
              id: "email",
              type: "email",
              label: "Work Email",
              placeholder: "Enter your work email",
              required: true,
              width: "full",
            },
            {
              id: "company",
              type: "text",
              label: "Company",
              placeholder: "Enter your company name",
              required: true,
              width: "full",
            },
          ],
          backgroundColor: "#111827",
          textColor: "#ffffff",
          successMessage: "Welcome! Check your email to get started.",
          errorMessage: "Something went wrong. Please try again.",
          privacyText: "14-day free trial. No credit card required.",
          n8nWorkflowId: "", // Will be populated when workflow is created
        },
        order: 1,
      },
    ],
  },
];

export const getTemplateById = (id: string): FunnelTemplate | undefined => {
  return funnelTemplates.find(template => template.id === id);
};

export const getTemplatesByCategory = (category: string): FunnelTemplate[] => {
  return funnelTemplates.filter(template => template.category === category);
};

export const getAllCategories = (): string[] => {
  const categories = new Set(funnelTemplates.map(template => template.category));
  return Array.from(categories);
};