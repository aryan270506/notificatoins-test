import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://10.100.146.86:5001/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;