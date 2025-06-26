<script setup>
defineProps({
  msg: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <div class="hero">
    <div class="container">
      <div class="hero-content fade-in">
        <h1 class="hero-title">{{ msg }}</h1>
        <p class="hero-subtitle">
          Build modern, scalable applications with Vue.js and professional UI design
        </p>
        <div class="hero-cta">
          <button class="btn btn-primary btn-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z"/>
              <path d="M12 22V12"/>
              <path d="M22 7L12 12L2 7"/>
            </svg>
            Get Started
          </button>
          <button class="btn btn-secondary btn-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6A2 2 0 0 0 4 4V20A2 2 0 0 0 6 22H18A2 2 0 0 0 20 20V8Z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            Documentation
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Enhanced Button Styles */
.btn-lg {
  padding: var(--space-lg) var(--space-2xl);
  font-size: var(--text-lg);
  font-weight: 600;
  font-variation-settings: 'wght' 600;
  border-radius: var(--radius-lg);
  min-width: 200px;
  position: relative;
  overflow: hidden;
  transition: all var(--transition-normal);
}

.btn-lg:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-2xl);
}

.btn-lg:active {
  transform: translateY(-1px);
}

/* Enhanced Hero Title with Animated Gradient */
.hero-title {
  background: linear-gradient(135deg, 
    #ffffff 0%, 
    rgba(255, 255, 255, 0.9) 25%,
    #ffffff 50%,
    rgba(255, 255, 255, 0.8) 75%,
    #ffffff 100%);
  background-size: 400% 400%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradientShift 8s ease-in-out infinite;
  text-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  position: relative;
}

.hero-title::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%);
  background-size: 200% 200%;
  animation: shine 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes gradientShift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes shine {
  0%, 100% {
    background-position: -200% -200%;
  }
  50% {
    background-position: 200% 200%;
  }
}

/* Hero Subtitle Enhancement */
.hero-subtitle {
  max-width: 700px;
  margin: 0 auto var(--space-3xl);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  line-height: var(--leading-relaxed);
}

/* Enhanced Button Interactions */
.btn svg {
  transition: all var(--transition-normal);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.btn:hover svg {
  transform: translateY(-2px) scale(1.1);
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.btn-primary svg {
  filter: drop-shadow(0 2px 4px rgba(255, 255, 255, 0.3));
}

.btn-secondary svg {
  color: var(--primary-600);
}

.btn-secondary:hover svg {
  color: var(--primary-700);
}

/* Fade-in Animation Enhancement */
.fade-in {
  animation: heroFadeIn 1.2s cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes heroFadeIn {
  0% {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Enhanced CTA Section */
.hero-cta .btn:nth-child(1) {
  animation-delay: 0.3s;
}

.hero-cta .btn:nth-child(2) {
  animation-delay: 0.5s;
}

/* Pulse effect for primary button */
.btn-primary {
  position: relative;
}

.btn-primary::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: var(--gradient-primary);
  border-radius: inherit;
  opacity: 0;
  transition: opacity var(--transition-normal);
  z-index: -1;
}

.btn-primary:hover::before {
  opacity: 0.7;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.4;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .btn-lg {
    min-width: 180px;
    padding: var(--space-md) var(--space-xl);
    font-size: var(--text-base);
  }
  
  .hero-cta {
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
  }
}

@media (max-width: 480px) {
  .btn-lg {
    min-width: 160px;
    padding: var(--space-sm) var(--space-lg);
  }
}
</style>
