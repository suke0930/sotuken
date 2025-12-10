import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { logger } from "./logger.js";

/**
 * HTTP Client wrapper with logging and error handling
 */
export class HttpClient {
  private client: AxiosInstance;

  constructor(baseURL: string, timeout: number = 30000) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor
    this.client.interceptors.request.use((config) => {
      logger.debug(`HTTP ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`HTTP ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error(`HTTP ${error.response.status} ${error.config.url}`, {
            data: error.response.data,
          });
        } else {
          logger.error(`HTTP Error: ${error.message}`);
        }
        throw error;
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  setAuthHeader(token: string) {
    this.client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  setFingerprintHeader(fingerprint: string) {
    this.client.defaults.headers.common["X-Fingerprint"] = fingerprint;
  }

  clearHeaders() {
    delete this.client.defaults.headers.common["Authorization"];
    delete this.client.defaults.headers.common["X-Fingerprint"];
  }
}
