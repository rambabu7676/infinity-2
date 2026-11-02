import { StoryItem } from '../types';

export const INITIAL_STORIES: StoryItem[] = [
  {
    id: 'my-story',
    userId: 'current-user',
    username: 'Your Story',
    userAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    isMyStory: true,
    hasUnseen: false,
    slides: [
      {
        id: 's-my-1',
        mediaUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop&q=80',
        mediaType: 'image',
        duration: 5,
        caption: 'Infinity vibes 🚀 Living life in motion',
        soundTitle: 'Infinity Beats (Original)',
        createdAt: '1h ago',
      },
    ],
  },
  {
    id: 'story-1',
    userId: 'u1',
    username: 'rohit_flow',
    userAvatar: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&auto=format&fit=crop&q=80',
    hasUnseen: true,
    slides: [
      {
        id: 's1-1',
        mediaUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
        mediaType: 'image',
        duration: 5,
        caption: 'Himalayan sunrise peaks 🏔️✨',
        soundTitle: 'Electric Bass Waves',
        createdAt: '2h ago',
      },
    ],
  },
  {
    id: 'story-2',
    userId: 'u2',
    username: 'street_flavors',
    userAvatar: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80',
    hasUnseen: true,
    slides: [
      {
        id: 's2-1',
        mediaUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
        mediaType: 'image',
        duration: 5,
        caption: 'Crispy snacks & desi culinary delights! 🤤🍛',
        soundTitle: 'Desi Street Beat',
        createdAt: '4h ago',
      },
    ],
  },
  {
    id: 'story-3',
    userId: 'u3',
    username: 'fitness_riya',
    userAvatar: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=300&auto=format&fit=crop&q=80',
    hasUnseen: true,
    slides: [
      {
        id: 's3-1',
        mediaUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
        mediaType: 'image',
        duration: 5,
        caption: 'Heavy sets & fitness discipline 💪🔥',
        soundTitle: 'Adrenaline Rush (Gym Hardcore)',
        createdAt: '6h ago',
      },
    ],
  },
  {
    id: 'story-4',
    userId: 'u4',
    username: 'aarav_singh',
    userAvatar: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300&auto=format&fit=crop&q=80',
    hasUnseen: true,
    slides: [
      {
        id: 's4-1',
        mediaUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80',
        mediaType: 'image',
        duration: 5,
        caption: 'Lost in the beauty of green hills 🌲💚',
        soundTitle: 'Mountain Air 432Hz',
        createdAt: '7h ago',
      },
    ],
  },
  {
    id: 'story-5',
    userId: 'u5',
    username: 'priya_flow',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    hasUnseen: true,
    slides: [
      {
        id: 's5-1',
        mediaUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
        mediaType: 'image',
        duration: 5,
        caption: 'Weekend aesthetic photoshoot ✨📸',
        soundTitle: 'Lo-Fi Chill Beats',
        createdAt: '8h ago',
      },
    ],
  },
];
