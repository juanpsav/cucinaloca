export default function HeroSection() {
  return (
    <div className="w-full max-w-lg px-5 xl:px-0 mx-auto pt-16">
      <div className="text-center mb-8">
        <h1
          className="animate-fade-up font-playfair text-center text-4xl font-bold tracking-tight text-sage-green-dark dark:text-sage-green-light opacity-0 drop-shadow-sm [text-wrap:balance] lg:text-6xl lg:leading-tight transition-colors"
          style={{ animationDelay: "0.15s", animationFillMode: "forwards" }}
        >
          Smarter recipes, rooted in your region.
        </h1>
        <p
          className="mt-4 animate-fade-up text-center text-sage-green/90 dark:text-gray-300 opacity-0 [text-wrap:balance] text-base font-medium leading-relaxed transition-colors"
          style={{ animationDelay: "0.25s", animationFillMode: "forwards" }}
        >
          Enter a recipe URL and your location to discover the most impactful local ingredient alternatives
        </p>
      </div>
    </div>
  );
}
