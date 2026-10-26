import axios from "axios";

// No token is stored in JS at all — the browser holds it as an httpOnly cookie
// (set by the backend) and sends it automatically on every request to the API origin.
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true,
});

// Endpoints that should never trigger the refresh-and-retry dance (avoids loops).
const NO_REFRESH_PATHS = ["/auth/login", "/auth/refresh", "/auth/register"];

let isRefreshing = false;
let pendingQueue = [];

function processQueue(error) {
  pendingQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve()));
  pendingQueue = [];
}

API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (!response || response.status !== 401 || !config || config._retried) {
      return Promise.reject(error);
    }
    if (NO_REFRESH_PATHS.some((p) => config.url?.includes(p))) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until the in-flight refresh completes.
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      })
        .then(() => API(config))
        .catch((err) => Promise.reject(err));
    }

    config._retried = true;
    isRefreshing = true;
    try {
      await API.post("/auth/refresh");
      processQueue(null);
      return API(config);
    } catch (refreshErr) {
      processQueue(refreshErr);
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default API;
