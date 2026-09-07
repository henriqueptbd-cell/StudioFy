/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                tenant: {
                    primary: 'var(--primary-color, #15803d)',
                    secondary: 'var(--secondary-color, #1e293b)',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
