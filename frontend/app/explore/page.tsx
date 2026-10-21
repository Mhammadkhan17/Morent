import type { Metadata } from "next";
import { Suspense } from "react";
import ExploreClient from "./ExploreClient";

export const metadata: Metadata = {
  title: "Explore cars — Morent",
};

const ExplorePage = () => (
  <Suspense
    fallback={
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold">Explore cars</h1>
      </div>
    }
  >
    <ExploreClient />
  </Suspense>
);

export default ExplorePage;
