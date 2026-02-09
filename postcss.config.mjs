const config = {
  plugins: {
    "@tailwindcss/postcss": {
      // Only scan src folder, not public/sec
      base: "./src",
    },
  },
};

export default config;
