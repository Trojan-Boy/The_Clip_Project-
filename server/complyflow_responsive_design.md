# ComplyFlow - Responsive Design Specifications

## Overview
Comprehensive responsive design specifications for the ComplyFlow platform across all device breakpoints. This document provides detailed guidelines for implementing responsive layouts, adaptive components, and mobile-first design patterns.

## 1. Responsive Breakpoint Strategy

### 1.1 Breakpoint Definitions
```css
/* Mobile-First Approach - Default styles are for mobile */
:root {
  /* Breakpoints */
  --breakpoint-sm: 640px;   /* Small tablets and large phones */
  --breakpoint-md: 768px;   /* Tablets in portrait */
  --breakpoint-lg: 1024px;  /* Tablets in landscape, small laptops */
  --breakpoint-xl: 1280px;  /* Desktop monitors */
  --breakpoint-2xl: 1536px; /* Large desktop monitors */
  
  /* Container Max Widths */
  --container-sm: 100%;
  --container-md: 720px;
  --container-lg: 960px;
  --container-xl: 1140px;
  --container-2xl: 1320px;
}
```

### 1.2 Mobile-First Implementation Pattern
```css
/* Base styles (mobile) */
.component {
  width: 100%;
  padding: var(--spacing-4);
}

/* Small tablets and up */
@media (min-width: var(--breakpoint-sm)) {
  .component {
    padding: var(--spacing-6);
  }
}

/* Tablets and up */
@media (min-width: var(--breakpoint-md)) {
  .component {
    max-width: var(--container-md);
    margin: 0 auto;
  }
}

/* Desktop and up */
@media (min-width: var(--breakpoint-lg)) {
  .component {
    max-width: var(--container-lg);
  }
}
```

## 2. Layout Grid System

### 2.1 Grid Configuration
```css
.grid {
  display: grid;
  gap: var(--spacing-6);
  grid-template-columns: repeat(1, 1fr); /* Mobile default */
}

@media (min-width: var(--breakpoint-sm)) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-4);
  }
}

@media (min-width: var(--breakpoint-md)) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-6);
  }
}

@media (min-width: var(--breakpoint-lg)) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
    gap: var(--spacing-8);
  }
}
```

### 2.2 Dashboard Layout Variations

#### Mobile (≤ 640px)
```
┌─────────────────────────────┐
│        Top Navigation       │
├─────────────────────────────┤
│   Compliance Score (100%)   │
├─────────────────────────────┤
│   Regulation Scores (100%)  │
│   [GDPR] [CCPA] [HIPAA]    │
├─────────────────────────────┤
│   Priority Tasks (100%)    │
│   ┌───────────────────┐    │
│   │ Task 1           │    │
│   └───────────────────┘    │
│   ┌───────────────────┐    │
│   │ Task 2           │    │
│   └───────────────────┘    │
├─────────────────────────────┤
│   Upcoming Deadlines (100%) │
│   ┌───────────────────┐    │
│   │ Deadline 1       │    │
│   └───────────────────┘    │
└─────────────────────────────┘
```

#### Tablet (641px - 1024px)
```
┌─────────────────────────────────────────────────┐
│            Top Navigation                       │
├─────────────────────────────────────────────────┤
│   Compliance Score (50%)   │ Regulation (50%)  │
│   ┌──────────────┐        │ ┌──────────────┐ │
│   │    85%       │        │ │GDPR:92%      │ │
│   │   Score      │        │ │CCPA:78%      │ │
│   │              │        │ │HIPAA:85%     │ │
│   └──────────────┘        │ └──────────────┘ │
├─────────────────────────────────────────────────┤
│         Priority Tasks (100%)                  │
│   ┌──────────────────┐ ┌──────────────────┐ │
│   │ Task 1          │ │ Task 2           │ │
│   └──────────────────┘ └──────────────────┘ │
│   ┌──────────────────┐ ┌──────────────────┐ │
│   │ Task 3          │ │ Task 4           │ │
│   └──────────────────┘ └──────────────────┘ │
├─────────────────────────────────────────────────┤
│      Upcoming Deadlines (100%)                │
│   ┌──────────────────┐ ┌──────────────────┐ │
│   │ Deadline 1      │ │ Deadline 2       │ │
│   └──────────────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────┘
```

#### Desktop (≥ 1025px)
```
┌─────────────────────────────────────────────────────────────────────┐
│                         Top Navigation                              │
├─────────────────────────────────────────────────────────────────────┤
│ Sidebar │ Compliance Score (33%) │ Regulation (33%) │ Tasks (33%) │
│         ├────────────────────────┼──────────────────┼─────────────┤
│         │       ┌──────┐         │ ┌──────────────┐ │ ┌─────────┐ │
│         │       │ 85%  │         │ │GDPR:92%      │ │ │Task 1   │ │
│         │       │      │         │ │CCPA:78%      │ │ │Due:2d   │ │
│         │       └──────┘         │ │HIPAA:85%     │ │ └─────────┘ │
│         ├────────────────────────┼──────────────────┼─────────────┤
│         │                        │                  │ ┌─────────┐ │
│         │                        │                  │ │Task 2   │ │
│         │                        │                  │ │Due:1w   │ │
│         │                        │                  │ └─────────┘ │
├─────────┼────────────────────────┼──────────────────┼─────────────┤
│         │      Upcoming Deadlines (66%)             │ Quick Actions│
│         │   ┌──────────────────┐ ┌──────────────────┐ │ ┌───────┐ │
│         │   │ Deadline 1      │ │ Deadline 2       │ │ │Upload │ │
│         │   └──────────────────┘ └──────────────────┘ │ └───────┘ │
└─────────┴──────────────────────────────────────────────┴───────────┘
```

## 3. Component Responsive Behavior

### 3.1 Navigation Components

#### Top Navigation Bar
```css
/* Mobile */
.navbar {
  height: 56px;
  padding: 0 var(--spacing-4);
  flex-direction: row;
  justify-content: space-between;
}

.navbar-logo {
  font-size: var(--font-size-lg);
}

.navbar-menu {
  display: none; /* Hidden on mobile */
}

.navbar-hamburger {
  display: block;
}

/* Tablet */
@media (min-width: var(--breakpoint-md)) {
  .navbar {
    height: 64px;
    padding: 0 var(--spacing-6);
  }
  
  .navbar-menu {
    display: flex;
    gap: var(--spacing-4);
  }
  
  .navbar-hamburger {
    display: none;
  }
}

/* Desktop */
@media (min-width: var(--breakpoint-lg)) {
  .navbar {
    height: 72px;
    padding: 0 var(--spacing-8);
  }
  
  .navbar-menu {
    gap: var(--spacing-6);
  }
}
```

#### Sidebar Navigation
```css
/* Mobile - Bottom Sheet */
.sidebar-mobile {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60vh;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

.sidebar-mobile.open {
  transform: translateY(0);
}

/* Tablet - Slide-out Panel */
@media (min-width: var(--breakpoint-md)) {
  .sidebar-tablet {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 240px;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }
  
  .sidebar-tablet.open {
    transform: translateX(0);
  }
}

/* Desktop - Persistent */
@media (min-width: var(--breakpoint-lg)) {
  .sidebar-desktop {
    position: fixed;
    top: 72px; /* Below navbar */
    left: 0;
    bottom: 0;
    width: 280px;
    transform: none;
  }
  
  .main-content {
    margin-left: 280px;
  }
}
```

### 3.2 Data Display Components

#### Data Tables
```css
/* Mobile - Card Layout */
.table-mobile {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.table-row-mobile {
  display: flex;
  flex-direction: column;
  padding: var(--spacing-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

/* Tablet - Hybrid */
@media (min-width: var(--breakpoint-md)) {
  .table-tablet {
    display: table;
    width: 100%;
    border-collapse: collapse;
  }
  
  .table-row-tablet {
    display: table-row;
  }
  
  .table-cell-tablet {
    display: table-cell;
    padding: var(--spacing-3);
    vertical-align: middle;
  }
}

/* Desktop - Full Table */
@media (min-width: var(--breakpoint-lg)) {
  .table-desktop {
    display: table;
    width: 100%;
  }
  
  .table-desktop thead {
    display: table-header-group;
  }
  
  .table-desktop tbody {
    display: table-row-group;
  }
}
```

#### Cards
```css
/* Base Card */
.card {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
}

/* Mobile Card */
@media (max-width: var(--breakpoint-sm)) {
  .card {
    margin: 0 var(--spacing-4) var(--spacing-4);
    padding: var(--spacing-4);
  }
}

/* Desktop Card */
@media (min-width: var(--breakpoint-lg)) {
  .card {
    margin: 0;
    padding: var(--spacing-6);
  }
}
```

## 4. Touch & Mobile Interactions

### 4.1 Touch Target Sizes
```css
/* Minimum touch target size */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  padding: var(--spacing-2) var(--spacing-4);
}

/* Spacing between touch targets */
.touch-spacing {
  margin: var(--spacing-2);
}

/* Touch feedback */
.touch-feedback:active {
  opacity: 0.7;
  transform: scale(0.98);
}
```

### 4.2 Gesture Support
```javascript
// Swipe gestures for mobile
const SWIPE_THRESHOLD = 50; // pixels
const SWIPE_VELOCITY = 0.3; // pixels per millisecond

class SwipeHandler {
  constructor(element, onSwipeLeft, onSwipeRight) {
    this.element = element;
    this.onSwipeLeft = onSwipeLeft;
    this.onSwipeRight = onSwipeRight;
    this.startX = 0;
    this.startTime = 0;
    
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }
  
  handleTouchStart(event) {
    this.startX = event.touches[0].clientX;
    this.startTime = Date.now();
  }
  
  handleTouchEnd(event) {
    const endX = event.changedTouches[0].clientX;
    const endTime = Date.now();
    const distance = endX - this.startX;
    const duration = endTime - this.startTime;
    const velocity = Math.abs(distance) / duration;
    
    if (Math.abs(distance) > SWIPE_THRESHOLD && velocity > SWIPE_VELOCITY) {
      if (distance > 0) {
        this.onSwipeRight();
      } else {
        this.onSwipeLeft();
      }
    }
  }
}
```

### 4.3 Mobile-Specific Interactions

#### Pull-to-Refresh
```css
/* Pull-to-refresh indicator */
.pull-to-refresh {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(-60px);
  transition: opacity 0.2s, transform 0.2s;
}

.pull-to-refresh.active {
  opacity: 1;
  transform: translateY(0);
}

.pull-to-refresh.refreshing {
  transform: translateY(20px);
}
```

#### Bottom Sheet
```css
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  box-shadow: var(--shadow-xl);
  transform: translateY(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
}

.bottom-sheet.open {
  transform: translateY(0);
}

.bottom-sheet-handle {
  width: 40px;
  height: 4px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  margin: var(--spacing-3) auto;
}
```

## 5. Performance Optimizations

### 5.1 Image Optimization
```html
/* Responsive Images */
