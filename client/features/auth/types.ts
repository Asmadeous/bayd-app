export type AuthField = {
  autoComplete: string;
  label: string;
  name: string;
  placeholder: string;
  type: "email" | "password" | "text";
};

export type AuthPageMode = "forgot" | "signin" | "signup";

export type AuthPageContent = {
  alternateAction: {
    href: string;
    label: string;
    text: string;
  };
  eyebrow: string;
  fields: AuthField[];
  forgotPasswordHref?: string;
  hero: {
    badge: string;
    image: {
      alt: string;
      src: string;
    };
    metrics: Array<{
      label: string;
      value: string;
    }>;
    note: string;
    title: string;
  };
  mode: AuthPageMode;
  primaryAction: string;
  supportText: string;
  title: string;
};
