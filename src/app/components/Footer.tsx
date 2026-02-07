export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-sage-green/20 bg-cream/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-5 xl:px-0 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          {/* Logo */}
          <div className="flex items-baseline">
            <span className="font-playfair text-lg sm:text-xl font-bold text-sage-green">Cucina</span>
            <span className="font-playfair text-lg sm:text-xl font-bold italic text-blood-orange">Loca</span>
          </div>

          {/* Copyright */}
          <p className="text-sage-green/70 text-xs sm:text-sm text-center sm:text-right">
            © {new Date().getFullYear()} Cucina Loca. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
