/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Our School Design Palette
        primary: "#4F46E5",   // Indigo (Buttons, Sidebar)
        secondary: "#6B7280", // Gray (Subtitles)
        success: "#10B981",   // Green (Present, Paid)
        danger: "#EF4444",    // Red (Absent, Late, Errors)
        warning: "#F59E0B",   // Amber (Pending, Alerts)
        background: "#F9FAFB", // Light Gray (App Background)
      },
      // Ensuring mobile-first responsiveness
      screens: {
        'sm': '640px',   // Mobile large
        'md': '768px',   // Tablets
        'lg': '1024px',  // Laptops
        'xl': '1280px',  // Desktops
      },
    },
  },
  plugins: [],
}