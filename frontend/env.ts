const { VITE_API_ENDPOINT, WEB_ORIGIN } = {
  // above is the default. if node doesn't have access to the env, the default will be used.
  VITE_API_ENDPOINT: "https://mayfest-rplace.onrender.com/",
  WEB_ORIGIN: "https://mayfest-rplace.onrender.com/",
  ...import.meta.env,
};
console.log(VITE_API_ENDPOINT);

export { VITE_API_ENDPOINT, WEB_ORIGIN };
