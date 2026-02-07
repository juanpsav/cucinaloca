import Header from './components/Header';
import HeroSection from './components/HeroSection';
import RecipeForm from './components/RecipeForm';
import Footer from './components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Brand Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cream via-cream to-lemon-cream/30" />

      <Header />

      {/* Main Content */}
      <div className="relative z-10 flex-1">
        <HeroSection />
        <RecipeForm />
      </div>

      <Footer />
    </div>
  );
}
