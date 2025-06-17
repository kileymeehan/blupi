import { useEffect, useRef } from 'react';
import introJs from 'intro.js';
import { useAuth } from '@/hooks/use-simple-auth';

interface TourStep {
  element: string;
  intro: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface UseTourOptions {
  steps: TourStep[];
  tourKey: string;
  enabled?: boolean;
  onComplete?: () => void;
  onExit?: () => void;
}

export function useIntroTour({ 
  steps, 
  tourKey, 
  enabled = true,
  onComplete,
  onExit
}: UseTourOptions) {
  const { user } = useAuth();
  const introRef = useRef<any>(null);

  const isAuthenticated = !!user;
  const userId = user?.uid || user?.email;



  const hasSeenTour = () => {
    if (!userId) {
      console.log('[IntroTour] No userId available for tour check');
      return false;
    }
    // Force show tour for kileymeehan@gmail.com to demonstrate
    if (userId === 'kileymeehan@gmail.com') return false;
    
    const storageKey = `intro-tour-${tourKey}-${userId}`;
    const seen = localStorage.getItem(storageKey);
    
    // DEBUG: Check all localStorage keys for tour data
    const allKeys = Object.keys(localStorage).filter(key => key.includes('intro-tour'));
    console.log('[IntroTour] Tour seen check:', { 
      userId, 
      tourKey, 
      storageKey,
      seen,
      allTourKeys: allKeys 
    });
    
    // For debugging: Force clear tour completion for new accounts
    if (userId && String(userId).includes('kileymeehan+test')) {
      localStorage.removeItem(storageKey);
      return false;
    }
    
    return seen === 'true';
  };

  const markTourComplete = () => {
    if (userId) {
      localStorage.setItem(`intro-tour-${tourKey}-${userId}`, 'true');
    }
  };

  const startTour = () => {
    console.log('[IntroTour] startTour called:', { enabled, isAuthenticated, hasSeenTour: hasSeenTour() });
    if (!enabled || !isAuthenticated || hasSeenTour()) {
      console.log('[IntroTour] Skipping tour - conditions not met');
      return;
    }

    // Wait for DOM elements to be available
    setTimeout(() => {
      // Check if all elements exist before starting tour
      console.log('[IntroTour] Checking DOM elements...');
      steps.forEach(step => {
        const element = document.querySelector(step.element);
        console.log(`[IntroTour] Element ${step.element}:`, element ? 'FOUND' : 'MISSING');
      });
      
      const missingElements = steps.filter(step => !document.querySelector(step.element));
      
      if (missingElements.length > 0) {
        console.warn('[IntroTour] Some tour elements not found:', missingElements.map(s => s.element));
        // Try again after a short delay
        setTimeout(startTour, 1000);
        return;
      }

      console.log('[IntroTour] All elements found, starting tour!');

      introRef.current = introJs();
      
      introRef.current.setOptions({
        steps: steps.map(step => ({
          element: step.element,
          intro: step.intro,
          position: step.position || 'bottom'
        })),
        showProgress: true,
        showBullets: false,
        exitOnOverlayClick: false,
        exitOnEsc: true,
        nextLabel: 'Next →',
        prevLabel: '← Back',
        doneLabel: 'Get Started!',
        skipLabel: 'Skip Tour'
      });

      introRef.current.onbeforechange(() => {
        // Ensure target element is visible
        const currentStep = introRef.current._currentStep;
        if (currentStep >= 0 && steps[currentStep]) {
          const element = document.querySelector(steps[currentStep].element);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });

      introRef.current.oncomplete(() => {
        markTourComplete();
        onComplete?.();
      });

      introRef.current.onexit(() => {
        markTourComplete();
        onExit?.();
      });

      introRef.current.start();
    }, 500);
  };

  const resetTour = () => {
    if (user?.uid) {
      localStorage.removeItem(`intro-tour-${tourKey}-${user.uid}`);
    }
  };

  useEffect(() => {
    console.log('[IntroTour] useEffect triggered:', { isAuthenticated, userId, enabled });
    if (isAuthenticated && userId && enabled) {
      startTour();
    }

    return () => {
      if (introRef.current) {
        introRef.current.exit();
      }
    };
  }, [isAuthenticated, userId, enabled]);

  return {
    startTour,
    resetTour,
    hasSeenTour: hasSeenTour()
  };
}