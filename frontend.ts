import { IJWTPayload } from "@/app/interfaces/jwt-payload";
import axios from "axios";
import jwt_decode from "jwt-decode";

export class ApiClient {
  private readonly baseUrl: string = this.getApiUrl();
  private static instance: ApiClient;

  private constructor() {
    axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL;
    axios.defaults.headers.post["Content-Type"] = "application/json";
    axios.defaults.headers.common["Access-Control-Allow-Origin"] = "*";
    axios.defaults.headers.common["Access-Control-Allow-Methods"] =
      "GET, POST, PUT, DELETE, PATCH, OPTIONS";

    axios.interceptors.request.use(
      async (config) => {
        const accessToken = localStorage.getItem("token");
        config.headers = config.headers ?? {};
        if (accessToken) {
          config.headers["Authorization"] = "Bearer " + accessToken;

          const payload: IJWTPayload = jwt_decode(accessToken);

          if (config.headers["x-workspace-id"]) {
          } else {
            config.headers["x-workspace-id"] = payload.workspaceId;
          }

          if (Date.now() >= payload.exp * 1000) {
            await fetch(
              `${this.baseUrl}/authentication/user-refresh-token?userId=${payload.sub}`
            )
              .then((res) => res.json())
              .then(async (data) => {
                const refreshToken = data.refreshToken;

                if (refreshToken) {
                  const body = {
                    refreshToken: refreshToken,
                  };

                  await fetch(`${this.baseUrl}/authentication/refresh-token`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: "Bearer " + accessToken,
                    },
                    body: JSON.stringify(body),
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      localStorage.setItem("token", data.accessToken);
                      config.headers["Authorization"] =
                        "Bearer " + data.accessToken;
                    })
                    .catch((err) => {
                      console.error(err);
                      localStorage.removeItem("token");
                      window.location.href = "/login";
                    });
                } else {
                  localStorage.removeItem("token");
                  window.location.href = "/login";
                }
              });
          }
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  public get(url: string, params?: any, responseType?: any, config?: any) {
    if (params) return axios.get(url, { params });
    if (responseType) return axios.get(url, { params, responseType });
    if (config) return axios.get(url, config);
    return axios.get(url);
  }

  public post(url: string, data: any, config?: any) {
    if (config) return axios.post(url, data, config);
    return axios.post(url, data);
  }

  public put(url: string, data?: any) {
    return axios.put(url, data);
  }

  public delete(url: string, data?: any) {
    return axios.delete(url, data);
  }

  public deleteWithParams(url: string, data: any) {
    return axios.delete(url, { data });
  }
}
