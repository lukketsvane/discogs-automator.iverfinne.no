import { VinylRecord } from './types';

export const MAX_BATCH_SIZE = 10;
export const COMPRESSION_WIDTH = 800; // Resize images to this width to save tokens/bandwidth

// Placeholder data for UI testing before API key is active
export const MOCK_RESULT: VinylRecord = {
  id: 'mock-1',
  artist: 'Pink Floyd',
  title: 'Dark Side of the Moon',
  year: '1973',
  label: 'Harvest',
  catalogNumber: 'SHVL 804',
  estimatedPrice: '$25 - $300',
  discogsUrl: 'https://www.discogs.com/master/10362-Pink-Floyd-The-Dark-Side-Of-The-Moon',
  description: 'Iconic progressive rock album. Look for the solid blue triangle on the label for first pressings.',
  images: [''],
  dateAdded: Date.now()
};