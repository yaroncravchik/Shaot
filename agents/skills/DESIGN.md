---
version: alpha
name: Israeli Ministry of Transport - Vehicle License Portal
description: >-
  A civic-digital payment portal for Israeli vehicle licensing, combining governmental authority with accessible form
  design. The aesthetic is 'Civic Clarity'—a blend of institutional trust (deep blue headers, structured layouts) with
  modern accessibility (light backgrounds, clear typography, high contrast).
logo:
  src: https://ecom.gov.il/voucherspa/input/favicon.ico
colors:
  surface: '#f5f8fa'
  surface-dim: '#eaeaea'
  surface-bright: '#ffffff'
  surface-container-lowest: '#f4f4f4'
  surface-container-low: '#f8f9fa'
  surface-container: '#ffffff'
  surface-container-high: '#f0f9fa'
  surface-container-highest: '#e9ecef'
  on-surface: '#0c3058'
  on-surface-variant: '#6c757d'
  inverse-surface: '#212529'
  inverse-on-surface: '#f8f9fa'
  outline: '#dee2e6'
  outline-variant: '#c8c8c8'
  surface-tint: '#007bff'
  primary: '#007bff'
  on-primary: '#ffffff'
  primary-container: '#8dcdff'
  on-primary-container: '#003d7a'
  inverse-primary: '#5dade2'
  secondary: '#6c757d'
  on-secondary: '#ffffff'
  secondary-container: '#dee2e6'
  on-secondary-container: '#212529'
  tertiary: '#007ad9'
  on-tertiary: '#ffffff'
  tertiary-container: '#8dcdff'
  on-tertiary-container: '#003d7a'
  error: '#dc3545'
  on-error: '#ffffff'
  error-container: '#f8d7da'
  on-error-container: '#721c24'
  primary-fixed: '#8dcdff'
  primary-fixed-dim: '#5dade2'
  on-primary-fixed: '#003d7a'
  on-primary-fixed-variant: '#007bff'
  secondary-fixed: '#dee2e6'
  secondary-fixed-dim: '#c8c8c8'
  on-secondary-fixed: '#212529'
  on-secondary-fixed-variant: '#6c757d'
  tertiary-fixed: '#8dcdff'
  tertiary-fixed-dim: '#5dade2'
  on-tertiary-fixed: '#003d7a'
  on-tertiary-fixed-variant: '#007ad9'
  background: '#f5f8fa'
  on-background: '#0c3058'
  surface-variant: '#dee2e6'
typography:
  display:
    fontFamily: Rubik
    fontSize: 60px
    fontWeight: '700'
    lineHeight: 68px
    letterSpacing: '-0.02em'
  headline-lg:
    fontFamily: Rubik
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: '-0.01em'
  headline-md:
    fontFamily: Rubik
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: 0em
  title-lg:
    fontFamily: Rubik
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: 0em
  body-lg:
    fontFamily: Rubik
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0em
  body-md:
    fontFamily: Rubik
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  label-md:
    fontFamily: Rubik
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Rubik
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  container-max: 1140px
elevation:
  sm: 0 1px 2px rgba(0, 0, 0, 0.06)
  md: 0 3px 8px rgba(0, 0, 0, 0.15)
  lg: 0 8px 24px rgba(0, 0, 0, 0.12)
layout:
  containerMaxWidth: 1140px
  gridColumns: 12
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.label-md}'
    rounded: '{rounded.lg}'
    padding: 12px 24px
    height: 48px
    border: none
    boxShadow: '{elevation.md}'
  button-primary-hover:
    backgroundColor: '#0056b3'
    textColor: '{colors.on-primary}'
    transition: background-color 200ms ease-in-out
  button-primary-focus:
    backgroundColor: '{colors.primary}'
    boxShadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25)
  button-secondary:
    backgroundColor: transparent
    textColor: '{colors.primary}'
    typography: '{typography.label-md}'
    rounded: '{rounded.lg}'
    padding: 12px 24px
    height: 48px
    border: 1px solid {colors.outline}
    boxShadow: none
  button-secondary-hover:
    backgroundColor: '{colors.surface-container-high}'
    textColor: '{colors.primary}'
    transition: background-color 200ms ease-in-out
  input-field:
    backgroundColor: '{colors.surface-container}'
    textColor: '{colors.on-surface}'
    typography: '{typography.body-md}'
    rounded: '{rounded.md}'
    padding: 12px 16px
    height: 40px
    border: 1px solid {colors.outline}
    boxShadow: none
  input-field-focus:
    backgroundColor: '{colors.surface-container}'
    border: 1px solid {colors.primary}
    boxShadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25)
    transition: border-color 150ms ease-in-out, box-shadow 150ms ease-in-out
  input-field-error:
    backgroundColor: '{colors.surface-container}'
    border: 1px solid {colors.error}
    boxShadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25)
  select-dropdown:
    backgroundColor: '{colors.surface-container}'
    textColor: '{colors.on-surface}'
    typography: '{typography.body-md}'
    rounded: '{rounded.md}'
    padding: 12px 16px
    height: 40px
    border: 1px solid {colors.outline}
    boxShadow: '{elevation.sm}'
  select-dropdown-panel:
    backgroundColor: '{colors.surface-container}'
    border: 1px solid {colors.outline}
    borderRadius: '{rounded.md}'
    boxShadow: '{elevation.md}'
    maxHeight: 300px
    overflow: auto
  select-option:
    padding: 6px 12px
    lineHeight: '1.5'
    cursor: pointer
  select-option-hover:
    backgroundColor: '{colors.surface-container-high}'
    textColor: '{colors.primary}'
  select-option-selected:
    backgroundColor: '{colors.surface-container-highest}'
    textColor: '{colors.on-surface}'
  card:
    backgroundColor: '{colors.surface-container}'
    rounded: '{rounded.lg}'
    padding: '{spacing.md}'
    border: 1px solid {colors.outline}
    boxShadow: '{elevation.sm}'
  card-hover:
    backgroundColor: '{colors.surface-container-high}'
    boxShadow: '{elevation.md}'
    transition: background-color 200ms ease-in-out, box-shadow 200ms ease-in-out
  step-indicator-active:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    borderRadius: 50%
    width: 40px
    height: 40px
    display: flex
    alignItems: center
    justifyContent: center
    typography: '{typography.label-md}'
  step-indicator-inactive:
    backgroundColor: '{colors.surface-container}'
    textColor: '{colors.on-surface-variant}'
    border: 2px solid {colors.outline}
    borderRadius: 50%
    width: 40px
    height: 40px
    display: flex
    alignItems: center
    justifyContent: center
    typography: '{typography.label-md}'
  label:
    typography: '{typography.label-md}'
    textColor: '{colors.on-surface}'
    marginBottom: '{spacing.xs}'
  label-required:
    textColor: '{colors.error}'
    marginLeft: 4px
  error-message:
    typography: '{typography.label-sm}'
    textColor: '{colors.error}'
    marginTop: '{spacing.xs}'
  helper-text:
    typography: '{typography.label-sm}'
    textColor: '{colors.on-surface-variant}'
    marginTop: '{spacing.xs}'
---

## Overview

This design system serves the Israeli Ministry of Transport's vehicle licensing payment portal, a mission-critical civic digital service. The aesthetic is 'Civic Clarity'—a deliberate fusion of governmental authority and modern accessibility. The deep blue header (#007bff) signals trust and official legitimacy, while the light, spacious background (#f5f8fa) reduces cognitive load for users navigating complex licensing workflows. The brand personality is direct, reassuring, and procedurally transparent: users should never wonder what step they're on or what information is required. Voice: formal but not cold, precise without jargon. Example sentence: 'הזנת מספר הרכב שלך יאפשר לנו לאתר את הרישיון הנוכחי שלך ולחדשו בתשלום מהיר.' (Entering your vehicle number allows us to locate your current license and renew it with a quick payment.)

## Colors

The color system is anchored in a civic-blue primary (#007bff), used exclusively for interactive elements—buttons, active step indicators, focus states, and links. This color appears 155 times in the DOM, making it the unmistakable call-to-action accent. Secondary grays (#6c757d for text, #dee2e6 for borders, #f4f4f4 for subtle backgrounds) create a neutral, professional hierarchy that never competes with the primary. Error states use a distinct red (#dc3545) to signal validation failures without ambiguity. The surface stack is deliberately light: the page background is #f5f8fa (a soft blue-gray), input fields are pure white (#ffffff), and container backgrounds step through #f4f4f4 → #f8f9fa → #f0f9fa to create subtle depth without darkness. This light palette respects the Israeli governme

## Typography

The type system uses Rubik, a geometric sans-serif optimized for Hebrew and Arabic, ensuring equal legibility across the site's multilingual interface (Hebrew primary, Arabic and English supported). Display (60px, 700 weight) is reserved for hero contexts; Headline-lg (40px, 600) anchors major sections like 'רישיון רכב' (Vehicle License); Body-md (16px, 400) is the workhorse for form labels and instructional text, set at 24px line-height for comfortable reading on mobile and desktop. Label-md (14px, 600) is applied to button text and form field labels, with 0.01em letter-spacing to maintain crispness at small sizes. All headings use -0.01em to -0.02em letter-spacing to tighten their visual weight. On small labels over busy backgrounds (e.g., step indicators), apply text-shadow: 0 1px 2px r

## Layout

The page uses a 12-column grid with a max-width of 1140px, centered on desktop and full-width on mobile (xs breakpoint). The gutter is 24px, applied consistently via Bootstrap's row-gov and col-* classes. Sections are separated by 40px (lg spacing) vertically, creating a rhythm that guides users through the multi-step form. The container-max-width of 1140px ensures that form fields never exceed 600px width, maintaining focus and reducing eye travel. White-space is semantic: the 24px gutter between columns is mirrored in the 24px padding inside cards, creating visual cohesion. The step indicator row uses no-gutters to compress the horizontal layout, then applies 40px margin-bottom to separate it from the form section below. Mobile uses xs-mb-10 (10px) and xs-mb-25 (25px) for tighter spacing

## Elevation & Depth

Depth is achieved through a restrained shadow system and subtle background shifts, never through darkness. Level 1 (Base): the page background is #f5f8fa with no shadow. Level 2 (Standard Cards & Inputs): 0 3px 8px rgba(0, 0, 0, 0.15) creates a soft, lifted appearance—this shadow is applied to dropdown panels, error messages, and card hover states. Level 3 (Modals & Elevated Surfaces): 0 8px 24px rgba(0, 0, 0, 0.12) is reserved for future modal overlays or high-priority alerts. Focus states use a colored ring instead of shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25) for primary focus, 0 0 0 0.2r

## Shapes

The shape philosophy is 'Civic Softness'—rounded corners are present but restrained, signaling approachability without sacrificing institutional formality. Buttons use 1rem (16px) border-radius, creating a modern, friendly appearance while remaining professional. Input fields and select dropdowns use 0.75rem (12px), a middle ground that feels less severe than sharp corners but more grounded than full rounding. Cards use 1rem (16px) to match buttons, creating a visual family. The step indicator circles are 50% border-radius (full circles), a universal symbol for progress. Error messages and hel

## Components

### Action Elements
Buttons are the primary interaction mechanism. The button-primary component uses background-color: {colors.primary} (#007bff), padding: 12px 24px, height: 48px (touch-friendly), and border-radius: 1rem. On hover, the background shifts to #0056b3 (a 20% darkening) with a 200ms ease-in-out transition. On focus, a 0.2rem rgba(0, 123, 255, 0.25) ring appears, meeting WCAG AAA focus visibility standards. Button-secondary uses a transparent background with a 1px solid border at {colors.outline} (#dee2e6), allowing secondary actions to coexist without visual dominance.

### Inputs & Form Fields
Input fields (text, email, tel) use background-color: #ffffff, padding: 12px 16px, height: 40px, and border: 1px solid {colors.outline}. On focus, the border shifts to {colors.primary}

## Do's and Don'ts

**Do**
- Do use {colors.primary} (#007bff) exclusively for interactive elements—buttons, links, active states, and focus rings. Never use it for backgrounds or body text.
- Do maintain 24px line-height on body text (16px font) to ensure readability for users with low vision or dyslexia, especially important for Hebrew and Arabic.
- Do apply focus rings (0 0 0 0.2rem rgba(0, 123, 255, 0.25)) to all interactive elements; keyboard navigation is mandatory for civic services.
- Do use the step indicator circles (40px, 50% border-radius) to signal progress; users must always know which step they're on.
- Do keep input fields at 40px height minimum to accommodate touch targets on mobile (48px preferred for buttons).
- Do apply 200ms ease-in-out transitions to hover and focus state changes; instant changes feel jarring in forms.

**Don't**
- Don't use colors outside the defined palette—no custom hex values. The system's contrast ratios are calibrated for accessibility.
- Don't apply shadows deeper than {elevation.lg} (0 8px 24px rgba(0, 0, 0, 0.12)); excessive shadow creates visual noise in a civic interface.
- Don't round corners more than 1rem (16px) on primary surfaces; the brand is institutional, not playful.
- Don't use the error color (#dc3545) for warnings or informational messages; reserve it for validation failures only.
- Don't set font sizes below 14px for body text or labels; the site must meet WCAG AA readability standards (16px preferred).
- Don't disable form fields without clear explanation; if a field is disabled, provide helper text explaining why.
