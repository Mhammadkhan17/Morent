import { cars } from '@/lib/cars';
import TopSection from './components/TopSection/TopSection';
import PickUpSection from './components/Pickupsection/pickupsection';
import CatalogueCar from './components/CatalogueCar';

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Top Section */}
      <TopSection/>
      {/* PickUp Section */}
      <PickUpSection/>
      {/* Popular Cars Section */}
      <CatalogueCar cars={cars} tag="popular" maxVisible={4} />
      {/* Recommendation Cars Section */}
      <CatalogueCar cars={cars} tag="recommended" maxVisible={8} />
    </div>
  );
}
