import http from "./httpService";
import { encrypt as encryptobj, decrypt as decryptobj } from "../utils/crypto";
import { API_ENDPOINTS } from "../config/apiEndpoints";

const apiUrl = import.meta.env.VITE_API_URL || "";
const tokenKey = "token";

// JWT Helper Functions
export function getJwt() {
  return localStorage.getItem(tokenKey) || localStorage.getItem("token") || null;
}

export function setJwt(jwt) {
  if (jwt) {
    localStorage.setItem(tokenKey, jwt);
    localStorage.setItem("token", jwt);
  } else {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem("token");
  }
}

export function getCurrentUser() {
  try {
    const token = getJwt();
    if (!token) return null;

    const base64Url = token.split(".")[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Token decode error:", error);
    return null;
  }
}

// Update JWT token
export async function updateJwt() {
  try {
    const { data } = await http.post(apiUrl + API_ENDPOINTS.UPDATE_JWT);
    if (data && data.token) {
      setJwt(data.token);
    }
    return data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw {
        success: false,
        error:
          error.response.data.message ||
          error.response.data.error ||
          "An error occurred with the request",
        code: error.response.data.code,
      };
    }
    throw error;
  }
}

// Unencrypted Backend Calls
export async function NobackEndCall(route) {
  try {
    const { data } = await http.get(apiUrl + route);
    return data;
  } catch (error) {
    if (error.response && error.response.data) {
      return {
        success: false,
        error:
          error.response.data.message ||
          error.response.data.error ||
          "An error occurred with the request",
      };
    }
    throw error;
  }
}

export async function NobackEndCallObj(route, obj, method = "post") {
  try {
    const lowerMethod = method.toLowerCase();
    let res;
    if (lowerMethod === "get") {
      res = await http.get(apiUrl + route, { params: obj });
    } else if (lowerMethod === "delete") {
      res = await http.delete(apiUrl + route, { data: obj });
    } else {
      res = await http[lowerMethod](apiUrl + route, obj);
    }
    return res.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw {
        success: false,
        ...error.response.data,
        error:
          error.response.data.message ||
          error.response.data.error ||
          "An error occurred with the request",
      };
    }
    throw error;
  }
}

export async function backEndCallObjPut(route, obj) {
  try {
    const { data } = await http.put(apiUrl + route, obj);
    return data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw {
        success: false,
        ...error.response.data,
        error:
          error.response.data.message ||
          error.response.data.error ||
          "An error occurred with the request",
      };
    }
    throw error;
  }
}

export async function backEndCallObjDel(route, id) {
  try {
    const url =
      typeof id === "string" || typeof id === "number"
        ? `${apiUrl}${route}/${id}`
        : apiUrl + route;
    const config = typeof id === "object" ? { data: id } : undefined;
    const { data } = await http.delete(url, config);
    return data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw {
        success: false,
        error:
          error.response.data.message ||
          error.response.data.error ||
          "An error occurred with the request",
      };
    }
    throw error;
  }
}

export async function backEndCallPatch(route, obj) {
  try {
    const { data } = await http.patch(apiUrl + route, obj);
    return data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw {
        success: false,
        ...error.response.data,
        error:
          error.response.data.message ||
          error.response.data.error ||
          "An error occurred",
      };
    }
    throw error;
  }
}

// Encrypted Routes
export async function backEndCallObj(route, obj) {
  try {
    const drreqpob = await encryptobj(obj);
    const { data } = await http.post(apiUrl + route, { enc: drreqpob });
    const dec = await decryptobj(data?.data || data, "data decrypt");
    if (!dec) return null;
    return dec;
  } catch (error) {
    if (error.response && error.response.data) {
      throw {
        success: false,
        error:
          error.response.data.message ||
          error.response.data.error ||
          "An error occurred with encrypted request",
      };
    }
    throw error;
  }
}

export async function backEndCall(route) {
  try {
    const { data } = await http.post(apiUrl + route);
    if (!data) return null;
    return await decryptobj(data);
  } catch (error) {
    if (error.response && error.response.data) {
      throw {
        success: false,
        error:
          error.response.data.message ||
          error.response.data.error ||
          "An error occurred with encrypted request",
      };
    }
    throw error;
  }
}

export async function backEndCallObjNoEnc(route, obj) {
  try {
    const { data } = await http.post(apiUrl + route, obj);
    return await decryptobj(data);
  } catch (error) {
    if (error.response && error.response.data) {
      throw {
        success: false,
        error:
          error.response.data.message ||
          error.response.data.error ||
          "An error occurred with the request",
      };
    }
    throw error;
  }
}

export async function backEndCallObjNoDcyt(route, obj) {
  try {
    const drreqpob = await encryptobj(obj);
    const { data } = await http.post(apiUrl + route, {
      enc: drreqpob,
    });
    return data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw {
        success: false,
        error:
          error.response.data.message ||
          error.response.data.error ||
          "An error occurred with encrypted request",
      };
    }
    throw error;
  }
}

// Captcha support call
export async function backEndCallObjCap(route, obj, cap) {
  if (cap) {
    http.setCaptcha(cap);
  }
  try {
    const { data } = await http.post(apiUrl + route, obj);
    return data;
  } catch (error) {
    if (error.response && error.response.data) {
      return {
        success: false,
        error:
          error.response.data.message ||
          error.response.data.error ||
          "An error occurred with the request",
      };
    }
    throw error;
  } finally {
    http.setCaptcha(null);
  }
}

// Upload & Download File Helpers
export async function uploadFileCall(route, formData, method = "post") {
  try {
    const lowerMethod = (method || "post").toLowerCase();
    const { data } = await http[lowerMethod](apiUrl + route, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw {
        success: false,
        ...error.response.data,
        error:
          error.response.data.message ||
          error.response.data.error ||
          "An error occurred with the request",
      };
    }
    throw error;
  }
}

export async function fetchFileBlob(route) {
  try {
    const isFullUrl = route.startsWith("http");
    const fullUrl = isFullUrl ? route : apiUrl + route;
    const response = await http.get(fullUrl, { responseType: "blob" });
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function postFileBlob(route, body = {}) {
  try {
    const fullUrl = apiUrl + route;
    const response = await http.post(fullUrl, body, { responseType: "blob" });
    return response.data;
  } catch (error) {
    console.error("Post file blob error:", error);
    throw error;
  }
}

// Login Call
export async function loginCall(route, obj) {
  try {
    const { data } = await http.post(apiUrl + route, obj);
    if (data && data.token) {
      setJwt(data.token);
    }
    return data;
  } catch (error) {
    if (error.response && error.response.data) {
      return {
        success: false,
        error:
          error.response.data.message ||
          error.response.data.error ||
          (typeof error.response.data === "string" ? error.response.data : "An error occurred with the request"),
      };
    }
    throw error;
  }
}

// Logout Call
export async function logout() {
  try {
    const endpoint = API_ENDPOINTS?.AUTH?.LOGOUT || "/auth/logout";
    const { data } = await http.post(apiUrl + endpoint);
    setJwt(null);
    return data;
  } catch (error) {
    setJwt(null);
    if (error.response && error.response.data) {
      return {
        success: false,
        error: error.response.data.message || "Logout failed",
      };
    }
    return { success: true };
  }
}

// Test Route
export async function testBackendcall(type) {
  return new Promise((resolve, reject) => {
    if (type === "fail") {
      let response = { response: { data: "Something went wrong" } };
      reject(JSON.stringify(response));
    } else {
      resolve({ success: "Success!" });
    }
  });
}

const exportedObject = {
  backEndCall,
  backEndCallObj,
  loginCall,
  logout,
  backEndCallObjCap,
  backEndCallObjNoDcyt,
  backEndCallObjNoEnc,
  NobackEndCall,
  NobackEndCallObj,
  uploadFileCall,
  fetchFileBlob,
  postFileBlob,
  getJwt,
  setJwt,
  getCurrentUser,
  updateJwt,
  backEndCallObjPut,
  backEndCallPatch,
  backEndCallObjDel,
  testBackendcall,
};

export default exportedObject;
