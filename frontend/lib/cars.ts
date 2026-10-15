export interface Car {
  _id: string;
  name: string;
  type: string;
  description: string;
  fuelCapacity: string;
  transmission: string;
  seatingCapacity: string;
  pricePerDay: string;
  originalPrice: string;
  imageUrl: string;
  images: string[];
  imageMetadata: {
    width: number;
    height: number;
  };
  tags: string[];
  rating?: number;
}

export const cars: Car[] = [
  {
    _id: "koenigsegg",
    name: "Koenigsegg Jesko",
    type: "Sport",
    description: "The flagship of the Koenigsegg line-up — extreme aerodynamics, a twin-turbo V8, and seat time you will never forget.",
    fuelCapacity: "90L",
    transmission: "Manual",
    seatingCapacity: "2 Persons",
    pricePerDay: "$99.00",
    originalPrice: "$100.00",
    imageUrl: "/asset/Car/Koenigsegg/2026-koenigsegg-jesko-front-3-4.png",
    images: [
      "/asset/Car/Koenigsegg/2026-koenigsegg-jesko-front-3-4.png",
      "/asset/Car/Koenigsegg/2026-koenigsegg-jesko-front-3-4-right.png",
      "/asset/Car/Koenigsegg/2026-koenigsegg-jesko-front.png",
      "/asset/Car/Koenigsegg/2026-koenigsegg-jesko-side.png",
      "/asset/Car/Koenigsegg/2026-koenigsegg-jesko-side-right.png",
      "/asset/Car/Koenigsegg/2026-koenigsegg-jesko-rear-3-4.png",
      "/asset/Car/Koenigsegg/2026-koenigsegg-jesko-rear-3-4-right.png",
      "/asset/Car/Koenigsegg/2026-koenigsegg-jesko-rear.png",
    ],
    imageMetadata: { width: 600, height: 600 },
    tags: ["popular", "recommended"],
    rating: 5,
  },
  {
    _id: "nissan-gtr",
    name: "Nissan GT-R",
    type: "Sport",
    description: "Legendary all-wheel-drive grip and twin-turbo pace — the everyday supercar that turns any road into an event.",
    fuelCapacity: "80L",
    transmission: "Manual",
    seatingCapacity: "2 Persons",
    pricePerDay: "$80.00",
    originalPrice: "$100.00",
    imageUrl: "/asset/Car/Nissan-GTR/2026-nissan-gt-r-front-3-4.png",
    images: [
      "/asset/Car/Nissan-GTR/2026-nissan-gt-r-front-3-4.png",
      "/asset/Car/Nissan-GTR/2026-nissan-gt-r-front-3-4-right.png",
      "/asset/Car/Nissan-GTR/2026-nissan-gt-r-front.png",
      "/asset/Car/Nissan-GTR/2026-nissan-gt-r-side.png",
      "/asset/Car/Nissan-GTR/2026-nissan-gt-r-side-right.png",
      "/asset/Car/Nissan-GTR/2026-nissan-gt-r-rear-3-4.png",
      "/asset/Car/Nissan-GTR/2026-nissan-gt-r-rear-3-4-right.png",
      "/asset/Car/Nissan-GTR/2026-nissan-gt-r-rear.png",
    ],
    imageMetadata: { width: 600, height: 600 },
    tags: ["popular", "recommended"],
    rating: 4,
  },
  {
    _id: "rolls-royce",
    name: "Rolls-Royce Spectre",
    type: "Coupe",
    description: "The electric grand tourer from Goodwood — silent, effortless, and wrapped in unmistakable Rolls-Royce presence.",
    fuelCapacity: "70L",
    transmission: "Automatic",
    seatingCapacity: "4 Persons",
    pricePerDay: "$96.00",
    originalPrice: "$100.00",
    imageUrl: "/asset/Car/Rolls-Royce/2024-rolls-royce-spectre-front-3-4.png",
    images: [
      "/asset/Car/Rolls-Royce/2024-rolls-royce-spectre-front-3-4.png",
      "/asset/Car/Rolls-Royce/2024-rolls-royce-spectre-front-3-4-right.png",
      "/asset/Car/Rolls-Royce/2024-rolls-royce-spectre-front.png",
      "/asset/Car/Rolls-Royce/2024-rolls-royce-spectre-side.png",
      "/asset/Car/Rolls-Royce/2024-rolls-royce-spectre-side-right.png",
      "/asset/Car/Rolls-Royce/2024-rolls-royce-spectre-rear-3-4.png",
      "/asset/Car/Rolls-Royce/2024-rolls-royce-spectre-rear-3-4-right.png",
      "/asset/Car/Rolls-Royce/2024-rolls-royce-spectre-rear.png",
    ],
    imageMetadata: { width: 600, height: 600 },
    tags: ["popular", "recommended"],
    rating: 5,
  },
  {
    _id: "mercedes-benz",
    name: "Mercedes-Benz EQS 400",
    type: "SUV",
    description: "A full-size electric SUV that blends lounge-grade comfort with confident long-distance capability.",
    fuelCapacity: "65L",
    transmission: "Automatic",
    seatingCapacity: "4 Persons",
    pricePerDay: "$72.00",
    originalPrice: "$80.00",
    imageUrl:
      "/asset/Car/Mercedez-BenZ/2027-mercedes-benz-eqs-400-4matic-suv-front-3-4.png",
    images: [
      "/asset/Car/Mercedez-BenZ/2027-mercedes-benz-eqs-400-4matic-suv-front-3-4.png",
      "/asset/Car/Mercedez-BenZ/2027-mercedes-benz-eqs-400-4matic-suv-front-3-4-right.png",
      "/asset/Car/Mercedez-BenZ/2027-mercedes-benz-eqs-400-4matic-suv-front.png",
      "/asset/Car/Mercedez-BenZ/2027-mercedes-benz-eqs-400-4matic-suv-side.png",
      "/asset/Car/Mercedez-BenZ/2027-mercedes-benz-eqs-400-4matic-suv-side-right.png",
      "/asset/Car/Mercedez-BenZ/2027-mercedes-benz-eqs-400-4matic-suv-rear-3-4.png",
      "/asset/Car/Mercedez-BenZ/2027-mercedes-benz-eqs-400-4matic-suv-rear-3-4-right.png",
      "/asset/Car/Mercedez-BenZ/2027-mercedes-benz-eqs-400-4matic-suv-rear.png",
    ],
    imageMetadata: { width: 600, height: 600 },
    tags: ["popular", "recommended"],
    rating: 4,
  },
  {
    _id: "volkswagen",
    name: "Volkswagen Golf",
    type: "Hatchback",
    description: "The definitive hatchback — nimble in the city, composed on the highway, and easy on fuel.",
    fuelCapacity: "50L",
    transmission: "Automatic",
    seatingCapacity: "4 Persons",
    pricePerDay: "$45.00",
    originalPrice: "$55.00",
    imageUrl: "/asset/Car/Volkswagen-Hatchback/2026-volkswagen-golf-front-3-4.png",
    images: [
      "/asset/Car/Volkswagen-Hatchback/2026-volkswagen-golf-front-3-4.png",
      "/asset/Car/Volkswagen-Hatchback/2026-volkswagen-golf-front-3-4-right.png",
      "/asset/Car/Volkswagen-Hatchback/2026-volkswagen-golf-front.png",
      "/asset/Car/Volkswagen-Hatchback/2026-volkswagen-golf-side.png",
      "/asset/Car/Volkswagen-Hatchback/2026-volkswagen-golf-side-right.png",
      "/asset/Car/Volkswagen-Hatchback/2026-volkswagen-golf-rear-3-4.png",
      "/asset/Car/Volkswagen-Hatchback/2026-volkswagen-golf-rear-3-4-right.png",
      "/asset/Car/Volkswagen-Hatchback/2026-volkswagen-golf-rear.png",
    ],
    imageMetadata: { width: 600, height: 600 },
    tags: ["recommended"],
    rating: 4,
  },
  {
    _id: "toyota",
    name: "Toyota Veloz",
    type: "MPV",
    description: "A practical MPV with flexible space for family trips, airport runs, and everything in between.",
    fuelCapacity: "60L",
    transmission: "Automatic",
    seatingCapacity: "6 Persons",
    pricePerDay: "$55.00",
    originalPrice: "$65.00",
    imageUrl: "/asset/Car/Toyota-MPV/2022-toyota-veloz-front-3-4.png",
    images: [
      "/asset/Car/Toyota-MPV/2022-toyota-veloz-front-3-4.png",
      "/asset/Car/Toyota-MPV/2022-toyota-veloz-front-3-4-right.png",
      "/asset/Car/Toyota-MPV/2022-toyota-veloz-front.png",
      "/asset/Car/Toyota-MPV/2022-toyota-veloz-side.png",
      "/asset/Car/Toyota-MPV/2022-toyota-veloz-side-right.png",
      "/asset/Car/Toyota-MPV/2022-toyota-veloz-rear-3-4.png",
      "/asset/Car/Toyota-MPV/2022-toyota-veloz-rear-3-4-right.png",
      "/asset/Car/Toyota-MPV/2022-toyota-veloz-rear.png",
    ],
    imageMetadata: { width: 600, height: 600 },
    tags: ["recommended"],
    rating: 4,
  },
  {
    _id: "jaguar",
    name: "Jaguar XF",
    type: "Sedan",
    description: "British sporting elegance with a responsive drive — equally at home in the city or on the open road.",
    fuelCapacity: "55L",
    transmission: "Automatic",
    seatingCapacity: "4 Persons",
    pricePerDay: "$65.00",
    originalPrice: "$75.00",
    imageUrl: "/asset/Car/Jaguar/2026-jaguar-xf-front-3-4.png",
    images: [
      "/asset/Car/Jaguar/2026-jaguar-xf-front-3-4.png",
      "/asset/Car/Jaguar/2026-jaguar-xf-front-3-4-right.png",
      "/asset/Car/Jaguar/2026-jaguar-xf-front.png",
      "/asset/Car/Jaguar/2026-jaguar-xf-side.png",
      "/asset/Car/Jaguar/2026-jaguar-xf-side-right.png",
      "/asset/Car/Jaguar/2026-jaguar-xf-rear-3-4.png",
      "/asset/Car/Jaguar/2026-jaguar-xf-rear-3-4-right.png",
      "/asset/Car/Jaguar/2026-jaguar-xf-rear.png",
    ],
    imageMetadata: { width: 600, height: 600 },
    tags: ["recommended"],
    rating: 5,
  },
];

export const getCarById = (id: string): Car | undefined =>
  cars.find((car) => car._id === id);
