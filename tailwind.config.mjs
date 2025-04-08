/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				// Cyberpunk neon colors
				'cyber-blue': '#00F0FF',
				'cyber-pink': '#FF00A0',
				'cyber-yellow': '#FFF500',
				'cyber-green': '#00FF41',
				'cyber-orange': '#FF5E00',
				'cyber-purple': '#BD00FF',
				// Light mode colors
				'light-bg': '#F0F2F5',
				'light-card': '#FFFFFF',
				'light-text': '#1A1A2E',
				// Dark mode colors
				'dark-bg': '#0D0D1A',
				'dark-card': '#121425',
				'dark-text': '#E6E6FA',
			},
			fontFamily: {
				'cyber': ['"Rajdhani"', '"Orbitron"', 'sans-serif'],
				'cyber-mono': ['"Share Tech Mono"', 'monospace'],
				'display': ['"Michroma"', 'sans-serif'],
			},
			boxShadow: {
				'cyber': '0 0 10px rgba(0, 240, 255, 0.7)',
				'cyber-pink': '0 0 10px rgba(255, 0, 160, 0.7)',
				'cyber-yellow': '0 0 10px rgba(255, 245, 0, 0.7)',
			},
			animation: {
				'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
				'glitch': 'glitch 1s linear infinite',
				'scan-line': 'scanLine 2s linear infinite',
			},
			keyframes: {
				glitch: {
					'0%': { transform: 'translateX(0)' },
					'2%': { transform: 'translateX(3px)' },
					'4%': { transform: 'translateX(-3px)' },
					'6%': { transform: 'translateX(3px)' },
					'8%': { transform: 'translateX(-3px)' },
					'10%': { transform: 'translateX(0)' },
				},
				scanLine: {
					'0%': { top: '0%' },
					'100%': { top: '100%' },
				},
			},
			backgroundImage: {
				'cyber-grid': 'linear-gradient(0deg, rgba(6, 6, 25, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 6, 25, 0.2) 1px, transparent 1px)',
			},
			backgroundSize: {
				'cyber-grid': '20px 20px',
			},
		},
	},
	plugins: [],
}
