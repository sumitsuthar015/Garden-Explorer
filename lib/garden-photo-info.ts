/**
 * Text that goes with each real garden photo — kept free of image imports so
 * the seed script (plain Node) can use the same paths and alt text as the site.
 * The files themselves live in public/images/garden/.
 */
export interface GardenPhotoInfo {
  id: string;
  /** Public path: what locations and trails store in the database. */
  url: string;
  alt: string;
  title: string;
  caption: string;
  emoji: string;
}

export const GARDEN_PHOTO_INFO = {
  gate: {
    id: "gate",
    url: "/images/garden/gate.jpg",
    alt: "The carved cream-coloured gateway of Bharatratna Dr Babasaheb Ambedkar Udyan, with golden gates, a giant banyan tree on the left and the garden's name board on the right.",
    title: "The carved gateway",
    caption:
      "The entrance is a grand carved arch with elephants, little figures and a wheel on top — built in the style of the ancient gateways of the Great Stupa at Sanchi.",
    emoji: "🐘",
  },
  gateStreet: {
    id: "gate-street",
    url: "/images/garden/gate-street.jpg",
    alt: "Street view of the garden's carved gateway beside a giant banyan tree, with a black-and-yellow taxi and a scooter passing on the road.",
    title: "Spot it from the road",
    caption:
      "Coming by road? Look for the tall carved arch next to a giant banyan tree — and maybe a black-and-yellow Mumbai taxi zooming past!",
    emoji: "🚕",
  },
  statueWalkway: {
    id: "statue-walkway",
    url: "/images/garden/statue-walkway.jpg",
    alt: "A paved walkway lined with trimmed bushes and palm trees, leading to the statue of Dr Babasaheb Ambedkar on a round lawn.",
    title: "The walkway to Babasaheb",
    caption: "A paved walkway lined with neat bushes leads straight to the statue of Dr Babasaheb Ambedkar.",
    emoji: "🚶",
  },
  statue: {
    id: "statue",
    url: "/images/garden/statue.jpg",
    alt: "Statue of Dr Babasaheb Ambedkar pointing ahead, on a cream pedestal in the middle of a round grassy mound with a glass railing.",
    title: "Babasaheb's statue",
    caption: "Dr Babasaheb Ambedkar's statue stands tall on a round green lawn, pointing the way forward.",
    emoji: "📘",
  },
  signatureWall: {
    id: "signature-wall",
    url: "/images/garden/signature-wall.jpg",
    alt: "A black wall in a grove of palm trees showing a golden portrait outline and B. R. Ambedkar's signature, with the words Signature That Changed Millions Of Lives.",
    title: "The signature wall",
    caption:
      "Among the palm trees, a black wall shows Babasaheb's golden signature: “Signature That Changed Millions Of Lives”.",
    emoji: "✍️",
  },
  playArea: {
    id: "play-area",
    url: "/images/garden/play-area.jpg",
    alt: "Children playing in the garden's play area on seesaws, a purple and blue climbing wall and slides, beside a tall blue wall with a bronze-coloured relief mural.",
    title: "The play area",
    caption:
      "Seesaws, a climbing wall, slides and swings — next to a tall blue wall with a bronze-coloured mural of Babasaheb.",
    emoji: "🛝",
  },
  playAreaWide: {
    id: "play-area-wide",
    url: "/images/garden/play-area-wide.jpg",
    alt: "The play area with an orange playhouse, a green spiral slide, a climbing ladder frame and a rubber-floored circle, surrounded by palm trees.",
    title: "Slides & climbing frames",
    caption: "The spiral slide, the playhouse and the climbing frames are perfect for testing forces and shapes.",
    emoji: "🧗",
  },
} satisfies Record<string, GardenPhotoInfo>;
