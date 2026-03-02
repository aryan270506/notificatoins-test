import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://192.168.137.118:5001/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;