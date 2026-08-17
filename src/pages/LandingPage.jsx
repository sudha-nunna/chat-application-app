import { useNavigate } from 'react-router-dom';
import { Navbar, Footer } from "../components/landing/Layout";
import { Hero } from "../components/landing/Hero";
import {
  TimelineSection,
  PillarsSection,
  WorkflowSection,
} from "../components/landing/Features";
import {
  DocumentSection,
  MemorySection,
  StudioSection,
} from "../components/landing/Intelligence";
import { MultiAgentSection, ApiSection } from "../components/landing/Agents";
import {
  IndustriesSection,
  CtaSection,
  RoadmapSection,
} from "../components/landing/Company";

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen font-sans antialiased landing bg-[#030303] text-white selection:bg-blue-500/30 overflow-hidden">
      <Navbar onSignInClick={() => navigate('/dashboard')} onBookDemoClick={() => navigate('/dashboard')} />

      <main>
        <div id="home">
          <Hero />
        </div>
        <div id="workflows">
          <TimelineSection />
          <PillarsSection />
          <WorkflowSection />
        </div>
        <div id="agents">
          <DocumentSection />
          <MemorySection />
          <StudioSection />
          <MultiAgentSection />
        </div>
        <div id="integrations">
          <ApiSection />
        </div>
        <div id="usecases">
          <IndustriesSection />
          <CtaSection />
          <RoadmapSection />
        </div>
      </main>
      <Footer />
    </div>
  );
}
