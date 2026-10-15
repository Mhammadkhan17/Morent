export interface ReviewReply {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  createdAt: string;
  text: string;
  replies: ReviewReply[];
}

export const reviews: Review[] = [
  {
    id: "r1",
    author: "Sarah M.",
    rating: 5,
    createdAt: "2026-09-28",
    text: "Booked the GT-R for a weekend trip up the coast. Pickup took five minutes, the car was spotless, and it drove exactly like the photos promised. Already planning the next rental.",
    replies: [
      {
        id: "r1-rep1",
        author: "Morent Support",
        text: "Thanks, Sarah! Glad the coast run lived up to the car. Your discount code for the next booking is on its way.",
        createdAt: "2026-09-29",
      },
    ],
  },
  {
    id: "r2",
    author: "James K.",
    rating: 5,
    createdAt: "2026-09-15",
    text: "Second rental this year and the standard hasn't dropped. Clean interior, full tank, and the app check-in meant I never waited at the counter.",
    replies: [],
  },
  {
    id: "r3",
    author: "Priya R.",
    rating: 4,
    createdAt: "2026-08-30",
    text: "The car itself was excellent and easy to extend for an extra day. Only hiccup was a short wait at the airport desk during the evening rush.",
    replies: [
      {
        id: "r3-rep1",
        author: "Morent Support",
        text: "Thanks for the honest feedback, Priya. We've added staff to the evening shift at the airport desk — the next pickup should be much faster.",
        createdAt: "2026-08-31",
      },
      {
        id: "r3-rep2",
        author: "Priya R.",
        text: "Good to know — I'll book there again next month.",
        createdAt: "2026-09-01",
      },
    ],
  },
  {
    id: "r4",
    author: "Daniel L.",
    rating: 5,
    createdAt: "2026-08-12",
    text: "Family trip with the Veloz — plenty of room for the bags and the kids, and the insurance process was clear with no surprises on the final invoice.",
    replies: [],
  },
];
