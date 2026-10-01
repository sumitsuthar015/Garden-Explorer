import type { StaticImageData } from "next/image";

import { GARDEN_PHOTO_INFO, type GardenPhotoInfo } from "@/lib/garden-photo-info";

import gate from "@/public/images/garden/gate.jpg";
import gateStreet from "@/public/images/garden/gate-street.jpg";
import playArea from "@/public/images/garden/play-area.jpg";
import playAreaWide from "@/public/images/garden/play-area-wide.jpg";
import signatureWall from "@/public/images/garden/signature-wall.jpg";
import statue from "@/public/images/garden/statue.jpg";
import statueWalkway from "@/public/images/garden/statue-walkway.jpg";

/**
 * Real photos of Bharatratna Dr Babasaheb Ambedkar Udyan, Bandra East.
 *
 * Static imports give next/image the size and a blur placeholder for free.
 */
export interface GardenPhoto extends GardenPhotoInfo {
  src: StaticImageData;
}

export const GARDEN_PHOTOS = {
  gate: { ...GARDEN_PHOTO_INFO.gate, src: gate },
  gateStreet: { ...GARDEN_PHOTO_INFO.gateStreet, src: gateStreet },
  statueWalkway: { ...GARDEN_PHOTO_INFO.statueWalkway, src: statueWalkway },
  statue: { ...GARDEN_PHOTO_INFO.statue, src: statue },
  signatureWall: { ...GARDEN_PHOTO_INFO.signatureWall, src: signatureWall },
  playArea: { ...GARDEN_PHOTO_INFO.playArea, src: playArea },
  playAreaWide: { ...GARDEN_PHOTO_INFO.playAreaWide, src: playAreaWide },
} satisfies Record<keyof typeof GARDEN_PHOTO_INFO, GardenPhoto>;

/** Gallery order: the big tile first, then the walk through the garden. */
export const GALLERY_PHOTOS: GardenPhoto[] = [
  GARDEN_PHOTOS.gate,
  GARDEN_PHOTOS.statueWalkway,
  GARDEN_PHOTOS.signatureWall,
  GARDEN_PHOTOS.statue,
  GARDEN_PHOTOS.playArea,
  GARDEN_PHOTOS.gateStreet,
  GARDEN_PHOTOS.playAreaWide,
];

export interface PhotoHuntCard {
  id: string;
  photo: GardenPhoto;
  /** Point of the photo (percent) the close-up zooms into. */
  focus: readonly [number, number];
  zoom: number;
  clue: string;
  answer: string;
  fact: string;
}

/**
 * "Can you spot it?" — a zoomed-in mystery crop, then the whole photo. Keep
 * focus points away from the photo edges (roughly 20–80%) so the zoomed image
 * still fills the card once the point is slid under the lens.
 */
export const PHOTO_HUNT: PhotoHuntCard[] = [
  {
    id: "wheel",
    photo: GARDEN_PHOTOS.gate,
    focus: [44, 26],
    zoom: 3.2,
    clue: "I sit on the very top of the big gate. I'm round, with spokes like a bicycle wheel. What am I?",
    answer: "The carved wheel on top of the gateway!",
    fact: "India's flag has a wheel like this in the middle too — the Ashoka Chakra.",
  },
  {
    id: "elephants",
    photo: GARDEN_PHOTOS.gate,
    focus: [29, 55],
    zoom: 3,
    clue: "Big ears, long trunk — but I'm made of stone and I never move. Where am I hiding?",
    answer: "On the pillars of the carved gate!",
    fact: "Look closely: more elephants march between the stone beams. How many can you count?",
  },
  {
    id: "banyan",
    photo: GARDEN_PHOTOS.gateStreet,
    focus: [20, 48],
    zoom: 3,
    clue: "My roots hang down from my branches like long ropes. Who am I?",
    answer: "The giant banyan tree beside the gate!",
    fact: "Its hanging aerial roots grow down into the soil and become new trunks. The banyan is India's national tree.",
  },
  {
    id: "statue",
    photo: GARDEN_PHOTOS.statue,
    focus: [56, 20],
    zoom: 2.6,
    clue: "I stand tall on a round green hill and point the way ahead. Who am I?",
    answer: "The statue of Dr Babasaheb Ambedkar!",
    fact: "Babasaheb led the writing of the Constitution of India — the rulebook for the whole country.",
  },
  {
    id: "signature",
    photo: GARDEN_PHOTOS.signatureWall,
    focus: [76, 50],
    zoom: 2.4,
    clue: "Golden letters on a black wall, hiding among the palm trees. What do they say?",
    answer: "Babasaheb's signature!",
    fact: "The wall says: “Signature That Changed Millions Of Lives”.",
  },
  {
    id: "climbing-wall",
    photo: GARDEN_PHOTOS.playArea,
    focus: [60, 57],
    zoom: 3,
    clue: "Purple and blue, with lots of bumpy little holds — climb me to the top! What am I?",
    answer: "The climbing wall in the play area!",
    fact: "Climbing works thanks to friction: the bumpy holds give your hands and shoes something to grip.",
  },
];
