export default function Header() {
  return (
    <div className="sticky top-0 z-50 w-full bg-cream/95 backdrop-blur-sm border-b border-sage-green/20">
      <div className="max-w-5xl mx-auto px-5 xl:px-0 py-3">
        <div className="flex items-center justify-between">
          <h1 className="flex items-baseline">
            <span className="font-playfair text-2xl font-bold text-sage-green">Cucina</span>
            <span className="font-playfair text-2xl font-bold italic text-blood-orange">Loca</span>
          </h1>
        </div>
      </div>
    </div>
  );
}
