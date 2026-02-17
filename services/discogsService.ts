import { DiscogsUser, DiscogsProfile, DiscogsSearchResponse } from '../types';

const BASE_URL = 'https://api.discogs.com';
const USER_AGENT = 'discogs.iverfinne.no/1.0';

export class DiscogsClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;

    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Discogs token=${this.token}`,
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Discogs API ${res.status}: ${text || res.statusText}`);
    }

    return res.json();
  }

  async getIdentity(): Promise<DiscogsUser> {
    return this.request('/oauth/identity');
  }

  async getProfile(username: string): Promise<DiscogsProfile> {
    return this.request(`/users/${username}`);
  }

  async search(query: string, params: Record<string, string> = {}): Promise<DiscogsSearchResponse> {
    const qs = new URLSearchParams({ q: query, per_page: '10', ...params });
    return this.request(`/database/search?${qs}`);
  }

  async searchRelease(query: string): Promise<DiscogsSearchResponse> {
    return this.search(query, { type: 'release' });
  }

  async getRelease(id: number): Promise<any> {
    return this.request(`/releases/${id}`);
  }

  async addToCollection(username: string, releaseId: number, folderId: number = 1): Promise<any> {
    return this.request(`/users/${username}/collection/folders/${folderId}/releases/${releaseId}`, {
      method: 'POST',
    });
  }

  async getCollection(username: string, folderId: number = 0, page: number = 1): Promise<any> {
    return this.request(`/users/${username}/collection/folders/${folderId}/releases?page=${page}&per_page=50&sort=added&sort_order=desc`);
  }

  async addToWantlist(username: string, releaseId: number): Promise<any> {
    return this.request(`/users/${username}/wants/${releaseId}`, {
      method: 'PUT',
    });
  }
}
