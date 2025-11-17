import axios, { AxiosInstance, AxiosError } from 'axios';
import config from '../config/config';

/**
 * Service for integrating with Lendsqr Adjutor Karma API
 * to check if users are blacklisted
 */
export class KarmaService {
  private axiosClient: AxiosInstance;
  private readonly baseURL: string;
  private readonly apiToken: string;

  constructor() {
    this.baseURL = config.karma.baseUrl;
    this.apiToken = config.karma.apiToken;

    if (!this.apiToken) {
      console.warn('KARMA_API_TOKEN is not configured. Blacklist checks may fail.');
    }

    this.axiosClient = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, 
    });
  }

  /**
   * Check if a user is blacklisted in the Karma system
   * @param identity - User identifier (email, phone, etc.)
   * @returns Promise<boolean> - true if blacklisted, false if not blacklisted
   * @throws Error if API call fails (except for 404 which means not blacklisted)
   */
  async checkBlacklist(identity: string): Promise<boolean> {
    try {
      const response = await this.axiosClient.get(`/v2/verification/karma/${identity}`);
      
      // Check if this is a mock response (test mode)
      if (response.data?.['mock-response']) {
        console.log('Karma API in test mode - treating user as not blacklisted');
        return false;
      }
      
      if (response.data?.data) {
        // User exists in the blacklist database
        console.log('User found in Karma blacklist:', response.data.data);
        return true;
      }
      
      return false;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        
        // 404 means user is not in the blacklist database - this is good
        if (axiosError.response?.status === 404) {
          return false;
        }
        
        // For other errors, log and throw
        console.error('Karma API error:', {
          status: axiosError.response?.status,
          message: axiosError.message,
          data: axiosError.response?.data,
        });
        
        throw new Error(`Unable to verify user blacklist status: ${axiosError.message}`);
      }
      
      // Non-axios errors
      console.error('Unexpected error checking Karma blacklist:', error);
      throw new Error('Unable to verify user blacklist status');
    }
  }
}

export const karmaService = new KarmaService();
