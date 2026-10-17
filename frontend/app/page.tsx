import CatalogueCar from './components/CatalogueCar';
import PickUpSection from './components/Pickupsection/pickupsection';
import TopSection from './components/TopSection/TopSection';
import { fetchCars } from '@/lib/cars-api';

// Live catalogue from the API — never prerender at build (CI has no backend)
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const cars = await fetchCars();

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
