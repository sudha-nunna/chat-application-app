import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';

// interface LoginProps {
//   onClose: () => void;
// }

const slides = [
  {
    // image: '/robot-middle.png',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=1200',
    quote: "Working with this team was a game-changer. The design felt incredibly intuitive, and everything was tailored perfectly to our needs. We've already seen a noticeable improvement in user engagement.",
    author: "Aathif Thajudeen",
    role: "Product Designer at Meta"
  },
  {
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1200',
    quote: "The platform's orchestration capabilities have transformed how we handle complex queries. It's like having an entire department working at light speed.",
    author: "Sarah Jenkins",
    role: "CTO at InnovateCorp"
  },
  {
    image: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80&w=1200',
    quote: "Unmatched performance and reliability. Nexora AI has seamlessly integrated into our existing infrastructure without any friction.",
    author: "David Chen",
    role: "Lead Architect at Systems.io"
  }
];

export function Login({ onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p--4 md:p--8 bg-black/60 backdrop-blur-sm"
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[210]"
      >
        <X className="w-6 h-6" />
      </button>

      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="w-full max-w-[1000px h-full max-h-[700px bg-[#0A0A0A] rounded-[32px overflow-hidden flex flex-col md:flex-row shadow-2xl relative"
      >
        {/* Left Side - Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative z-10 overflow-y-auto">
          <div className="max-w-[360px] mx-auto w-full">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-display font-medium text-white mb-2">Welcome back to Nexora!</h2>
              <p className="text-white/50 text-sm">Please enter your details to sign in your account</p>
            </div>

            <div className="space-y-3 mb-6">
              <button className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium text-white/90">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
              <button className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium text-white/90">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.09 2.31-.86 3.59-.8 1.54.03 2.8.59 3.66 1.76-3.08 1.84-2.58 5.79.48 7.12-.76 1.76-1.74 3.24-2.81 4.09zm-2.9-15.01c-.13-2.12 1.62-4.04 3.73-4.27.31 2.24-1.69 4.14-3.73 4.27z"/>
                </svg>
                Continue with Apple
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-xs text-white/40 font-medium">Or sign with</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">Email</label>
                <input 
                  type="email" 
                  placeholder="johndoe@gmail.com"
                  className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/70">Password</label>
                <input 
                  type="password" 
                  placeholder="minimum 8 character"
                  className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>

              <button className="w-full bg-white text-black font-medium text-sm py-3 rounded-xl mt-2 hover:bg-white/90 transition-colors">
                Sign In
              </button>
            </form>

            <div className="mt-4 text-center">
              <a href="#" className="text-xs text-white/50 hover:text-white transition-colors underline decoration-white/20 underline-offset-4">
                Forgot password?
              </a>
            </div>
          </div>
        </div>

        {/* Right Side - Image Slider */}
        <div className="hidden md:block w-1/2 relative bg-[#111111] m-2 rounded-xl overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.img
              key={currentSlide}
              src={slides[currentSlide].image}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 w-full h-full object-cover"
              alt="Slide"
            />
          </AnimatePresence>
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-10 z-10 flex flex-col justify-end">
            <div className="flex gap-1.5 mb-6">
              {slides.map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/60'}`}
                />
              ))}
            </div>

            <motion.div
              key={`text-${currentSlide}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <p className="text-white/90 font-medium text-base leading-relaxed mb-6">
                {slides[currentSlide].quote}
              </p>
              
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-white font-medium text-sm">{slides[currentSlide].author}</div>
                  <div className="text-white/50 text-xs mt-0.5">{slides[currentSlide].role}</div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={prevSlide}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={nextSlide}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
