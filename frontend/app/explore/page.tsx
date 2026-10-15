import type { Metadata } from "next";
import ExploreClient from "./ExploreClient";

export const metadata: Metadata = {
  title: "Explore cars — Morent",
};

const ExplorePage = () => <ExploreClient />;

export default ExplorePage;
