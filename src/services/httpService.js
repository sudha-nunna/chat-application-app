import axios from "axios";

axios.interceptors.response.use(null, (error) => {
  const expectedError =
    error.response &&
    error.response.status >= 400 &&
    error.response.status < 500;

  if (!expectedError) {
    // alert("No Network, Please Connect to Internet");
  }
  if (error.response.status === 401) {
    localStorage.clear();
    window.location.href = `/section_expaired?text=${error.response.data}`;
  }

  return Promise.reject(error);
});

function setJwt(jwt) {
  axios.defaults.headers.common["x-auth-token"] = jwt;
  axios.defaults.headers.common["Content-type"] = "application/json";
}

function setTx(tx) {
  axios.defaults.headers.common["x-transaction-auth"] = tx;
  axios.defaults.headers.common["Content-type"] = "application/json";
}

export default {
  get: axios.get,
  post: axios.post,
  put: axios.put,
  delete: axios.delete,
  setJwt,
  setTx,
};