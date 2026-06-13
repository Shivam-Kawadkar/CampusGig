import { MarketingNav } from "@/features/marketing/components/marketing-nav";
import { Hero } from "@/features/marketing/components/hero";
import { HowItWorks } from "@/features/marketing/components/how-it-works";
import { Categories } from "@/features/marketing/components/categories";
import { LeaderboardTeaser } from "@/features/marketing/components/leaderboard-teaser";
import { WhyCampusGig } from "@/features/marketing/components/why-campusgig";
import { StatsBand } from "@/features/marketing/components/stats-band";
import { Testimonials } from "@/features/marketing/components/testimonials";
import { CtaFooter } from "@/features/marketing/components/cta-footer";

export default function LandingPage() {
  return (
    <>
      <MarketingNav />
      <main>
        <Hero />
        <div id="how">
          <HowItWorks />
        </div>
        <Categories />
        <LeaderboardTeaser />
        <StatsBand />
        <WhyCampusGig />
        <Testimonials />
        <CtaFooter />
      </main>
    </>
  );
}
