import axios from 'axios'
import setAuthTokenRefreshInterceptor from '../lib/axios'

const instance = axios.create({
  baseURL: 'https://swapi.dev/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// add request interceptor
instance.interceptors.request.use(function(config) {
  console.log('before sending request')
  return config
}, function(err) {
  return Promise.reject(err)
})

setAuthTokenRefreshInterceptor(
  instance,
  () => Promise.resolve(),
  {}
);

export default instance
