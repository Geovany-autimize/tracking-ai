import { Hero } from "@/components/landing/Hero";
import { Benefits } from "@/components/landing/Benefits";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Integrations } from "@/components/landing/Integrations";
import { Pricing } from "@/components/landing/Pricing";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { CTAFinal } from "@/components/landing/CTAFinal";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/ui/Navbar";

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <Hero />
      <section id="beneficios">
        <Benefits />
      </section>
      <section id="como-funciona">
        <HowItWorks />
      </section>
      <section id="features">
        <Features />
      </section>
      <section id="integracoes">
        <Integrations />
      </section>
      <section id="precos">
        <Pricing />
      </section>
      <Testimonials />
      <section id="faq">
        <FAQ />
      </section>
      <CTAFinal />
      <Footer />
    </div>
  );
};

export default Index;
