import axios from "axios";

// Create Axios instance with credentials support
const http = axios.create({
  withCredentials: true,
});

// Request Interceptor: Dynamically attaches token to EVERY outgoing request
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("webtoken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers["x-auth-token"] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handles 401 session expiration globally
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const expectedError =
      error.response &&
      error.response.status >= 400 &&
      error.response.status < 500;

    if (!expectedError) {
      // Log network or server error
    }
    if (error.response && error.response.status === 401) {
      localStorage.clear();
      window.location.href = `/section_expaired?text=${encodeURIComponent(error.response.data || "")}`;
    }

    return Promise.reject(error);
  }
);

http.setCaptcha = (captcha) => {
  if (captcha) {
    http.defaults.headers.common["x-captcha-token"] = captcha;
  } else {
    delete http.defaults.headers.common["x-captcha-token"];
  }
};

http.setTx = (tx) => {
  if (tx) {
    http.defaults.headers.common["x-transaction-auth"] = tx;
  } else {
    delete http.defaults.headers.common["x-transaction-auth"];
  }
};

export default http;
