
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: [
					'Poppins',
					'ui-sans-serif',
					'system-ui',
					'sans-serif',
				],
			},
			fontSize: {
				'vms-xs': ['12px', { lineHeight: '1.5' }],
				'vms-sm': ['14px', { lineHeight: '1.5' }],
				'vms-base': ['16px', { lineHeight: '1.5' }],
				'vms-xl': ['24px', { lineHeight: '1.35' }],
				'vms-3xl': ['36px', { lineHeight: '1.25' }],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Excel-inspired colors
				excel: {
					orange: '#F25C05',
					darkOrange: '#D44A00',
					lightOrange: '#FFD0B5',
					darkGray: '#323130',
					mediumGray: '#605E5C',
					lightGray: '#F3F2F1',
					white: '#FFFFFF',
					ribbon: '#F3F2F1',
					selected: '#EDEBE9',
					hover: '#F3F2F1'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'vms-lg': '24px',
				'vms-xl': '32px',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'caret-blink': {
					'0%, 70%, 100%': { opacity: '1' },
					'20%, 50%': { opacity: '0' },
				},
				'vms-fade-in-up': {
					from: { opacity: '0', transform: 'translateY(12px)' },
					to: { opacity: '1', transform: 'translateY(0)' },
				},
				'vms-pulse-dot': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.45' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'caret-blink': 'caret-blink 1.25s ease-out infinite',
				'vms-fade-in-up': 'vms-fade-in-up 0.45s cubic-bezier(0.4, 0, 0.2, 1) both',
				'vms-pulse': 'vms-pulse-dot 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
