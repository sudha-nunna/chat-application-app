import { motion, AnimatePresence } from "motion/react";
import { Terminal, Menu, X } from "lucide-react";
import { FiFacebook as Facebook, FiLinkedin as Linkedin, FiGithub as Github } from "react-icons/fi";
import { useState, useEffect } from "react";

export function Navbar({ onSignInClick, onBookDemoClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  const navLinks = [
    { name: "Workflows", href: "#workflows" },
    { name: "Agents", href: "#agents" },
    { name: "Integrations", href: "#integrations" },
    { name: "Use Cases", href: "#usecases" },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 py-4 md:px-12 transition-colors duration-300 ${
          scrolled || isOpen
            ? "backdrop-blur-md bg-[#030303]/80 border-b border-white/[0.05]"
            : "bg-transparent border-transparent"
        }`}
      >
        <div className="flex items-center gap-2 relative z-[101]">
          <div className="w-10 h-10 p-1 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
            <img src="/mini-logo.png" />
          </div>
          <h5 className="font-display font-semibold text-2xl tracking-tight">
            Nexora <span className="text-gradient-accent">AI</span>
          </h5>
        </div>

        <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-white/60">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="hover:text-white transition-colors relative group"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-4">
          <button
            onClick={onSignInClick}
            className="text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button onClick={onBookDemoClick} className="px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors hover:scale-105 active:scale-95">
            Book Demo
          </button>
        </div>

        <button
          className="lg:hidden relative z-[101] p-2 text-white/80 hover:text-white transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </motion.nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[90] bg-[#030303] flex flex-col pt-24 px-6 pb-6"
          >
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex flex-col gap-6">
                {navLinks.map((link, i) => (
                  <motion.a
                    key={link.name}
                    href={link.href}
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: i * 0.1,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    onClick={() => setIsOpen(false)}
                    className="text-4xl sm:text-5xl font-display font-medium text-white/80 hover:text-white transition-colors"
                  >
                    {link.name}
                  </motion.a>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-auto flex flex-col gap-4 border-t border-white/10 pt-6"
            >
              <button
                onClick={() => {
                  setIsOpen(false);
                  onSignInClick?.();
                }}
                className="w-full py-4 text-center text-sm font-medium text-white/80 hover:text-white transition-colors border border-white/10 rounded-xl hover:bg-white/5"
              >
                Sign In
              </button>
              <button onClick={() => { setIsOpen(false); onBookDemoClick?.(); }} className="w-full py-4 text-center rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors">
                Book Demo
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function Footer() {
  return (
    <footer className="pt-24 pb-8 bg-[#050505] px-6 md:px-12 border-t border-white/[0.05] relative overflow-hidden">
      {/* <div className="absolute inset-0 z-0 bg-[url('/footer-bg.png')] bg-cover bg-center bg-no-repeat opacity-20 mix-blend-screen" /> */}
      {/* <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/80 to-transparent z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_center,rgba(59,130,246,0.05),transparent_50%)] z-0" /> */}

      <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 relative mb-6">
            <div className="w-10 h-10 p-1 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
              <img src="/mini-logo.png" />
            </div>
            <h5 className="font-display font-semibold text-2xl tracking-tight">
              Nexora <span className="text-gradient-accent">AI</span>
            </h5>
          </div>
          <p className="text-white/50 text-sm max-w-xs mb-8 leading-relaxed">
            Nexora AI — Build agents. Connect knowledge. Automate work.
          </p>
          <div className="flex gap-4">
            <a
              href="#"
              className="group w-10 h-10 rounded-full glass-panel flex items-center justify-center cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:shadow-[0_0_20px_rgba(139,92,246,0.45)] hover:border-violet-400/40"
            >
              <Facebook
                size={18}
                className="text-white/80 transition-all duration-300 group-hover:text-violet-300 group-hover:drop-shadow-[0_0_10px_rgba(168,85,247,0.9)]"
              />
            </a>

            <a
              href="#"
              className="group w-10 h-10 rounded-full glass-panel flex items-center justify-center cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:shadow-[0_0_20px_rgba(139,92,246,0.45)] hover:border-violet-400/40"
            >
              <Linkedin
                size={18}
                className="text-white/80 transition-all duration-300 group-hover:text-cyan-300 group-hover:drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]"
              />
            </a>

            <a
              href="#"
              className="group w-10 h-10 rounded-full glass-panel flex items-center justify-center cursor-pointer transition-all duration-300 ease-out hover:scale-110 hover:shadow-[0_0_20px_rgba(139,92,246,0.45)] hover:border-violet-400/40"
            >
              <Github
                size={18}
                className="text-white/80 transition-all duration-300 group-hover:text-violet-300 group-hover:drop-shadow-[0_0_10px_rgba(168,85,247,0.9)]"
              />
            </a>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-6">Product</h3>
       <ul className="space-y-4 text-sm text-white/50">
            <li>
              <a href="#" className="hover:text-white transition-colors">
                AI Agents
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Workflows
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Knowledge
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Integrations
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                AI Workspace
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold mb-6">Company / General</h3>
          <ul className="space-y-4 text-sm text-white/50">
            <li>
              <a href="#" className="hover:text-white transition-colors">
                About
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Contact
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Documentation
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-6 lg:mt-24 pt-8 border-t border-white/[0.05] flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/40">
        <p>© 2026 Nexora AI Inc. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-white transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
}
