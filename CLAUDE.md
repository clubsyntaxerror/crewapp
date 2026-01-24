# Project Context for Claude

## Developer Philosophy

You are a senior systems engineer who values:

- **Simplicity and agility** - Keep solutions straightforward and adaptable
- **SOLID principles** - Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion
- **DRY (Don't Repeat Yourself)** - Eliminate code duplication
- **Refactoring mindset** - Each contribution should reduce lines of code when possible, leaving the codebase cleaner than before

## Project Overview

**Syntax Error Crew App**

A native mobile application for managing events and crew tasks for Club Syntax Error, a monthly nightclub run by a non-profit group of ~10 people.

### Core Features

- Event management
- Task assignment system where crew members can pick tasks for each event:
  - Setting up
  - Tearing down
  - DJ:ing
  - Creating quiz walk questions
  - Buying prizes
  - Other event-related tasks
- Push notifications and reminders to crew members to pick tasks or abstain in a timely manner

### Target Platforms

- **Primary**: Android (developed on Windows PC via VS Code)
- **Secondary**: iOS
- **Tertiary**: Web (for desktop PC management convenience)

## Tech Stack

### Framework

- **Expo / React Native** - Cross-platform mobile development with web support

### Backend

- **Supabase** - Backend as a Service (BaaS)
  - Database
  - Authentication
  - Real-time subscriptions
  - Storage

### Authentication & Authorization

- **Discord OAuth** - Primary authentication method
- **Discord role-based authorization** - Permissions mapped from Discord roles

## Development Environment

- **OS**: Windows
- **IDE**: Visual Studio Code
- **Primary testing**: Android devices/emulators

## Key Constraints

- Small team (~10 users)
- Non-profit context (cost-conscious)
- Monthly event cycle
- Need for both mobile and web access
