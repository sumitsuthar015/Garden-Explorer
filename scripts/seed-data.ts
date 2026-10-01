/**
 * Starter content for Dr Babasaheb Ambedkar Garden (Bharatratna Dr Babasaheb
 * Ambedkar Udyan), Government Colony, Bandra East, Mumbai.
 *
 * Grounded in what public listings and photos taken in the garden confirm: its
 * name and namesake, address and opening hours; the carved Sanchi-style gateway
 * with a giant banyan beside it; the paved walkway to Dr Ambedkar's statue; the
 * palm grove with the signature wall; and the children's play area with its
 * bronze-coloured mural wall. Nothing here claims a feature the garden is not
 * known to have — stops about plants, insects and rain work anywhere in it, and
 * the admin area is where the garden team adds its own specifics.
 *
 * The science is mainstream and stated plainly, and no third-party teaching
 * material is reproduced.
 */
import { GARDEN_LOCATION } from "../lib/constants";
import { GARDEN_PHOTO_INFO } from "../lib/garden-photo-info";
import type { ActivityType, AgeGroup, ContentBlockType, LocationCategory, QuestionDifficulty, TrailDifficulty } from "@/lib/constants";

export interface SeedBlock {
  type: ContentBlockType;
  title: string;
  body: string;
  order: number;
}

export interface SeedFact {
  label: string;
  value: string;
}

export interface SeedActivity {
  type: ActivityType;
  prompt: string;
  hint?: string;
  successMessage: string;
  points: number;
  config: Record<string, unknown>;
}

export interface SeedQuestion {
  prompt: string;
  hint: string;
  explanation: string;
  points: number;
  difficulty: QuestionDifficulty;
  options: string[];
  correctIndex: number;
}

export interface SeedImage {
  url: string;
  alt: string;
}

/** A real garden photo from public/images/garden/. */
function photo(key: keyof typeof GARDEN_PHOTO_INFO): SeedImage {
  const { url, alt } = GARDEN_PHOTO_INFO[key];
  return { url, alt };
}

export interface SeedLocation {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  category: LocationCategory;
  icon: string;
  estimatedMinutes: number;
  featured: boolean;
  qrCode: string;
  heroImage?: SeedImage;
  blocks: SeedBlock[];
  facts: SeedFact[];
  activities: SeedActivity[];
  questions: SeedQuestion[];
}

const OBSERVE_CONFIRM = { confirmLabel: "I found one" };

export const GARDEN = {
  name: GARDEN_LOCATION.name,
  slug: "dr-babasaheb-ambedkar-garden",
  description: `${GARDEN_LOCATION.officialName} is a much-loved neighbourhood garden in ${GARDEN_LOCATION.area}, Mumbai. Walk in through its carved Sanchi-style gateway, follow the paved walkway to Dr Babasaheb Ambedkar's statue, explore the palm grove and play in the busy children's play area. It is open ${GARDEN_LOCATION.openingHours.toLowerCase()} — and with Garden Explorer, it is an outdoor classroom too.`,
};

export const SITE_SETTINGS = {
  siteTitle: "Garden Explorer",
  seoDescription: `QR learning trails for kids at ${GARDEN_LOCATION.name}, ${GARDEN_LOCATION.area}: scan a sign to learn science, logic and coding with activities, quizzes, XP and badges.`,
  primaryColor: "#2F6B4F",
  contactEmail: null,
  contactAddress: GARDEN_LOCATION.address,
  privacyNotes: null,
};

export const LOCATIONS: SeedLocation[] = [
  // ---------------------------------------------------------------- Science
  {
    slug: "garden-entrance",
    name: "Garden Gate",
    shortDescription:
      "Start here at the carved stone gateway! Count the elephants, meet the giant banyan tree and learn how the QR trail works.",
    description: `Welcome to ${GARDEN_LOCATION.officialName} in ${GARDEN_LOCATION.area}. Its entrance is a grand carved gateway in the style of the ancient gateways of the Great Stupa at Sanchi, with a giant banyan tree standing right beside it.`,
    category: "garden-knowledge",
    icon: "🐘",
    estimatedMinutes: 6,
    featured: true,
    qrCode: "ENTRANCE-001",
    heroImage: photo("gate"),
    blocks: [
      {
        type: "text",
        title: "Welcome, Explorer!",
        body:
          "Look up! The garden's entrance is a grand carved gateway. It has three curved stone beams, elephants on top of the pillars, little carved figures and a wheel right at the very top.\n\nThe garden is open every day from early morning until 8 in the evening. Every Garden Explorer sign has a QR code — scan it to open a mini-lesson right where you are standing.",
        order: 0,
      },
      {
        type: "did_you_know",
        title: "A Gate From History",
        body:
          "This gate copies the style of the toranas — the stone gateways — of the Great Stupa at Sanchi in Madhya Pradesh. The real ones were carved more than 2,000 years ago and are covered in stories told in stone.\n\nRead the name board beside the gate. Udyan means garden, so Bharatratna Dr Babasaheb Ambedkar Udyan is the Bharat Ratna Dr Babasaheb Ambedkar Garden.",
        order: 1,
      },
      {
        type: "science",
        title: "The Giant Banyan Tree",
        body:
          "Right next to the gate stands a huge banyan tree. See the thin brown ropes hanging from its branches? They are aerial roots.\n\nAerial roots grow down from the branches. When they reach the soil they thicken into new trunks that hold the heavy branches up like pillars — that is how one banyan can spread wider and wider. The banyan is the national tree of India.",
        order: 2,
      },
      {
        type: "science",
        title: "What Makes a Garden a Habitat?",
        body:
          "A habitat is a home for living things. It gives them four things: food, water, shelter and somewhere safe to raise their young.\n\nAs you explore, look for all four. Who is eating here? Where is the water? Where could a bird or insect hide?",
        order: 3,
      },
      {
        type: "observation",
        title: "Observe",
        body:
          "Count the elephants carved on the gateway. Look at the tops of the pillars and in the gaps between the three stone beams.",
        order: 4,
      },
    ],
    facts: [
      { label: "Open", value: GARDEN_LOCATION.openingHours },
      { label: "Gate style", value: "Like the gateways of the Great Stupa at Sanchi" },
      { label: "Gate tree", value: "A giant banyan — India's national tree" },
      { label: "Find it", value: GARDEN_LOCATION.landmark },
    ],
    activities: [
      {
        type: "observation",
        prompt: "Look closely at the carved gateway. Can you find at least four elephants?",
        hint: "Look at the tops of the pillars, and between the three curved stone beams.",
        successMessage: "Eagle eyes! Those stone elephants have been waiting for you.",
        points: 10,
        config: { confirmLabel: "I found them" },
      },
      {
        type: "yes_no",
        prompt: "Look at the giant tree beside the gate. True or false: some of its roots hang down from its branches.",
        hint: "Look for thin brown ropes dangling from the branches.",
        successMessage: "Correct! Those are aerial roots — they grow down and become new trunks.",
        points: 10,
        config: { answer: true },
      },
    ],
    questions: [
      {
        prompt: "What four things does a habitat provide for living things?",
        hint: "Think about what you need to live, too.",
        explanation:
          "Every habitat provides food, water, shelter and a safe place to raise young. Even a small garden can give living things all four.",
        points: 20,
        difficulty: "easy",
        options: [
          "Food, water, shelter and a place to raise young",
          "Paint, plastic, glass and metal",
          "Sunlight, moonlight, wind and rain only",
          "Nothing — animals find these elsewhere",
        ],
        correctIndex: 0,
      },
      {
        prompt: "The garden gate is carved in the style of the gateways of a famous ancient monument. Which one?",
        hint: "Its stone gateways in Madhya Pradesh are more than 2,000 years old.",
        explanation:
          "The gate copies the toranas — the stone gateways — of the Great Stupa at Sanchi, which were carved more than 2,000 years ago.",
        points: 20,
        difficulty: "medium",
        options: ["The Taj Mahal", "The Great Stupa at Sanchi", "The Gateway of India", "The Qutub Minar"],
        correctIndex: 1,
      },
      {
        prompt: "What are the rope-like roots hanging from the banyan tree's branches called?",
        hint: "They grow in the air before they reach the soil.",
        explanation:
          "They are aerial roots. When they reach the ground they thicken into extra trunks that hold up the tree's long branches.",
        points: 20,
        difficulty: "easy",
        options: ["Leaf strings", "Vines", "Aerial roots", "Branch tails"],
        correctIndex: 2,
      },
    ],
  },
  {
    slug: "ambedkar-statue",
    name: "Babasaheb's Statue",
    shortDescription:
      "Meet the statue of Dr B. R. Ambedkar, find his famous signature and discover the rulebook he helped write for all of India.",
    description:
      "Follow the paved walkway from the gate to a round green lawn behind a glass railing. On a tall pedestal stands the statue of Dr Babasaheb Ambedkar, pointing ahead and holding a book.",
    category: "garden-knowledge",
    icon: "📘",
    estimatedMinutes: 6,
    featured: true,
    qrCode: "STATUE-017",
    heroImage: photo("statue"),
    blocks: [
      {
        type: "text",
        title: "Meet Babasaheb",
        body:
          "Dr Bhimrao Ramji Ambedkar, lovingly called Babasaheb, was born on 14 April 1891. As a child he was treated unfairly because of caste, but he never stopped studying. He went on to study at universities in India, the USA and the UK, and became one of India's greatest thinkers.\n\nHe led the committee that wrote the Constitution of India. In 1990 he was honoured with the Bharat Ratna, India's highest civilian award — that is why the garden's name begins with Bharatratna.",
        order: 0,
      },
      {
        type: "did_you_know",
        title: "A Signature That Changed Millions of Lives",
        body:
          "In the palm grove, look for a black wall with a golden outline of Babasaheb and his signature. Its words say: “Signature That Changed Millions Of Lives”.\n\nThe Constitution promises every person in India equal rights — to learn, to speak freely and to be treated fairly. Babasaheb believed education could change lives: a good thought to carry around a learning garden!",
        order: 1,
      },
      {
        type: "science",
        title: "Shadow Science",
        body:
          "On a sunny day, look at the statue's shadow. A shadow forms on the side away from the Sun, because the statue blocks the light.\n\nThe Sun rises in the east, so in the morning the shadow points west. In the evening the Sun is in the west, so the shadow points east. Around midday, when the Sun is highest, shadows are shortest.",
        order: 2,
      },
      {
        type: "observation",
        title: "Observe",
        body:
          "Near the play area there is a tall blue wall with a big bronze-coloured picture of Babasaheb that sticks out from the wall. A picture like this is called a relief. Can you find it?",
        order: 3,
      },
    ],
    facts: [
      { label: "Born", value: "14 April 1891" },
      { label: "Known for", value: "Leading the writing of India's Constitution" },
      { label: "Honour", value: "Bharat Ratna, 1990" },
    ],
    activities: [
      {
        type: "observation",
        prompt:
          "Find the black wall with Babasaheb's golden signature in the palm grove. Can you trace the shape of the signature in the air with your finger?",
        hint: "It stands among tall, feathery palm trees beside the walkway.",
        successMessage: "Wonderful! You found a signature that changed millions of lives.",
        points: 10,
        config: { confirmLabel: "I found it" },
      },
      {
        type: "yes_no",
        prompt: "Look carefully at the statue. True or false: Babasaheb is holding a book.",
        hint: "Look at the arm that is not pointing.",
        successMessage: "Correct! The book is a sign of his love of learning — and of the Constitution he helped write.",
        points: 10,
        config: { answer: true },
      },
    ],
    questions: [
      {
        prompt: "Dr Ambedkar led the writing of which important document?",
        hint: "It is the rulebook for the whole country of India.",
        explanation:
          "Dr Ambedkar led the committee that drafted the Constitution of India — the set of rules and rights for the whole country.",
        points: 20,
        difficulty: "easy",
        options: ["A cookbook", "The Constitution of India", "The rules of cricket", "A weather report"],
        correctIndex: 1,
      },
      {
        prompt: "What is the Bharat Ratna?",
        hint: "Bharat means India, and ratna means jewel.",
        explanation:
          "The Bharat Ratna — the Jewel of India — is the country's highest civilian award. Dr Ambedkar received it in 1990.",
        points: 20,
        difficulty: "easy",
        options: ["A type of flower", "A train from Bandra Terminus", "India's highest civilian award", "A kind of sweet"],
        correctIndex: 2,
      },
      {
        prompt: "In the evening the Sun is in the west. Which way does the statue's shadow point?",
        hint: "A shadow always falls on the side away from the Sun.",
        explanation:
          "The statue blocks the sunlight, so its shadow falls on the side away from the Sun. With the Sun in the west, the shadow points east.",
        points: 20,
        difficulty: "medium",
        options: ["West, towards the Sun", "East, away from the Sun", "Straight up into the sky", "There are no shadows in the evening"],
        correctIndex: 1,
      },
    ],
  },
  {
    slug: "leaf-lab",
    name: "Leaf Lab",
    shortDescription:
      "Every leaf is a tiny food factory. Find different shapes and discover how plants make food from sunlight.",
    description:
      "Look at the feathery palms in the palm grove and the plants and trees all around the garden. Their leaves come in many shapes and sizes, but every green leaf does the same amazing job: it turns sunlight, water and air into food.",
    category: "plants",
    icon: "🍃",
    estimatedMinutes: 6,
    featured: true,
    qrCode: "LEAF-012",
    heroImage: photo("signatureWall"),
    blocks: [
      {
        type: "text",
        title: "Leaves Are Food Factories",
        body:
          "Plants make their own food. Their leaves take in sunlight, carbon dioxide from the air and water brought up from the roots, and turn them into sugar.\n\nThis is called photosynthesis. As a bonus, it gives off oxygen — the gas we breathe!",
        order: 0,
      },
      {
        type: "observation",
        title: "Observe",
        body:
          "Find three leaves with different shapes: long and thin, round, or with jagged edges. Gently feel the top and the bottom. Is one side smoother or shinier?\n\nPlease look and touch gently — leave the leaves on the plant so it can keep making food.",
        order: 1,
      },
      {
        type: "did_you_know",
        title: "Did You Know?",
        body:
          "Leaves are green because of chlorophyll, a pigment that captures sunlight. Chlorophyll soaks up red and blue light and bounces green light back to your eyes.",
        order: 2,
      },
      {
        type: "thinking",
        title: "Think",
        body:
          "Look up at a tree. Why do you think its leaves spread out in layers instead of piling on top of each other?",
        order: 3,
      },
    ],
    facts: [
      { label: "A leaf's job", value: "Making food from sunlight" },
      { label: "Gas it gives off", value: "Oxygen" },
      { label: "Please", value: "Look and touch gently — no picking" },
    ],
    activities: [
      {
        type: "observation",
        prompt: "Find three leaves with three different shapes.",
        hint: "Try a big tree, a small bush and a plant close to the ground.",
        successMessage: "Brilliant! Scientists call this comparing — you just did real botany.",
        points: 10,
        config: { confirmLabel: "I found three" },
      },
      {
        type: "multiple_choice",
        prompt: "What do leaves need to make food?",
        hint: "Think about what reaches a leaf from the sky, the air and the roots.",
        successMessage: "Exactly! Sunlight, water and carbon dioxide from the air.",
        points: 10,
        config: {
          options: ["Only soil", "Only rain", "Sunlight, water and air", "Moonlight and sugar"],
          correctIndex: 2,
        },
      },
    ],
    questions: [
      {
        prompt: "What is the name for the way plants make food from sunlight?",
        hint: "It starts with 'photo', which means light.",
        explanation:
          "Photosynthesis means 'putting together with light'. Leaves use sunlight to turn water and carbon dioxide into sugar.",
        points: 20,
        difficulty: "easy",
        options: ["Evaporation", "Photosynthesis", "Pollination", "Digestion"],
        correctIndex: 1,
      },
      {
        prompt: "Which gas do green plants give off that we need to breathe?",
        hint: "You are breathing it in right now.",
        explanation: "Photosynthesis releases oxygen into the air. Every breath you take depends on plants!",
        points: 20,
        difficulty: "easy",
        options: ["Carbon dioxide", "Helium", "Oxygen", "Smoke"],
        correctIndex: 2,
      },
      {
        prompt: "Why are most leaves green?",
        hint: "It is the name of the pigment that catches sunlight.",
        explanation:
          "Leaves contain chlorophyll. It absorbs red and blue light for photosynthesis and reflects green light, so leaves look green.",
        points: 20,
        difficulty: "medium",
        options: [
          "They contain chlorophyll, which captures sunlight",
          "Gardeners paint them",
          "They are full of green water",
          "Green keeps them warm",
        ],
        correctIndex: 0,
      },
    ],
  },
  {
    slug: "butterfly-garden",
    name: "Butterfly Watch",
    shortDescription: "Discover how butterflies, flowers and pollination are connected.",
    description:
      "Wherever flowers bloom, insects come to visit. Butterflies, bees and other small creatures feed on nectar — and while they do, they carry pollen from flower to flower and help plants make seeds.",
    category: "animals",
    icon: "🦋",
    estimatedMinutes: 6,
    featured: true,
    qrCode: "BUTTERFLY-003",
    blocks: [
      {
        type: "text",
        title: "About Butterflies",
        body:
          "Butterflies are insects with two pairs of scaly wings. The tiny scales give them their colours and patterns, which help them warm up, hide and find each other.\n\nA butterfly needs flowers for nectar, and its caterpillars need the right leaves to eat.",
        order: 0,
      },
      {
        type: "science",
        title: "Pollination, Step by Step",
        body:
          "1. A butterfly lands on a flower to drink nectar.\n2. Pollen from the flower sticks to its body.\n3. It flies to another flower of the same kind.\n4. Some of that pollen rubs off onto the second flower.\n5. Because pollen reached it, that flower can make seeds.",
        order: 1,
      },
      {
        type: "did_you_know",
        title: "Did You Know?",
        body:
          "A butterfly tastes with sensors on its feet. Landing on a leaf is how a mother butterfly checks whether that plant is food for her caterpillars.",
        order: 2,
      },
      {
        type: "observation",
        title: "Observe",
        body:
          "Pick one flowering plant and watch it for two minutes. Which insects visit? Do they arrive from above or from the side?\n\nButterflies with wide wings usually land on flat, open flowers. Bees often push into tube-shaped flowers instead.",
        order: 3,
      },
      {
        type: "thinking",
        title: "Think",
        body:
          "If every flower in the garden had no nectar, what would happen to the butterflies — and then to the flowers themselves?",
        order: 4,
      },
    ],
    facts: [
      { label: "Best time to look", value: "Warm, sunny mornings" },
      { label: "Butterflies drink", value: "Sweet nectar from flowers" },
      { label: "Please", value: "Watch quietly — never catch them" },
    ],
    activities: [
      {
        type: "observation",
        prompt: "Look around the flowers. Can you spot a butterfly, bee or other insect visiting one?",
        hint: "Stand still near a bright, open flower in the sunshine and wait a little.",
        successMessage: "Well spotted. Watch which flower it chooses next.",
        points: 10,
        config: OBSERVE_CONFIRM,
      },
      {
        type: "yes_no",
        prompt:
          "True or false: a single flower can be visited many times by different insects before it makes seeds.",
        hint: "Flowers stay open for hours or days, and nectar refills.",
        successMessage: "Correct — that is why one flower can receive pollen from several visitors.",
        points: 10,
        config: { answer: true },
      },
    ],
    questions: [
      {
        prompt: "Why do butterflies visit flowers?",
        hint: "Think about what butterflies get from flowers, and what they leave behind.",
        explanation:
          "Butterflies visit flowers for nectar, a sugary drink. While feeding they pick up pollen and can carry it to the next flower, which is how many plants make seeds.",
        points: 20,
        difficulty: "easy",
        options: [
          "They find nectar, and they carry pollen between flowers",
          "They grow leaves while they sit there",
          "They create soil under the flower",
          "They produce rain to water the plant",
        ],
        correctIndex: 0,
      },
      {
        prompt: "Which two things does a butterfly need from plants?",
        hint: "One is for the adults, one is for their young.",
        explanation:
          "Adult butterflies need nectar from flowers, and caterpillars need the right leaves to eat. A garden with both supports the whole life cycle.",
        points: 20,
        difficulty: "medium",
        options: [
          "Only flowers and no leaves",
          "Nectar for the adults and leaves for the caterpillars",
          "Only leaves and no flowers",
          "Stones and sand",
        ],
        correctIndex: 1,
      },
      {
        prompt: "What does a butterfly use the scales on its wings for?",
        hint: "Think about warmth, hiding and finding a mate.",
        explanation:
          "Wing scales create the colours and patterns that help a butterfly warm up, blend in, signal to other butterflies and shed water.",
        points: 20,
        difficulty: "hard",
        options: [
          "Storing extra nectar",
          "Producing pollen of its own",
          "Colour and pattern that help with warmth, camouflage and signalling",
          "Digging into the soil",
        ],
        correctIndex: 2,
      },
    ],
  },
  {
    slug: "play-area-science",
    name: "Swing & Slide Science",
    shortDescription:
      "The play area is a physics lab! Discover pushes, pulls, gravity and friction.",
    description:
      "With seesaws, slides (even a spiral one!), swings and a climbing wall, the children's play area is brilliant for learning about forces — the pushes and pulls that make things move, stop and change direction. Every slide, swing and climb is a science experiment.",
    category: "science",
    icon: "🛝",
    estimatedMinutes: 7,
    featured: true,
    qrCode: "PLAY-013",
    heroImage: photo("playArea"),
    blocks: [
      {
        type: "text",
        title: "Forces Are Everywhere",
        body:
          "A force is a push or a pull. When you push off on a swing, pull yourself up a ladder or zoom down a slide, forces are at work.\n\nGravity is the force that pulls everything down towards the Earth. It is what makes you whoosh down a slide!",
        order: 0,
      },
      {
        type: "science",
        title: "Friction: The Slowing-Down Force",
        body:
          "Friction happens when two surfaces rub together, and it slows things down. A smooth, shiny slide has little friction, so you slide fast. Rough or sticky surfaces make more friction and slow you down.\n\nFriction is also what lets your shoes grip the ground so you don't slip.",
        order: 1,
      },
      {
        type: "science",
        title: "The Seesaw Is a Lever",
        body:
          "A seesaw is a lever: a stiff bar that tips on a pivot in the middle. Push one end down and the other end goes up.\n\nSit further from the middle and your push turns the seesaw more easily. That is why a lighter friend sitting near the end can balance a heavier friend sitting closer to the middle.",
        order: 2,
      },
      {
        type: "did_you_know",
        title: "Did You Know?",
        body:
          "A swing is a kind of pendulum. Each swing takes almost the same time, even as it gets smaller — which is why old clocks used pendulums to keep time.",
        order: 3,
      },
      {
        type: "callout",
        title: "Play Safely",
        body: "Take turns, hold on tight, and only use equipment that is right for your age.",
        order: 4,
      },
    ],
    facts: [
      { label: "Force", value: "A push or a pull" },
      { label: "Gravity", value: "Pulls everything down" },
      { label: "Friction", value: "Slows things down" },
    ],
    activities: [
      {
        type: "observation",
        prompt:
          "In the play area, find something you push, something you pull, and something that gravity pulls down.",
        hint: "A swing is pushed, a rope or bar can be pulled, and anything sliding down is pulled by gravity.",
        successMessage: "Great force-finding! You are thinking like a physicist.",
        points: 10,
        config: { confirmLabel: "I found them" },
      },
      {
        type: "yes_no",
        prompt: "True or false: friction helps you slow down and stop at the bottom of a slide.",
        hint: "What happens when your feet rub on the ground at the end?",
        successMessage: "Correct! Friction slows you down so you can stop safely.",
        points: 10,
        config: { answer: true },
      },
    ],
    questions: [
      {
        prompt: "What is a force?",
        hint: "You use one every time you open a door.",
        explanation: "A force is a push or a pull. Forces make things start moving, stop, speed up, slow down or change direction.",
        points: 20,
        difficulty: "easy",
        options: ["A kind of plant", "A loud noise", "A type of cloud", "A push or a pull"],
        correctIndex: 3,
      },
      {
        prompt: "Which force pulls you down a slide?",
        hint: "It also makes a dropped ball fall to the ground.",
        explanation: "Gravity pulls everything towards the Earth. On a slide, it pulls you down the slope.",
        points: 20,
        difficulty: "easy",
        options: ["Gravity", "Magnetism", "Wind", "Sound"],
        correctIndex: 0,
      },
      {
        prompt: "Why do you slide faster on a smooth slide than on a rough one?",
        hint: "Think about the slowing-down force.",
        explanation:
          "A smooth surface makes less friction, so less of your speed is lost as you slide. A rough surface rubs more and slows you down.",
        points: 20,
        difficulty: "medium",
        options: [
          "A smooth slide is always taller",
          "A smooth slide has less friction",
          "Rough slides have more gravity",
          "Smooth slides are colder",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    slug: "monsoon-science",
    name: "Monsoon Lab",
    shortDescription: "Mumbai's monsoon waters this garden. Find out where rain comes from and where it goes.",
    description:
      "Every year the monsoon brings heavy rain to Mumbai, mostly between June and September. That rain soaks the soil, feeds the plants and trees in this garden, and keeps the water cycle turning.",
    category: "environment",
    icon: "🌧️",
    estimatedMinutes: 6,
    featured: false,
    qrCode: "MONSOON-016",
    blocks: [
      {
        type: "text",
        title: "The Water Cycle",
        body:
          "The Sun warms water in seas, lakes and puddles and turns some of it into invisible water vapour. This is evaporation.\n\nHigh in the sky the vapour cools into tiny droplets that make clouds — condensation. When the droplets join up and get heavy, they fall as rain — precipitation. Then it all starts again!",
        order: 0,
      },
      {
        type: "science",
        title: "Why Mumbai Gets a Monsoon",
        body:
          "In summer, land heats up faster than the sea. Moist winds blow in from the Arabian Sea towards the warm land, carrying clouds full of rain. That is the monsoon!\n\nMumbai usually gets more than 2,000 millimetres of rain a year, and most of it falls in just those few monsoon months.",
        order: 1,
      },
      {
        type: "observation",
        title: "Observe",
        body:
          "Look at the ground around you. Where is it lowest? That is where rainwater would flow and collect. Can you see soil, grass or paving that would soak water up, and hard surfaces that would let it run off?",
        order: 2,
      },
      {
        type: "did_you_know",
        title: "Did You Know?",
        body:
          "The Earth keeps using the same water over and over. The rain that falls on this garden has been through the water cycle countless times — it may once have been in the sea, a cloud or a river far away.",
        order: 3,
      },
    ],
    facts: [
      { label: "Monsoon months", value: "Mostly June to September" },
      { label: "Rain comes from", value: "Moist winds off the Arabian Sea" },
      { label: "Water cycle", value: "Evaporate → condense → rain" },
    ],
    activities: [
      {
        type: "yes_no",
        prompt: "True or false: clouds are made of tiny droplets of water.",
        hint: "What happens to water vapour when it cools high in the sky?",
        successMessage: "Correct! Clouds are billions of tiny water droplets (or ice crystals) floating together.",
        points: 10,
        config: { answer: true },
      },
      {
        type: "thinking",
        prompt: "Imagine you are a raindrop landing in this garden. Where might you go next?",
        successMessage: "What a journey! Every drop keeps travelling around the water cycle.",
        points: 10,
        config: {
          sampleAnswer:
            "I could soak into the soil, get sucked up by a tree's roots, and float away as vapour from a leaf.",
        },
      },
    ],
    questions: [
      {
        prompt: "When does Mumbai get most of its monsoon rain?",
        hint: "It starts as the school year begins.",
        explanation: "Mumbai's monsoon rain falls mostly from June to September, when moist winds blow in from the sea.",
        points: 20,
        difficulty: "easy",
        options: ["December to February", "March and April", "June to September", "Only on Sundays"],
        correctIndex: 2,
      },
      {
        prompt: "What is it called when the Sun's heat turns water into invisible vapour?",
        hint: "Puddles disappear on a sunny day because of it.",
        explanation: "Evaporation is when liquid water turns into water vapour, a gas. The Sun's heat makes it happen faster.",
        points: 20,
        difficulty: "easy",
        options: ["Evaporation", "Condensation", "Photosynthesis", "Friction"],
        correctIndex: 0,
      },
      {
        prompt: "How does rain help the plants in this garden?",
        hint: "Think about what roots do.",
        explanation:
          "Rain soaks into the soil, and plant roots take up that water. Plants need it to stay firm, move food around and make food in their leaves.",
        points: 20,
        difficulty: "medium",
        options: [
          "It paints their leaves blue",
          "Their roots take up the water they need to live and grow",
          "It makes them stop growing",
          "It is bad for every plant",
        ],
        correctIndex: 1,
      },
    ],
  },

  // ------------------------------------------------------------------ Logic
  {
    slug: "pattern-path",
    name: "Pattern Path",
    shortDescription: "Nature loves patterns. Count petals, spot spirals and guess what comes next.",
    description:
      "Petals, leaves and seed heads repeat in patterns — and once you spot a pattern, you can predict what comes next. That is the heart of logical thinking.",
    category: "logic",
    icon: "🔢",
    estimatedMinutes: 6,
    featured: true,
    qrCode: "PATTERN-008",
    blocks: [
      {
        type: "text",
        title: "About This Place",
        body:
          "Look closely at a flower and count its petals. Many flowers have 3, 5 or 8 petals.\n\nWhen something repeats, you have found a pattern. Patterns help us predict — and making good predictions is what logic is all about.",
        order: 0,
      },
      {
        type: "science",
        title: "A Famous Number Pattern",
        body:
          "Petal numbers like 3, 5, 8 and 13 turn up again and again in nature. They belong to a famous pattern called the Fibonacci sequence: 1, 1, 2, 3, 5, 8, 13…\n\nThe rule is simple: each number is the two numbers before it added together.",
        order: 1,
      },
      {
        type: "observation",
        title: "Observe",
        body:
          "Find a leafy stem and follow the leaves upwards. Do they grow in pairs, opposite each other, or one at a time, turning around the stem like a spiral staircase?",
        order: 2,
      },
      {
        type: "did_you_know",
        title: "Did You Know?",
        body:
          "The seeds in a sunflower's head are packed in spirals that curve both ways. Count the spirals and you will often find two Fibonacci numbers, such as 34 and 55.",
        order: 3,
      },
    ],
    facts: [
      { label: "Pattern to spot", value: "Petals in 3s, 5s and 8s" },
      { label: "Logic skill", value: "Predicting what comes next" },
      { label: "Time needed", value: "About 6 minutes" },
    ],
    activities: [
      {
        type: "observation",
        prompt: "Find a flower and count its petals. Is the number 3, 5 or 8 — or something else?",
        hint: "Start at one petal and go round in a circle so you don't count any twice.",
        successMessage: "Great counting! Pattern spotters notice the small details.",
        points: 10,
        config: { confirmLabel: "I counted one" },
      },
      {
        type: "multiple_choice",
        prompt: "What comes next?  🌱 🌿 🌱 🌿 🌱 …",
        hint: "Say the pattern out loud: sprout, leaf, sprout, leaf…",
        successMessage: "Yes! The pattern goes sprout, leaf, sprout, leaf — so a leaf comes next.",
        points: 10,
        config: {
          options: ["🌱 Sprout", "🌳 Tree", "🌿 Leaf", "🌸 Flower"],
          correctIndex: 2,
        },
      },
    ],
    questions: [
      {
        prompt: "What number comes next?  1, 1, 2, 3, 5, 8, …",
        hint: "Add the last two numbers together.",
        explanation:
          "Each number is the two before it added together, so 5 + 8 = 13. This is the Fibonacci sequence, and it hides in petals, pinecones and sunflowers.",
        points: 20,
        difficulty: "medium",
        options: ["10", "11", "13", "16"],
        correctIndex: 2,
      },
      {
        prompt: "Look at this pattern:  🔴 🔵 🔵 🔴 🔵 🔵 🔴 …  Which colour comes next?",
        hint: "Find the part that repeats, then keep it going.",
        explanation:
          "The pattern repeats red, blue, blue. After every red come two blues, so the next one is blue.",
        points: 20,
        difficulty: "easy",
        options: ["🔴 Red", "🔵 Blue", "🟢 Green", "🟡 Yellow"],
        correctIndex: 1,
      },
      {
        prompt: "Why is spotting patterns so useful?",
        hint: "Think about what a pattern lets you guess.",
        explanation:
          "If you know the pattern, you can predict the next step. Scientists, detectives and computer programmers all use patterns this way.",
        points: 20,
        difficulty: "easy",
        options: [
          "It makes flowers grow faster",
          "It helps you predict what will happen next",
          "It stops it from raining",
          "It only matters in maths lessons",
        ],
        correctIndex: 1,
      },
    ],
  },
  {
    slug: "riddle-bench",
    name: "Riddle Stop",
    shortDescription: "Stop, think hard and crack the garden's brain-teasers like a detective.",
    description:
      "Logic means using clues to reach an answer you can be sure of — like a detective solving a case with evidence instead of guesses. This stop is all about careful thinking.",
    category: "logic",
    icon: "🧩",
    estimatedMinutes: 6,
    featured: false,
    qrCode: "RIDDLE-009",
    blocks: [
      {
        type: "text",
        title: "About This Place",
        body:
          "Logic is careful thinking. You start with clues you know are true and, step by step, you work out something new.\n\nDetectives, scientists and computer programmers all use logic every day.",
        order: 0,
      },
      {
        type: "thinking",
        title: "The Detective's Rule",
        body:
          "IF it has rained, THEN the ground is wet. That rule is true.\n\nBut be careful: wet ground does not prove it rained. Someone might have used a hose or a watering can! Good detectives check whether there could be another reason.",
        order: 1,
      },
      {
        type: "did_you_know",
        title: "Did You Know?",
        body:
          "An 'odd one out' puzzle is really a sorting puzzle. First find the rule that most of the things share, then spot the one that breaks it.",
        order: 2,
      },
    ],
    facts: [
      { label: "Logic skill", value: "Using clues, not guesses" },
      { label: "Try this", value: "Explain your answer out loud" },
      { label: "Time needed", value: "About 6 minutes" },
    ],
    activities: [
      {
        type: "yes_no",
        prompt: "Detective check: the path is wet but the sky is clear and sunny. Does that PROVE it rained?",
        hint: "Could anything else make a path wet?",
        successMessage: "Sharp thinking! A hose or a watering can could have made it wet too.",
        points: 10,
        config: { answer: false },
      },
      {
        type: "thinking",
        prompt:
          "Make up your own 'odd one out' puzzle using four things you can see from here. What is the rule, and which one breaks it?",
        successMessage: "Brilliant — making a puzzle is even harder than solving one!",
        points: 10,
        config: {
          sampleAnswer:
            "Slide, swing, jungle gym, tree — the tree is the odd one out because it is the only living thing.",
        },
      },
    ],
    questions: [
      {
        prompt: "Which one is the odd one out?  🌹 Rose, 🌻 Sunflower, 🌳 Oak tree, 🌼 Daisy",
        hint: "Three of them share something the fourth does not.",
        explanation:
          "The rose, sunflower and daisy are all small flowering plants. The oak is a big tree, so it breaks the pattern.",
        points: 20,
        difficulty: "easy",
        options: ["🌹 Rose", "🌻 Sunflower", "🌼 Daisy", "🌳 Oak tree"],
        correctIndex: 3,
      },
      {
        prompt: "Every bee visits flowers. Buzz is a bee. What do we know for sure?",
        hint: "Use only what the clues tell you.",
        explanation:
          "The clue says every bee visits flowers, and Buzz is a bee — so Buzz must visit flowers. The other answers might be true, but the clues don't prove them.",
        points: 20,
        difficulty: "medium",
        options: [
          "Buzz is the biggest bee",
          "Buzz visits flowers",
          "Buzz is making honey today",
          "Buzz lives in a tree",
        ],
        correctIndex: 1,
      },
      {
        prompt: "Three friends stand in a line. Asha is in front of Ben. Ben is in front of Chen. Who is at the back?",
        hint: "Draw three dots in a line and place each friend.",
        explanation:
          "Asha is ahead of Ben, and Ben is ahead of Chen, so the order is Asha, Ben, Chen. Chen is at the back.",
        points: 20,
        difficulty: "medium",
        options: ["Asha", "Ben", "Chen", "We can't tell"],
        correctIndex: 2,
      },
    ],
  },
  {
    slug: "jungle-gym-engineers",
    name: "Jungle Gym Engineers",
    shortDescription: "Why are climbing frames so strong? Hunt for shapes, count bars and think like an engineer.",
    description:
      "The jungle gym is built from bars joined together into shapes. Engineers choose those shapes carefully — some stay strong and stiff, while others wobble.",
    category: "logic",
    icon: "🧗",
    estimatedMinutes: 6,
    featured: false,
    qrCode: "JUNGLE-014",
    heroImage: photo("playAreaWide"),
    blocks: [
      {
        type: "text",
        title: "Shapes Make Structures",
        body:
          "Look at how the bars of the jungle gym join together. You might spot squares, rectangles and triangles.\n\nA triangle is the strongest simple shape: push on one corner and it keeps its shape. A square can be squashed into a diamond — unless someone adds a diagonal bar, which turns it into two triangles!",
        order: 0,
      },
      {
        type: "thinking",
        title: "Think Like an Engineer",
        body:
          "Bridges, towers, cranes and roofs are full of triangles. Why do you think builders use them so often?",
        order: 1,
      },
      {
        type: "did_you_know",
        title: "Did You Know?",
        body:
          "The Eiffel Tower in Paris is made of thousands of iron pieces, many of them joined in triangles. That is how a tower so tall and airy stays so strong.",
        order: 2,
      },
      {
        type: "callout",
        title: "Climb Safely",
        body: "Hold on with both hands, climb only as high as you feel safe, and take turns.",
        order: 3,
      },
    ],
    facts: [
      { label: "Strongest simple shape", value: "Triangle" },
      { label: "Logic skill", value: "Counting and comparing shapes" },
      { label: "Time needed", value: "About 6 minutes" },
    ],
    activities: [
      {
        type: "observation",
        prompt: "How many triangles can you spot on the jungle gym? Count them!",
        hint: "Look where bars cross diagonally — each corner piece can make a triangle.",
        successMessage: "Super spotting! Engineers call this looking for 'bracing'.",
        points: 10,
        config: { confirmLabel: "I counted them" },
      },
      {
        type: "multiple_choice",
        prompt: "Which shape keeps its shape best when you push on a corner?",
        hint: "Imagine pressing on each shape made of straws.",
        successMessage: "Correct! A triangle can't be squashed without bending or breaking a side.",
        points: 10,
        config: {
          options: ["Square", "Circle", "Triangle", "Rectangle"],
          correctIndex: 2,
        },
      },
    ],
    questions: [
      {
        prompt: "Why do engineers love triangles?",
        hint: "Think about what happens when you push on a triangle's corner.",
        explanation:
          "A triangle's shape is locked by its three sides, so it doesn't wobble or squash. That makes structures built from triangles strong and stiff.",
        points: 20,
        difficulty: "medium",
        options: [
          "Triangles are the prettiest shape",
          "Triangles keep their shape and are very strong",
          "Triangles need no materials",
          "Triangles can fly",
        ],
        correctIndex: 1,
      },
      {
        prompt: "A square frame wobbles. What can you add to make it strong?",
        hint: "Turn the square into two of the strongest shape.",
        explanation: "A diagonal bar splits the square into two triangles, and triangles don't wobble.",
        points: 20,
        difficulty: "medium",
        options: [
          "A diagonal bar, making two triangles",
          "A coat of paint",
          "A flag on top",
          "Nothing — squares can't be fixed",
        ],
        correctIndex: 0,
      },
      {
        prompt: "A climbing frame has 3 levels. Each level has 4 bars. How many bars is that?",
        hint: "3 groups of 4.",
        explanation: "3 levels × 4 bars = 12 bars. Multiplying is a quick way to count equal groups.",
        points: 20,
        difficulty: "easy",
        options: ["7", "12", "34", "43"],
        correctIndex: 1,
      },
    ],
  },

  // ----------------------------------------------------------------- Coding
  {
    slug: "walkway-loop",
    name: "Walkway Loop",
    shortDescription: "Walk the walkway like a robot! Learn about loops, instructions and counting in code.",
    description:
      "The garden's walkway is perfect for thinking like a programmer. Every step is an instruction, walking a lap is a loop, and counting your steps is how a computer keeps track.",
    category: "coding",
    icon: "🔁",
    estimatedMinutes: 7,
    featured: true,
    qrCode: "WALKWAY-015",
    heroImage: photo("statueWalkway"),
    blocks: [
      {
        type: "text",
        title: "You Are the Robot",
        body:
          "Programmers write instructions for computers. Let's pretend you are a robot and the walkway is your track:\n\nMOVE FORWARD 10 STEPS\nTURN AROUND\nMOVE FORWARD 10 STEPS\n\nFollow them exactly — you just ran a program!",
        order: 0,
      },
      {
        type: "callout",
        title: "Coding Idea: Loops",
        body:
          "Walking the same path again and again is a loop. Instead of writing 'walk a lap' three times, programmers write it once:\n\nREPEAT 3 TIMES → walk a lap",
        order: 1,
      },
      {
        type: "callout",
        title: "Coding Idea: Variables",
        body:
          "A variable is like a labelled box that holds a number that can change. Counting steps? Your 'steps' box starts at 0 and goes up by 1 each time:\n\nsteps = steps + 1",
        order: 2,
      },
      {
        type: "did_you_know",
        title: "Did You Know?",
        body:
          "Phones and fitness bands count steps with a tiny sensor called an accelerometer, which feels every little bounce as you walk.",
        order: 3,
      },
    ],
    facts: [
      { label: "Coding idea", value: "Loops and variables" },
      { label: "Your program", value: "Steps in the right order" },
      { label: "Time needed", value: "About 7 minutes" },
    ],
    activities: [
      {
        type: "observation",
        prompt: "Count your steps from this sign to the next bend or corner of the walkway. Remember your number!",
        hint: "Say each number out loud — that's your 'steps' variable going up by 1.",
        successMessage: "Nice! Your step count is a variable, and you updated it every step.",
        points: 10,
        config: { confirmLabel: "I counted my steps" },
      },
      {
        type: "multiple_choice",
        prompt: "Which instruction walks 4 laps using a loop?",
        hint: "Look for the word that repeats things for you.",
        successMessage: "Yes! One short loop does the work of four instructions.",
        points: 10,
        config: {
          options: ["walk a lap", "REPEAT 4 TIMES → walk a lap", "STOP", "walk a lap, walk a lap"],
          correctIndex: 1,
        },
      },
    ],
    questions: [
      {
        prompt: "What is a loop in coding?",
        hint: "Think about walking the same path again and again.",
        explanation: "A loop tells the computer to repeat some instructions — a set number of times, or until something changes.",
        points: 20,
        difficulty: "easy",
        options: ["Instructions that repeat", "A mistake in code", "A computer screen", "A kind of flower"],
        correctIndex: 0,
      },
      {
        prompt: "A robot runs: REPEAT 3 TIMES → take 5 steps. How many steps does it take in total?",
        hint: "3 groups of 5 steps.",
        explanation: "The loop runs 3 times and each time takes 5 steps: 3 × 5 = 15 steps.",
        points: 20,
        difficulty: "medium",
        options: ["8", "15", "3", "53"],
        correctIndex: 1,
      },
      {
        prompt: "Your step counter starts at 0 and adds 1 for every step. After 7 steps, what does it show?",
        hint: "Start at 0 and count up one at a time.",
        explanation: "0 + 1 seven times = 7. That's how a variable in a program keeps count.",
        points: 20,
        difficulty: "easy",
        options: ["0", "1", "8", "7"],
        correctIndex: 3,
      },
    ],
  },
  {
    slug: "robot-gardener",
    name: "Robot Gardener",
    shortDescription: "Give a pretend robot step-by-step instructions to plant a seed — that's coding!",
    description:
      "Imagine a robot gardener that looks after this garden and does exactly what you tell it — nothing more, nothing less. Writing clear, step-by-step instructions for it is exactly what programmers do when they write code.",
    category: "coding",
    icon: "🤖",
    estimatedMinutes: 7,
    featured: true,
    qrCode: "ROBOT-010",
    blocks: [
      {
        type: "text",
        title: "About This Place",
        body:
          "A computer cannot guess what you mean. It follows instructions exactly, one step at a time, in order.\n\nA list of steps that solves a problem is called an algorithm. A recipe is an algorithm. So is planting a seed!",
        order: 0,
      },
      {
        type: "callout",
        title: "Coding Idea: Loops",
        body:
          "If the robot must water five plants, you could write 'water the plant' five times. Programmers write it once and wrap it in a loop:\n\nREPEAT 5 TIMES → water the next plant\n\nLoops save time and stop mistakes from creeping in.",
        order: 1,
      },
      {
        type: "thinking",
        title: "Think",
        body:
          "What would happen if the robot followed these steps in this order?\n1. Cover the seed with soil.\n2. Dig a hole.\n3. Drop the seed in.\n\nWould the seed end up planted?",
        order: 2,
      },
      {
        type: "did_you_know",
        title: "Did You Know?",
        body:
          "A mistake in code is called a bug, and fixing it is called debugging. In 1947, engineers even found a real moth stuck inside an early computer and taped it into their notebook as the 'first actual case of bug being found'!",
        order: 3,
      },
    ],
    facts: [
      { label: "Coding idea", value: "Algorithms — steps in order" },
      { label: "Also learn", value: "Loops and bugs" },
      { label: "Time needed", value: "About 7 minutes" },
    ],
    activities: [
      {
        type: "multiple_choice",
        prompt: "The robot must plant a seed. Which step should come FIRST?",
        hint: "What has to happen before the seed can go into the ground?",
        successMessage: "Correct! Order matters — computers follow steps exactly as written.",
        points: 10,
        config: {
          options: ["Water the seed", "Cover the seed with soil", "Dig a small hole", "Wait for a flower"],
          correctIndex: 2,
        },
      },
      {
        type: "observation",
        prompt:
          "Look around you. Can you find something in the garden that repeats like a loop — someone walking laps, a swing going back and forth, or a bee visiting flower after flower?",
        hint: "Watch for a few seconds. Does something do the same thing again and again?",
        successMessage: "Nice! Loops are everywhere once you start looking.",
        points: 10,
        config: { confirmLabel: "I found a loop" },
      },
    ],
    questions: [
      {
        prompt: "What do we call a list of step-by-step instructions that solves a problem?",
        hint: "A recipe is one of these.",
        explanation:
          "An algorithm is a set of steps, in order, that solves a problem. Computer programs are algorithms written in a language the computer understands.",
        points: 20,
        difficulty: "easy",
        options: ["A battery", "An algorithm", "A password", "A pixel"],
        correctIndex: 1,
      },
      {
        prompt: "The robot must water 4 plants. Which instruction is the smartest code?",
        hint: "Which one does the whole job without writing the same thing again and again?",
        explanation:
          "A loop repeats an instruction for you. 'REPEAT 4 TIMES' waters every plant exactly once, and it is shorter and easier to check.",
        points: 20,
        difficulty: "medium",
        options: [
          "Water the first plant only",
          "Water, water, water, water, water, water",
          "STOP",
          "REPEAT 4 TIMES → water the next plant",
        ],
        correctIndex: 3,
      },
      {
        prompt:
          "The robot's steps were: drop the seed, then dig the hole. The seed ended up lying on top of the ground! What is this mistake called?",
        hint: "Programmers go 'debugging' to fix these.",
        explanation:
          "A mistake in instructions is called a bug. Here the steps were in the wrong order. Swap them — dig first, then drop the seed in — and the bug is fixed!",
        points: 20,
        difficulty: "easy",
        options: ["A bug", "A byte", "A browser", "A battery"],
        correctIndex: 0,
      },
    ],
  },
  {
    slug: "binary-blooms",
    name: "Binary Blooms",
    shortDescription: "Open flower, closed bud: learn to count like a computer using just 1 and 0.",
    description:
      "Look at the flowers around the garden: some are open and some are still closed buds — just like a light switch is either on or off. Computers store everything, from photos to games, using only two signals: 1 (on) and 0 (off).",
    category: "coding",
    icon: "💡",
    estimatedMinutes: 7,
    featured: false,
    qrCode: "BINARY-011",
    blocks: [
      {
        type: "text",
        title: "About This Place",
        body:
          "Computers only understand two things: on and off. We write them as 1 and 0. This way of counting is called binary.\n\nLet's pretend an open flower means 1 and a closed bud means 0.",
        order: 0,
      },
      {
        type: "science",
        title: "How Binary Counts",
        body:
          "In binary, each place is worth double the place to its right: 4, 2, 1.\n\nSo open – closed – open (1 0 1) means 4 + 0 + 1 = 5. With just three flowers you can count all the way from 0 to 7!",
        order: 1,
      },
      {
        type: "observation",
        title: "Observe",
        body:
          "Find three flowers or buds in a row. Which are open and which are still closed? Write them as 1s and 0s — you have just made a binary number!",
        order: 2,
      },
      {
        type: "did_you_know",
        title: "Did You Know?",
        body: "Every letter you type is stored as 1s and 0s. The capital letter A is stored as 01000001.",
        order: 3,
      },
    ],
    facts: [
      { label: "Coding idea", value: "Binary: 1 = on, 0 = off" },
      { label: "Also learn", value: "IF–THEN rules" },
      { label: "Time needed", value: "About 7 minutes" },
    ],
    activities: [
      {
        type: "yes_no",
        prompt: "True or false: in binary, computers use only two digits — 1 and 0.",
        hint: "Think of a light switch: on or off.",
        successMessage: "Yes! Everything a computer does is built from 1s and 0s.",
        points: 10,
        config: { answer: true },
      },
      {
        type: "multiple_choice",
        prompt: "A young sunflower follows a simple rule. Which one is it?",
        hint: "Sunflowers need lots of light to grow.",
        successMessage: "Right! Young sunflowers turn to follow the sun. Programs use IF–THEN rules just like this.",
        points: 10,
        config: {
          options: [
            "IF it rains, THEN turn purple",
            "IF a bee comes, THEN fly away",
            "IF the sun moves, THEN turn to face it",
            "IF it is night, THEN grow a new flower",
          ],
          correctIndex: 2,
        },
      },
    ],
    questions: [
      {
        prompt: "In our flower code, open = 1 and closed = 0. What is the binary number 1 0 1 in normal numbers?",
        hint: "The places are worth 4, 2 and 1. Add up the places that have a 1.",
        explanation: "1 0 1 means one 4, no 2 and one 1: 4 + 1 = 5.",
        points: 20,
        difficulty: "medium",
        options: ["101", "3", "5", "2"],
        correctIndex: 2,
      },
      {
        prompt: "How many different signals does binary use?",
        hint: "'Bi' means two, like the two wheels of a bicycle.",
        explanation: "Binary uses just two signals — 1 and 0, on and off. 'Bi' means two, just like in bicycle.",
        points: 20,
        difficulty: "easy",
        options: ["2", "10", "26", "100"],
        correctIndex: 0,
      },
      {
        prompt: "Which IF–THEN rule would a helpful garden robot follow?",
        hint: "Pick the rule that makes sense and helps the plants.",
        explanation:
          "Programs make decisions with IF–THEN rules. A smart watering robot checks the soil and only waters when it is dry — which saves water too.",
        points: 20,
        difficulty: "medium",
        options: [
          "IF it is Tuesday, THEN the grass turns blue",
          "IF the soil is dry, THEN water the plant",
          "IF a bird sings, THEN delete the flowers",
          "IF the sun is up, THEN it is midnight",
        ],
        correctIndex: 1,
      },
    ],
  },
];

/**
 * Early demo places that described features this garden is not known to have
 * (a pond, a compost area, themed beds). Re-seeding archives them and disables
 * their QR codes, so nothing public points at them any more.
 */
export const RETIRED_LOCATION_SLUGS = [
  "rose-garden",
  "medicinal-plant-garden",
  "pond",
  "tree-garden",
  "compost-area",
];

export interface SeedTrail {
  slug: string;
  name: string;
  description: string;
  goals: string;
  difficulty: TrailDifficulty;
  ageGroup: AgeGroup;
  estimatedMinutes: number;
  icon: string;
  coverImage?: SeedImage;
  stops: { slug: string; instruction: string }[];
}

/*
 * Directions refer only to what the garden is known to have — the carved gate,
 * the paved walkway, the statue lawn, the palm grove, the play area with its
 * blue mural wall and the jungle gym — plus the next Garden Explorer sign. Once
 * signs are up, the garden team can make them more precise in Admin → Trails.
 */
export const TRAILS: SeedTrail[] = [
  {
    slug: "garden-science-trail",
    name: "Garden Science Trail",
    description:
      "A friendly science walk around the garden. Meet the carved gate and its giant banyan, try shadow science at Babasaheb's statue, discover how leaves make food, watch insects at work, test forces in the play area and follow the monsoon's water cycle.",
    goals:
      "Say what a habitat gives to living things\nExplain why a shadow points away from the Sun\nExplain how leaves make food from sunlight\nDescribe how insects help flowers make seeds\nFind a push, a pull and gravity in the play area\nTrace a raindrop around the water cycle",
    difficulty: "easy",
    ageGroup: "all-ages",
    estimatedMinutes: 40,
    icon: "🔬",
    coverImage: photo("gateStreet"),
    stops: [
      {
        slug: "garden-entrance",
        instruction:
          "Walk through the carved gate and follow the paved walkway straight ahead to the round lawn with the statue. The Babasaheb's Statue sign is beside the glass railing.",
      },
      {
        slug: "ambedkar-statue",
        instruction:
          "Look for the tall, feathery palm trees and the black signature wall. The Leaf Lab sign is in the palm grove.",
      },
      {
        slug: "leaf-lab",
        instruction:
          "Keep following the walkway and look out for flowers — the Butterfly Watch sign is where insects come to feed.",
      },
      {
        slug: "butterfly-garden",
        instruction:
          "Head to the children's play area beside the tall blue mural wall. The Swing & Slide Science sign is close to the play equipment.",
      },
      {
        slug: "play-area-science",
        instruction: "Walk back along the walkway and look for the Monsoon Lab sign — your final stop.",
      },
      { slug: "monsoon-science", instruction: "" },
    ],
  },
  {
    slug: "code-and-logic-quest",
    name: "Code & Logic Quest",
    description:
      "A brain-training adventure for young coders. Spot number patterns, crack detective riddles, test the jungle gym like an engineer, walk the walkway as a robot, program a robot gardener and count in binary with flowers.",
    goals:
      "Continue a number pattern and explain the rule\nUse clues to reach an answer you can be sure of\nExplain why triangles make strong structures\nWrite and follow a loop\nPut instructions in the right order and fix a bug\nRead a small binary number",
    difficulty: "moderate",
    ageGroup: "ages-9-12",
    estimatedMinutes: 45,
    icon: "🤖",
    coverImage: photo("playAreaWide"),
    stops: [
      {
        slug: "pattern-path",
        instruction: "Look around for the Riddle Stop sign — find a comfortable spot nearby to think.",
      },
      {
        slug: "riddle-bench",
        instruction:
          "Make your way to the jungle gym in the play area. The Jungle Gym Engineers sign is right beside it.",
      },
      {
        slug: "jungle-gym-engineers",
        instruction: "Head back to the walkway. The Walkway Loop sign marks where your robot walk begins.",
      },
      {
        slug: "walkway-loop",
        instruction: "Follow the walkway (count your steps!) until you find the Robot Gardener sign.",
      },
      {
        slug: "robot-gardener",
        instruction: "Look around the flowering plants for the Binary Blooms sign — your final stop.",
      },
      { slug: "binary-blooms", instruction: "" },
    ],
  },
  {
    slug: "little-explorers",
    name: "Little Explorers",
    description:
      "A short, happy walk for our youngest explorers. Say hello to the garden, spot a butterfly, play with forces in the play area and count petals.",
    goals:
      "Say what a habitat gives to living things\nSpot an insect on a flower\nFind a push and a pull in the play area\nContinue a simple pattern",
    difficulty: "easy",
    ageGroup: "ages-5-8",
    estimatedMinutes: 25,
    icon: "🐞",
    coverImage: photo("playArea"),
    stops: [
      {
        slug: "garden-entrance",
        instruction: "Walk through the carved gate, along the paved walkway, and look for flowers — find the Butterfly Watch sign.",
      },
      {
        slug: "butterfly-garden",
        instruction: "Go to the children's play area and find the Swing & Slide Science sign.",
      },
      {
        slug: "play-area-science",
        instruction: "Look around for the Pattern Path sign near the flowers and leaves — your last stop!",
      },
      { slug: "pattern-path", instruction: "" },
    ],
  },
];

/** Early demo trails that visited the retired places; re-seeding archives them. */
export const RETIRED_TRAIL_SLUGS = ["plant-explorer", "water-and-soil-detectives"];

export interface SeedBadge {
  code: string;
  name: string;
  description: string;
  icon: string;
  criteriaType:
    | "locations_completed"
    | "trail_completed"
    | "trails_completed"
    | "quiz_first_try"
    | "activities_completed"
    | "xp_earned"
    | "category_completed"
    | "location_completed"
    | "quiz_accuracy";
  config: Record<string, unknown>;
  displayOrder: number;
}

export const BADGES: SeedBadge[] = [
  {
    code: "first_discovery",
    name: "First Discovery",
    description: "You completed your very first place. Welcome, explorer!",
    icon: "🌱",
    criteriaType: "locations_completed",
    config: { count: 1 },
    displayOrder: 0,
  },
  {
    code: "garden_explorer",
    name: "Garden Explorer",
    description: "You finished the Garden Science Trail.",
    icon: "🏆",
    criteriaType: "trail_completed",
    config: { trailSlug: "garden-science-trail" },
    displayOrder: 1,
  },
  {
    code: "quest_champion",
    name: "Quest Champion",
    description: "You finished the Code & Logic Quest.",
    icon: "🤖",
    criteriaType: "trail_completed",
    config: { trailSlug: "code-and-logic-quest" },
    displayOrder: 2,
  },
  {
    code: "little_explorer",
    name: "Little Explorer",
    description: "You finished the Little Explorers trail.",
    icon: "🐞",
    criteriaType: "trail_completed",
    config: { trailSlug: "little-explorers" },
    displayOrder: 3,
  },
  {
    code: "logic_wizard",
    name: "Logic Wizard",
    description: "You completed two Logic places.",
    icon: "🧩",
    criteriaType: "category_completed",
    config: { category: "logic", count: 2 },
    displayOrder: 4,
  },
  {
    code: "code_cracker",
    name: "Code Cracker",
    description: "You completed two Coding places.",
    icon: "💻",
    criteriaType: "category_completed",
    config: { category: "coding", count: 2 },
    displayOrder: 5,
  },
  {
    code: "butterfly_explorer",
    name: "Butterfly Spotter",
    description: "You completed Butterfly Watch.",
    icon: "🦋",
    criteriaType: "location_completed",
    config: { locationSlug: "butterfly-garden" },
    displayOrder: 6,
  },
  {
    code: "force_finder",
    name: "Force Finder",
    description: "You completed Swing & Slide Science.",
    icon: "🛝",
    criteriaType: "location_completed",
    config: { locationSlug: "play-area-science" },
    displayOrder: 7,
  },
  {
    code: "young_scientist",
    name: "Young Scientist",
    description: "You completed four garden places.",
    icon: "🔬",
    criteriaType: "locations_completed",
    config: { count: 4 },
    displayOrder: 8,
  },
  {
    code: "sharp_mind",
    name: "Sharp Mind",
    description: "You got five quiz questions right on the first try.",
    icon: "⚡",
    criteriaType: "quiz_first_try",
    config: { count: 5 },
    displayOrder: 9,
  },
  {
    code: "observation_expert",
    name: "Observation Expert",
    description: "You finished five real-world observation activities.",
    icon: "👀",
    criteriaType: "activities_completed",
    config: { count: 5 },
    displayOrder: 10,
  },
  {
    code: "trail_finisher",
    name: "Trail Finisher",
    description: "You completed two different learning trails.",
    icon: "🥾",
    criteriaType: "trails_completed",
    config: { count: 2 },
    displayOrder: 11,
  },
  {
    code: "xp_superstar",
    name: "XP Superstar",
    description: "You earned 500 XP. What a star!",
    icon: "🌟",
    criteriaType: "xp_earned",
    config: { count: 500 },
    displayOrder: 12,
  },
];

/** Badges whose rules pointed at retired places; re-seeding archives them. */
export const RETIRED_BADGE_CODES = ["plant_detective", "eco_explorer"];
