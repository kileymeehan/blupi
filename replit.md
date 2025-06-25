# Blupi - Collaborative Design Platform

## Overview
Blupi is an advanced collaborative product design platform that leverages AI and real-time technologies to transform team creativity and design workflows. The platform provides sophisticated visual collaboration tools with intelligent design management and enhanced team interactions.

**Current State**: Production-ready application with comprehensive staging deployment configuration

## Project Architecture

### Core Technologies
- **Frontend**: React with TypeScript, Wouter routing
- **Backend**: Express.js with WebSocket support
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase Auth with OAuth integration
- **AI Integration**: Stable Diffusion XL via Replicate API for storyboard generation
- **Real-time**: WebSocket-powered collaborative editing
- **Deployment**: Replit with custom domain support

### Key Features
- Real-time collaborative design boards
- AI-powered storyboard generation using DALL-E 3 and Stable Diffusion XL
- Comprehensive starring system for tracking design opportunities
- Multi-user authentication with Google OAuth
- Project and team management
- Sheet document integration
- Notification system
- Rate limiting and security measures

## Recent Changes (December 2024)

### AI Image Generation Fixed (June 25, 2025)
- **Resolved storyboard generation issue** affecting both development and production
- **Fixed `__dirname` compatibility errors** in ES module production environment
- **Replaced express.static middleware** with dedicated API route for image serving
- **Eliminated 500 errors** when serving AI-generated storyboard images
- **Simplified artistic style** to clean black and white line drawings without panel framing
- **Improved prompt accuracy** by prioritizing scene description over artistic style directives
- **Switched from Stable Diffusion XL to DALL-E 3** for significantly better prompt adherence and scene accuracy
- **Updated prompt style to cartoon/stick figure format** to create generic, non-specific character representations
- **Updated CSP headers** to allow OpenAI DALL-E image URLs for proper image serving
- **Production storyboard generation now fully functional** on my.blupi.io

### Staging Environment Setup (June 23, 2025)
- **Comprehensive staging deployment configuration** implemented
- **Environment-aware configuration system** with staging/production separation
- **Visual staging indicators** including orange banner and environment badges
- **Automated setup scripts** for staging environment configuration
- **DNS configuration guides** for Squarespace domain management
- **Complete isolation** between staging and production environments

### Production CSP Fix (June 2025)
- **Resolved CSP issue** blocking AI-generated images on production
- **Fixed malformed Replit domain wildcards** in img-src directive
- **Implemented comprehensive diagnostic logging** for image generation pipeline
- **Added CSP violation reporting** for ongoing monitoring
- **Production images now loading successfully** on my.blupi.io

### AI Image Generation System
- **Replicate API integration** for Stable Diffusion XL
- **Comprehensive error handling** and retry mechanisms  
- **Image serving and management** with proper file permissions
- **Storyboard generation workflow** with user-friendly interface

## User Preferences
- **Communication Style**: Professional and direct, avoid repetitive phrases
- **Technical Detail**: Provide comprehensive technical information
- **Documentation**: Maintain detailed architectural documentation
- **Deployment**: Prefer Replit for hosting and deployment
- **Testing**: Implement staging environment for safe testing before production

## Project Structure

### Client (`client/`)
- React application with TypeScript
- Component-based architecture using shadcn/ui
- Real-time collaboration features
- AI-powered design tools

### Server (`server/`)
- Express.js API with WebSocket support
- Authentication and session management
- Database operations via Drizzle ORM
- AI service integrations

### Shared (`shared/`)
- Database schema definitions
- Type definitions and interfaces
- Shared utilities and constants

### Configuration (`config/`)
- Environment-aware configuration system
- Staging and production environment separation
- Feature flags and environment-specific settings

## Deployment Configuration

### Production Environment
- **Domain**: my.blupi.io
- **Branch**: production
- **Database**: Production PostgreSQL instance
- **Firebase**: Production Firebase project
- **Features**: Full production configuration with rate limiting

### Staging Environment  
- **Domain**: staging.blupi.io
- **Branch**: main (auto-deploys from main branch)
- **Database**: Separate staging PostgreSQL instance
- **Firebase**: Separate staging Firebase project
- **Features**: Debug mode enabled, staging banner, relaxed rate limiting

### DNS Configuration
- **Production**: my.blupi.io → production deployment
- **Staging**: staging.blupi.io → staging deployment via CNAME to [username].repl.co

## Security and Performance
- **CSP Headers**: Properly configured for production image serving
- **Rate Limiting**: Environment-aware rate limiting configuration
- **Authentication**: Secure Firebase authentication with OAuth
- **Error Monitoring**: Comprehensive logging and error tracking
- **Session Management**: Secure session handling with PostgreSQL store

## Development Workflow
1. **Local Development**: Test features locally
2. **Main Branch**: Push to main for automatic staging deployment
3. **Staging Testing**: Verify functionality on staging.blupi.io
4. **Production Release**: Merge main → production for production deployment

This architecture ensures safe testing and deployment cycles while maintaining production stability.