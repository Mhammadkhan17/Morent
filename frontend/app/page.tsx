import CatalogueCar from './components/CatalogueCar';
import PickUpSection from './components/Pickupsection/pickupsection';
import TopSection from './components/TopSection/TopSection';
import { fetchCars } from '@/lib/cars-api';

// Live catalogue from the API — never prerender at build (CI has no backend)
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const cars = await fetchCars();

  return (
    <>
      {/* Top Section — owns a wider container so hero cards hit exactly 640×360 */}
      <TopSection />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <PickUpSection />
        <CatalogueCar cars={cars} tag="popular" maxVisible={4} />
        <CatalogueCar cars={cars} tag="recommended" maxVisible={8} />
      </div>
    </>
  );
}
