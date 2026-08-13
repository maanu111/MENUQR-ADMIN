import { SiteNav } from "@/components/marketing/SiteNav";
import { Hero } from "@/components/marketing/Hero";
import { Surfaces } from "@/components/marketing/Surfaces";
import { Analytics } from "@/components/marketing/Analytics";
import { SpecSheet } from "@/components/marketing/SpecSheet";
import { Pricing } from "@/components/marketing/Pricing";
import { CallToAction } from "@/components/marketing/CallToAction";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export default function LandingPage() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <Surfaces />
        <Analytics />
        <SpecSheet />
        <Pricing />
        <CallToAction />
      </main>
      <SiteFooter />
    </>
  );
}
