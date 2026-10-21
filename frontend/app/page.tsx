import Link from 'next/link';
import CatalogueCar from './components/CatalogueCar';
import PickUpSection from './components/Pickupsection/pickupsection';
import TopSection from './components/TopSection/TopSection';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { fetchCars } from '@/lib/cars-api';
import { CircleX, RefreshCw } from 'lucide-react';

// Live catalogue from the API — never prerender at build (CI has no backend)
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let cars;
  try {
    cars = await fetchCars();
  } catch {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CircleX
                aria-hidden="true"
                className="size-5 text-destructive"
              />
              Couldn&apos;t load cars
            </CardTitle>
            <CardDescription>
              The catalogue is unreachable right now. Try again in a moment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">
                <RefreshCw aria-hidden="true" className="mr-2 size-4" />
                Try again
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
