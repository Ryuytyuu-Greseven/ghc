import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import axios, { AxiosInstance } from 'axios';
import { AsyncLocalStorage } from 'async_hooks';

export interface HttpContext {
  token?: string;
  lang?: string;
}

export const httpLocalStorage = new AsyncLocalStorage<HttpContext>();

@Injectable({ scope: Scope.REQUEST })
export class HttpService {
  private instance: AxiosInstance;

  constructor(@Inject(REQUEST) private readonly request: any) {
    const baseURL = process.env.API_BASE_URL ?? 'http://localhost:3000';
    this.instance = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.instance.interceptors.request.use((config) => {
      const token = this.extractToken();
      if (token) {
        config.headers.Authorization = token.startsWith('Bearer ')
          ? token
          : `Bearer ${token}`;
      }
      return config;
    });
  }

  private extractToken(): string | null {
    // 1. Check AsyncLocalStorage first
    const store = httpLocalStorage.getStore();
    if (store && store.token) {
      return store.token;
    }

    // 2. Check injected request context
    if (this.request) {
      if (this.request.headers?.authorization) {
        return this.request.headers.authorization;
      }
      if (this.request.handshake) {
        const auth = this.request.handshake.auth;
        if (auth && auth.token) {
          return auth.token;
        }
        const authHeader = this.request.handshake.headers?.authorization;
        if (authHeader) {
          return authHeader;
        }
      }
    }

    return null;
  }

  get client(): AxiosInstance {
    return this.instance;
  }

  async get<T>(url: string, config?: any): Promise<T> {
    const res = await this.instance.get<T>(url, config);
    return res.data;
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const res = await this.instance.post<T>(url, data, config);
    return res.data;
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const res = await this.instance.put<T>(url, data, config);
    return res.data;
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    const res = await this.instance.delete<T>(url, config);
    return res.data;
  }
}

// Global, request-context-aware Axios instance that can be imported directly
// inside non-NestJS classes like LangChain tools!
const baseURL = process.env.API_BASE_URL ?? 'http://localhost:3000';
export const httpClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use((config) => {
  const store = httpLocalStorage.getStore();
  if (store && store.token) {
    config.headers.Authorization = store.token.startsWith('Bearer ')
      ? store.token
      : `Bearer ${store.token}`;
  }
  return config;
});
