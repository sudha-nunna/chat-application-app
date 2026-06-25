import { jwtDecode } from "jwt-decode";
import http from "./httpService";
import helpers from "./crypto";
import { publicIpv4 } from "public-ip";
import { LOGOUT } from "../reduxstore/rootReducer/RootReducer";
// import { useDispatch } from "react-redux";
// import apiUrl from "../config.json";

// const { detect } = require("detect-browser");

// const browser = detect();
const apiEndpoint = import.meta.env.VITE_API_URL;
import { backEndCallNoEnc } from "./mainService";
import { getNetbanksRdx } from "../reduxstore/slice/getNetbanksSlice";

const tokenKey = "webtoken";

// const dispatch = useDispatch();

http.setJwt(getJwt());

export async function login(obj) {
  const drreqpob = helpers.encryptobj(obj);
  const { data } = await http.post(apiEndpoint + "/admin/loginotp", {
    enc: drreqpob,
  });
  return helpers.decryptobj(data);
}

export async function resendotp(obj) {
  const drreqpob = helpers.encryptobj(obj);
  const { data } = await http.post(apiEndpoint + "/admin/resend", {
    enc: drreqpob,
  });
  return helpers.decryptobj(data);
}

export async function validateOTP(obj) {
  // const IP = await publicIpv4();
  // obj.browserid = browser.version;
  // obj.ip = IP;
  obj.web = true;
  const drreqpob = helpers.encryptobj(obj);
  var { data: jwt } = await http.post(apiEndpoint + "/member/valotp", {
    enc: drreqpob,
  });

  // jwt = helpers.decrypt(jwt);

  // localStorage.setItem(tokenKey, helpers.encrypt(jwt));
  console.log(jwt, 'jwt');


  return jwt;
}

export async function verifyReauth(obj) {
  const drreqpob = helpers.encryptobj(obj);
  console.log(obj, 'obj');

  var { data } = await http.post(apiEndpoint + "/member/reset_forgot_pin", {
    enc: drreqpob,
  });

  return helpers.decryptobj(data);

  // const { data } = await http.post(apiEndpoint + "/admin/resend");
  // return data;
}

export async function validateNonPhilOTP(obj) {
  // const IP = await publicIpv4();
  // obj.browserid = browser.version;
  obj.web = true;
  const drreqpob = helpers.encryptobj(obj);
  var { data: jwt } = await http.post(apiEndpoint + "/member/int_valotp", {
    enc: drreqpob,
  });

  // jwt = helpers.decrypt(jwt);

  // localStorage.setItem(tokenKey, helpers.encrypt(jwt));

  return jwt;
}

export async function updtkk() {
  const token = getJwtt();
  if (!token) {
    console.warn("No Token in header");
  }

  http.setJwt(getJwtt());
}

export function getJwtt() {
  return localStorage.getItem(tokenKey);
}
export async function updateJwt() {
  updtkk();
  // const drreqpob = helpers.encryptobj(obj);
  var { data: jwt } = await http.post(apiEndpoint + "/userget/gettoken");
  await setJwt(jwt);
  return jwt;
}
export async function checkLogin(obj, res) {
  http.setJwt(res);
  const drreqpob = helpers.encryptobj(obj);
  var { data } = await http.post(apiEndpoint + "/member/chklogin_web", {
    enc: drreqpob,
  });

  return helpers.decryptobj(data);
}

export async function setPin(obj, res) {
  http.setJwt(res);
  const drreqpob = helpers.encryptobj(obj);
  var { data } = await http.post(apiEndpoint + "/member/set4DigitPin", {
    enc: drreqpob,
  });

  return helpers.decryptobj(data);
}

export async function returnUrlSetPin(obj) {
  const drreqpob = helpers.encryptobj(obj);
  var { data } = await http.post(apiEndpoint + "/member/reset4DigitPin", {
    enc: drreqpob,
  });

  return helpers.decryptobj(data);
}

export async function loginwithJwt(jwt, pin) {
  localStorage.setItem(tokenKey, jwt);
  localStorage.setItem("google_key", helpers.encryptobj(pin));
  localStorage.setItem("screen", helpers.encryptobj("UnLocked"));
}

export async function saveobj(arry) {
  localStorage.setItem("obj", helpers.encryptobj(arry));
}

export async function getsaveobj() {
  const tt = localStorage.getItem("obj");
  if (tt) {
    return helpers.decryptobj(tt);
  } else {
    return [];
  }
}

export async function savebankobj(arry) {
  localStorage.setItem("bankobj", helpers.encryptobj(arry));
}

export async function getbanksaveobj() {
  const tt = localStorage.getItem("bankobj");
  if (tt) {
    return helpers.decryptobj(tt);
  } else {
    return [];
  }
}

export async function getplanssaveobj() {
  const tt = localStorage.getItem("planobj");
  if (tt) {
    return helpers.decryptobj(tt);
  } else {
    return [];
  }
}

export async function saveplanobj(arry) {
  localStorage.setItem("planobj", helpers.encryptobj(arry));
}

export async function setlockscreen(dat) {
  localStorage.setItem("screen", helpers.encryptobj(dat));
  // localStorage.setItem("screen", helpers.encryptobj(dat));
  return;
}

export function getlockscreen() {
  var lc = localStorage.getItem("screen");

  // var lc = localStorage.getItem("screen");
  if (lc) {
    return helpers.decryptobj(lc);
  } else {
    return null;
  }
}

export async function saveutiliesobj(arry) {
  localStorage.setItem("utilobj", helpers.encryptobj(arry));
}

export async function getutiliesobj() {
  const tt = localStorage.getItem("utilobj");
  if (tt) {
    return helpers.decryptobj(tt);
  } else {
    return [];
  }
}
export async function setJwt(jwt) {
  localStorage.setItem(tokenKey, jwt);
}

export async function saveImage(item) {
  localStorage.setItem("image", item);
}

export async function sendotp() {
  const { data } = await http.post(apiEndpoint + "/member/otpsupdate");
  return helpers.decryptobj(data);
}

export async function updtk() {
  const token = getJwt();
  if (!token) {
    console.warn("No Token in header");
  }
  http.setJwt(getJwt());
}

export async function getPinDcry() {
  const google_key = helpers.decryptobj(localStorage.getItem("google_key"));
  return google_key;
}

export async function setCountrem(no) {
  localStorage.setItem("remcount", helpers.encryptobj(no));

  return;
}

export async function getCountrem() {
  const gg = localStorage.getItem("remcount");
  if (gg) {
    const count = helpers.decryptobj(gg);
    return count;
  } else {
    return null;
  }
}
export async function ind_register(obj) {
  const IP = await publicIpv4();

  obj.current_access_ip = IP;
  const drreqpob = helpers.encryptobj(obj);
  var res = await http.post(apiEndpoint + "/member/inividual_register", {
    enc: drreqpob,
  });

  return res;
}
export async function register(obj) {
  const IP = await publicIpv4();

  obj.current_access_ip = IP;
  const drreqpob = helpers.encryptobj(obj);
  var res = await http.post(apiEndpoint + "/member/register", {
    enc: drreqpob,
  });

  return res;
}

export function logout(dispatch) {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem("google_key");
  localStorage.removeItem("IP");
  localStorage.removeItem("obj");
  localStorage.removeItem("remcount");
  localStorage.removeItem("randonid");
  localStorage.clear();
  dispatch({ type: LOGOUT });
  // window.location.href = "/";
}
(async () => {
  const IP = await publicIpv4();
  localStorage.setItem("IP", helpers.encrypt(IP));
})();

export function getCurrentUser() {
  try {
    const clientip = helpers.decrypt(localStorage.getItem("IP"));
    const tttre = localStorage.getItem(tokenKey);
    if (tttre) {
      const jwt = helpers.decrypt(tttre);

      const some = jwtDecode(jwt);
      if (
        some.exp >=
        Date.now() / 1000
        // &&
        // some.ip === clientip &&
        // some.browserid === browser.version
      ) {
        return some;
      } else {
        logout();
      }
    } else {
      return null;
    }
  } catch (ex) {
    return null;
  }
}

export function getJwt() {
  return helpers.decrypt(localStorage.getItem(tokenKey));
}
export async function savefcmtoken(fcm) {
  localStorage.setItem("fcm_token", fcm);
}
export function getfcmtoken(fcm) {
  return localStorage.getItem("fcm_token");
}

export async function savelocation(location) {
  localStorage.setItem("location", helpers.encryptobj(location));
}

export async function getlocation() {
  const tt = localStorage.getItem("location");
  if (tt) {
    return helpers.decryptobj(tt);
  } else {
    return null;
  }
}
export async function saverecentads(arry) {
  localStorage.setItem("recent", helpers.encryptobj(arry));
}

export async function getrecentads() {
  const tt = localStorage.getItem("recent");
  if (tt) {
    return helpers.decryptobj(tt);
  } else {
    return [];
  }
}
export async function replaceImage(error) {
  //replacement of broken Image
  return (error.target.src =
    "https://t3.ftcdn.net/jpg/00/36/94/26/240_F_36942622_9SUXpSuE5JlfxLFKB1jHu5Z07eVIWQ2W.jpg");
}

export function formatBalance(value, precision = 2) {
  const num = parseFloat(value || 0);
  if (Number.isNaN(num)) return "0.00";
  let number = num.toFixed(precision);
  return number;
}

export const getAllBanksList = async (setLoader, dispatch) => {
  setLoader(true);
  try {
    const res = await backEndCallNoEnc("/userget/get_netbanks");
    const netbanksArray = Object.values(res.net_banks || {}); // convert object to array

    await dispatch(getNetbanksRdx({ netbanksArray }));
  } catch (error) {
    console.error("Error fetching bank list:", error);
  } finally {
    setLoader(false);
  }
};

export const wallet_banks = async (net_banks) => {
  const fn = [
    "Alipay / Lazada Wallet",
    "DCPay / COINS.PH",
    "GrabPay Philippines",
    "G-Xchange / GCash",
    "PayMaya Philippines Inc",
    "PAYMONGO PAYMENTS  INC.",
    "ShopeePay Philippines Inc",
    "Starpay Corporation",
    "TAGCASH LTD. INC.",
    "TAYOCASH INC",
    "TONIK DIGITAL BANK  INC.",
    "UnionDigital Bank",
    "Zybi Tech Inc. / JuanCash",
    "TOKTOKWALLET INCORPORATED",
    "UNObank",
    "Tonik Bank",
    "PalawanPay",
    "Maya Bank  Inc.",
    "MAYA BANK  INC",
  ];

  const normalize = (str) =>
    str
      ?.replace(
        /[`~!@#$%^&*()_|+\-=?;:'",.<>×÷⋅°π©℗®™√€£¥¢✓•△¶∆\{\}\[\]\\\/]/gi,
        ""
      )
      .replace(/\s/g, "");

  return fn.map((walletName) => {
    const normalizedWalletName = normalize(walletName);

    // Find the matching bank in net_banks
    const matchedBank = net_banks.find(
      (bank) => normalize(bank.full_name) === normalizedWalletName
    );

    const full_name = walletName;
    const image = `https://img.topwallet.ph/bank_logos/${normalizedWalletName}.png`;
    const settlement_rail = matchedBank?.settlement_rail || null;
    const swift_bic = matchedBank?.swift_bic || null;

    return {
      full_name,
      image,
      settlement_rail,
      swift_bic,
    };
  });
};

export const getimgname = (item) => {
  var full_name = item?.full_name
    .replace(
      /[`~!@#$%^&*()_|+\-=?;:'",.<>×÷⋅°π©℗®™√€£¥¢✓•△¶∆\{\}\[\]\\\/]/gi,
      ""
    )
    .replace(/\s/g, "");
  return `https://img.topwallet.ph/bank_logos/${full_name}.png`;
};

export default {
  login,
  logout,
  getCurrentUser,
  getJwt,
  validateOTP,
  getlockscreen,
  setlockscreen,
  replaceImage,
};