/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./clean-room/new-frontend/index.html",
    "./clean-room/new-frontend/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Warm gradient color palette - 温暖渐变色系
        claude: {
          // Light mode colors - 保持原有的优秀基础色
          bg: '#FDFCFB',              // Warmer white background
          surface: '#FFFFFF',          // Cards, inputs
          surfaceHover: '#F8F6F3',     // Warmer hover state
          surfaceMuted: '#F5F3F0',     // Subtle area distinction
          surfaceInset: '#F0EDE8',     // Inset areas (e.g., input inner)
          border: '#E8E3DD',           // Warmer border
          borderLight: '#F0EBE5',      // Subtle dividers
          text: '#2C2C2C',             // Primary text, warm black
          textSecondary: '#7A756E',    // Secondary text, warm gray
          // Dark mode colors - 保持暗色模式完整性
          darkBg: '#1A1611',           // Warmer dark background
          darkSurface: '#24201B',      // Warmer dark cards
          darkSurfaceHover: '#2E2A25', // Warmer dark hover
          darkSurfaceMuted: '#201D18', // Subtle dark area
          darkSurfaceInset: '#181510', // Dark inset areas
          darkBorder: '#34302B',       // Warmer dark borders
          darkBorderLight: '#2A2621',  // Subtle dark dividers
          darkText: '#F2F0EB',         // Warmer dark primary text
          darkTextSecondary: '#A09B94', // Warmer dark secondary text
          // Accent - 温暖紫橙渐变系替代蓝色
          accent: '#A78BFA',           // Warm purple primary
          accentHover: '#8B5CF6',      // Purple hover
          accentLight: '#C4B5FD',      // Light purple for badges
          accentMuted: 'rgba(167, 139, 250, 0.10)', // Faint purple background
          // Gradient accents - 渐变色系
          gradient: {
            primary: 'linear-gradient(135deg, #A78BFA 0%, #F59E0B 100%)',     // Purple to Orange
            secondary: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)',   // Orange gradient
            tertiary: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',    // Purple gradient
            warm: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',        // Warm orange to red
            soft: 'linear-gradient(135deg, #C4B5FD 0%, #FDE68A 100%)',         // Soft purple to yellow
          }
        },
        primary: {
          DEFAULT: '#A78BFA',  // Warm purple
          dark: '#8B5CF6'
        },
        secondary: {
          DEFAULT: '#F59E0B',  // Warm amber
          dark: '#F97316'
        },
        // Clay colors - 粘土色系 (enhanced)
        clay: {
          soft: '#E0B8A8',
          warm: '#D4A894', 
          muted: '#C59A88',
          light: '#F3E5D8',
          medium: '#E6D5C7',
        },
        // Pearl colors - 珍珠白色系 (enhanced)
        pearl: {
          50: '#FEFDFB',
          100: '#FCFAF7',
          150: '#F9F6F2',
          200: '#F5F1EC',
          300: '#EBE6DF',
          400: '#DDD8D0',
          500: '#CDC8C0',
        },
        // Amber/Orange gradient system - 琥珀橙渐变系统
        gradient: {
          warm: {
            50: '#FFFBEB',
            100: '#FEF3C7',
            200: '#FDE68A',
            300: '#FCD34D',
            400: '#F59E0B',
            500: '#F97316',
            600: '#EA580C',
            700: '#C2410C',
            800: '#9A3412',
            900: '#7C2D12',
          },
          purple: {
            50: '#F5F3FF',
            100: '#EDE9FE',
            200: '#DDD6FE',
            300: '#C4B5FD',
            400: '#A78BFA',
            500: '#8B5CF6',
            600: '#7C3AED',
            700: '#6D28D9',
            800: '#5B21B6',
            900: '#4C1D95',
          }
        },
        // Brand gradient colors - 品牌渐变色 (replacing blue)
        brand: {
          gradient: {
            5: 'rgba(167, 139, 250, 0.05)',
            10: 'rgba(167, 139, 250, 0.1)',
            15: 'rgba(167, 139, 250, 0.15)',
            20: 'rgba(167, 139, 250, 0.2)',
            30: 'rgba(167, 139, 250, 0.3)',
            40: 'rgba(167, 139, 250, 0.4)',
            50: 'rgba(167, 139, 250, 0.5)',
            DEFAULT: '#A78BFA',
            hover: '#8B5CF6',
          }
        }
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(0,0,0,0.05)',
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        elevated: '0 4px 12px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.04)',
        modal: '0 8px 30px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
        popover: '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.05)',
        'glow-accent': '0 0 20px rgba(59,130,246,0.15)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.25s ease-out',
        'fade-in-down': 'fade-in-down 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        shimmer: 'shimmer 1.5s infinite',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#1A1D23',
            a: {
              color: '#3B82F6',
              '&:hover': {
                color: '#2563EB',
              },
            },
            code: {
              color: '#1A1D23',
              backgroundColor: 'rgba(224, 226, 231, 0.5)',
              padding: '0.2em 0.4em',
              borderRadius: '0.25rem',
              fontWeight: '400',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            pre: {
              backgroundColor: '#F0F1F4',
              color: '#1A1D23',
              padding: '1em',
              borderRadius: '0.75rem',
              overflowX: 'auto',
            },
            blockquote: {
              borderLeftColor: '#3B82F6',
              color: '#6B7280',
            },
            h1: {
              color: '#1A1D23',
            },
            h2: {
              color: '#1A1D23',
            },
            h3: {
              color: '#1A1D23',
            },
            h4: {
              color: '#1A1D23',
            },
            strong: {
              color: '#1A1D23',
            },
          },
        },
        dark: {
          css: {
            color: '#E4E5E9',
            a: {
              color: '#60A5FA',
              '&:hover': {
                color: '#93BBFD',
              },
            },
            code: {
              color: '#E4E5E9',
              backgroundColor: 'rgba(42, 46, 56, 0.5)',
              padding: '0.2em 0.4em',
              borderRadius: '0.25rem',
              fontWeight: '400',
            },
            pre: {
              backgroundColor: '#1A1D27',
              color: '#E4E5E9',
              padding: '1em',
              borderRadius: '0.75rem',
              overflowX: 'auto',
            },
            blockquote: {
              borderLeftColor: '#3B82F6',
              color: '#8B8FA3',
            },
            h1: {
              color: '#E4E5E9',
            },
            h2: {
              color: '#E4E5E9',
            },
            h3: {
              color: '#E4E5E9',
            },
            h4: {
              color: '#E4E5E9',
            },
            strong: {
              color: '#E4E5E9',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
