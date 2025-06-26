<template>
  <div class="theme-showcase">
    <!-- Navigation Bar -->
    <nav class="navbar">
      <div class="container navbar-content">
        <div class="navbar-brand">VueTheme</div>
        <ul class="navbar-nav">
          <li><a href="#home">Home</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </div>
    </nav>

    <!-- Features Grid -->
    <section class="features">
      <div class="container">
        <h2 class="section-title fade-in">Modern Components</h2>
        <div class="features-grid">
          <!-- Button Variants -->
          <div class="feature-card slide-up">
            <div class="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z"/>
              </svg>
            </div>
            <h3 class="feature-title">Enhanced Buttons</h3>
            <p class="feature-description">Beautiful button variants with hover effects and animations</p>
            <div class="btn-showcase">
              <button class="btn btn-primary">Primary</button>
              <button class="btn btn-secondary">Secondary</button>
              <button class="btn btn-gradient">Gradient</button>
            </div>
          </div>

          <!-- Cards -->
          <div class="feature-card slide-up">
            <div class="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"/>
              </svg>
            </div>
            <h3 class="feature-title">Modern Cards</h3>
            <p class="feature-description">Elegant card components with glass morphism effects</p>
            <div class="card-mini card-glass">
              <div class="card-body">
                <p>Glass morphism card</p>
              </div>
            </div>
          </div>

          <!-- Form Elements -->
          <div class="feature-card slide-up">
            <div class="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19Z"/>
              </svg>
            </div>
            <h3 class="feature-title">Smart Forms</h3>
            <p class="feature-description">Interactive form elements with floating labels</p>
            <div class="form-demo">
              <div class="form-floating">
                <input type="text" id="demo-input" placeholder=" " class="form-input">
                <label for="demo-input">Floating Label</label>
              </div>
            </div>
          </div>

          <!-- Loading States -->
          <div class="feature-card slide-up">
            <div class="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
              </svg>
            </div>
            <h3 class="feature-title">Loading States</h3>
            <p class="feature-description">Elegant loading animations and skeleton screens</p>
            <div class="loading-demo">
              <div class="spinner spinner-sm"></div>
              <div class="skeleton" style="height: 20px; margin-top: 8px;"></div>
            </div>
          </div>

          <!-- Status Indicators -->
          <div class="feature-card slide-up">
            <div class="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2Z"/>
              </svg>
            </div>
            <h3 class="feature-title">Status System</h3>
            <p class="feature-description">Clear status indicators and notifications</p>
            <div class="status-demo">
              <span class="status-indicator status-online">Online</span>
              <span class="badge badge-success">Active</span>
            </div>
          </div>

          <!-- Interactive Elements -->
          <div class="feature-card slide-up">
            <div class="feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2C13.1,2 14,2.9 14,4C14,5.1 13.1,6 12,6C10.9,6 10,5.1 10,4C10,2.9 10.9,2 12,2Z"/>
              </svg>
            </div>
            <h3 class="feature-title">Micro-interactions</h3>
            <p class="feature-description">Smooth animations and hover effects throughout</p>
            <div class="interaction-demo">
              <button class="btn btn-outline-gradient tooltip" data-tooltip="Hover me!">
                Interactive Button
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="stats">
      <div class="container">
        <div class="stats-grid">
          <div class="stat-item bounce-in">
            <div class="stat-number">{{ animatedStats.components }}</div>
            <div class="stat-label">Components</div>
          </div>
          <div class="stat-item bounce-in">
            <div class="stat-number">{{ animatedStats.animations }}</div>
            <div class="stat-label">Animations</div>
          </div>
          <div class="stat-item bounce-in">
            <div class="stat-number">{{ animatedStats.colors }}</div>
            <div class="stat-label">Color Variants</div>
          </div>
          <div class="stat-item bounce-in">
            <div class="stat-number">{{ animatedStats.utilities }}</div>
            <div class="stat-label">Utilities</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Interactive Demo Table -->
    <section class="demo-section">
      <div class="container">
        <h2 class="section-title">Interactive Data Table</h2>
        <div class="user-table">
          <table class="table table-modern">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Role</th>
                <th>Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in demoUsers" :key="user.id">
                <td>{{ user.name }}</td>
                <td>
                  <span :class="`status-indicator status-${user.status}`">
                    {{ user.status }}
                  </span>
                </td>
                <td>
                  <span :class="`badge badge-${user.roleBadge}`">
                    {{ user.role }}
                  </span>
                </td>
                <td>
                  <div class="progress">
                    <div class="progress-bar" :style="`width: ${user.progress}%`"></div>
                  </div>
                </td>
                <td>
                  <button class="btn btn-ghost btn-sm">Edit</button>
                  <button class="btn btn-ghost btn-sm">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Floating Action Button -->
    <button class="fab tooltip" data-tooltip="Back to top" @click="scrollToTop">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z"/>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// Animated statistics
const animatedStats = ref({
  components: 0,
  animations: 0,
  colors: 0,
  utilities: 0
})

const finalStats = {
  components: 25,
  animations: 15,
  colors: 50,
  utilities: 100
}

// Demo users data
const demoUsers = ref([
  {
    id: 1,
    name: 'Alice Johnson',
    status: 'online',
    role: 'Admin',
    roleBadge: 'primary',
    progress: 85
  },
  {
    id: 2,
    name: 'Bob Smith',
    status: 'away',
    role: 'User',
    roleBadge: 'secondary',
    progress: 65
  },
  {
    id: 3,
    name: 'Carol Wilson',
    status: 'online',
    role: 'Moderator',
    roleBadge: 'success',
    progress: 92
  },
  {
    id: 4,
    name: 'David Brown',
    status: 'offline',
    role: 'User',
    roleBadge: 'secondary',
    progress: 45
  }
])

// Animate stats on mount
onMounted(() => {
  setTimeout(() => {
    Object.keys(finalStats).forEach(key => {
      animateNumber(key, finalStats[key])
    })
  }, 500)
})

const animateNumber = (key, target) => {
  const duration = 2000
  const steps = 60
  const increment = target / steps
  let current = 0
  
  const timer = setInterval(() => {
    current += increment
    if (current >= target) {
      animatedStats.value[key] = target
      clearInterval(timer)
    } else {
      animatedStats.value[key] = Math.floor(current)
    }
  }, duration / steps)
}

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}
</script>

<style scoped>
.theme-showcase {
  min-height: 100vh;
}

.section-title {
  text-align: center;
  font-size: var(--text-3xl);
  font-weight: 700;
  font-variation-settings: 'wght' 700;
  margin-bottom: var(--space-3xl);
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-showcase {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-md);
  flex-wrap: wrap;
}

.card-mini {
  margin-top: var(--space-md);
  padding: var(--space-md);
  font-size: var(--text-sm);
}

.form-demo {
  margin-top: var(--space-md);
}

.loading-demo {
  margin-top: var(--space-md);
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-direction: column;
}

.status-demo {
  margin-top: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.interaction-demo {
  margin-top: var(--space-md);
}

.demo-section {
  padding: var(--space-3xl) 0;
  background: var(--background-secondary);
}

.btn-sm {
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--text-xs);
}

/* Animation delays for staggered effects */
.feature-card:nth-child(1) { animation-delay: 0.1s; }
.feature-card:nth-child(2) { animation-delay: 0.2s; }
.feature-card:nth-child(3) { animation-delay: 0.3s; }
.feature-card:nth-child(4) { animation-delay: 0.4s; }
.feature-card:nth-child(5) { animation-delay: 0.5s; }
.feature-card:nth-child(6) { animation-delay: 0.6s; }

.stat-item:nth-child(1) { animation-delay: 0.2s; }
.stat-item:nth-child(2) { animation-delay: 0.4s; }
.stat-item:nth-child(3) { animation-delay: 0.6s; }
.stat-item:nth-child(4) { animation-delay: 0.8s; }

/* Responsive adjustments */
@media (max-width: 768px) {
  .btn-showcase {
    flex-direction: column;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
