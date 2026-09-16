import { createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    throw redirect({ to: data.user ? "/dashboard" : "/login" });
  },
  head: () => ({
    meta: [
      { title: "Land Record Intelligence System" },
      {
        name: "description",
        content:
          "AI-powered land record intelligence and verification system for land acquisition case officers.",
      },
      { property: "og:title", content: "Land Record Intelligence System" },
      {
        property: "og:description",
        content: "AI-powered land record intelligence and verification system.",
      },
    ],
  }),
  component: () => null,
});
